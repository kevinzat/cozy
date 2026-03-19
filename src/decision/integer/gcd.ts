/** Returns the quotient (first) part returned by divmod. */
export function div(a: bigint, b: bigint): bigint {
  let s = divmod(a, b);
  return s[0];
}

/** Returns the quotient (first) part returned by divmod. */
export function mod(a: bigint, b: bigint): bigint {
  let s = divmod(a, b);
  return s[1];
}

/**
 * This and mod return integers d and q such that a = q*d + q, where q also has
 * the property that 0 <= q < b.
 * @requires: a and b are integers and that b > 0
 */
export function divmod(a: bigint, b: bigint): [bigint, bigint] {
  if (b > 0n) {
    // Bigint division truncates toward zero; adjust to floor division.
    let q = a / b;
    let r = a % b;
    if (r < 0n) {
      q -= 1n;
      r += b;
    }
    return [q, r];
  } else if (b < 0n) {
    throw new Error("second parameter to divmod must be positive");
  } else {
    throw new Error("division by zero");
  }
}


function abs(a: bigint): bigint {
  return a < 0n ? -a : a;
}


/** Returns the GCD of the two given numbers. */
export function gcd(a: bigint, b: bigint): bigint {
  if (a < 0n || b < 0n) {
    return gcd(a < 0n ? -a : a, b < 0n ? -b : b);
  } else if (a < b) {
    return gcd_rec(b, a);
  } else {
    return gcd_rec(a, b);
  }
}

// Helper function for above that assumes a >= b >= 0.
function gcd_rec(a: bigint, b: bigint): bigint {
  if (a < 0n || b < 0n) {
    throw new Error(`gcd on ${a} and ${b}`);
  } else if (b === 0n) {
    return a;
  } else {
    return gcd_rec(b, a % b);
  }
}


/**
 * Returns a triple [d, s, t] with d = gcd(a, b) = s*a + t*b. This
 * implementation is O(1) time when a = +/-b or b = 0.
 */
export function ext_gcd(a: bigint, b: bigint): [bigint, bigint, bigint] {
  if (abs(a) == abs(b)) {
    if (a >= 0n) {
      return [a, 1n, 0n];
    } else {
      return [-a, -1n, 0n];
    }
  } else if (a < 0n) {
    let [d, s, t] = ext_gcd(-a, b);
    return [d, -s, t];  // add a negative here to cancel out the negative above
  } else if (b < 0n) {
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
function ext_gcd_rec(a: bigint, b: bigint): [bigint, bigint, bigint] {
  if (b === 0n) {
    return [a, 1n, 0n];  // a = gcd(a, 0) = 1*a + 0*0
  } else {
    let [d, s, t] = ext_gcd_rec(b, a % b);  // d = s*b + t*(a%b)
                                            // a%b = a - (a/b)*b
                                            // => d = s*b + t*(a - (a/b)*b)
    return [d, t, s - t*(a/b)];             //      = t*a + (s - t*(a/b))*b
  }
}
