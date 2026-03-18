import * as assert from 'assert';
import {divmod, div, mod, gcd, ext_gcd} from './gcd';


describe('gcd', function() {

  it('divmod', function() {
    assert.deepEqual(divmod(0, 1), [0, 0]);

    assert.deepEqual(divmod(0, 6), [0, 0]);
    assert.deepEqual(divmod(1, 6), [0, 1]);
    assert.deepEqual(divmod(2, 6), [0, 2]);
    assert.deepEqual(divmod(3, 6), [0, 3]);
    assert.deepEqual(divmod(5, 6), [0, 5]);
    assert.deepEqual(divmod(6, 6), [1, 0]);
    assert.deepEqual(divmod(7, 6), [1, 1]);
    assert.deepEqual(divmod(11, 6), [1, 5]);
    assert.deepEqual(divmod(12, 6), [2, 0]);
    assert.deepEqual(divmod(13, 6), [2, 1]);

    assert.deepEqual(divmod(-1, 6), [-1, 5]);
    assert.deepEqual(divmod(-2, 6), [-1, 4]);
    assert.deepEqual(divmod(-3, 6), [-1, 3]);
    assert.deepEqual(divmod(-5, 6), [-1, 1]);
    assert.deepEqual(divmod(-6, 6), [-1, 0]);
    assert.deepEqual(divmod(-7, 6), [-2, 5]);
    assert.deepEqual(divmod(-11, 6), [-2, 1]);
    assert.deepEqual(divmod(-12, 6), [-2, 0]);
    assert.deepEqual(divmod(-13, 6), [-3, 5]);

    assert.strictEqual(div(13, 6), 2);
    assert.strictEqual(mod(13, 6), 1);
    assert.strictEqual(div(-13, 6), -3);
    assert.strictEqual(mod(-13, 6), 5);
  });

  it('gcd', function() {
    assert.strictEqual(gcd(0, 0), 0);  // just don't crash
    assert.strictEqual(gcd(3, 0), 3);
    assert.strictEqual(gcd(-3, 0), 3);
    assert.strictEqual(gcd(0, 3), 3);
    assert.strictEqual(gcd(0, -3), 3);

    assert.strictEqual(gcd(2, 1), 1);
    assert.strictEqual(gcd(3, 1), 1);
    assert.strictEqual(gcd(1, 2), 1);
    assert.strictEqual(gcd(1, 3), 1);
    assert.strictEqual(gcd(1, -3), 1);

    assert.strictEqual(gcd(6, 2), 2);
    assert.strictEqual(gcd(6, 3), 3);
    assert.strictEqual(gcd(9, 6), 3);
    assert.strictEqual(gcd(12, 6), 6);
    assert.strictEqual(gcd(660, 126), 6);
    assert.strictEqual(gcd(126, 660), 6);
    assert.strictEqual(gcd(1000, 500), 500);
  });

  it('ext_gcd', function() {
    assert.deepEqual(ext_gcd(0, 0), [0, 1, 0]);
    assert.deepEqual(ext_gcd(3, 0), [3, 1, 0]);
    assert.deepEqual(ext_gcd(-3, 0), [3, -1, 0]);
    assert.deepEqual(ext_gcd(0, 3), [3, 0, 1]);
    assert.deepEqual(ext_gcd(0, -3), [3, 0, -1]);

    assert.deepEqual(ext_gcd(2, 1), [1, 0, 1]);
    assert.deepEqual(ext_gcd(3, 1), [1, 0, 1]);
    assert.deepEqual(ext_gcd(1, 2), [1, 1, 0]);
    assert.deepEqual(ext_gcd(1, 3), [1, 1, 0]);
    assert.deepEqual(ext_gcd(1, -3), [1, 1, 0]);

    assert.deepEqual(ext_gcd(9, 6), [3, 1, -1]);
    assert.deepEqual(ext_gcd(12, 9), [3, 1, -1]);
    assert.deepEqual(ext_gcd(1000, 500), [500, 0, 1]);
    assert.deepEqual(ext_gcd(35, 27), [1, -10, 13]);
    assert.deepEqual(ext_gcd(27, 35), [1, 13, -10]);
    assert.deepEqual(ext_gcd(26, 7), [1, 3, -11]);

    // Check the special cases where a = +/-b
    assert.deepEqual(ext_gcd(2, 2), [2, 1, 0]);
    assert.deepEqual(ext_gcd(2, -2), [2, 1, 0]);
    assert.deepEqual(ext_gcd(-2, 2), [2, -1, 0]);
    assert.deepEqual(ext_gcd(-2, -2), [2, -1, 0]);
  });

});