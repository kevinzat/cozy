import * as assert from 'assert';
import { PROP_PREDICATE, Predicate } from '../facts/props';
import { ParseProp } from '../facts/props_parser';
import { IsInequalityImplied } from './inequality';


function ParsePred(s: string): Predicate {
  const p = ParseProp(s);
  if (p.variety === PROP_PREDICATE) {
    return p as Predicate;
  } else {
    throw new Error(`expected a predicate, got ${p.variety}`);
  }
}


describe('inequality', function() {

  // -- Equations only (should still work) --

  it('equations imply equation', function() {
    assert.ok(IsInequalityImplied(
        [ParsePred("x + y = 5"), ParsePred("y = 2")],
        ParsePred("x = 3")));
  });

  it('equations do not imply wrong equation', function() {
    assert.ok(!IsInequalityImplied(
        [ParsePred("x + y = 5"), ParsePred("y = 2")],
        ParsePred("x = 4")));
  });

  // -- Equations implying inequalities --

  it('x = 3 implies 3 <= x', function() {
    assert.ok(IsInequalityImplied(
        [ParsePred("x = 3")],
        ParsePred("3 <= x")));
  });

  it('x = 3 implies x <= 3', function() {
    assert.ok(IsInequalityImplied(
        [ParsePred("x = 3")],
        ParsePred("x <= 3")));
  });

  it('x = 3 does not imply 4 <= x', function() {
    assert.ok(!IsInequalityImplied(
        [ParsePred("x = 3")],
        ParsePred("4 <= x")));
  });

  // -- Inequalities implying inequalities --

  it('3 <= x implies 2 <= x', function() {
    assert.ok(IsInequalityImplied(
        [ParsePred("3 <= x")],
        ParsePred("2 <= x")));
  });

  it('3 <= x does not imply 5 <= x', function() {
    assert.ok(!IsInequalityImplied(
        [ParsePred("3 <= x")],
        ParsePred("5 <= x")));
  });

  it('5 <= x + y, 1 <= x - y implies 3 <= x', function() {
    assert.ok(IsInequalityImplied(
        [ParsePred("5 <= x + y"), ParsePred("1 <= x - y")],
        ParsePred("3 <= x")));
  });

  it('5 <= x + y, 1 <= x - y does not imply 4 <= x', function() {
    assert.ok(!IsInequalityImplied(
        [ParsePred("5 <= x + y"), ParsePred("1 <= x - y")],
        ParsePred("4 <= x")));
  });

  // -- Strict inequalities --

  it('2 < x implies 3 <= x', function() {
    assert.ok(IsInequalityImplied(
        [ParsePred("2 < x")],
        ParsePred("3 <= x")));
  });

  it('2 < x does not imply 4 <= x', function() {
    assert.ok(!IsInequalityImplied(
        [ParsePred("2 < x")],
        ParsePred("4 <= x")));
  });

  it('3 <= x does not imply 3 < x', function() {
    assert.ok(!IsInequalityImplied(
        [ParsePred("3 <= x")],
        ParsePred("3 < x")));
  });

  // -- Mixed equations and inequalities --

  it('x + y = 5, 3 <= x implies y <= 2', function() {
    assert.ok(IsInequalityImplied(
        [ParsePred("x + y = 5"), ParsePred("3 <= x")],
        ParsePred("y <= 2")));
  });

  it('x + y = 5, 3 <= x does not imply y <= 1', function() {
    assert.ok(!IsInequalityImplied(
        [ParsePred("x + y = 5"), ParsePred("3 <= x")],
        ParsePred("y <= 1")));
  });

  // -- Contradictory premises (vacuously true) --

  it('5 <= x, x <= 2 vacuously implies anything', function() {
    assert.ok(IsInequalityImplied(
        [ParsePred("5 <= x"), ParsePred("x <= 2")],
        ParsePred("100 <= x")));
  });

  // -- No premises --

  it('no premises does not imply 1 <= x', function() {
    assert.ok(!IsInequalityImplied(
        [],
        ParsePred("1 <= x")));
  });

  // -- Goal is an equality from inequalities --

  it('3 <= x, x <= 3 implies x = 3', function() {
    assert.ok(IsInequalityImplied(
        [ParsePred("3 <= x"), ParsePred("x <= 3")],
        ParsePred("x = 3")));
  });

  it('3 <= x does not imply x = 3', function() {
    assert.ok(!IsInequalityImplied(
        [ParsePred("3 <= x")],
        ParsePred("x = 3")));
  });

});
