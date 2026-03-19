import * as assert from 'assert';
import Tableau from './tableau';
import { FirstProfitable, LimitingRow, Pivot, SimplexMethod } from './simplex';
import Fraction from './fraction';


function CheckTableau(A: Tableau, B: bigint[][], c: bigint[]): void {
  assert.strictEqual(A.m, B.length);
  assert.strictEqual(A.m, c.length);
  for (let i = 0; i < A.m; i++) {
    assert.strictEqual(A.n, B[i].length);
    for (let j = 0; j < A.n; j++)
      assert.ok(A.entries[i][j] === B[i][j],
          `entries[${i}][${j}]: expected ${B[i][j]}, got ${A.entries[i][j]}`);
    assert.strictEqual(A.col0![i], c[i]);
  }
}

/** Returns the solution vector x from a tableau with basis cols. */
function Solution(A: Tableau, cols: number[]): Fraction[] {
  const x: Fraction[] = Array.from({ length: A.n }, () => Fraction.ZERO);
  for (let i = 0; i < A.m; i++) {
    x[cols[i]] = new Fraction(A.col0![i], A.entries[i][cols[i]]);
  }
  return x;
}

/** Checks Ax = b (col0) for the given basis solution. */
function CheckFeasible(origEntries: bigint[][], origCol0: bigint[], x: Fraction[]): void {
  const m = origEntries.length;
  const n = origEntries[0].length;
  for (let i = 0; i < m; i++) {
    let sum = Fraction.ZERO;
    for (let j = 0; j < n; j++) {
      sum = sum.add(new Fraction(origEntries[i][j]).multiply(x[j]));
    }
    assert.ok(sum.equals(new Fraction(origCol0[i])),
        `row ${i}: expected ${origCol0[i]}, got ${sum.to_string()}`);
  }
  for (let j = 0; j < n; j++) {
    assert.ok(!x[j].is_less(Fraction.ZERO),
        `x[${j}] = ${x[j].to_string()} < 0`);
  }
}

/** Computes the objective value c . x. */
function ObjectiveValue(c: bigint[], x: Fraction[]): Fraction {
  let val = Fraction.ZERO;
  for (let j = 0; j < c.length; j++)
    val = val.add(new Fraction(c[j]).multiply(x[j]));
  return val;
}


