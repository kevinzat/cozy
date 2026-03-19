import * as assert from 'assert';
import Tableau from './tableau';
import { FirstProfitable, LimitingRow, Pivot } from './simplex';
import Fraction from './fraction';


function CheckTableau(A: Tableau, B: bigint[][], c: bigint[]): void {
  assert.strictEqual(A.m, B.length);
  assert.strictEqual(A.m, c.length);
  for (let i = 0; i < A.m; i++) {
    assert.strictEqual(A.n, B[i].length);
    for (let j = 0; j < A.n; j++)
      assert.ok(A.entries[i][j] === B[i][j]);
    assert.strictEqual(A.col0![i], c[i]);
  }
}


describe('simplex', function() {

  it('Pivot', function() {
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

  it('LimitingRow', function() {
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

  it('FirstProfitable', function() {
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

});
