import * as assert from 'assert';
import Tableau from './tableau';
import { SmithNormalForm, IsImplied } from './smith';


describe('smith', function() {

  it('SmithNormalForm', function() {
    let A = new Tableau([[2, 4, 4],
                         [-6, 6, 12],
                         [10, -4, -16]]);
    let [_, indexes] = SmithNormalForm(A);
    assert.deepEqual(A.entries, [[2, 0, 0],
                                 [0, 6, 0],
                                 [0, 0, 12]]);
    assert.deepEqual(indexes, [0, 1, 2]);

    A = new Tableau([[2, 4, 4],
                     [-6, 6, 12],
                     [10, 4, 16]]);
    [_, indexes] = SmithNormalForm(A);
    assert.deepEqual(A.entries, [[2, 0, 0],
                                 [0, 4, 0],
                                 [0, 0, -78]]);
    assert.deepEqual(indexes, [0, 2, 1]);

    A = new Tableau([[1, 0, -1],
                     [4, 3, -1],
                     [0, 9, 3],
                     [3, 12, 3]]);
    [_, indexes] = SmithNormalForm(A);
    assert.deepEqual(A.entries, [[1, 0, 0],
                                 [0, 3, 0],
                                 [0, 0, 6],
                                 [0, 0, 0]]);
    assert.deepEqual(indexes, [0, 1, 2]);
  });

  it('IsImplied', function() {
    assert.strictEqual(IsImplied([
          {coefs: [1, 0, 1], value: 3},
          {coefs: [0, 1, 1], value: 5}
        ],
        {coefs: [1, 2, 3], value: 13}), true);

    // Example from HW:
    //   x + y = 2a
    //   y + z = 2b
    //   => x + z = 2(a+b−y)
    // Variables in order [a, b, x, y, z]
    assert.strictEqual(IsImplied([
          {coefs: [-2,  0, 1, 1, 0], value: 0},
          {coefs: [ 0, -2, 0, 1, 1], value: 0}
        ],
        {coefs: [-2, -2, 1, 2, 1], value: 0}), true);

    // Example from Lecture:
    //   a − b = sm
    //   c − d = tm
    //   => (a + c) − (b + d) = (s + t)m
    // Variables in order [a, b, c, d, sm, tm]
    assert.strictEqual(IsImplied([
          {coefs: [1, -1, 0, 0, -1, 0], value: 0},
          {coefs: [0, 0, 1, -1, 0, -1], value: 0}
        ],
        {coefs: [1, -1, 1, -1, -1, -1], value: 0}), true);

    // Example from Lecture:
    //   a − b = qm
    //   a = (a div m)m + (a mod m)
    //   => b = ((a div m) − q)m + (a mod m)
    // Variables in order [a, b, qm, (a div m)m, a mod m]
    assert.strictEqual(IsImplied([
          {coefs: [1, -1, -1, 0, 0], value: 0},
          {coefs: [1, 0, 0, -1, -1], value: 0}
        ],
        {coefs: [0, 1, 1, -1, -1], value: 0}), true);

    // Example from Lecture:
    //   a mod m = b mod m
    //   a = (a div m)m + (a mod m)
    //   b = (b div m)m + (b mod m)
    //   => a − b = ((a div m) − (b div m))m
    // Variables in order [a, (a div m)m, a mod m, b, (b div m)m, b mod m]
    assert.strictEqual(IsImplied([
          {coefs: [0, 0, 1, 0, 0, -1], value: 0},
          {coefs: [1, -1, -1, 0, 0, 0], value: 0},
          {coefs: [0, 0, 0, 1, -1, -1], value: 0}
        ],
        {coefs: [1, -1, 0, -1, 1, 0], value: 0}), true);

    // Example from Lecture:
    //   n^2 = 4(q^2+qr)+r^2
    //   r^2 = 1
    //   => n^2 − 1 = (q^2 + qr)4
    // Variables in order [n^2, q^2, r^2, qr]
    assert.strictEqual(IsImplied([
          {coefs: [1, -4, -1, -4], value: 0},
          {coefs: [0, 0, 1, 0], value: 1}
        ],
        {coefs: [1, -4, 0, -4], value: 1}), true);
  });

});