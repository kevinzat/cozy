import Fraction from './fraction';
import { ext_gcd, gcd } from './gcd';
import { LinearEquation } from './smith';
import Tableau from './tableau';

/**
 * Represents a linear inequality on variables x0, ..., xN given by coefs[0] * x0
 * + coefs[1] * x1 + ... + coefs[N] * xN >= value.
 */
export interface LinearInequality {
  coefs: bigint[];
  value: bigint;
}

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

/**
 * Solves a linear program using the two-phase simplex method. This handles
 * the general case where no initial basic feasible solution is known.
 *
 * Minimizes c^T x subject to Ax = b with x >= 0, where b is col0 of A.
 *
 * Phase I introduces artificial variables and minimizes their sum to find a
 * basic feasible solution (or determine infeasibility). Phase II then optimizes
 * the real objective. The tableau A is modified in place.
 *
 * @returns status and basis columns if optimal
 */
export function TwoPhaseSimplexMethod(A: Tableau, c: bigint[]):
    { status: 'optimal', cols: number[] } |
    { status: 'infeasible' } |
    { status: 'unbounded' } {
  if (!A.col0) throw new Error('Tableau is missing col0');
  if (c.length !== A.n) throw new Error(`wrong size for c: ${c.length} vs ${A.n}`);

  const m = A.m;
  const n = A.n;

  // Make col0 non-negative by negating rows as needed.
  for (let i = 0; i < m; i++) {
    if (A.col0[i] < 0n)
      A.rowScale(i, -1n);
  }

  // Build augmented tableau: append m artificial columns (identity matrix).
  const augEntries: bigint[][] = [];
  for (let i = 0; i < m; i++) {
    const row: bigint[] = new Array(n + m);
    for (let j = 0; j < n; j++) row[j] = A.entries[i][j];
    for (let j = 0; j < m; j++) row[n + j] = (i === j) ? 1n : 0n;
    augEntries.push(row);
  }
  const aug = new Tableau(augEntries, A.col0.slice());

  // Phase I: minimize sum of artificial variables.
  const phase1Cost: bigint[] = new Array(n + m).fill(0n);
  for (let j = n; j < n + m; j++) phase1Cost[j] = 1n;

  const cols: number[] = [];
  for (let i = 0; i < m; i++) cols.push(n + i);

  SimplexMethod(aug, phase1Cost, cols);

  // Check feasibility: all artificial variables must have value zero.
  for (let i = 0; i < m; i++) {
    if (cols[i] >= n && aug.col0![i] !== 0n)
      return { status: 'infeasible' };
  }

  // Pivot out any degenerate artificial variables still in the basis.
  for (let i = 0; i < m; i++) {
    if (cols[i] < n) continue;

    let pivoted = false;
    for (let j = 0; j < n; j++) {
      if (!cols.includes(j) && aug.entries[i][j] !== 0n) {
        Pivot(aug, cols, i, j);
        pivoted = true;
        break;
      }
    }
    // If not pivoted, the row is redundant (all real coefficients are zero).
  }

  // Build Phase II tableau: keep only non-redundant rows and real columns.
  const activeRows: number[] = [];
  const activeCols: number[] = [];
  for (let i = 0; i < m; i++) {
    if (cols[i] < n) {
      activeRows.push(i);
      activeCols.push(cols[i]);
    }
  }

  const phase2Entries: bigint[][] = [];
  const phase2Col0: bigint[] = [];
  for (const i of activeRows) {
    const row: bigint[] = new Array(n);
    for (let j = 0; j < n; j++) row[j] = aug.entries[i][j];
    phase2Entries.push(row);
    phase2Col0.push(aug.col0![i]);
  }

  // Update A in place for Phase II.
  A.m = activeRows.length;
  A.entries = phase2Entries;
  A.col0 = phase2Col0;

  // Phase II: optimize the real objective.
  const phase2Ok = SimplexMethod(A, c, activeCols);

  if (!phase2Ok)
    return { status: 'unbounded' };

  return { status: 'optimal', cols: activeCols };
}


/** Returns the non-negative remainder of a divided by d (d > 0). */
function positiveMod(a: bigint, d: bigint): bigint {
  return ((a % d) + d) % d;
}

/**
 * Determines whether a set of linear equations and inequalities implies a
 * linear inequality over the integers. Uses the two-phase simplex method
 * with Gomory cuts.
 *
 * Given equations a_i · x = b_i and inequalities a_j · x >= b_j, determines
 * whether c · x >= d must hold for every integer solution x.
 *
 * Variables are unrestricted integers, handled via the substitution
 * x_i = x_i⁺ − x_i⁻ with x_i⁺, x_i⁻ >= 0. Each input inequality adds a
 * slack variable.
 */
