
import * as assert from 'assert';
import Fraction from './fraction';


describe('fraction', function() {

  it('equal', function() {
    assert.ok(new Fraction(0n).equals(new Fraction(0n, 3n)));
    assert.ok(new Fraction(2n, 1n).equals(new Fraction(6n, 3n)));
    assert.ok(new Fraction(1n, 2n).equals(new Fraction(3n, 6n)));
    assert.ok(new Fraction(1n, 2n).equals(new Fraction(-1n, -2n)));
  });

  it('is_less', function() {
    assert.strictEqual(new Fraction(0n).is_less(new Fraction(1n)), true);
    assert.strictEqual(new Fraction(1n).is_less(new Fraction(0n)), false);
    assert.strictEqual(new Fraction(1n, 2n).is_less(new Fraction(1n)), true);
    assert.strictEqual(new Fraction(1n).is_less(new Fraction(1n, 2n)), false);
    assert.strictEqual(new Fraction(1n, 3n).is_less(new Fraction(1n, 2n)), true);
    assert.strictEqual(new Fraction(1n, 2n).is_less(new Fraction(1n, 3n)), false);
    assert.strictEqual(new Fraction(-1n, 2n).is_less(new Fraction(1n, 2n)), true);
    assert.strictEqual(new Fraction(1n, 2n).is_less(new Fraction(-1n, 2n)), false);
    assert.strictEqual(new Fraction(1n, 2n).is_less(new Fraction(1n, 2n)), false);
  });

  it('is_less_eq', function() {
    assert.strictEqual(new Fraction(0n).is_less_eq(new Fraction(1n)), true);
    assert.strictEqual(new Fraction(1n).is_less_eq(new Fraction(0n)), false);
    assert.strictEqual(new Fraction(1n, 2n).is_less_eq(new Fraction(1n)), true);
    assert.strictEqual(new Fraction(1n).is_less_eq(new Fraction(1n, 2n)), false);
    assert.strictEqual(new Fraction(1n, 3n).is_less_eq(new Fraction(1n, 2n)), true);
    assert.strictEqual(new Fraction(1n, 2n).is_less_eq(new Fraction(1n, 3n)), false);
    assert.strictEqual(new Fraction(-1n, 2n).is_less(new Fraction(1n, 2n)), true);
    assert.strictEqual(new Fraction(1n, 2n).is_less(new Fraction(-1n, 2n)), false);
    assert.strictEqual(new Fraction(1n, 2n).is_less_eq(new Fraction(1n, 2n)), true);
  });

  it('to_string', function() {
    assert.strictEqual(new Fraction(0n).to_string(), "0");
    assert.strictEqual(new Fraction(1n).to_string(), "1");
    assert.strictEqual(new Fraction(-2n).to_string(), "-2");
    assert.strictEqual(new Fraction(1n, 2n).to_string(), "1/2");
    assert.strictEqual(new Fraction(2n, 4n).to_string(), "1/2");
    assert.strictEqual(new Fraction(1n, -2n).to_string(), "-1/2");
  });

  it('is_integer', function() {
    assert.strictEqual(new Fraction(0n).is_integer(), true);
    assert.strictEqual(new Fraction(1n).is_integer(), true);
    assert.strictEqual(new Fraction(-2n).is_integer(), true);
    assert.strictEqual(new Fraction(1n, 2n).is_integer(), false);
    assert.strictEqual(new Fraction(4n, 2n).is_integer(), true);
    assert.strictEqual(new Fraction(-4n, 2n).is_integer(), true);
  });

  it('to_integer', function() {
    assert.strictEqual(new Fraction(0n).to_integer(), 0n);
    assert.strictEqual(new Fraction(1n).to_integer(), 1n);
    assert.strictEqual(new Fraction(-2n).to_integer(), -2n);
    assert.strictEqual(new Fraction(4n, 2n).to_integer(), 2n);
    assert.strictEqual(new Fraction(-4n, 2n).to_integer(), -2n);
  });

  it('inverse', function() {
    assert.strictEqual(new Fraction(1n).inverse().to_string(), "1");
    assert.strictEqual(new Fraction(-2n).inverse().to_string(), "-1/2");
    assert.strictEqual(new Fraction(1n, 2n).inverse().to_string(), "2");
    assert.strictEqual(new Fraction(2n, 4n).inverse().to_string(), "2");
    assert.strictEqual(new Fraction(1n, -2n).inverse().to_string(), "-2");
  });

  it('add', function() {
    assert.strictEqual(new Fraction(1n).add(new Fraction(2n)).to_string(), "3");
    assert.strictEqual(new Fraction(2n).add(new Fraction(1n)).to_string(), "3");
    assert.strictEqual(new Fraction(1n, 2n).add(new Fraction(1n, 2n)).to_string(), "1");
    assert.strictEqual(new Fraction(1n, 2n).add(new Fraction(1n, 3n)).to_string(), "5/6");
    assert.strictEqual(new Fraction(1n, 2n).add(new Fraction(-1n, 3n)).to_string(), "1/6");
    assert.strictEqual(new Fraction(1n, 3n).add(new Fraction(-1n, 2n)).to_string(), "-1/6");
  });

  it('subtract', function() {
    assert.strictEqual(new Fraction(1n).subtract(new Fraction(2n)).to_string(), "-1");
    assert.strictEqual(new Fraction(2n).subtract(new Fraction(1n)).to_string(), "1");
    assert.strictEqual(new Fraction(1n, 2n).subtract(new Fraction(1n, 2n)).to_string(), "0");
    assert.strictEqual(new Fraction(1n, 2n).subtract(new Fraction(1n, 3n)).to_string(), "1/6");
    assert.strictEqual(new Fraction(1n, 2n).subtract(new Fraction(-1n, 3n)).to_string(), "5/6");
    assert.strictEqual(new Fraction(1n, 3n).subtract(new Fraction(-1n, 2n)).to_string(), "5/6");
  });

  it('multiply', function() {
    assert.strictEqual(new Fraction(2n).multiply(new Fraction(1n)).to_string(), "2");
    assert.strictEqual(new Fraction(2n).multiply(new Fraction(3n)).to_string(), "6");
    assert.strictEqual(new Fraction(-1n).multiply(new Fraction(2n)).to_string(), "-2");
    assert.strictEqual(new Fraction(1n, 2n).multiply(new Fraction(2n)).to_string(), "1");
    assert.strictEqual(new Fraction(1n, 2n).multiply(new Fraction(1n, 3n)).to_string(), "1/6");
    assert.strictEqual(new Fraction(1n, 2n).multiply(new Fraction(2n, 3n)).to_string(), "1/3");
  });

  it('divide', function() {
    assert.strictEqual(new Fraction(2n).divide(new Fraction(1n)).to_string(), "2");
    assert.strictEqual(new Fraction(2n).divide(new Fraction(3n)).to_string(), "2/3");
    assert.strictEqual(new Fraction(-1n).divide(new Fraction(2n)).to_string(), "-1/2");
    assert.strictEqual(new Fraction(1n, 2n).divide(new Fraction(2n)).to_string(), "1/4");
    assert.strictEqual(new Fraction(1n, 2n).divide(new Fraction(1n, 3n)).to_string(), "3/2");
    assert.strictEqual(new Fraction(1n, 2n).divide(new Fraction(2n, 3n)).to_string(), "3/4");
  });

});
