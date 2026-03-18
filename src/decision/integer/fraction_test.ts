
import * as assert from 'assert';
import Fraction from './fraction';


describe('fraction', function() {

  it('equal', function() {
    assert.ok(new Fraction(0).equals(new Fraction(0, 3)));
    assert.ok(new Fraction(2, 1).equals(new Fraction(6, 3)));
    assert.ok(new Fraction(1, 2).equals(new Fraction(3, 6)));
    assert.ok(new Fraction(1, 2).equals(new Fraction(-1, -2)));
  });

  it('is_less', function() {
    assert.strictEqual(new Fraction(0).is_less(new Fraction(1)), true);
    assert.strictEqual(new Fraction(1).is_less(new Fraction(0)), false);
    assert.strictEqual(new Fraction(1, 2).is_less(new Fraction(1)), true);
    assert.strictEqual(new Fraction(1).is_less(new Fraction(1, 2)), false);
    assert.strictEqual(new Fraction(1, 3).is_less(new Fraction(1, 2)), true);
    assert.strictEqual(new Fraction(1, 2).is_less(new Fraction(1, 3)), false);
    assert.strictEqual(new Fraction(-1, 2).is_less(new Fraction(1, 2)), true);
    assert.strictEqual(new Fraction(1, 2).is_less(new Fraction(-1, 2)), false);
    assert.strictEqual(new Fraction(1, 2).is_less(new Fraction(1, 2)), false);
  });

  it('is_less_eq', function() {
    assert.strictEqual(new Fraction(0).is_less_eq(new Fraction(1)), true);
    assert.strictEqual(new Fraction(1).is_less_eq(new Fraction(0)), false);
    assert.strictEqual(new Fraction(1, 2).is_less_eq(new Fraction(1)), true);
    assert.strictEqual(new Fraction(1).is_less_eq(new Fraction(1, 2)), false);
    assert.strictEqual(new Fraction(1, 3).is_less_eq(new Fraction(1, 2)), true);
    assert.strictEqual(new Fraction(1, 2).is_less_eq(new Fraction(1, 3)), false);
    assert.strictEqual(new Fraction(-1, 2).is_less(new Fraction(1, 2)), true);
    assert.strictEqual(new Fraction(1, 2).is_less(new Fraction(-1, 2)), false);
    assert.strictEqual(new Fraction(1, 2).is_less_eq(new Fraction(1, 2)), true);
  });

  it('to_string', function() {
    assert.strictEqual(new Fraction(0).to_string(), "0");
    assert.strictEqual(new Fraction(1).to_string(), "1");
    assert.strictEqual(new Fraction(-2).to_string(), "-2");
    assert.strictEqual(new Fraction(1, 2).to_string(), "1/2");
    assert.strictEqual(new Fraction(2, 4).to_string(), "1/2");
    assert.strictEqual(new Fraction(1, -2).to_string(), "-1/2");
  });

  it('is_integer', function() {
    assert.strictEqual(new Fraction(0).is_integer(), true);
    assert.strictEqual(new Fraction(1).is_integer(), true);
    assert.strictEqual(new Fraction(-2).is_integer(), true);
    assert.strictEqual(new Fraction(1, 2).is_integer(), false);
    assert.strictEqual(new Fraction(4, 2).is_integer(), true);
    assert.strictEqual(new Fraction(-4, 2).is_integer(), true);
  });

  it('to_integer', function() {
    assert.strictEqual(new Fraction(0).to_integer(), 0);
    assert.strictEqual(new Fraction(1).to_integer(), 1);
    assert.strictEqual(new Fraction(-2).to_integer(), -2);
    assert.strictEqual(new Fraction(4, 2).to_integer(), 2);
    assert.strictEqual(new Fraction(-4, 2).to_integer(), -2);
  });

  it('inverse', function() {
    assert.strictEqual(new Fraction(1).inverse().to_string(), "1");
    assert.strictEqual(new Fraction(-2).inverse().to_string(), "-1/2");
    assert.strictEqual(new Fraction(1, 2).inverse().to_string(), "2");
    assert.strictEqual(new Fraction(2, 4).inverse().to_string(), "2");
    assert.strictEqual(new Fraction(1, -2).inverse().to_string(), "-2");
  });

  it('add', function() {
    assert.strictEqual(new Fraction(1).add(new Fraction(2)).to_string(), "3");
    assert.strictEqual(new Fraction(2).add(new Fraction(1)).to_string(), "3");
    assert.strictEqual(new Fraction(1, 2).add(new Fraction(1, 2)).to_string(), "1");
    assert.strictEqual(new Fraction(1, 2).add(new Fraction(1, 3)).to_string(), "5/6");
    assert.strictEqual(new Fraction(1, 2).add(new Fraction(-1, 3)).to_string(), "1/6");
    assert.strictEqual(new Fraction(1, 3).add(new Fraction(-1, 2)).to_string(), "-1/6");
  });

  it('subtract', function() {
    assert.strictEqual(new Fraction(1).subtract(new Fraction(2)).to_string(), "-1");
    assert.strictEqual(new Fraction(2).subtract(new Fraction(1)).to_string(), "1");
    assert.strictEqual(new Fraction(1, 2).subtract(new Fraction(1, 2)).to_string(), "0");
    assert.strictEqual(new Fraction(1, 2).subtract(new Fraction(1, 3)).to_string(), "1/6");
    assert.strictEqual(new Fraction(1, 2).subtract(new Fraction(-1, 3)).to_string(), "5/6");
    assert.strictEqual(new Fraction(1, 3).subtract(new Fraction(-1, 2)).to_string(), "5/6");
  });

  it('multiply', function() {
    assert.strictEqual(new Fraction(2).multiply(new Fraction(1)).to_string(), "2");
    assert.strictEqual(new Fraction(2).multiply(new Fraction(3)).to_string(), "6");
    assert.strictEqual(new Fraction(-1).multiply(new Fraction(2)).to_string(), "-2");
    assert.strictEqual(new Fraction(1, 2).multiply(new Fraction(2)).to_string(), "1");
    assert.strictEqual(new Fraction(1, 2).multiply(new Fraction(1, 3)).to_string(), "1/6");
    assert.strictEqual(new Fraction(1, 2).multiply(new Fraction(2, 3)).to_string(), "1/3");
  });

  it('divide', function() {
    assert.strictEqual(new Fraction(2).divide(new Fraction(1)).to_string(), "2");
    assert.strictEqual(new Fraction(2).divide(new Fraction(3)).to_string(), "2/3");
    assert.strictEqual(new Fraction(-1).divide(new Fraction(2)).to_string(), "-1/2");
    assert.strictEqual(new Fraction(1, 2).divide(new Fraction(2)).to_string(), "1/4");
    assert.strictEqual(new Fraction(1, 2).divide(new Fraction(1, 3)).to_string(), "3/2");
    assert.strictEqual(new Fraction(1, 2).divide(new Fraction(2, 3)).to_string(), "3/4");
  });

});