export function IsImplied(
    eqs: LinearEquation[], ineqs: LinearInequality[],
    ineq: LinearInequality): boolean {
  const n = ineq.coefs.length;
  for (const eq of eqs) {
    if (eq.coefs.length !== n)
      throw new Error('mismatched coefficient lengths');
  }
  for (const iq of ineqs) {
    if (iq.coefs.length !== n)
      throw new Error('mismatched coefficient lengths');
  }

  // No variables.
  if (n === 0) {
    for (const eq of eqs) {
      if (eq.value !== 0n) return true;  // infeasible, vacuously true
    }
    for (const iq of ineqs) {
      if (iq.value > 0n) return true;  // 0 >= positive is infeasible
    }
    return ineq.value <= 0n;
  }

  // No constraints: variables unrestricted.
  if (eqs.length === 0 && ineqs.length === 0) {
    return ineq.coefs.every(c => c === 0n) && ineq.value <= 0n;
  }

  const numSlacks = ineqs.length;
  const totalCols = 2 * n + numSlacks;

  // Build initial tableau.
  let currentEntries: bigint[][] = [];
  let currentCol0: bigint[] = [];

  // Equations: a · (x⁺ − x⁻) = b
  for (const eq of eqs) {
    const row = new Array(totalCols).fill(0n);
    for (let j = 0; j < n; j++) {
      row[j] = eq.coefs[j];
      row[n + j] = -eq.coefs[j];
    }
    currentEntries.push(row);
    currentCol0.push(eq.value);
  }

  // Inequalities: a · (x⁺ − x⁻) − s_k = b
  for (let k = 0; k < ineqs.length; k++) {
    const iq = ineqs[k];
    const row = new Array(totalCols).fill(0n);
    for (let j = 0; j < n; j++) {
      row[j] = iq.coefs[j];
      row[n + j] = -iq.coefs[j];
    }
    row[2 * n + k] = -1n;  // slack variable
    currentEntries.push(row);
    currentCol0.push(iq.value);
  }

  // Cost: minimize c · (x⁺ − x⁻). Slacks have zero cost.
  const baseCost: bigint[] = new Array(totalCols).fill(0n);
  for (let j = 0; j < n; j++) {
    baseCost[j] = ineq.coefs[j];
    baseCost[n + j] = -ineq.coefs[j];
  }

  // Gomory cutting plane loop.
  for (let iter = 0; iter < 100; iter++) {
    const A = new Tableau(
        currentEntries.map(r => r.slice()),
        currentCol0.slice());

    // Pad cost with zeros for Gomory slack variables added in previous iterations.
    const cost: bigint[] = new Array(A.n).fill(0n);
    for (let j = 0; j < baseCost.length; j++)
      cost[j] = baseCost[j];

    const result = TwoPhaseSimplexMethod(A, cost);

    if (result.status === 'infeasible') return true;   // vacuously true
    if (result.status === 'unbounded') return false;

    // Check if all basis variables are integer.
    const cols = result.cols;
    let fractionalRow = -1;

    for (let i = 0; i < A.m; i++) {
      const val = new Fraction(A.col0![i], A.entries[i][cols[i]]);
      if (!val.is_integer()) {
        fractionalRow = i;
        break;
      }
    }

    if (fractionalRow < 0) {
      // Integer optimum found — compute objective and compare with ineq.value.
      let obj = Fraction.ZERO;
      for (let i = 0; i < A.m; i++) {
        const xi = new Fraction(A.col0![i], A.entries[i][cols[i]]);
        obj = obj.add(new Fraction(cost[cols[i]]).multiply(xi));
      }
      return !obj.is_less(new Fraction(ineq.value));
    }

    // Generate Gomory fractional cut from the fractional row.
    //
    // Row equation: D · x_B + Σ_j a_j · x_j = b  (j over non-basis)
    // Dividing by D: x_B = b/D − Σ (a_j/D) · x_j
    // For x_B integer: Σ frac(a_j/D) · x_j ≥ frac(b/D)
    // Multiplied by D: Σ mod(a_j, D) · x_j − D·s = mod(b, D),  s ≥ 0
    let D = A.entries[fractionalRow][cols[fractionalRow]];
    let bRow = A.col0![fractionalRow];
    const rowCoefs = A.entries[fractionalRow].slice();

    if (D < 0n) {
      D = -D;
      bRow = -bRow;
      for (let j = 0; j < rowCoefs.length; j++)
        rowCoefs[j] = -rowCoefs[j];
    }

    const basisSet = new Set(cols);
    const cutRow: bigint[] = new Array(A.n + 1).fill(0n);
    for (let j = 0; j < A.n; j++) {
      if (!basisSet.has(j))
        cutRow[j] = positiveMod(rowCoefs[j], D);
    }
    cutRow[A.n] = -D;  // Gomory slack variable
    const cutRHS = positiveMod(bRow, D);

    // Add the cut to the system with a new slack column.
    const newWidth = A.n + 1;
    const newEntries: bigint[][] = [];
    for (const row of currentEntries) {
      const newRow: bigint[] = new Array(newWidth).fill(0n);
      for (let j = 0; j < row.length; j++) newRow[j] = row[j];
      newEntries.push(newRow);
    }
    newEntries.push(cutRow);

    currentEntries = newEntries;
    currentCol0 = [...currentCol0, cutRHS];
  }

  throw new Error('Gomory cut iteration limit exceeded');
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
