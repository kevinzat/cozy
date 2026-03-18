import { Call, Constant, Expression, Variable,
         EXPR_CONSTANT, EXPR_FUNCTION, EXPR_VARIABLE } from './exprs';
import { Biconditional, Conjunction, Disjunction, Implication, Negation,
         NewVarName, Predicate, Proposition, Quantifier,
         PROP_AND, PROP_EXISTS, PROP_FALSE, PROP_FORALL, PROP_IFF, PROP_IMPLIES,
         PROP_NOT, PROP_OR, PROP_PREDICATE, PROP_TRUE } from './props';


/**
 * Returns substitutions that would make the two propositions identical by
 * performing substitutions for any of the allowed variables (if undefined, then
 * any variables can be substituted).
 */
export function UnifyProps(
    prop1: Proposition, prop2: Proposition, allowed_vars?: Set<string>):
    Map<string, Expression>|undefined {
  if (allowed_vars === undefined)
    allowed_vars = new Set(prop1.free_var_refs().concat(prop2.free_var_refs()));
  const subst = new Map<string, Expression>();
  return UnifyPropsHelper(prop1, prop2, allowed_vars, subst) ? subst : undefined;
}

/**
 * As above but takes an already existing set of substitutions as an extra
 * argument. The latter will be updated with any needed substitutions.
 */
function UnifyPropsHelper(
    prop1: Proposition, prop2: Proposition, allowed_vars: Set<string>,
    subst: Map<string, Expression>): boolean {

  // In terms of the standard unification argument, every proposition can be
  // thought of as a boolean-valued function. Hence, we are simply applying that
  // one case of unification (functions) in each case below. That case says that
  // the function names must match and all the arguments must unify. The variety
  // of proposition is the function name here.

  if (prop1.variety !== prop2.variety)
    return false;  // no substitution can make these the same

  switch (prop1.variety) {
    case PROP_TRUE:
    case PROP_FALSE:
      return true;

    case PROP_NOT:
      const not1 = prop1 as Negation;
      const not2 = prop2 as Negation;
      return UnifyPropsHelper(not1.prop, not2.prop, allowed_vars, subst);

    case PROP_AND:
      const conj1 = prop1 as Conjunction;
      const conj2 = prop2 as Conjunction;
      return UnifyPropsHelper(conj1.left, conj2.left, allowed_vars, subst) &&
             UnifyPropsHelper(conj1.right, conj2.right, allowed_vars, subst);

    case PROP_OR:
      const disj1 = prop1 as Disjunction;
      const disj2 = prop2 as Disjunction;
      return UnifyPropsHelper(disj1.left, disj2.left, allowed_vars, subst) &&
             UnifyPropsHelper(disj1.right, disj2.right, allowed_vars, subst);

    case PROP_IMPLIES:
      const impl1 = prop1 as Implication;
      const impl2 = prop2 as Implication;
      return UnifyPropsHelper(impl1.premise, impl2.premise, allowed_vars, subst) &&
             UnifyPropsHelper(impl1.conclusion, impl2.conclusion, allowed_vars, subst);

    case PROP_IFF:
      const iff1 = prop1 as Biconditional;
      const iff2 = prop2 as Biconditional;
      return UnifyPropsHelper(iff1.left, iff2.left, allowed_vars, subst) &&
             UnifyPropsHelper(iff1.right, iff2.right, allowed_vars, subst);

    case PROP_PREDICATE:
      const pred1 = prop1 as Predicate;
      const pred2 = prop2 as Predicate;
      if (pred1.name !== pred2.name)
        return false;
      if (pred1.args.length !== pred2.args.length)
        return false;
      for (let i = 0; i < pred1.args.length; i++) {
        if (!UnifyExprsHelper(pred1.args[i], pred2.args[i], allowed_vars, subst))
          return false;
      }
      return true;

    case PROP_FORALL:
    case PROP_EXISTS:
      const quant1 = prop1 as Quantifier;
      const quant2 = prop2 as Quantifier;

      // Match them up by changing both to use the same variable name.
      const var_name = NewVarName();
      const body1 = quant1.body.subst(quant1.name, Variable.of(var_name));
      const body2 = quant2.body.subst(quant2.name, Variable.of(var_name));

      // Try to match up the bodies now.
      if (!UnifyPropsHelper(body1, body2, allowed_vars, subst))
        return false;

      // The bound variable is not free outside of this expression, so it could
      // not be used in a substitution to make them equal.
      for (const val of subst.values()) {
        if (val.vars().has(var_name))
          return false;
      }

      return true;

    default:
      throw new Error(`unknown variety ${prop1.variety}`);
  }
}
/**
 * Returns substitutions that would make the two expressions identical by
 * performing substitutions for any of the allowed variables (if undefined, then
 * any variables can be substituted).
 */
