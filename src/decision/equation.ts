import { Predicate } from "../facts/props";
import { EXPR_CONSTANT, EXPR_FUNCTION, EXPR_VARIABLE, FUNC_ADD, FUNC_MULTIPLY } from '../facts/exprs';
import { Expression, Constant, Call } from '../facts/exprs';
import { IsImplied, LinearEquation } from './integer/smith';


/** Determines whether the last equation is implied by the earlier ones. */
export function IsEquationImplied(eqs: Predicate[], eq: Predicate): boolean {
  // Normalize both sides of all the equations (once only) to put each in
  // sum-of-products form.
  const eqs_sides = eqs.map(
      (eqn) => [eqn.args[0].normalize(), eqn.args[1].normalize()]);
  const eq_sides = [eq.args[0].normalize(), eq.args[1].normalize()];

  // Index all of the terms appearing in any equation.
  const indexes: Map<string, number> = new Map();
  for (const sides of eqs_sides) {
    _AddIndexes(sides[0], indexes);
    _AddIndexes(sides[1], indexes);
  }
  _AddIndexes(eq_sides[0], indexes);
  _AddIndexes(eq_sides[1], indexes);

  // Build the actual equations.
  const eqns: LinearEquation[] = eqs_sides.map(
      (s) => _MakeEquation(s[0], s[1], indexes));
  const eqn = _MakeEquation(eq_sides[0], eq_sides[1], indexes);

  const result = IsImplied(eqns, eqn);
  return result === true;
}

/**
 * Adds a unique index for each term appearing in the given sum. Indexes will
 * start at zero and constitute a continuous integer range.
 */
function _AddIndexes(expr: Expression, indexes: Map<string, number>): void {
  for (const term of _GetTerms(expr)) {
    if (term[1] !== undefined && !indexes.has(term[1]))
      indexes.set(term[1], indexes.size);
  }
}

/**
 * Returns the equation (left = right) as a LinearEquation by placing terms
 * at the indexes in the given map, which should range from 0 .. indexes.size-1.
 */
function _MakeEquation(
    left: Expression, right: Expression, indexes: Map<string, number>): LinearEquation {
  
  let value = 0;
  let coefs: number[] = [];
  for (let i = 0; i < indexes.size; i++)
      coefs.push(0);

  // Add the left-hand-side terms on the left and constant terms on the right.
  for (const term of _GetTerms(left)) {
    if (term[1] === undefined) {
      value -= term[0];
    } else {
      if (!indexes.has(term[1]))
        throw new Error(`we have uh-oh... missing index for ${term[1]}, over`);

      const index = indexes.get(term[1])!;
      if (index < 0 || indexes.size <= index)
        throw new Error(`we have uh-oh... bad index value ${index} for ${term[1]}, over`);

      coefs[index] += term[0];
    }
  }

  // Add the right-hand-side terms negated (on the left) and constant terms as is
  for (const term of _GetTerms(right)) {
    if (term[1] === undefined) {
      value += term[0];
    } else {
      if (!indexes.has(term[1]))
        throw new Error(`we have uh-oh... missing index for ${term[1]}, over`);

      const index = indexes.get(term[1])!;
      if (index < 0 || indexes.size <= index)
        throw new Error(`we have uh-oh... bad index value ${index} for ${term[1]}, over`);

      coefs[index] -= term[0];
    }
  }

  return {coefs: coefs, value: value};
}

/**
 * Returns each term in the given expression, split into a constant factor and
 * the rest of the expression, if any, as a string.
 */
function _GetTerms(expr: Expression): [number, string|undefined][] {
  // If this is not a sum, then turn it into one to reduce this to one case.
  if (expr.variety !== EXPR_FUNCTION ||
      (expr as Call).name !== FUNC_ADD) {
    expr = new Call(FUNC_ADD, [expr]);
  }

  const call = expr as Call;
  const terms: [number, string|undefined][] = [];

  for (const arg of call.args) {
    switch (arg.variety) {
      case EXPR_CONSTANT:
        terms.push([(arg as Constant).value, undefined]);
        break;

      case EXPR_VARIABLE:
        terms.push([1, arg.to_string()]);
        break;

      case EXPR_FUNCTION:
        const innerCall = arg as Call;
        if (innerCall.name !== FUNC_MULTIPLY ||
            innerCall.args.length < 2 ||
            innerCall.args[0].variety !== EXPR_CONSTANT) {
          terms.push([1, arg.to_string()]);

        } else {
          const factor = innerCall.args[0] as Constant;
          if (innerCall.args.length === 2) {
            terms.push([factor.value, innerCall.args[1].to_string()]);
          
          } else {  // > 2 arguments
            const rest = new Call(FUNC_MULTIPLY, innerCall.args.slice(1));
            terms.push([factor.value, rest.to_string()]);
          }
        }
        break;

      default:
        throw new Error(`unknown expression variety: ${arg.variety}`);
    }
  }
  return terms;
}

