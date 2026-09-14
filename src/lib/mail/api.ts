/**
 * Client for the temporary-mailbox API.
 *
 * The mailbox runs as a separate deployment of the `cloudflare_temp_email`
 * worker, reachable at `SITE.mailApi`. Everything here is browser-side: the
 * worker enables CORS for all origins, and the address JWT it issues is the
 * only credential, held in memory for the session.
 *
 * Endpoint contract, read from the worker source (worker/src/mails_api):
 *
 *   GET    /open_api/settings        public  -> domains, length limits, flags
 *   POST   /api/new_address          public  -> { address, jwt, password, address_id }
 *   GET    /api/parsed_mails         address -> { results: ParsedMail[], count }
 *   GET    /api/parsed_mail/:id      address -> ParsedMail
 *   DELETE /api/clear_inbox          address -> { success }
 *
 * The parsed variants are used rather than the raw ones: the worker runs a Rust
 * mail parser and returns `subject`, `sender`, `text` and `html` already
 * decoded, so the browser does not have to.
 */

import { SITE } from "../../config";

/** Mailbox server settings, as reported by `/open_api/settings`. */
export interface MailSettings {
  domains: string[];
  defaultDomains: string[];
  prefix: string;
  minAddressLen: number;
  maxAddressLen: number;
  needAuth: boolean;
  /** Present only when the deployment has Turnstile enabled. */
  cfTurnstileSiteKey?: string;
  enableUserCreateEmail: boolean;
  enableUserDeleteEmail: boolean;
  addressRegex?: string;
}

/** A freshly created mailbox. */
export interface MailAddress {
  address: string;
  /** Address-scoped JWT; the only credential needed for reading mail. */
  jwt: string;
  addressId: number;
  /** Set only when the deployment requires an address password. */
  password?: string | null;
}

/** One received message, already parsed by the server. */
export interface Mail {
  id: number | string;
  subject: string;
  sender: string;
  text: string;
  html: string;
  created_at?: string;
  /** Milliseconds since epoch, when the server supplies it. */
  created_at_ms?: number;
  is_unread?: number;
  attachments?: { filename: string; mimeType: string; size: number }[];
}

/** Error carrying the server's own message, so the UI can show it verbatim. */
export class MailApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "MailApiError";
  }
}

/**
 * Performs a request and normalises failures.
 *
 * The worker returns plain-text error bodies (not JSON) for most failures, so
 * the body is read as text first and only parsed when it looks like JSON.
 */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${SITE.mailApi}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    // A network-level failure: the worker is unreachable or blocked.
    throw new MailApiError("unreachable", 0);
  }

  const text = await res.text();
  if (!res.ok) {
    // Error bodies are plain text; prefer them over a generic status message.
    throw new MailApiError(text.trim() || `HTTP ${res.status}`, res.status);
  }
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

/** Reads the mailbox server's public settings. */
export async function fetchSettings(): Promise<MailSettings> {
  const raw = await request<Record<string, unknown>>("/open_api/settings");
  return {
    domains: (raw.domains as string[]) ?? [],
    defaultDomains: (raw.defaultDomains as string[]) ?? [],
    prefix: (raw.prefix as string) ?? "",
    minAddressLen: (raw.minAddressLen as number) ?? 1,
    maxAddressLen: (raw.maxAddressLen as number) ?? 30,
    needAuth: Boolean(raw.needAuth),
    cfTurnstileSiteKey: (raw.cfTurnstileSiteKey as string) || undefined,
    enableUserCreateEmail: raw.enableUserCreateEmail !== false,
    enableUserDeleteEmail: raw.enableUserDeleteEmail !== false,
    addressRegex: (raw.addressRegex as string) || undefined,
  };
}

/**
 * Creates a mailbox.
 *
 * Both arguments are optional: with neither, the server generates a random
 * name on its default domain.
 */
