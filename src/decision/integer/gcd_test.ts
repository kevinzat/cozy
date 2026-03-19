import * as assert from 'assert';
import {divmod, div, mod, gcd, ext_gcd} from './gcd';


describe('gcd', function() {

  it('divmod', function() {
    assert.deepEqual(divmod(0n, 1n), [0n, 0n]);

    assert.deepEqual(divmod(0n, 6n), [0n, 0n]);
    assert.deepEqual(divmod(1n, 6n), [0n, 1n]);
    assert.deepEqual(divmod(2n, 6n), [0n, 2n]);
    assert.deepEqual(divmod(3n, 6n), [0n, 3n]);
    assert.deepEqual(divmod(5n, 6n), [0n, 5n]);
    assert.deepEqual(divmod(6n, 6n), [1n, 0n]);
    assert.deepEqual(divmod(7n, 6n), [1n, 1n]);
    assert.deepEqual(divmod(11n, 6n), [1n, 5n]);
    assert.deepEqual(divmod(12n, 6n), [2n, 0n]);
    assert.deepEqual(divmod(13n, 6n), [2n, 1n]);

    assert.deepEqual(divmod(-1n, 6n), [-1n, 5n]);
    assert.deepEqual(divmod(-2n, 6n), [-1n, 4n]);
    assert.deepEqual(divmod(-3n, 6n), [-1n, 3n]);
    assert.deepEqual(divmod(-5n, 6n), [-1n, 1n]);
    assert.deepEqual(divmod(-6n, 6n), [-1n, 0n]);
    assert.deepEqual(divmod(-7n, 6n), [-2n, 5n]);
    assert.deepEqual(divmod(-11n, 6n), [-2n, 1n]);
    assert.deepEqual(divmod(-12n, 6n), [-2n, 0n]);
    assert.deepEqual(divmod(-13n, 6n), [-3n, 5n]);

    assert.strictEqual(div(13n, 6n), 2n);
    assert.strictEqual(mod(13n, 6n), 1n);
    assert.strictEqual(div(-13n, 6n), -3n);
    assert.strictEqual(mod(-13n, 6n), 5n);
  });

  it('gcd', function() {
    assert.strictEqual(gcd(0n, 0n), 0n);  // just don't crash
    assert.strictEqual(gcd(3n, 0n), 3n);
    assert.strictEqual(gcd(-3n, 0n), 3n);
    assert.strictEqual(gcd(0n, 3n), 3n);
    assert.strictEqual(gcd(0n, -3n), 3n);

    assert.strictEqual(gcd(2n, 1n), 1n);
    assert.strictEqual(gcd(3n, 1n), 1n);
    assert.strictEqual(gcd(1n, 2n), 1n);
    assert.strictEqual(gcd(1n, 3n), 1n);
    assert.strictEqual(gcd(1n, -3n), 1n);

    assert.strictEqual(gcd(6n, 2n), 2n);
    assert.strictEqual(gcd(6n, 3n), 3n);
    assert.strictEqual(gcd(9n, 6n), 3n);
    assert.strictEqual(gcd(12n, 6n), 6n);
    assert.strictEqual(gcd(660n, 126n), 6n);
    assert.strictEqual(gcd(126n, 660n), 6n);
    assert.strictEqual(gcd(1000n, 500n), 500n);
  });

  it('ext_gcd', function() {
    assert.deepEqual(ext_gcd(0n, 0n), [0n, 1n, 0n]);
    assert.deepEqual(ext_gcd(3n, 0n), [3n, 1n, 0n]);
    assert.deepEqual(ext_gcd(-3n, 0n), [3n, -1n, 0n]);
    assert.deepEqual(ext_gcd(0n, 3n), [3n, 0n, 1n]);
    assert.deepEqual(ext_gcd(0n, -3n), [3n, 0n, -1n]);

    assert.deepEqual(ext_gcd(2n, 1n), [1n, 0n, 1n]);
    assert.deepEqual(ext_gcd(3n, 1n), [1n, 0n, 1n]);
    assert.deepEqual(ext_gcd(1n, 2n), [1n, 1n, 0n]);
    assert.deepEqual(ext_gcd(1n, 3n), [1n, 1n, 0n]);
    assert.deepEqual(ext_gcd(1n, -3n), [1n, 1n, 0n]);

    assert.deepEqual(ext_gcd(9n, 6n), [3n, 1n, -1n]);
    assert.deepEqual(ext_gcd(12n, 9n), [3n, 1n, -1n]);
    assert.deepEqual(ext_gcd(1000n, 500n), [500n, 0n, 1n]);
    assert.deepEqual(ext_gcd(35n, 27n), [1n, -10n, 13n]);
    assert.deepEqual(ext_gcd(27n, 35n), [1n, 13n, -10n]);
    assert.deepEqual(ext_gcd(26n, 7n), [1n, 3n, -11n]);

    // Check the special cases where a = +/-b
    assert.deepEqual(ext_gcd(2n, 2n), [2n, 1n, 0n]);
    assert.deepEqual(ext_gcd(2n, -2n), [2n, 1n, 0n]);
    assert.deepEqual(ext_gcd(-2n, 2n), [2n, -1n, 0n]);
    assert.deepEqual(ext_gcd(-2n, -2n), [2n, -1n, 0n]);
  });

});
