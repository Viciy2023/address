/**
 * Luhn (mod-10) check digit arithmetic.
 *
 * The algorithm is the same one the generator already applied inline for the
 * identity card number; it lives here as a named module because the standalone
 * card generator needs both directions — computing a check digit for a partial
 * number the visitor typed, and validating a finished number.
 *
 * Everything works on the digit string, with non-digits stripped first, so a
 * caller can pass "4111 1111 1111 1111" or "4111-1111-1111-1111" unchanged.
 */

/** Keeps only the digits of `input`. */
export function digitsOnly(input: string): string {
  return input.replace(/\D+/g, "");
}

/**
 * Luhn check digit for the digits given. The input is the number *without* its
 * check digit; the returned character is what belongs on the end.
 *
 * Doubling starts from the rightmost digit of the payload, which is the correct
 * parity once the check digit is appended.
 */
export function luhnCheckDigit(payload: string): number {
  const digits = digitsOnly(payload);
  let sum = 0;
  // Walk right-to-left, doubling every second digit (positions 1, 3, 5, ...).
  for (let i = 0; i < digits.length; i++) {
    const fromRight = digits.length - 1 - i;
    let v = Number(digits[fromRight]);
    if (i % 2 === 0) {
      v *= 2;
      if (v > 9) v -= 9;
    }
    sum += v;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Appends the check digit to `payload` and returns the full number.
 * Returns the input unchanged when it has no digits.
 */
export function withCheckDigit(payload: string): string {
  const digits = digitsOnly(payload);
  if (!digits) return "";
  return digits + String(luhnCheckDigit(digits));
}

/** True when `input` is a Luhn-valid number of at least two digits. */
export function isValidLuhn(input: string): boolean {
  const digits = digitsOnly(input);
  if (digits.length < 2) return false;
  // A valid number has a check digit of zero once the whole string is summed.
  return luhnCheckDigit(digits.slice(0, -1)) === Number(digits[digits.length - 1]);
}