export function UnifyExprs(
    expr1: Expression, expr2: Expression, allowed_vars?: Set<string>):
    Map<string, Expression>|undefined {
  if (allowed_vars === undefined)
    allowed_vars = new Set(expr1.var_refs().concat(expr2.var_refs()));
  const subst = new Map<string, Expression>();
  return UnifyExprsHelper(expr1, expr2, allowed_vars, subst) ? subst : undefined;
}

/**
 * As above but takes an already existing set of substitutions as an extra
 * argument. The latter will be updated with any needed substitutions.
 */
export function UnifyExprsHelper(
    expr1: Expression, expr2: Expression, allowed_vars: Set<string>,
    subst: Map<string, Expression>): boolean {

  // In the terminology of the standard unification algorithm, any variable that
  // is not in allowed_vars is a constant, not a variable.

  if (expr1.variety === EXPR_VARIABLE &&
      allowed_vars.has((expr1 as Variable).name)) {
    return UnifyVar((expr1 as Variable).name, expr2, allowed_vars, subst);

  } else if (expr2.variety === EXPR_VARIABLE &&
             allowed_vars.has((expr2 as Variable).name)) {
    return UnifyVar((expr2 as Variable).name, expr1, allowed_vars, subst);

  } else if (expr1.variety === EXPR_VARIABLE &&
             expr2.variety === EXPR_VARIABLE) {  // note: neither in allowed_vars
    return (expr1 as Variable).name === (expr2 as Variable).name;

  } else if (expr1.variety === EXPR_CONSTANT &&
             expr2.variety === EXPR_CONSTANT) {
    return (expr1 as Constant).value === (expr2 as Constant).value;

  } else if (expr1.variety === EXPR_FUNCTION &&
             expr2.variety === EXPR_FUNCTION) {
    const func1 = expr1 as Call;
    const func2 = expr2 as Call;
    if (func1.name !== func2.name)
      return false;
    if (func1.args.length !== func2.args.length)
      return false;
    for (let i = 0; i < func1.args.length; i++) {
      if (!UnifyExprsHelper(func1.args[i], func2.args[i], allowed_vars, subst))
        return false;
    }
    return true;

  } else {
    return false;
  }
}

/**
 * Handles the case of UnifyExpr where one is a variable.
 */
function UnifyVar(
    name: string, expr: Expression, allowed_vars: Set<string>,
    subst: Map<string, Expression>): boolean {

  if (!allowed_vars.has(name))  // should be disallowed by UnifyExprs
    throw new Error(`trying to substitute a non-allowed variable ${name}`);

  if (subst.has(name)) {
    return UnifyExprsHelper(subst.get(name)!, expr, allowed_vars, subst);
  } else if (expr.variety === EXPR_VARIABLE &&
             subst.has((expr as Variable).name)) {
    return UnifyVar(name, subst.get((expr as Variable).name)!, allowed_vars, subst);
  } else if (OccursCheck(name, expr, subst)) {
    return false;  // substitution would be self-referential (nonsensical)
  } else {
    subst.set(name, expr);
    return true;
  }
}

/**
 * Checks whether the given name occurs in the expression after applying all the
 * given substitutions.
 */
function OccursCheck(
    name: string, expr: Expression, subst: Map<string, Expression>): boolean {
  if (expr.variety === EXPR_VARIABLE) {
    const v = expr as Variable;
    if (subst.has(v.name))
      return OccursCheck(name, subst.get(v.name)!, subst);
    return name === v.name;
  } else if (expr.variety === EXPR_FUNCTION) {
    const func = expr as Call;
    for (let i = 0; i < func.args.length; i++) {
      if (OccursCheck(name, func.args[i], subst))
        return true;
    }
    return false;
  } else {
    return false;
  }
}