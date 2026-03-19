import * as assert from 'assert';
import Tableau from './tableau';
import { SmithNormalForm, IsImplied } from './smith';


describe('smith', function() {

  it('SmithNormalForm', function() {
    let A = new Tableau([[2n, 4n, 4n],
                         [-6n, 6n, 12n],
                         [10n, -4n, -16n]]);
    let [_, indexes] = SmithNormalForm(A);
    assert.deepEqual(A.entries, [[2n, 0n, 0n],
                                 [0n, 6n, 0n],
                                 [0n, 0n, 12n]]);
    assert.deepEqual(indexes, [0, 1, 2]);

    A = new Tableau([[2n, 4n, 4n],
                     [-6n, 6n, 12n],
                     [10n, 4n, 16n]]);
    [_, indexes] = SmithNormalForm(A);
    assert.deepEqual(A.entries, [[2n, 0n, 0n],
                                 [0n, 4n, 0n],
                                 [0n, 0n, -78n]]);
    assert.deepEqual(indexes, [0, 2, 1]);

    A = new Tableau([[1n, 0n, -1n],
                     [4n, 3n, -1n],
                     [0n, 9n, 3n],
                     [3n, 12n, 3n]]);
    [_, indexes] = SmithNormalForm(A);
    assert.deepEqual(A.entries, [[1n, 0n, 0n],
                                 [0n, 3n, 0n],
                                 [0n, 0n, 6n],
                                 [0n, 0n, 0n]]);
    assert.deepEqual(indexes, [0, 1, 2]);
  });

  it('IsImplied', function() {
    assert.strictEqual(IsImplied([
          {coefs: [1n, 0n, 1n], value: 3n},
          {coefs: [0n, 1n, 1n], value: 5n}
        ],
        {coefs: [1n, 2n, 3n], value: 13n}), true);

    // Example from HW:
    //   x + y = 2a
    //   y + z = 2b
    //   => x + z = 2(a+b−y)
    // Variables in order [a, b, x, y, z]
    assert.strictEqual(IsImplied([
          {coefs: [-2n,  0n, 1n, 1n, 0n], value: 0n},
          {coefs: [ 0n, -2n, 0n, 1n, 1n], value: 0n}
        ],
        {coefs: [-2n, -2n, 1n, 2n, 1n], value: 0n}), true);

    // Example from Lecture:
    //   a − b = sm
    //   c − d = tm
    //   => (a + c) − (b + d) = (s + t)m
    // Variables in order [a, b, c, d, sm, tm]
    assert.strictEqual(IsImplied([
          {coefs: [1n, -1n, 0n, 0n, -1n, 0n], value: 0n},
          {coefs: [0n, 0n, 1n, -1n, 0n, -1n], value: 0n}
        ],
        {coefs: [1n, -1n, 1n, -1n, -1n, -1n], value: 0n}), true);

    // Example from Lecture:
    //   a − b = qm
    //   a = (a div m)m + (a mod m)
    //   => b = ((a div m) − q)m + (a mod m)
    // Variables in order [a, b, qm, (a div m)m, a mod m]
    assert.strictEqual(IsImplied([
          {coefs: [1n, -1n, -1n, 0n, 0n], value: 0n},
          {coefs: [1n, 0n, 0n, -1n, -1n], value: 0n}
        ],
        {coefs: [0n, 1n, 1n, -1n, -1n], value: 0n}), true);

    // Example from Lecture:
    //   a mod m = b mod m
    //   a = (a div m)m + (a mod m)
    //   b = (b div m)m + (b mod m)
    //   => a − b = ((a div m) − (b div m))m
    // Variables in order [a, (a div m)m, a mod m, b, (b div m)m, b mod m]
    assert.strictEqual(IsImplied([
          {coefs: [0n, 0n, 1n, 0n, 0n, -1n], value: 0n},
          {coefs: [1n, -1n, -1n, 0n, 0n, 0n], value: 0n},
          {coefs: [0n, 0n, 0n, 1n, -1n, -1n], value: 0n}
        ],
        {coefs: [1n, -1n, 0n, -1n, 1n, 0n], value: 0n}), true);

    // Example from Lecture:
    //   n^2 = 4(q^2+qr)+r^2
    //   r^2 = 1
    //   => n^2 − 1 = (q^2 + qr)4
    // Variables in order [n^2, q^2, r^2, qr]
    assert.strictEqual(IsImplied([
          {coefs: [1n, -4n, -1n, -4n], value: 0n},
          {coefs: [0n, 0n, 1n, 0n], value: 1n}
        ],
        {coefs: [1n, -4n, 0n, -4n], value: 1n}), true);
  });

});
