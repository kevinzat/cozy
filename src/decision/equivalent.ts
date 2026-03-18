import { Variable } from "../facts/exprs";
import { Biconditional, Conjunction, Disjunction, Implication, Negation,
         Proposition, Quantifier,
         PROP_AND, PROP_FALSE, PROP_EXISTS, PROP_FORALL, PROP_IFF,
         PROP_IMPLIES, PROP_NOT, PROP_OR, PROP_PREDICATE, PROP_TRUE } from "../facts/props";

/**
 * Ensure that the two given propositions are equivalent. Returns the reason (if
 * any) that they were found to be not equivalent. Note that this may call some
 * equivalent propositions non-equivalent, but it will not do the opposite.
 */
export function CheckEquivalent(prop1: Proposition, prop2: Proposition): string|null {
  // First try to check equivalence with quantifiers where they are.
  if (CheckEquivalentHelper(prop1, prop2) === null)
    return null;

  // Since that didn't work, we can try to verify equivalence by replacing each
  // with an equivalent form that is somewhat normalized. Note, in particular,
  // that this moves quantifiers to the outside.
  prop1 = prop1.normalize();
  prop2 = prop2.normalize();

  if (prop1.variety === PROP_FORALL || prop1.variety === PROP_EXISTS) {
    // Match up and remove the quantifiers from both propositions, renaming the
    // variables in equiv to use the names from prop.
    while (prop1.variety === PROP_FORALL ||
           prop1.variety === PROP_EXISTS) {
      if (prop1.variety !== prop2.variety) {
        return "quantifiers differ after normalization";
      }
      prop2 = (prop2 as Quantifier).body.subst(
          (prop2 as Quantifier).name, Variable.of((prop1 as Quantifier).name));
      prop1 = (prop1 as Quantifier).body;
    }
    if (prop2.variety === PROP_FORALL ||
        prop2.variety === PROP_EXISTS) {
      return "quantifiers differ after normalization";
    }

    // Name changes above could ruined normalization, so normalize again.
    prop1 = prop1.normalize();
    prop2 = prop2.normalize();
  }

  return CheckEquivalentHelper(prop1, prop2);
}

/**
 * Checks whether two propositions are equivalent by replacing each of the
 * complicated subexpressions, predicates or quantifiers, by atomic propositions
 * and then considering every possible truth value.
 */
function CheckEquivalentHelper(prop1: Proposition, prop2: Proposition): string|null {
  // Map each predicate appearing in the two propositions to a unique index.
  const indexes = new Map<string, number>();
  IndexPredicates(prop1, indexes);
  IndexPredicates(prop2, indexes);
  if (indexes.size > 16) {
    return "more than 16 unique predicates";
  }

  // Create a reverse mapping from indexes to predicates.
  const preds = new Map<number, string>();
  for (let [prop, index] of indexes.entries()) {
    preds.set(index, prop);
  }

  // Ensure that the two propositions have the same value under every possible
  // assignment of truth values for the predicates.
  for (let val = 0; val < (1 << indexes.size); val++) {
    const pred_vals = new Map<string, boolean>();
    for (let i = 0; i < indexes.size; i++) {
      pred_vals.set(preds.get(i)!, ((1 << i) & val) != 0);
    }

    if (Eval(prop1, pred_vals) != Eval(prop2, pred_vals)) {
      return "different values under some assignment";
    }
  }

  return null;
}


/** Adds a unique index to the map for each predicate or quantified expression. */
function IndexPredicates(prop: Proposition, indexes: Map<string, number>) {
  switch (prop.variety) {
    case PROP_TRUE:
    case PROP_FALSE:
      break;

    case PROP_NOT:
      IndexPredicates((prop as Negation).prop, indexes);
      break;

    case PROP_AND:
      IndexPredicates((prop as Conjunction).left, indexes);
      IndexPredicates((prop as Conjunction).right, indexes);
      break;

    case PROP_OR:
      IndexPredicates((prop as Disjunction).left, indexes);
      IndexPredicates((prop as Disjunction).right, indexes);
      break;

    case PROP_IMPLIES:
      IndexPredicates((prop as Implication).premise, indexes);
      IndexPredicates((prop as Implication).conclusion, indexes);
      break;

    case PROP_IFF:
      IndexPredicates((prop as Biconditional).left, indexes);
      IndexPredicates((prop as Biconditional).right, indexes);
      break;

    case PROP_PREDICATE:
    case PROP_FORALL:
    case PROP_EXISTS:
      const key = prop.to_string();
      if (!indexes.has(key)) {
        indexes.set(key, indexes.size);
      }
      break;

    default:
      throw new Error(`unsupported variety of proposition ${prop.variety}`);
  }
}

/**
 * Returns the value of the given proposition when the predicates have the
 * values indicated in the second argument.
 */
export function Eval(prop: Proposition, pred_vals: Map<string, boolean>): boolean {
  switch (prop.variety) {
    case PROP_TRUE:
      return true;
    case PROP_FALSE:
      return false;

    case PROP_NOT:
      return !Eval((prop as Negation).prop, pred_vals);

    case PROP_AND:
      return Eval((prop as Conjunction).left, pred_vals) &&
             Eval((prop as Conjunction).right, pred_vals);

    case PROP_OR:
      return Eval((prop as Disjunction).left, pred_vals) ||
             Eval((prop as Disjunction).right, pred_vals);

    case PROP_IMPLIES:
      return !Eval((prop as Implication).premise, pred_vals) ||
             Eval((prop as Implication).conclusion, pred_vals);

    case PROP_IFF:
      return Eval((prop as Biconditional).left, pred_vals) ==
             Eval((prop as Biconditional).right, pred_vals);

    case PROP_PREDICATE:
    case PROP_FORALL:
    case PROP_EXISTS:
      const key = prop.to_string();
      if (pred_vals.has(key)) {
        return pred_vals.get(key)!;
      } else {
        throw new Error(`missing value for subexpression ${key}`);  // bug
      }

    default:
      throw new Error(`unsupported variety of proposition ${prop.variety}`);
  }
}