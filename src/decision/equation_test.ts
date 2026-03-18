import * as assert from 'assert';
import { IsEquation, PROP_PREDICATE, Predicate } from '../facts/props';
import { ParseProp } from '../facts/props_parser';
import { IsEquationImplied } from './equation';


// Parses an equation as a string.
function ParseEq(s: string): Predicate {
  const p = ParseProp(s);
  if (p.variety === PROP_PREDICATE) {
    return p as Predicate;
  } else {
    throw new Error(`expected a predicate, got ${p.variety}`);
  }
}


describe('equation', function() {

  // TODO: add a lot more tests...

  it('implied', function() {
    assert.ok(IsEquationImplied(
        [ ParseEq("x + y^2 = 3"), ParseEq("y^2 + z + 5 = 0")],
        ParseEq("x - z = 8")));

    assert.ok(IsEquationImplied(
        [ ParseEq("(1+y)*x + y*(y - x) = 3"), ParseEq("y^2 + z + 5 = 0") ],
        ParseEq("x - z = 8")));
  });

});
