import * as assert from 'assert';
import Tableau from './tableau';
import { FirstProfitable, LimitingRow, Pivot } from './simplex';
import Fraction from './fraction';


function CheckTableau(A: Tableau, B: number[][], c: number[]): void {
  assert.strictEqual(A.m, B.length);
  assert.strictEqual(A.m, c.length);
  for (let i = 0; i < A.m; i++) {
    assert.strictEqual(A.n, B[i].length);
    for (let j = 0; j < A.n; j++)
      assert.ok(Math.abs(A.entries[i][j] - B[i][j]) == 0);
    assert.strictEqual(A.col0![i], c[i]);
  }
}


describe('simplex', function() {

  it('Pivot', function() {
    let A1 = new Tableau(
        [[3, 2, 1, 0, 0],
         [2, -1, 0, 1, 0],
         [-1, 3, 0, 0, 1]],
        [1, 2, 3]);
    Pivot(A1, [2, 3, 4], 0, 0);
    CheckTableau(A1, 
        [[3,  2,  1, -0, 0],
         [0, -7, -2,  3, 0],
         [0, 11,  1,  0, 3]],
        [1, 4, 10]);

    let A2 = new Tableau(
        [[3, 2, 1, 0, 0],
         [2, -1, 0, 1, 0],
         [-1, 3, 0, 0, 1]],
        [1, 2, 3]);
    Pivot(A2, [2, 3, 4], 0, 1);
    CheckTableau(A2,
        [[  3, 2,  1, 0, 0],
         [  7, 0,  1, 2, 0],
         [-11, 0, -3, 0, 2]],
        [1, 5, 3]);
  });

  it('LimitingRow', function() {
    let A = new Tableau(
        [[3, 2, 1, 0, 0],
         [2, -1, 0, 1, 0],
         [-1, 3, 0, 0, 1]],
        [1, 2, 3]);

    const [row1, th1] = LimitingRow(A, 0);
    assert.strictEqual(row1, 0);
    assert.ok(th1.equals(new Fraction(1, 3)));

    const [row2, th2] = LimitingRow(A, 1);
    assert.strictEqual(row2, 0);
    assert.ok(th2.equals(new Fraction(1, 2)));
  });

  it('FirstProfitable', function() {
    let A1 = new Tableau(
        [[3, 2, 1, 0, 0],
         [2, -1, 0, 1, 0],
         [-1, 3, 0, 0, 1]],
        [1, 2, 3]);
    const c = [1, 1, 1, 1, 1];
    assert.strictEqual(FirstProfitable(A1, c, [2, 3, 4]), 0);

    let A2 = new Tableau(
        [[1, 0, 0, 3, 2],
         [0, 1, 0, 2, -1],
         [0, 0, 1, -1, 3]],
        [1, 2, 3]);
    const col = FirstProfitable(A2, c, [0, 1, 2]);
    assert.strictEqual(col, 3);
  });

});