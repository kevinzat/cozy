import { Predicate, PRED_EQUAL, PRED_LESS_THAN, PRED_LESS_EQUAL } from "../facts/props";
import { Expression } from '../facts/exprs';
import { LinearEquation } from './integer/smith';
import { LinearInequality, IsImplied } from './integer/simplex';
import { _AddIndexes, _MakeEquation, _GetTerms } from './equation';


/**
 * Determines whether the goal equation or inequality is implied by the given
 * equations and inequalities. Each predicate must be an equation (=), less-than
 * (<), or less-or-equal (<=).
 */
export function IsInequalityImplied(
    premises: Predicate[], goal: Predicate): boolean {

  // Normalize both sides of all predicates to put each in sum-of-products form.
  const premSides = premises.map(
      (p) => [p.args[0].normalize(), p.args[1].normalize()]);
  const goalSides = [goal.args[0].normalize(), goal.args[1].normalize()];

  // Index all of the terms appearing in any predicate.
  const indexes: Map<string, number> = new Map();
  for (const sides of premSides) {
    _AddIndexes(sides[0], indexes);
    _AddIndexes(sides[1], indexes);
  }
  _AddIndexes(goalSides[0], indexes);
  _AddIndexes(goalSides[1], indexes);

  // Split premises into equations and inequalities.
  const eqs: LinearEquation[] = [];
  const ineqs: LinearInequality[] = [];
  for (let i = 0; i < premises.length; i++) {
    const name = premises[i].name;
    const left = premSides[i][0];
    const right = premSides[i][1];

    if (name === PRED_EQUAL) {
      eqs.push(_MakeEquation(left, right, indexes));
    } else if (name === PRED_LESS_EQUAL) {
      // left <= right  =>  right - left >= 0
      ineqs.push(_MakeInequality(left, right, indexes, 0n));
    } else if (name === PRED_LESS_THAN) {
      // left < right  =>  right - left >= 1
      ineqs.push(_MakeInequality(left, right, indexes, 1n));
    } else {
      throw new Error(`unsupported predicate: ${name}`);
    }
  }

  // Build the goal.
  if (goal.name === PRED_EQUAL) {
    // a = b  iff  a >= b and b >= a.
    const fwd = _MakeInequality(goalSides[1], goalSides[0], indexes, 0n);
    const bwd = _MakeInequality(goalSides[0], goalSides[1], indexes, 0n);
    return IsImplied(eqs, ineqs, fwd) && IsImplied(eqs, ineqs, bwd);
  } else if (goal.name === PRED_LESS_EQUAL) {
    return IsImplied(eqs, ineqs, _MakeInequality(goalSides[0], goalSides[1], indexes, 0n));
  } else if (goal.name === PRED_LESS_THAN) {
    return IsImplied(eqs, ineqs, _MakeInequality(goalSides[0], goalSides[1], indexes, 1n));
  } else {
    throw new Error(`unsupported goal predicate: ${goal.name}`);
  }
}


/**
 * Returns a LinearInequality for (right - left >= minDiff).
 *
 * For left <= right, pass minDiff = 0 (right - left >= 0).
 * For left < right, pass minDiff = 1 (right - left >= 1).
 */
function _MakeInequality(
    left: Expression, right: Expression, indexes: Map<string, number>,
    minDiff: bigint): LinearInequality {

  const coefs = new Array<bigint>(indexes.size).fill(0n);
  let value = minDiff;

  // right - left >= minDiff, so right terms are positive, left terms negative.
  for (const term of _GetTerms(right)) {
    if (term[1] === undefined) {
      value -= term[0];
    } else {
      coefs[indexes.get(term[1])!] += term[0];
    }
  }

  for (const term of _GetTerms(left)) {
    if (term[1] === undefined) {
      value += term[0];
    } else {
      coefs[indexes.get(term[1])!] -= term[0];
    }
  }

  return {coefs, value};
}