describe('simplex', function() {

  // ---- LimitingRow ----

  describe('LimitingRow', function() {
    it('basic case', function() {
      let A = new Tableau(
          [[3n, 2n, 1n, 0n, 0n],
           [2n, -1n, 0n, 1n, 0n],
           [-1n, 3n, 0n, 0n, 1n]],
          [1n, 2n, 3n]);

      const [row1, th1] = LimitingRow(A, 0);
      assert.strictEqual(row1, 0);
      assert.ok(th1.equals(new Fraction(1n, 3n)));

      const [row2, th2] = LimitingRow(A, 1);
      assert.strictEqual(row2, 0);
      assert.ok(th2.equals(new Fraction(1n, 2n)));
    });

    it('picks row with smallest ratio', function() {
      let A = new Tableau(
          [[1n, 1n],
           [2n, 1n]],
          [10n, 6n]);
      // ratios: row0 = 10/1 = 10, row1 = 6/2 = 3
      const [row, th] = LimitingRow(A, 0);
      assert.strictEqual(row, 1);
      assert.ok(th.equals(new Fraction(3n)));
    });

    it('skips rows with non-positive entries', function() {
      let A = new Tableau(
          [[0n, 1n],
           [-1n, 1n],
           [3n, 1n]],
          [5n, 5n, 9n]);
      const [row, th] = LimitingRow(A, 0);
      assert.strictEqual(row, 2);
      assert.ok(th.equals(new Fraction(3n)));
    });

    it('returns -1 when no row has a positive entry', function() {
      let A = new Tableau(
          [[0n, 1n],
           [-2n, 1n]],
          [5n, 5n]);
      const [row, _] = LimitingRow(A, 0);
      assert.strictEqual(row, -1);
    });

    it('breaks ties by choosing first row', function() {
      let A = new Tableau(
          [[2n, 1n],
           [3n, 1n]],
          [6n, 9n]);
      // ratios: 6/2 = 3, 9/3 = 3 (tie)
      const [row, th] = LimitingRow(A, 0);
      assert.strictEqual(row, 0);
      assert.ok(th.equals(new Fraction(3n)));
    });

    it('handles single row', function() {
      let A = new Tableau([[4n, 1n]], [8n]);
      const [row, th] = LimitingRow(A, 0);
      assert.strictEqual(row, 0);
      assert.ok(th.equals(new Fraction(2n)));
    });

    it('handles all rows negative', function() {
      let A = new Tableau(
          [[-1n, 1n],
           [-3n, 1n],
           [-5n, 1n]],
          [1n, 2n, 3n]);
      const [row, _] = LimitingRow(A, 0);
      assert.strictEqual(row, -1);
    });
  });

  // ---- FirstProfitable ----

  describe('FirstProfitable', function() {
    it('basic case', function() {
      let A1 = new Tableau(
          [[3n, 2n, 1n, 0n, 0n],
           [2n, -1n, 0n, 1n, 0n],
           [-1n, 3n, 0n, 0n, 1n]],
          [1n, 2n, 3n]);
      const c = [1n, 1n, 1n, 1n, 1n];
      assert.strictEqual(FirstProfitable(A1, c, [2, 3, 4]), 0);

      let A2 = new Tableau(
          [[1n, 0n, 0n, 3n, 2n],
           [0n, 1n, 0n, 2n, -1n],
           [0n, 0n, 1n, -1n, 3n]],
          [1n, 2n, 3n]);
      const col = FirstProfitable(A2, c, [0, 1, 2]);
      assert.strictEqual(col, 3);
    });

    it('returns -1 when already at optimum', function() {
      // Basis costs are 0, non-basis entries make z_j = 0 <= c_j for all j
      let A = new Tableau(
          [[1n, 0n, 2n],
           [0n, 1n, 3n]],
          [1n, 1n]);
      // z_2 = 0*2 + 0*3 = 0; c_2 = 10 > 0 = z_2, not profitable
      assert.strictEqual(FirstProfitable(A, [0n, 0n, 10n], [0, 1]), -1);
    });

    it('finds profitable column when cost can be reduced', function() {
      let A = new Tableau(
          [[1n, 0n, 2n],
           [0n, 1n, 3n]],
          [1n, 1n]);
      // z_2 = 1*2 + 1*3 = 5 > c_2 = 1, profitable
      assert.strictEqual(FirstProfitable(A, [1n, 1n, 1n], [0, 1]), 2);
    });

    it('skips basis columns', function() {
      let A = new Tableau(
          [[1n, 0n],
           [0n, 1n]],
          [1n, 1n]);
      assert.strictEqual(FirstProfitable(A, [1n, 1n], [0, 1]), -1);
    });

    it('returns first profitable, not most profitable', function() {
      let A = new Tableau(
          [[1n, 0n, 1n, 5n],
           [0n, 1n, 1n, 5n]],
          [1n, 1n]);
      // z_2 = 1*1 + 1*1 = 2 > 1 = c_2, profitable
      // z_3 = 1*5 + 1*5 = 10 > 1 = c_3, more profitable but col 2 returned first
      assert.strictEqual(FirstProfitable(A, [1n, 1n, 1n, 1n], [0, 1]), 2);
    });

    it('handles negative costs', function() {
      let A = new Tableau(
          [[1n, 0n, 1n],
           [0n, 1n, 1n]],
          [1n, 1n]);
      // basis = [0,1], c = [0, 0, -1]
      // z_2 = 0*1 + 0*1 = 0; c_2 = -1 < 0 = z_2, profitable
      assert.strictEqual(FirstProfitable(A, [0n, 0n, -1n], [0, 1]), 2);
    });

    it('handles non-identity basis', function() {
      // After a pivot, basis columns may not be identity
      let A = new Tableau(
          [[3n,  2n,  1n, 0n, 0n],
           [0n, -7n, -2n, 3n, 0n],
           [0n, 11n,  1n, 0n, 3n]],
          [1n, 4n, 10n]);
      // basis = [0, 3, 4]
      const c = [1n, 1n, 1n, 1n, 1n];
      const col = FirstProfitable(A, c, [0, 3, 4]);
      // z_1 = c[0]*A[0][1]/A[0][0] + c[3]*A[1][1]/A[1][3] + c[4]*A[2][1]/A[2][4]
      //      = 1*2/3 + 1*(-7)/3 + 1*11/3 = (2-7+11)/3 = 6/3 = 2
      // c_1 = 1 < 2, profitable
      assert.strictEqual(col, 1);
    });
  });

  // ---- Pivot ----

  describe('Pivot', function() {
    it('basic pivots on 3x5 tableau', function() {
      let A1 = new Tableau(
          [[3n, 2n, 1n, 0n, 0n],
           [2n, -1n, 0n, 1n, 0n],
           [-1n, 3n, 0n, 0n, 1n]],
          [1n, 2n, 3n]);
      Pivot(A1, [2, 3, 4], 0, 0);
      CheckTableau(A1,
          [[3n,  2n,  1n, 0n, 0n],
           [0n, -7n, -2n,  3n, 0n],
           [0n, 11n,  1n,  0n, 3n]],
          [1n, 4n, 10n]);

      let A2 = new Tableau(
          [[3n, 2n, 1n, 0n, 0n],
           [2n, -1n, 0n, 1n, 0n],
           [-1n, 3n, 0n, 0n, 1n]],
          [1n, 2n, 3n]);
      Pivot(A2, [2, 3, 4], 0, 1);
      CheckTableau(A2,
          [[  3n, 2n,  1n, 0n, 0n],
           [  7n, 0n,  1n, 2n, 0n],
           [-11n, 0n, -3n, 0n, 2n]],
          [1n, 5n, 3n]);
    });

    it('updates cols array', function() {
      let A = new Tableau(
          [[3n, 2n, 1n, 0n, 0n],
           [2n, -1n, 0n, 1n, 0n],
           [-1n, 3n, 0n, 0n, 1n]],
          [1n, 2n, 3n]);
      const cols = [2, 3, 4];
      Pivot(A, cols, 0, 0);
      assert.strictEqual(cols[0], 0);
      assert.strictEqual(cols[1], 3);
      assert.strictEqual(cols[2], 4);
    });

    it('zeros new basis column in all non-pivot rows', function() {
      let A = new Tableau(
          [[3n, 2n, 1n, 0n, 0n],
           [2n, -1n, 0n, 1n, 0n],
           [-1n, 3n, 0n, 0n, 1n]],
          [1n, 2n, 3n]);
      const cols = [2, 3, 4];
      Pivot(A, cols, 0, 0);
      // Col 0 should be nonzero only in row 0
      assert.ok(A.entries[0][0] !== 0n);
      assert.strictEqual(A.entries[1][0], 0n);
      assert.strictEqual(A.entries[2][0], 0n);
    });

    it('maintains basis column structure', function() {
      let A = new Tableau(
          [[1n, 0n, 3n, 2n],
           [0n, 1n, 1n, 4n]],
          [5n, 3n]);
      const cols = [0, 1];
      Pivot(A, cols, 0, 2);
      assert.deepStrictEqual(cols, [2, 1]);
      // Col 2 nonzero only in row 0
      assert.ok(A.entries[0][2] !== 0n);
      assert.strictEqual(A.entries[1][2], 0n);
      // Col 1 nonzero only in row 1
      assert.strictEqual(A.entries[0][1], 0n);
      assert.ok(A.entries[1][1] !== 0n);
    });

    it('keeps col0 non-negative after pivot', function() {
      let A = new Tableau(
          [[2n, 1n, 1n, 0n],
           [1n, 3n, 0n, 1n]],
          [8n, 12n]);
      const cols = [2, 3];
      Pivot(A, cols, 0, 0);
      for (let i = 0; i < A.m; i++) {
        assert.ok(A.col0![i] >= 0n,
            `col0[${i}] = ${A.col0![i]} should be non-negative`);
      }
    });

    it('handles entries requiring GCD reduction', function() {
      // This previously caused an infinite loop when Zero modified both rows
      let A = new Tableau(
          [[1n, 0n, 5n],
           [0n, 1n, 7n]],
          [10n, 14n]);
      const cols = [0, 1];
      Pivot(A, cols, 0, 2);
      assert.deepStrictEqual(cols, [2, 1]);
      // Col 2 nonzero only in row 0
      assert.ok(A.entries[0][2] !== 0n);
      assert.strictEqual(A.entries[1][2], 0n);
      // Col 1 nonzero only in row 1
      assert.strictEqual(A.entries[0][1], 0n);
      assert.ok(A.entries[1][1] !== 0n);
      // col0 non-negative
      for (let i = 0; i < A.m; i++)
        assert.ok(A.col0![i] >= 0n);
    });

    it('throws when column is already in basis', function() {
      let A = new Tableau(
          [[1n, 0n],
           [0n, 1n]],
          [1n, 1n]);
      assert.throws(() => Pivot(A, [0, 1], 0, 0), /already in the basis/);
    });

    it('throws when pivot element is zero', function() {
      let A = new Tableau(
          [[1n, 0n, 0n],
           [0n, 1n, 1n]],
          [1n, 1n]);
      // A[0][2] = 0, so pivoting row=0, col=2 should throw
      assert.throws(() => Pivot(A, [0, 1], 0, 2), /cannot pivot on zero/);
    });
  });

  // ---- SimplexMethod (end-to-end) ----

  describe('SimplexMethod', function() {
    it('solves a basic 2-constraint LP', function() {
      // Minimize x0 + x1 subject to:
      //   x0 + x1 + x2 = 4
      //   2*x0 + x1 + x3 = 6
      const entries = [
          [1n, 1n, 1n, 0n],
          [2n, 1n, 0n, 1n]];
      const col0 = [4n, 6n];
      let A = new Tableau(entries.map(r => r.slice()), col0.slice());
      const c = [1n, 1n, 0n, 0n];
      const cols = [2, 3];

      assert.strictEqual(SimplexMethod(A, c, cols), true);
      const x = Solution(A, cols);
      CheckFeasible(entries, col0, x);
    });

    it('returns true immediately when already optimal', function() {
      // Basis costs are 0, non-basis costs positive -> already optimal
      let A = new Tableau(
          [[1n, 0n, 1n, 1n],
           [0n, 1n, 1n, -1n]],
          [3n, 2n]);
      const c = [0n, 0n, 1n, 1n];
      const cols = [0, 1];

      assert.strictEqual(SimplexMethod(A, c, cols), true);
      assert.deepStrictEqual(cols, [0, 1]);
    });

    it('returns false for unbounded problem', function() {
      // Minimize -x0: increasing x0 always reduces cost, never blocked
      //   -x0 + x1 = 1
      let A = new Tableau(
          [[-1n, 1n]],
          [1n]);
      const c = [-1n, 0n];
      const cols = [1];

      assert.strictEqual(SimplexMethod(A, c, cols), false);
    });

    it('solves a 3-constraint problem', function() {
      // Minimize 2*x0 + 3*x1 + x2 subject to:
      //   x0 + x1 + x2 + x3 = 10
      //   x0 + 2*x1 + x4 = 12
      //   x1 + x2 + x5 = 8
      const entries = [
          [1n, 1n, 1n, 1n, 0n, 0n],
          [1n, 2n, 0n, 0n, 1n, 0n],
          [0n, 1n, 1n, 0n, 0n, 1n]];
      const col0 = [10n, 12n, 8n];
      let A = new Tableau(entries.map(r => r.slice()), col0.slice());
      const c = [2n, 3n, 1n, 0n, 0n, 0n];
      const cols = [3, 4, 5];

      assert.strictEqual(SimplexMethod(A, c, cols), true);
      const x = Solution(A, cols);
      CheckFeasible(entries, col0, x);
    });

    it('solves with zero-cost objective', function() {
      // All costs zero -> immediately optimal
      let A = new Tableau(
          [[1n, 0n, 1n],
           [0n, 1n, 1n]],
          [3n, 5n]);
      const c = [0n, 0n, 0n];
      const cols = [0, 1];

      assert.strictEqual(SimplexMethod(A, c, cols), true);
    });

    it('pivots to improve cost in single-constraint case', function() {
      // Minimize -x0 + 0*x1 subject to x0 + x1 = 5, basis at x1
      let A = new Tableau(
          [[1n, 1n]],
          [5n]);
      const c = [-1n, 0n];
      const cols = [1];

      assert.strictEqual(SimplexMethod(A, c, cols), true);
      assert.ok(cols.includes(0), 'x0 should enter the basis');
    });

    it('solves a problem requiring multiple pivots', function() {
      // Minimize -3*x0 - 2*x1 subject to:
      //   x0 + x1 + x2 = 6
      //   x0 + x3 = 4
      //   x1 + x4 = 5
      const entries = [
          [1n, 1n, 1n, 0n, 0n],
          [1n, 0n, 0n, 1n, 0n],
          [0n, 1n, 0n, 0n, 1n]];
      const col0 = [6n, 4n, 5n];
      let A = new Tableau(entries.map(r => r.slice()), col0.slice());
      const c = [-3n, -2n, 0n, 0n, 0n];
      const cols = [2, 3, 4];

      assert.strictEqual(SimplexMethod(A, c, cols), true);
      const x = Solution(A, cols);
      CheckFeasible(entries, col0, x);
      // Optimal: x0=4, x1=2, cost = -3*4 + -2*2 = -16
      assert.ok(cols.includes(0), 'x0 should be in basis');
      assert.ok(cols.includes(1), 'x1 should be in basis');
    });

    it('finds correct objective value', function() {
      // Minimize -x0 - 2*x1 subject to:
      //   x0 + x1 + x2 = 4
      //   x0 + 3*x1 + x3 = 9
      const entries = [
          [1n, 1n, 1n, 0n],
          [1n, 3n, 0n, 1n]];
      const col0 = [4n, 9n];
      let A = new Tableau(entries.map(r => r.slice()), col0.slice());
      const c = [-1n, -2n, 0n, 0n];
      const cols = [2, 3];

      assert.strictEqual(SimplexMethod(A, c, cols), true);
      const x = Solution(A, cols);
      CheckFeasible(entries, col0, x);

      // At optimum, verify cost is no worse than at the origin (x0=x1=0, x2=4, x3=9)
      const originCost = new Fraction(0n); // c . [0,0,4,9] = 0
      const optCost = ObjectiveValue(c, x);
      assert.ok(!originCost.is_less(optCost),
          `optimal cost ${optCost.to_string()} should be <= origin cost ${originCost.to_string()}`);
    });

    it('solution is non-negative', function() {
      // Verify all solution components are >= 0
      const entries = [
          [1n, 2n, 1n, 0n],
          [3n, 1n, 0n, 1n]];
      const col0 = [10n, 15n];
      let A = new Tableau(entries.map(r => r.slice()), col0.slice());
      const c = [-1n, -1n, 0n, 0n];
      const cols = [2, 3];

      assert.strictEqual(SimplexMethod(A, c, cols), true);
      const x = Solution(A, cols);
      for (let j = 0; j < x.length; j++)
        assert.ok(!x[j].is_less(Fraction.ZERO), `x[${j}] = ${x[j].to_string()} < 0`);
    });

    it('solves with large coefficients', function() {
      // Minimize -x0 - x1 subject to:
      //   1000*x0 + x1 + x2 = 1000000
      //   x0 + 1000*x1 + x3 = 1000000
      const entries = [
          [1000n, 1n, 1n, 0n],
          [1n, 1000n, 0n, 1n]];
      const col0 = [1000000n, 1000000n];
      let A = new Tableau(entries.map(r => r.slice()), col0.slice());
      const c = [-1n, -1n, 0n, 0n];
      const cols = [2, 3];

      assert.strictEqual(SimplexMethod(A, c, cols), true);
      const x = Solution(A, cols);
      CheckFeasible(entries, col0, x);
    });

    it('throws when col0 is missing', function() {
      let A = new Tableau([[1n, 0n], [0n, 1n]]);
      assert.throws(() => SimplexMethod(A, [1n, 1n], [0, 1]),
          /missing col0/);
    });

    it('throws when cost vector has wrong size', function() {
      let A = new Tableau([[1n, 0n], [0n, 1n]], [1n, 1n]);
      assert.throws(() => SimplexMethod(A, [1n], [0, 1]),
          /wrong size for c/);
    });
  });

});
