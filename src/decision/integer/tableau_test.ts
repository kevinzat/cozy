import * as assert from 'assert';
import Tableau from './tableau';


describe('tableau', function() {

  it('rowSwap', function() {
    let A = new Tableau([[1n, 2n, 3n], [4n, 5n, 6n]], [7n, 8n], [9n, 10n, 11n]);
    A.rowSwap(0, 1);
    assert.deepEqual(A.entries, [[4n, 5n, 6n], [1n, 2n, 3n]]);
    assert.deepEqual(A.col0, [8n, 7n]);
    assert.deepEqual(A.row0, [9n, 10n, 11n]);
  });

  it('colSwap', function() {
    let A = new Tableau([[1n, 2n, 3n], [4n, 5n, 6n]], [7n, 8n], [9n, 10n, 11n]);
    A.colSwap(1, 2);
    assert.deepEqual(A.entries, [[1n, 3n, 2n], [4n, 6n, 5n]]);
    assert.deepEqual(A.col0, [7n, 8n]);
    assert.deepEqual(A.row0, [9n, 11n, 10n]);
  });

  it('rowScale', function() {
    let A = new Tableau([[1n, 2n, 3n], [4n, 5n, 6n]], [7n, 8n], [9n, 10n, 11n]);
    A.rowScale(1, 2n);
    assert.deepEqual(A.entries, [[1n, 2n, 3n], [8n, 10n, 12n]]);
    assert.deepEqual(A.col0, [7n, 16n]);
    assert.deepEqual(A.row0, [9n, 10n, 11n]);
  });

  it('colScale', function() {
    let A = new Tableau([[1n, 2n, 3n], [4n, 5n, 6n]], [7n, 8n], [9n, 10n, 11n]);
    A.colScale(1, 3n);
    assert.deepEqual(A.entries, [[1n, 6n, 3n], [4n, 15n, 6n]]);
    assert.deepEqual(A.col0, [7n, 8n]);
    assert.deepEqual(A.row0, [9n, 30n, 11n]);
  });

  it('rowAddMultiple', function() {
    let A = new Tableau([[1n, 2n, 3n], [4n, 5n, 6n]], [7n, 8n], [9n, 10n, 11n]);
    A.rowAddMultiple(1, 0, 2n);
    assert.deepEqual(A.entries, [[1n, 2n, 3n], [6n, 9n, 12n]]);
    assert.deepEqual(A.col0, [7n, 22n]);
    assert.deepEqual(A.row0, [9n, 10n, 11n]);
  });

  it('colAddMultiple', function() {
    let A = new Tableau([[1n, 2n, 3n], [4n, 5n, 6n]], [7n, 8n], [9n, 10n, 11n]);
    A.colAddMultiple(0, 1, 3n);
    assert.deepEqual(A.entries, [[7n, 2n, 3n], [19n, 5n, 6n]]);
    assert.deepEqual(A.col0, [7n, 8n]);
    assert.deepEqual(A.row0, [39n, 10n, 11n]);
  });

});
