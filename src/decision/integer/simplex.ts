import Fraction from './fraction';
import { ext_gcd, gcd } from './gcd';
import Tableau from './tableau';

/**
 * Finds the point that minimizes the given cost function while satisfying the
 * linear equations Ax = b with x >= 0. Here, b is col0 of the tableau.
 * @param A the tableau in question
 * @param c the cost function
 * @param cols the indexes of the columns such that A[:,cols] = I
 * @returns whether a minimum was found
 */
export function SimplexMethod(A: Tableau, c: bigint[], cols: number[]): boolean {
  if (A.col0 === undefined)
    throw new Error('Tableau is missing col0');
  if (c.length !== A.n)
    throw new Error(`wrong size for c: ${c.length} vs ${A.n}`);

  while (true) {
    // Find a column to add to the basis that will reduce its cost.
    const col = FirstProfitable(A, c, cols);
    if (col < 0)
      return true;   // at an optimum

    // Find the row that will leave when this one enters. (This is the first row
    // whose corresopnding basis column becomes zero as we increase the new col)
    const [row, _] = LimitingRow(A, col);
    if (row < 0)
      return false;  // there is no optimum!

    // Pivot this into the basis.
    Pivot(A, cols, row, col);
  }
}


/**
 * Returns the first column index such that adding it to the basis will reduce
 * cost or -1 if no change would reduce cost.
 */
export function FirstProfitable(A: Tableau, c: bigint[], cols: number[]): number {
  const basis = new Set<number>(cols);

  for (let j = 0; j < A.n; j++) {
    if (basis.has(j))
      continue;  // in the basis already

    let zj: Fraction = Fraction.ZERO;
    for (let i = 0; i < A.m; i++) {
      zj = zj.add(new Fraction(A.entries[i][j] * c[cols[i]], A.entries[i][cols[i]]));
    }

    if (new Fraction(c[j]).is_less(zj))
      return j;
  }

  return -1;  // none found
}


/**
 * Returns the row whose corresponding basis variable first becomes zero as we
 * add in more of the variable in the given column.
 */
export function LimitingRow(A: Tableau, col: number): [number, Fraction] {
  const options: Array<[number, Fraction]> = [];
  for (let i = 0; i < A.m; i++) {
    if (A.entries[i][col] > 0n)
      options.push([i, new Fraction(A.col0![i], A.entries[i][col])]);
  }

  if (options.length === 0)
    return [-1, Fraction.ZERO];

  options.sort(([_, f], [__, g]) => Fraction.compare(f, g));
  return options[0];
}


/**
 * Adds col into the basis. To do so, this performs row- and column-operations
 * to make (row, col) the only non-zero value in that column. Then, it replaces
 * cols[row], which originally had this property, in the basis.
 * @param A the tableau in question
 * @param cols cols[i] identifies the column with a non-zero value in row i only
 */
export function Pivot(A: Tableau, cols: number[], row: number, col: number): void {
  if (cols.includes(col))
    throw new Error(`${col} is already in the basis`);
  if (A.entries[row][col] === 0n)
    throw new Error(`cannot pivot on zero value at (${row}, ${col})`);

  // Ensure that cols[row] is nonzero in this row and 0 elsewhere.
  const col1 = cols[row];
  for (let i = 0; i < A.m; i++) {
    if (i === row) {
      if (A.entries[i][col1] === 0n)
        throw new Error(`zero value in (${col1}, ${i}): ${A.entries[i][col1]}`);
    } else {
      if (A.entries[i][col1] !== 0n)
        throw new Error(`non-zero value in (${col1}, ${i}): ${A.entries[i][col1]}`);
    }
  }

  // Eliminate the values in other rows in col.
  for (let i = 0; i < A.m; i++) {
    if (i === row)
      continue;  // allowed to be non-zero

    if (A.entries[i][col] === 0n)
      continue;  // already zero

    // Zero A[i][col] using one-sided elimination: only modify row i, never row.
    // Since row is untouched, no other basis column in row is disturbed.
    const a = A.entries[i][col];
    const b = A.entries[row][col];
    const d = gcd(a < 0n ? -a : a, b < 0n ? -b : b);
    A.rowScale(i, b / d);
    A.rowAddMultiple(i, row, -(a / d));
  }

  // If any row of col0 is negative, rescale it to be non-negative.
  // (Make sure the solution is still positive.)
  for (let i = 0; i < A.m; i++) {
    if (!A.col0) continue;
    if (A.col0[i] < 0n)
      A.rowScale(i, -1n);
    const val = A.entries[i][cols[i]];
    if (A.entries[i][cols[i]] < 0n)
      throw new Error(`invalid solution x_${i} = ${A.col0[i]}/${val} < 0`);
  }

  // Update cols to indicate that col is now included.
  cols[row] = col;
}

// Zero out (row1, col) using multiples of (row2, col).
function Zero(A: Tableau, row1: number, row2: number, col: number): void {
  // Calculate the gcd of A[row1][col] and A[row2][col].
  let [d, s, t] = ext_gcd(A.entries[row1][col], A.entries[row2][col]);

  if (t === 0n) {  // A[row1][col] is the gcd
    if (A.entries[row2][col] % A.entries[row1][col] !== 0n)
      throw new Error(`uh oh! ${A.entries[row1][col]} should divide ${A.entries[row2][col]}`)

    // Scale row1 up so A[row1][col] = A[row2][col] then subtract row1 to zero row2
    A.rowScale(row1, A.entries[row2][col] / A.entries[row1][col]);
    A.rowAddMultiple(row1, row2, -1n);

  } else {
    // Apply row ops to make A[row2][col] contain the gcd.
    if (t !== 1n)
      A.rowScale(row2, t);
    if (s !== 0n)
      A.rowAddMultiple(row2, row1, s);  // gcd = s * A[row1][col] + t * A[row2][col]

    if (A.entries[row2][col] !== d)
      throw new Error(`uh oh! ${A.entries[row2][col]} should be ${d}`);
    if (A.entries[row1][col] % d !== 0n)
      throw new Error(`uh oh! ${d} should divide ${A.entries[row1][col]}`);

    // Eliminate A[row1][col] by subtracting a multiple of gcd;
    A.rowAddMultiple(row1, row2, -A.entries[row1][col] / d);
  }
}