export async function createAddress(opts: {
  name?: string;
  domain?: string;
  /** Turnstile response token, when the deployment requires one. */
  cfToken?: string;
} = {}): Promise<MailAddress> {
  const raw = await request<{
    address: string;
    jwt: string;
    address_id: number;
    password?: string | null;
  }>("/api/new_address", {
    method: "POST",
    body: JSON.stringify({
      name: opts.name || undefined,
      domain: opts.domain || undefined,
      cf_token: opts.cfToken || undefined,
      enableRandomSubdomain: false,
    }),
  });
  return {
    address: raw.address,
    jwt: raw.jwt,
    addressId: raw.address_id ?? 0,
    password: raw.password,
  };
}

/** Lists received mail, newest first. */
export async function listMails(jwt: string, limit = 20, offset = 0): Promise<{ results: Mail[]; count: number }> {
  const raw = await request<{ results: Mail[]; count: number }>(
    `/api/parsed_mails?limit=${limit}&offset=${offset}`,
    { headers: { Authorization: `Bearer ${jwt}` } },
  );
  return { results: raw.results ?? [], count: raw.count ?? 0 };
}

/** Fetches one message including its full HTML body. */
export async function getMail(jwt: string, id: number | string): Promise<Mail | null> {
  return request<Mail | null>(`/api/parsed_mail/${encodeURIComponent(String(id))}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
}

/** Empties the inbox. */
export async function clearInbox(jwt: string): Promise<void> {
  await request<{ success: boolean }>("/api/clear_inbox", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${jwt}` },
  });
}

/**
 * Extracts a verification code from a message.
 *
 * Codes arrive in every imaginable shape — "123456", "Your code is 1234", a
 * six-digit number inside a paragraph. Longest digit run wins, since a
 * too-short match (a year, a house number) is more likely to be wrong than a
 * too-long one is; six digits is by far the most common length.
 */
export function extractCodes(mail: Pick<Mail, "subject" | "text">): string[] {
  const haystack = `${mail.subject ?? ""}\n${mail.text ?? ""}`;
  const runs = haystack.match(/\b\d{4,8}\b/g) ?? [];
  // Rank by length first, then by how often the value repeats.
  const counts = new Map<string, number>();
  for (const r of runs) counts.set(r, (counts.get(r) ?? 0) + 1);
  return [...new Set(runs)].sort((a, b) => b.length - a.length || (counts.get(b)! - counts.get(a)!)).slice(0, 6);
}

/**
 * Sanitises a message body for `{@html}`.
 *
 * The worker returns the sender's own HTML. Rendering it directly into the page
 * would let any sender run script in the visitor's session, so the document is
 * parsed in a detached context first and only a small allow-list of formatting
 * elements survives; scripts, frames, forms and event handlers are dropped.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");

  const ALLOWED = new Set([
    "A", "B", "BLOCKQUOTE", "BR", "CODE", "DIV", "EM", "H1", "H2", "H3", "H4",
    "HR", "I", "IMG", "LI", "OL", "P", "PRE", "SMALL", "SPAN", "STRONG",
    "TABLE", "TBODY", "TD", "TH", "THEAD", "TR", "U", "UL",
  ]);
  const DROP_WITH_CONTENT = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "FORM", "LINK", "META", "BASE"]);

  const walk = (node: Element) => {
    for (const child of [...node.children]) {
      if (DROP_WITH_CONTENT.has(child.tagName)) {
        child.remove();
        continue;
      }
      if (!ALLOWED.has(child.tagName)) {
        // Unwrap rather than delete: keep the text, drop the element.
        child.replaceWith(...child.childNodes);
        walk(node);
        continue;
      }
      // Strip every attribute except a safe few.
      for (const attr of [...child.attributes]) {
        const name = attr.name.toLowerCase();
        const isSafeHref = name === "href" && /^(https?:|mailto:)/i.test(attr.value);
        const isSafeSrc = name === "src" && /^(https?:|data:image\/)/i.test(attr.value);
        if (!isSafeHref && !isSafeSrc && name !== "alt" && name !== "title" && name !== "colspan" && name !== "rowspan") {
          child.removeAttribute(attr.name);
        }
      }
      // External links open in a new tab and cannot reach back via window.opener.
      if (child.tagName === "A" && child.getAttribute("href")) {
        child.setAttribute("target", "_blank");
        child.setAttribute("rel", "noopener noreferrer nofollow");
      }
      walk(child);
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
}
