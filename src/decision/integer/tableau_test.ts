import * as assert from 'assert';
import Tableau from './tableau';


describe('tableau', function() {

  it('rowSwap', function() {
    let A = new Tableau([[1, 2, 3], [4, 5, 6]], [7, 8], [9, 10, 11]);
    A.rowSwap(0, 1);
    assert.deepEqual(A.entries, [[4, 5, 6], [1, 2, 3]]);
    assert.deepEqual(A.col0, [8, 7]);
    assert.deepEqual(A.row0, [9, 10, 11]);
  });

  it('colSwap', function() {
    let A = new Tableau([[1, 2, 3], [4, 5, 6]], [7, 8], [9, 10, 11]);
    A.colSwap(1, 2);
    assert.deepEqual(A.entries, [[1, 3, 2], [4, 6, 5]]);
    assert.deepEqual(A.col0, [7, 8]);
    assert.deepEqual(A.row0, [9, 11, 10]);
  });

  it('rowScale', function() {
    let A = new Tableau([[1, 2, 3], [4, 5, 6]], [7, 8], [9, 10, 11]);
    A.rowScale(1, 2);
    assert.deepEqual(A.entries, [[1, 2, 3], [8, 10, 12]]);
    assert.deepEqual(A.col0, [7, 16]);
    assert.deepEqual(A.row0, [9, 10, 11]);
  });

  it('colScale', function() {
    let A = new Tableau([[1, 2, 3], [4, 5, 6]], [7, 8], [9, 10, 11]);
    A.colScale(1, 3);
    assert.deepEqual(A.entries, [[1, 6, 3], [4, 15, 6]]);
    assert.deepEqual(A.col0, [7, 8]);
    assert.deepEqual(A.row0, [9, 30, 11]);
  });

  it('rowAddMultiple', function() {
    let A = new Tableau([[1, 2, 3], [4, 5, 6]], [7, 8], [9, 10, 11]);
    A.rowAddMultiple(1, 0, 2);
    assert.deepEqual(A.entries, [[1, 2, 3], [6, 9, 12]]);
    assert.deepEqual(A.col0, [7, 22]);
    assert.deepEqual(A.row0, [9, 10, 11]);
  });

  it('colAddMultiple', function() {
    let A = new Tableau([[1, 2, 3], [4, 5, 6]], [7, 8], [9, 10, 11]);
    A.colAddMultiple(0, 1, 3);
    assert.deepEqual(A.entries, [[7, 2, 3], [19, 5, 6]]);
    assert.deepEqual(A.col0, [7, 8]);
    assert.deepEqual(A.row0, [39, 10, 11]);
  });

});