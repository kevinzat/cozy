import { ext_gcd } from './gcd';
import Tableau from './tableau';


/**
 * Represents a linear equation on variables x0, ..., xN given by coefs[0] * x0
 * + coefs[1] * x1 + ... + coefs[N] * xN = value.
 */
export interface LinearEquation {
  coefs: bigint[];
  value: bigint;
}


// Notes on the Smith Normal Form (SNF) calculation below:
//
// It should not be difficult to extend this method to return matrices U and V
// such that the input = U output V. The idea is to start with U = V = I and
// then, as we apply each elementary operation to A (the eventual output), we
// apply an inverse operation to U or V to maintian equality.
//  * It looks easier to keep track of U^T as we go and then un-transpose later.
//  * Here are the individual operations:
//     - Swap is [[0, 1], [1, 0]], which is its own (transpose) inverse
//     - Add a times row 1 to row 2 is [[1, 0], [a, 1]]. It's transpose inverse
//       is given by [[1, -a], [0, 1]]
//     - If column 1 contains [a b]^T and sa + bt = d = gcd(a, b), then we have
//       s(a/d) + t(b/d) = 1, so multiplication by [[s, t], [(b/d), (a/d)]] puts
//       gcd(a, b) into the top-left corner. Its determinant is 1, so it is
//       invertible, and its transpose inverse is [[(a/d), t], [-(b/d), s]].
//  * The method below does not perform the third operation (for gcd) because it
//    only modifies the first row, but it would be easy to modify it to match.

/**
 * Converts the given matrix into a diagonal one, where, in the sequence of
 * diagonal entries, each one divides the next.
 * @returns the rank of the matrix and a list containing, for each column, its
 *      original index (these may change due to column swaps)
 */
export function SmithNormalForm(A: Tableau): [number, number[]] {
  // We start out with each column have its original index.
  let indexes: number[] = [];
  for (let i = 0; i < A.n; i++) {
    indexes.push(i);
  }

  // After k iterations, A[:,:k] and A[:k,:] are diagonal.
  let k = 0;
  while (k < Math.min(A.m, A.n)) {
    // Swap the smallest entry in A[k:,k:] (by abs) into A[k,k]
    let [i, j] = _ArgMinAbs(A, k, A.m, k, A.n);
    if (i < 0)
      break;  // nothing left
    if (i !== k)
      A.rowSwap(i, k);
    if (j !== k) {
      A.colSwap(j, k);
      [indexes[j], indexes[k]] = [indexes[k], indexes[j]];
    }

    let working: boolean = true;
    while (working) {
      working = false;

      // Wipe out all entries below A[k,k] in its column.
      for (let i = k+1; i < A.m; i++) {
        if (A.entries[i][k] === 0n)
          continue;  // already correct

        // Calculate the gcd of A[k][k] and A[i][k].
        let [d, s, t] = ext_gcd(A.entries[k][k], A.entries[i][k]);

        // Apply row ops to make A[k][k] contain the gcd.
        if (s === 0n) {
          A.rowSwap(i, k);  // A[i][k] is the gcd, so just swap them
        } else {
          if (s !== 1n)
            A.rowScale(k, s);
          if (t !== 0n)
            A.rowAddMultiple(k, i, t);  // gcd = s * A[k][k] + t * A[i][k]
        }

        if (A.entries[k][k] !== d)
          throw new Error(`un oh! ${A.entries[k][k]} should be ${d}`);
        if (A.entries[i][k] % d !== 0n)
          throw new Error(`un oh! ${d} should divide ${A.entries[i][k]}`);

        // Eliminate A[i][k] by subtracting a multiple of gcd;
        A.rowAddMultiple(i, k, -A.entries[i][k] / d);
      }

      // Wipe out all entries to the right of A[k,k] in its row.
      for (let j = k+1; j < A.n; j++) {
        if (A.entries[k][j] === 0n)
          continue;  // already correct

        // Calculate the gcd of A[k][k] and A[k][j].
        let [d, s, t] = ext_gcd(A.entries[k][k], A.entries[k][j]);
        if (d !== s * A.entries[k][k] + t * A.entries[k][j])
          throw new Error(`${d} != ${s} * ${A.entries[k][k]} + ${t} * ${A.entries[k][j]}`);

        // Apply column ops to make A[k][k] contain the gcd.
        if (s === 0n) {
          A.colSwap(j, k);  // A[k][j] is the gcd, so just swap them
          [indexes[j], indexes[k]] = [indexes[k], indexes[j]];
          if (t !== 0n)
            A.colScale(k, t);
        } else {
          if (s !== 1n)
            A.colScale(k, s);
          if (t !== 0n)
            A.colAddMultiple(k, j, t);  // gcd = s * A[k][k] + t * A[k][j]
        }

        if (A.entries[k][k] !== d)
          throw new Error(`un oh! ${A.entries[k][k]} should be ${d}`);
        if (A.entries[k][j] % d !== 0n)
          throw new Error(`un oh! ${d} should divide ${A.entries[k][j]}`);

        // Eliminate A[k][j] by subtracting a multiple of gcd;
        A.colAddMultiple(j, k, -A.entries[k][j] / d);

        working = true;  // will need to re-check the rows now
      }
    }

    k += 1;
  }

  return [k, indexes];
}

function abs(a: bigint): bigint {
  return a < 0n ? -a : a;
}

// Returns the index of the nonzero entry in the given submatrix with the
// smallest absolute value (breaking ties toward lower indices, row then col)
// or [-1, -1] if no nonzero entries are found.
function _ArgMinAbs(A: Tableau,
    row_start: number, row_end: number,
    col_start: number, col_end: number): [number, number] {
  let min_abs: bigint | undefined = undefined;
  let min_i = -1, min_j = -1;
  for (let i = row_start; i < row_end; i++) {
    for (let j = col_start; j < col_end; j++) {
      let c = abs(A.entries[i][j]);
      if (c > 0n && (min_abs === undefined || c < min_abs)) {
        min_abs = c;
        min_i = i;
        min_j = j;
      }
    }
  }
  return [min_i, min_j];
}

/**
 * Determines whether a set of linear equations implies another one.
 * @returns true if it is implied, false if known facts imply it is false, and
 *      undefined if it could be either true or false (depending on variables)
 */
export function IsImplied(
    eqs: LinearEquation[], eq: LinearEquation): boolean|undefined {

  // Form a tableau representing these equations with the final equation encoded
  // in the extra row, so that it is transformed in the same way.
  let A = new Tableau(eqs.map(eq => eq.coefs), eqs.map(eq => eq.value), eq.coefs);
  let res = SmithNormalForm(A);
  const rk = res[0];

  // If any variables but the ones solved for (0 to rk-1) remain in the new
  // equation, then its value could be true or false depending on their values.
  for (let j = rk; j < A.n; j++) {
    if (A.row0![j] !== 0n)
      return undefined;
  }

  // Since the values of the solved-for variables are known, we can now
  // calculate the value of the LHS of the new equation.
  let val = 0n;
  for (let j = 0; j < rk; j++) {
    if (A.row0![j] % A.entries[j][j] !== 0n)
      return undefined;  // we only know about xj in these multiples

    const t = A.row0![j] / A.entries[j][j];
    val += t * A.col0![j];  // Each t copies of xj are equal to A.row0[j]
  }

  // The equation is true iff the calculated LHS equals the given value.
  return val === eq.value;
}
