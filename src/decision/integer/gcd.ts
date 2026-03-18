/** Returns the quotient (first) part returned by divmod. */
export function div(a: number, b: number): number {
  let s = divmod(a, b);
  return s[0];
}

/** Returns the quotient (first) part returned by divmod. */
export function mod(a: number, b: number): number {
  let s = divmod(a, b);
  return s[1];
}

/**
 * This and mod return integers d and q such that a = q*d + q, where q also has
 * the property that 0 <= q < b.
 * @requires: a and b are integers and that b > 0
 */
export function divmod(a: number, b: number): [number, number] {
  if (b > 0) {
    let q = Math.floor(a/b);
    let r = a % b;
    if (r >= 0) {
      return [q, r];
    } else {
      // The positive value -a satisfies -a = (-q-1)*b - r: q is too negative,
      // making -1 too positive, so we add 1 to get the usual quotient, and the
      // remainder is simply the negative of the usual positive remainder.
      // Multiplying through by -1 gives a = (q+1)*b + r
      //
      // However we have b < r < 0. We fix that by adding b to it and
      // subtracting one off the quotient to compensate, so a = q*b + (r+b).
      return [q, r+b];
    }
  } else if (b < 0) {
    throw new Error("second parameter to divmod must be positive");
  } else {
    throw new Error("division by zero");
  }
}


/** Returns the GCD of the two given numbers. */
export function gcd(a: number, b: number): number {
  if (isNaN(a) || isNaN(b)) {
    throw new Error(`${a} is NaN or ${b} is NaN`);
  } else if (a < 0 || b < 0) {
    return gcd(a < 0 ? -a : a, b < 0 ? -b : b);
  } else if (a < b) {
    return gcd_rec(b, a);
  } else {
    return gcd_rec(a, b);
  }
}

// Helper function for above that assumes a >= b >= 0.
function gcd_rec(a: number, b: number): number {
  if (a < 0 || b < 0) {
    throw new Error(`gcd on ${a} and ${b}`);
  } else if (b === 0) {
    return a;
  } else {
    return gcd_rec(b, a % b);
  }
}


/**
 * Returns a triple [d, s, t] with d = gcd(a, b) = s*a + t*b. This
 * implementation is O(1) time when a = +/-b or b = 0.
 */
export function ext_gcd(a: number, b: number): [number, number, number] {
  if (Math.abs(a) == Math.abs(b)) {
    if (a >= 0) {
      return [a, 1, 0];
    } else {
      return [-a, -1, 0];
    }
  } else if (a < 0) {
    let [d, s, t] = ext_gcd(-a, b);
    return [d, -s, t];  // add a negative here to cancel out the negative above
  } else if (b < 0) {
    let [d, s, t] = ext_gcd(a, -b);
    return [d, s, -t];  // add a negative here to cancel out the negative above
  } else if (a < b) {
    let [d, s, t] = ext_gcd(b, a);
    return [d, t, s];  // swap again to undo the one above
  } else {
    return ext_gcd_rec(a, b);
  }
}

// Helper function for above that assumes a >= b >= 0.
function ext_gcd_rec(a: number, b: number): [number, number, number] {
  if (b === 0) {
    return [a, 1, 0];  // a = gcd(a, 0) = 1*a + 0*0
  } else {
    let [d, s, t] = ext_gcd_rec(b, a % b);  // d = s*b + t*(a%b)
                                            // a%b = a - (a/b)*b
                                            // => d = s*b + t*(a - (a/b)*b)
    return [d, t, s - t*Math.floor(a/b)];   //      = t*a + (s - t*(a/b))*b
  }
}