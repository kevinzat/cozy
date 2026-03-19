import {
    Proposition, Conjunction, Disjunction, Negation, Implication, Biconditional,
    ForAll, Exists, Quantifier, Predicate, IsEquation, IsInequality, PRED_SUBSET,
    PRED_SAME_SET, UniquifyQuantifiers, NewVarNameVariation
  } from "../facts/props";
import { UnifyProps } from '../facts/unify';
import { UserError } from '../facts/user_error';
import * as props from '../facts/props';
import {
    Expression, Variable, FUNC_SET_COMPLEMENT, FUNC_SET_DIFFERENCE,
    FUNC_SET_INTERSECTION, FUNC_SET_UNION,
    Call,
    Constant,
    EXPR_CONSTANT, 
  } from '../facts/exprs';
import { IsEquationImplied } from '../decision/equation';
import { IsInequalityImplied } from '../decision/inequality';
import { CheckEquivalent } from '../decision/equivalent';
import { Environment, SubproofEnv, TopLevelEnv, TrailingEnv } from "./env";


export const RULE_ASSUMPTION = 0;
export const RULE_GIVEN = 1;
export const RULE_CITE = 2;
export const RULE_REPEAT = 3;

export const RULE_MODUS_PONENS = 4;   // elim implies
export const RULE_DIRECT_PROOF = 5;   // intro implies
export const RULE_ELIM_AND = 6;
export const RULE_INTRO_AND = 7;
export const RULE_ELIM_OR = 8;
export const RULE_SIMPLE_CASES = 9;
export const RULE_CASES = 10;
export const RULE_INTRO_OR = 11;

export const RULE_CONTRADICTION = 12;  // elim not
export const RULE_ABSURDUM = 13;       // intro not
export const RULE_EX_FALSO = 14;       // elim false
export const RULE_VERUM = 15;          // intro true

export const RULE_TAUTOLOGY = 16;
export const RULE_EQUIVALENT = 17;

export const RULE_ELIM_FORALL = 18;
export const RULE_INTRO_FORALL = 19;
export const RULE_ELIM_EXISTS = 20;
export const RULE_INTRO_EXISTS = 21;

export const RULE_INDUCTION = 22;

// Derived rules
export const RULE_SUBSTITUTE = 23;
export const RULE_DEFINITION = 24;
export const RULE_APPLY = 25;
export const RULE_ALGEBRA = 26;

/** List of all the rules that can be typed in by users. */
export const USER_RULES = [
    RULE_CITE, RULE_REPEAT, RULE_MODUS_PONENS, RULE_DIRECT_PROOF, RULE_ELIM_AND,
    RULE_INTRO_AND, RULE_ELIM_OR, RULE_SIMPLE_CASES, RULE_CASES,
    RULE_INTRO_OR, RULE_CONTRADICTION, RULE_ABSURDUM, RULE_EX_FALSO, RULE_VERUM,
    RULE_TAUTOLOGY, RULE_EQUIVALENT, RULE_ELIM_FORALL, RULE_INTRO_FORALL,
    RULE_ELIM_EXISTS, RULE_INTRO_EXISTS, RULE_INDUCTION, RULE_SUBSTITUTE,
    RULE_DEFINITION, RULE_APPLY, RULE_ALGEBRA,
  ];


/**
 * Returns a name for the rule with the given variety. This is only used for
 * error messages, but it should match the names from infer_forward_parser.g.
 */
export function RuleName(variety: number): string {
  switch (variety) {
    case RULE_ASSUMPTION:       return "assumption";
    case RULE_GIVEN:            return "given";
    case RULE_CITE:             return "cite";
    case RULE_REPEAT:           return "repeat";

    case RULE_MODUS_PONENS:     return "modus ponens";
    case RULE_DIRECT_PROOF:     return "direct proof";
    case RULE_ELIM_AND:         return "elim and";
    case RULE_INTRO_AND:        return "intro and";
    case RULE_ELIM_OR:          return "elim or";
    case RULE_SIMPLE_CASES:     return "simple cases";
    case RULE_CASES:            return "cases";
    case RULE_INTRO_OR:         return "intro or";

    case RULE_CONTRADICTION:    return "contradiction";
    case RULE_ABSURDUM:         return "absurdum";
    case RULE_EX_FALSO:         return "exfalso";
    case RULE_VERUM:            return "verum";

    case RULE_TAUTOLOGY:        return "tautology";
    case RULE_EQUIVALENT:       return "equivalent";

    case RULE_ELIM_FORALL:      return "elim forall";
    case RULE_INTRO_FORALL:     return "intro forall";
    case RULE_ELIM_EXISTS:      return "elim exists";
    case RULE_INTRO_EXISTS:     return "intro exists";

    case RULE_INDUCTION:        return "induction";

    case RULE_SUBSTITUTE:       return "substitute";
    case RULE_DEFINITION:       return "defof/undef";
    case RULE_APPLY:            return "apply";
    case RULE_ALGEBRA:          return "algebra";

    default:                    return "unknown";
  }
}

/**
 * Returns a name for the rule with the given variety. This is only used for
 * error messages, but it should match the names from infer_forward_parser.g.
 */
export function RuleVariety(name: string): number|undefined {
  name = name.trim().replace(/\s+/, ' ').toLowerCase();
  switch (name) {
    case "assumption":  return RULE_ASSUMPTION;
    case "given":       return RULE_GIVEN;
    case "cite":        return RULE_CITE;
    case "repeat":      return RULE_REPEAT;

    case "modus ponens":  return RULE_MODUS_PONENS;
    case "direct proof":  return RULE_DIRECT_PROOF;
    case "elim and":      return RULE_ELIM_AND;
    case "intro and":     return RULE_INTRO_AND;
    case "elim or":       return RULE_ELIM_OR;
    case "simple cases":  return RULE_SIMPLE_CASES;
    case "cases":         return RULE_CASES;
    case "intro or":      return RULE_INTRO_OR;

    case "contradiction":   return RULE_CONTRADICTION;
    case "absurdum":        return RULE_ABSURDUM;
    case "exfalso":         return RULE_EX_FALSO;
    case "verum":           return RULE_VERUM;

    case "tautology":   return RULE_TAUTOLOGY;
    case "equivalent":  return RULE_EQUIVALENT;

    case "elim forall":   return RULE_ELIM_FORALL;
    case "intro forall":  return RULE_INTRO_FORALL;
    case "elim exists":   return RULE_ELIM_EXISTS;
    case "intro exists":  return RULE_INTRO_EXISTS;

    case "induction":   return RULE_INDUCTION;

    case "substitute":    return RULE_SUBSTITUTE;
    case "defof/undef":   return RULE_DEFINITION;
    case "apply":         return RULE_APPLY;
    case "algebra":       return RULE_ALGEBRA;

    default:  return undefined;
  }
}


//function DumpEnv(env: Environment): string[] {
//  if (env instanceof TopLevelEnv) {
//    return ['top level'];
//  } else if (env instanceof SubproofEnv) {
//    return DumpEnv(env.parent).concat([`subproof ${env.conclusion.to_string()}`]);
//  } else if (env instanceof TrailingEnv) {
//    return DumpEnv(env.before).concat([`trailing ${env.varName}`]);
//  } else {
//    throw Error('unknown environment type!!');
//  }
//}


/**
 * Represents an inference rule that can be used for forward reasoning. The
 * varieties of rules are listed above. Note that the native representation of a
 * proof is as a tree. Each rule stores its premises in fields and produces the
 * conclusion when requested. (Note that some rules take propositions as
 * arguments that are not premises -- just additional information for the rule.)
 */
export abstract class Rule {
  variety: number;         // which type of rule
  envBefore: Environment;  // environment in which the rule is executing
  envAfter: Environment;   // environment after the rule (default: the same)
  _newProp?: Proposition;  // result of applying the rule (once known)

  constructor(variety: number, envBefore: Environment, ...premises: Rule[]) {
    this.variety = variety;
    this.envBefore = envBefore;
    this.envAfter = envBefore;

    // Make sure all premises come from environment visible from this one.
    for (const rule of premises) {
      if (!envBefore.isParentOrBefore(rule.envAfter)) {
        throw new Error(`${RuleName(variety)} has premise from an incompatible environment`);
      }
    }
  }

  /** Makes sure the given expression only references known variables. */
  checkVarsInExpr(expr: Expression): void {
    const known = new Set(this.envBefore.getVariablesInScope());
    for (const name of expr.vars()) {
      if (!known.has(name))
        throw new InvalidRule(this.variety, `no variable called "${name}" is in scope`);
    }
  }

  /** Makes sure the expressions in the given proposition only include known variables. */
  checkVarsInProp(prop: Proposition): void {
    const known = new Set(this.envBefore.getVariablesInScope());
    for (const name of prop.free_vars()) {
      if (!known.has(name))
        throw new InvalidRule(this.variety, `no variable called "${name}" is in scope`);
    }
  }

  /** Does the work to produce the new fact. Must not fail. */
  abstract doApply(): Proposition;

  /** Returns the proposition produced by applying the rule forward. */
  apply(): Proposition {
    if (this._newProp === undefined) {
      this._newProp = this.doApply();
    }
    return this._newProp;
  }
}


/**
 * Thrown when the caller attempts to use a rule in an invalid manner. Ordinary
 * bugs should be signalled using an Error.
 */
export class InvalidRule extends UserError {
  variety: number;  // type of rule that was applied incorrectly
  desc: string;     // description of the problem

  constructor(variety: number, desc: string) {
    super(`Error applying rule ${RuleName(variety)}: ${desc}`);

    // hack workaround of TS transpiling bug (so gross)
    Object.setPrototypeOf(this, InvalidRule.prototype);

    this.variety = variety;
    this.desc = desc;
  }
}


/**
 * Allows a rule to be stated without proof. This should only be used as a
 * hypothesis of a subproof.
 */
export class Assumption extends Rule {
  env: Environment;
  prop: Proposition;

  constructor(env: Environment, prop: Proposition) {
    super(RULE_ASSUMPTION, env);

    if (env.isTopLevel())
      throw new InvalidRule(RULE_ASSUMPTION, 'assumptions not allowed at top level');

    this.checkVarsInProp(prop);

    const premise = env.getPremise();
    if (premise === undefined || !premise.equals_alpha(prop)) {
      throw new InvalidRule(RULE_ASSUMPTION,
          `assumption ${prop.to_string()} does not match the subproof premise: ${premise?.to_string()}`);
    }

    this.env = env;
    this.prop = prop;
  }

  doApply(): Proposition {
    return this.prop;
  }
}


/** Allows a known fact to be cited by content (not name). */
export class Given extends Rule {
  env: Environment;
  prop: Proposition;

  constructor(env: Environment, prop: Proposition) {
    super(RULE_GIVEN, env);

    if (!env.hasHypothesis(prop)) {
      throw new InvalidRule(RULE_GIVEN,
          `${prop.to_string()} does not appear to be given`)
    }

    this.checkVarsInProp(prop);

    this.env = env;
    this.prop = prop;
  }

  doApply(): Proposition {
    return this.prop;
  }
}


/** Cites a known theorem. */
export class Cite extends Rule {
  name: string;  // name of the theorem

  constructor(env: Environment, name: string) {
    super(RULE_CITE, env);

    if (!env.hasTheorem(name)) {
      throw new InvalidRule(RULE_CITE, `no theorem named ${name}`);
    }

    this.name = name;
  }

  doApply(): Proposition {
    return this.envBefore.getTheorem(this.name);
  }
}


/** Repeats a proposition proven earlier. */
export class Repeat extends Rule {
  rule: Rule;  // how it was proven the first time

  constructor(env: Environment, rule: Rule) {
    super(RULE_REPEAT, env, rule);

    this.rule = rule;
  }

  doApply(): Proposition {
    return this.rule.apply();
  }
}


/**
 * Produces the conclusion of a premise, which must be an implication, given
 * that its premise is also known to hold.
 */
export class ModusPonens extends Rule {
  premRule: Rule;
  implRule: Rule;

  constructor(env: Environment, premRule: Rule, implRule: Rule) {
    super(RULE_MODUS_PONENS, env, premRule, implRule);

    if (implRule.apply().variety !== props.PROP_IMPLIES) {
      throw new InvalidRule(RULE_MODUS_PONENS,
          `${implRule.apply().to_string()} is not an implication`);
    }
    const implication = implRule.apply() as Implication;

    this.premRule = premRule;
    this.implRule = implRule;

    const premise = premRule.apply();
    if (!premise.equals_alpha(implication.premise)) {
      throw new InvalidRule(RULE_MODUS_PONENS,
          `${premise.to_string()} is not the premise of ${implication.to_string()}`);
    }
  }

  doApply(): Proposition {
    const implication = this.implRule.apply() as Implication;
    return implication.conclusion;
  }
}


/**
 * Produces an implication from a subproof starting with an assumption. Note
 * that this does not need to check the validity of each rule in the subproof,
 * as the constructors for the rules themselves do that.
 */
export class DirectProof extends Rule {
  subEnv: Environment;
  premise: Proposition;
  conclusion: Proposition;

  // @param subEnd the environment at the end of the subproof
  constructor(env: Environment, subEnv: Environment) {
    super(RULE_DIRECT_PROOF, env);

    const premise = subEnv.getPremise();
    if (premise === undefined) {
      throw new Error('subproof has no premise');
    }

    const conclusion = subEnv.getConclusion();
    if (conclusion === undefined) {
      throw new Error('subproof has no conclusion');
    }

    this.checkVarsInProp(premise)
    this.checkVarsInProp(conclusion)

    this.subEnv = subEnv;
    this.premise = premise;
    this.conclusion = conclusion;
  }

  doApply(): Proposition {
    return Implication.of(this.premise, this.conclusion);
  }
}


/** Produces one part of the premise, prop, which must be a conjunction. */
export class ElimAnd extends Rule {
  rule: Rule;
  left: boolean;

  constructor(env: Environment, rule: Rule, left: boolean) {
    super(RULE_ELIM_AND, env), rule;

    const prop = rule.apply();
    if (prop.variety !== props.PROP_AND) {
      throw new InvalidRule(RULE_ELIM_AND,
          `${prop.to_string()} is not a conjunction`);
    }

    this.rule = rule;
    this.left = left;
  }

  doApply(): Proposition {
    const prop = this.rule.apply() as Conjunction;
    return this.left ? prop.left : prop.right;
  }
}


/** Produces the conjunction of two premises, left and right. */
export class IntroAnd extends Rule {
  left: Rule;
  right: Rule;

  constructor(env: Environment, left: Rule, right: Rule) {
    super(RULE_INTRO_AND, env, left, right);

    this.left = left;
    this.right = right;
  }

  doApply(): Proposition {
    return Conjunction.of(this.left.apply(), this.right.apply());
  }
}


/**
 * Produces one part of a premise, prop, which must be a disjunction, given that
 * the other premise, neg_alt, is the negation of one of its disjuncts.
 */
export class ElimOr extends Rule {
  left: boolean;  // whether to produce the left or right of prop
                  // (neg_alt must be the negation of the other side)
  disjRule: Rule;
  negAltRule: Rule;

  constructor(env: Environment, disjRule: Rule, negAltRule: Rule) {
    super(RULE_ELIM_OR, env, disjRule, negAltRule);

    if (disjRule.apply().variety !== props.PROP_OR) {
      throw new InvalidRule(RULE_ELIM_OR,
          `${disjRule.apply().to_string()} is not a disjunction`);
    }
    const disj = disjRule.apply() as Disjunction;

    if (negAltRule.apply().variety !== props.PROP_NOT) {
      throw new InvalidRule(RULE_ELIM_OR,
          `${negAltRule.apply().to_string()} is not a negation`);
    }
    const negAlt = negAltRule.apply() as Negation;

    this.disjRule = disjRule;
    this.negAltRule = negAltRule;

    let alt = negAlt.prop;
    if (alt.equals_alpha(disj.left)) {
      this.left = false;
    } else if (alt.equals_alpha(disj.right)) {
      this.left = true;
    } else {
      throw new InvalidRule(RULE_ELIM_OR,
          `${alt.to_string()} is not either side of ${disj.to_string()}`);
    }
  }

  doApply(): Proposition {
    const disj = this.disjRule.apply() as Disjunction;
    return this.left ? disj.left : disj.right;
  }
}


/**
 * Produces the conclusion of two implications, where one premise is the
 * negation of the other's premise. (This is a special case of ByCases, below,
 * where the disjunction is implicitly provided by Excluded Middle.)
 */
export class SimpleCases extends Rule {
  leftRule: Rule;
  rightRule: Rule;

  constructor(env: Environment, leftRule: Rule, rightRule: Rule) {
    super(RULE_SIMPLE_CASES, env, leftRule, rightRule);

    if (leftRule.apply().variety !== props.PROP_IMPLIES) {
      throw new InvalidRule(RULE_SIMPLE_CASES,
          `${leftRule.apply().to_string()} is not an implication`);
    }
    const case_left = leftRule.apply() as Implication;

    if (rightRule.apply().variety !== props.PROP_IMPLIES) {
      throw new InvalidRule(RULE_SIMPLE_CASES,
          `${rightRule.apply().to_string()} is not an implication`);
    }
    const case_right = rightRule.apply() as Implication;

    this.leftRule = leftRule;
    this.rightRule = rightRule;

    if (!case_left.premise.equals_alpha(Negation.of(case_right.premise)) &&
        !case_right.premise.equals_alpha(Negation.of(case_left.premise))) {
      throw new InvalidRule(RULE_SIMPLE_CASES,
          `premise ${case_left.premise.to_string()} is not the negation of ${case_right.premise.to_string()} nor vice versa`);
    }

    if (!case_left.conclusion.equals_alpha(case_right.conclusion)) {
      throw new InvalidRule(RULE_SIMPLE_CASES,
          `conclusion ${case_left.conclusion.to_string()} is not the same as ${case_right.conclusion.to_string()}`);
    }
  }

  doApply(): Proposition {
    const case_left = this.leftRule.apply() as Implication;
    return case_left.conclusion;
  }
}


/**
 * Produces the conclusion of two implications for which the disjunction of the
 * two premises is known to hold.
 */
export class Cases extends Rule {
  disjRule: Rule;
  leftRule: Rule;
  rightRule: Rule;

  constructor(env: Environment, disjRule: Rule, leftRule: Rule, rightRule: Rule) {
    super(RULE_CASES, env, disjRule, leftRule, rightRule);

    if (disjRule.apply().variety !== props.PROP_OR) {
      throw new InvalidRule(RULE_CASES,
          `${disjRule.apply().to_string()} is not a disjunction`);
    }
    const prop = disjRule.apply() as Disjunction;
    
    if (leftRule.apply().variety !== props.PROP_IMPLIES) {
      throw new InvalidRule(RULE_CASES,
          `${leftRule.apply().to_string()} is not an implication`);
    }
    const caseLeft = leftRule.apply() as Implication;
    
    if (rightRule.apply().variety !== props.PROP_IMPLIES) {
      throw new InvalidRule(RULE_CASES,
          `${rightRule.apply().to_string()} is not an implication`);
    }
    const caseRight = rightRule.apply() as Implication;

    this.disjRule = disjRule;
    this.leftRule = leftRule;
    this.rightRule = rightRule;

    if (!caseLeft.conclusion.equals_alpha(caseRight.conclusion)) {
      throw new InvalidRule(RULE_CASES,
          `conclusion ${caseLeft.conclusion.to_string()} is not the same as ${caseRight.conclusion.to_string()}`);
    }

    let disj = Disjunction.of(caseLeft.premise, caseRight.premise);
    if (!prop.equals_alpha(disj)) {
      throw new InvalidRule(RULE_CASES,
          `${prop.to_string()} should be ${disj.to_string()}`);
    }
  }

  doApply(): Proposition {
    const case_left = this.leftRule.apply() as Implication;
    return case_left.conclusion;
  }
}


/** Produces the disjunction of a premise and any other claim, alt. */
export class IntroOr extends Rule {
  rule: Rule;
  alt: Proposition;
  right: boolean;  // make alt the right disjunct

  constructor(env: Environment, rule: Rule, alt: Proposition, right: boolean) {
    super(RULE_INTRO_OR, env, rule);

    this.checkVarsInProp(alt);

    this.rule = rule;
    this.alt = alt;
    this.right = right;
  }

  doApply(): Proposition {
    if (this.right) {
      return props.Disjunction.of(this.rule.apply(), this.alt);
    } else {
      return props.Disjunction.of(this.alt, this.rule.apply());
    }
  }
}


/** Produces false from two directly contradictory facts. */
export class PrincipiumContradictionis extends Rule {
  leftRule: Rule;
  rightRule: Rule;

  constructor(env: Environment, leftRule: Rule, rightRule: Rule) {
    super(RULE_SIMPLE_CASES, env, leftRule, rightRule);

    const left = leftRule.apply();
    const right = rightRule.apply();
    if (!left.equals_alpha(Negation.of(right)) && !right.equals_alpha(Negation.of(left))) {
      throw new InvalidRule(RULE_CONTRADICTION,
          `${left.to_string()} is not the negation of ${right.to_string()} nor vice versa`);
    }

    this.leftRule = leftRule;
    this.rightRule = rightRule;
  }

  doApply(): Proposition {
    return props.FALSE;
  }
}

/** Produces a negation from a subproof that produces absurdity. */
export class ReductioAdAbsurdum extends Rule {
  subEnv: Environment;
  premise: Proposition;

  constructor(env: Environment, subEnv: Environment) {
    super(RULE_ABSURDUM, env);

    const premise = subEnv.getPremise();
    if (premise === undefined) {
      throw new Error('subproof has no premise');
    }

    const conclusion = subEnv.getConclusion();
    if (conclusion === undefined) {
      throw new Error('subproof has no conclusion');
    } else if (conclusion.variety !== props.PROP_FALSE) {
      throw new InvalidRule(RULE_ABSURDUM,
          'subproof must end with an absurdity (false)');
    }

    this.checkVarsInProp(premise);

    this.subEnv = subEnv;
    this.premise = premise;
  }

  doApply(): Proposition {
    return Negation.of(this.premise);
  }
}

/** Derives any fact from "false". */
export class ExFalsoQuodlibet extends Rule {
  rule: Rule;         // premise producing false
  prop: Proposition;  // what we want

  constructor(env: Environment, rule: Rule, prop: Proposition) {
    super(RULE_EX_FALSO, env, rule);

    this.checkVarsInProp(prop);

    if (rule.apply().variety !== props.PROP_FALSE) {
      throw new InvalidRule(RULE_EX_FALSO,
          `${rule.apply().to_string()} is not false`);
    }

    this.rule = rule;
    this.prop = prop;
  }

  doApply(): Proposition {
    return this.prop;
  }
}


/** Produces the self-evident proposition "true". */
export class AdLitteramVerum extends Rule {
  constructor(env: Environment) {
    super(RULE_VERUM, env);
  }

  doApply(): Proposition {
    return props.TRUE;
  }
}


/** Generates a given fact provided that it is always true. */
export class Tautology extends Rule {
  prop: Proposition;

  constructor(env: Environment, prop: Proposition) {
    super(RULE_TAUTOLOGY, env);

    this.checkVarsInProp(prop);

    const reason = CheckEquivalent(prop, props.TRUE);
    if (reason != null) {
      throw new InvalidRule(RULE_TAUTOLOGY,
          `${prop.to_string()} does not appear to be a tautology (${reason})`);
    }

    this.prop = prop;
  }

  doApply(): Proposition {
    return this.prop;
  }
}


/** Performs straightforward checks of equivalence between two props. */
export class Equivalent extends Rule {
  rule: Rule;
  equiv: Proposition;

  constructor(env: Environment, rule: Rule, equiv: Proposition) {
    super(RULE_EQUIVALENT, env, rule);

    this.checkVarsInProp(equiv);

    const reason = CheckEquivalent(rule.apply(), equiv);
    if (reason != null) {
      throw new InvalidRule(RULE_EQUIVALENT,
          `${rule.apply().to_string()} does not appear to be equivalent to ${equiv.to_string()} (${reason})`);
    }

    this.rule = rule;
    this.equiv = equiv;
  }

  doApply(): Proposition {
    return this.equiv;
  }
}


/** Produces the instantiation of a known for-all fact. */
export class ElimForAll extends Rule {
  rule: Rule;
  exprs: Array<Expression>;

  constructor(env: Environment, rule: Rule, exprs: Array<Expression>) {
    super(RULE_ELIM_FORALL, env, rule);

    if (exprs.length === 0) {
      throw new InvalidRule(RULE_ELIM_FORALL,
          `elim forall requires at least one expression`)
    }

    // Make sure the premise has the requisite number of foralls.
    let prop = rule.apply();
    for (const expr of exprs) {
      this.checkVarsInExpr(expr);
      if (prop.variety !== props.PROP_FORALL) {
        throw new InvalidRule(RULE_ELIM_FORALL,
            `${prop.to_string()} is not a forall`);
      }
      prop = (prop as ForAll).body;
    }

    this.rule = rule;
    this.exprs = exprs;
  }

  doApply(): Proposition {
    let prop = this.rule.apply();
    for (const expr of this.exprs) {
      if (prop.variety !== props.PROP_FORALL)
        throw new Error(`expecting a forall not ${prop.to_string()}`);
      const forall = prop as ForAll;
      prop = forall.body.subst(forall.name, expr);
    }
    return prop;
  }
}


/** Produces a forall claim over free variables of a proven fact. */
export class IntroForAll extends Rule {
  subEnv: Environment;
  body: Proposition;
  names: [string, string][];  // old and new name for each variable

  constructor(env: Environment, subEnv: Environment, newNames?: string[]) {
    super(RULE_INTRO_FORALL, env);

    const conclusion = subEnv.getConclusion();
    if (conclusion === undefined)
      throw new Error('subproof has no conclusion');

    const premise = subEnv.getPremise();
    if (premise !== undefined)
      throw new Error('subproof has a premise');

    // Retrieve the variables declared by the subproof.
    const innerNames = subEnv.getVariables();
    if (innerNames.length === 0)
      throw new InvalidRule(RULE_INTRO_FORALL, 'must introduce at least one variable');
    if (new Set(innerNames).size < innerNames.length)
      throw new InvalidRule(RULE_INTRO_FORALL, 'variable names must be distinct');

    this.subEnv = subEnv;
    this.body = conclusion;

    if (newNames === undefined) {
      // If no names were given, then use the subproof names as is.
      this.names = innerNames.map((name) => [name, name]);
    } else {
      if (innerNames.length < newNames.length)
        throw new InvalidRule(RULE_INTRO_FORALL, 'too many new names given');
      if (new Set(newNames).size < newNames.length)
        throw new InvalidRule(RULE_INTRO_FORALL, 'variable names must be distinct');

      // Record the new names paired up with the old ones.
      this.names = [];
      for (let i = 0; i < newNames.length; ++i) {
        this.names.push([innerNames[i], newNames[i]]);
      }
    }

    // Check that the proposition that would be produced has no unknown variables
    this.checkVarsInProp(this.doApply());
  }

  doApply(): Proposition {
    let prop = this.body;
    for (let i = this.names.length - 1; i >= 0; --i) {
      if (this.names[i][0] === this.names[i][1]) {
        prop = ForAll.of(this.names[i][1], prop);
      } else {
        prop = ForAll.of(this.names[i][1],
            prop.subst(this.names[i][0], Variable.of(this.names[i][1])));
      }
    }
    return prop;
  }
}


/**
 * Instantiates an existential with a new, specific variable name.
 * 
 * NOTE: this rule essentially declares a new variable, so any rules that use it
 * should be applied in a new environment that has the new variable.
 */
export class ElimExists extends Rule {
  rule: Rule;  // premise
  name: string;

  constructor(env: Environment, rule: Rule, name: string) {
    super(RULE_ELIM_EXISTS, env, rule);

    if (rule.apply().variety !== props.PROP_EXISTS) {
      throw new InvalidRule(RULE_ELIM_EXISTS,
          `${rule.apply().to_string()} is not an exists`);
    }

    // Using an existing name could change the meaning of the formula, so we
    // require a new name to be used.
    if (!env.isAvailableName(name)) {
      throw new InvalidRule(RULE_ELIM_EXISTS, `name ${name} is unavailable`);
    }

    this.rule = rule;
    this.name = name;
    this.envAfter = new TrailingEnv(env, name);
  }

  doApply(): Proposition {
    const prop = this.rule.apply() as Exists;
    return prop.body.subst(prop.name, Variable.of(this.name));
  }
}


/** Produces an existential from a known, specific fact. */
export class IntroExists extends Rule {
  rule: Rule;  // premise
  expr: Expression;
  name: string;
  exists: Exists|undefined;  // statement to prove if not the obvious one

  constructor(env: Environment, rule: Rule, expr: Expression, name: string,
      exists?: Proposition) {
    super(RULE_INTRO_EXISTS, env, rule);

    this.checkVarsInExpr(expr);
    if (exists !== undefined)
      this.checkVarsInProp(exists);

    // The explicit form of the exists can be used when the invoker only wants
    // to replace some instances of variable (leaving the remaining free). We
    // will check that this is valid by renaming the rest.
    if (exists !== undefined) {
      const var_name = Variable.of(name);
      const def_exists = Substitute.subst(rule.apply(), expr, var_name, false);
      if (exists.variety !== props.PROP_EXISTS ||
          (exists as Exists).name !== name ||
          !def_exists.equals_alpha(
              Substitute.subst((exists as Exists).body, expr, var_name, false))) {
        throw new InvalidRule(RULE_INTRO_EXISTS,
            `provided existential ${exists.to_string()} cannot be produced by intro exists`)
      }
    }

    // Check for any free-variable-capturing shenanigans by eliminating the
    // exists this would produce, using the exact expression we know we used,
    // and making sure we get back the original proposition.
    const newProp = (exists !== undefined) ? exists as Exists :
        Exists.of(name, Substitute.subst(rule.apply(), expr, Variable.of(name), false));
    if (!newProp.body.subst(name, expr).equals_alpha(rule.apply())) {
      throw new InvalidRule(RULE_INTRO_EXISTS,
          `substituting ${expr.to_string()} for ${name} in "${newProp.to_string()}" ` +
          `would not give us back "${rule.apply().to_string()}"`);
    }

    this.rule = rule;
    this.expr = expr;
    this.name = name;
    this.exists = exists as Exists|undefined;
  }

  doApply(): Proposition {
    if (this.exists !== undefined) {
      return this.exists;
    } else {
      return Exists.of(this.name,
          Substitute.subst(this.rule.apply(), this.expr, Variable.of(this.name), false));
    }
  }
}


/**
 * Produces the claim about all integers at least as large as a given number,
 * given proof that it holds for that number and proof that, if it holds for one
 * number, it holds for the next number.
 */
export class Induction extends Rule {
  baseRule: Rule;
  indRule: Rule;
  indHyp: ForAll;
  baseCase: bigint;

  constructor(env: Environment, baseRule: Rule, indRule: Rule) {
    super(RULE_INDUCTION, env, baseRule, indRule);

    const induction = indRule.apply();
    if (induction.variety !== props.PROP_FORALL) {
      throw new InvalidRule(RULE_INDUCTION,
          `${induction.to_string()} is not a forall`);
    }
    const indBody = induction as ForAll;
    if (indBody.body.variety !== props.PROP_IMPLIES) {
      throw new InvalidRule(RULE_INDUCTION,
          `${induction.to_string()}'s body is not an implication`);
    }
    const indStep = indBody.body as Implication;

    this.baseRule = baseRule;
    this.indRule = indRule;
    this.indHyp = ForAll.of(indBody.name,
        (indBody.body as Implication).premise);

    const baseCase = baseRule.apply();
    const subst = UnifyProps(baseCase, this.indHyp.body, new Set([this.indHyp.name]));
    if (subst === undefined) {
      throw new InvalidRule(RULE_INDUCTION,
          `${baseCase.to_string()} does not look like ${this.indHyp.body.to_string()}`);
    }
    const value = subst.get(indBody.name);
    if (value === undefined)
      throw new Error(`unification worked but didn't find ${indBody.name}`);
    if (value.variety !== EXPR_CONSTANT) {
      throw new InvalidRule(RULE_INDUCTION,
          `${baseCase.to_string()} is not ${this.indHyp.to_string()} evaluated at some constant`);
    }

    this.baseCase = (value as Constant).value;

    const indConcl = this.indHyp.body.subst(this.indHyp.name,
        Call.add(Variable.of(this.indHyp.name), Constant.ONE));
    if (!indConcl.equals_alpha(indStep.conclusion)) {
      const n = this.indHyp.name;
      throw new InvalidRule(RULE_INDUCTION,
          `the conclusion of ${induction.to_string()} is not P(${n}+1)`);
    }
  }

  doApply(): Proposition {
    return ForAll.of(this.indHyp.name,
        Implication.of(
            Predicate.lessOrEqual(Constant.of(this.baseCase),
                Variable.of(this.indHyp.name)),
            this.indHyp.body))
  }
}


/**
 * A rule that operates only by using other rules. Such a rule does not require
 * independent verification. It is correct if the ones it uses are.
 */
abstract class DerivedRule extends Rule {
  outputRule?: Rule;  // result of applying the rule (once known)

  constructor(variety: number, env: Environment, ...premises: Rule[]) {
    super(variety, env, ...premises);
  }

  /** Produces a rule that will produce the output. */
  abstract makeOutputRule(): Rule;

  /** Does the work to produce the new fact. Must not fail. */
  doApply(): Proposition {
    if (this.outputRule === undefined)
      this.outputRule = this.makeOutputRule();
    return this.outputRule.apply();
  }
}


/** Applies a theorem whose hypothesis is satisfied by known facts. */
export class Apply extends DerivedRule {
  thm_name: string;     // name of the theorem to use
  defnRule: Rule;       // rule that cites the theorem
  premRule: Rule;       // makes fact that is a special case of theorem's premise
  exprs: Expression[];  // substitutions to apply to theorem to get premise
  
  constructor(env: Environment, thm_name: string, premRule: Rule, ...exprs: Expression[]) {
    super(RULE_APPLY, env, premRule);

    for (const expr of exprs) {
      this.checkVarsInExpr(expr);
    }

    // Retrieve the actual definition from its name.
    const defnRule = new Cite(this.envBefore, thm_name);
    const defn = defnRule.apply();

    // Make sure we have one expression per quantifier.
    const vars = props.SplitQuantifiers(defn)[0];
    if (exprs.length !== vars.length) {
      throw new InvalidRule(RULE_APPLY,
          `theorem ${thm_name} requires ${vars.length} arguments (not ${exprs.length})`);
    }

    // Make sure the substitutions give the premise.
    const premise = premRule.apply();
    const body = ((exprs.length === 0) ? defnRule : 
        new ElimForAll(this.envBefore, defnRule, exprs)).apply();
    if (body.variety === props.PROP_IMPLIES) {
      const impl = body as Implication;
      if (!impl.premise.equals_alpha(premise)) {
        throw new InvalidRule(RULE_APPLY,
            `${premise.to_string()} does not match the premise of theorem ${thm_name}: ${impl.premise.to_string()}`);
      }
    } else if (body.variety === props.PROP_IFF) {
      const cond = body as Biconditional;
      if (!cond.left.equals_alpha(premise) && !cond.right.equals(premise)) {
        throw new InvalidRule(RULE_APPLY,
            `${premise.to_string()} does not match either side of theorem ${thm_name}: ${cond.left.to_string()} and ${cond.right.to_string()}`);
      }
    } else {
      throw new Error(`we have uh oh, over`);
    }

    this.thm_name = thm_name;
    this.defnRule = defnRule;
    this.premRule = premRule;
    this.exprs = exprs.slice(0);
  }

  makeOutputRule(): Rule {
    const bodyRule = (this.exprs.length === 0) ? this.defnRule :
        new ElimForAll(this.envBefore, this.defnRule, this.exprs);
    const body = bodyRule.apply();
    const premise = this.premRule.apply();

    let implRule;
    if (body.variety === props.PROP_IMPLIES) {
      implRule = bodyRule
    } else if (body.variety === props.PROP_IFF) {
      const cond = body as Biconditional;
      const arrows = new Equivalent(this.envBefore, bodyRule,
        Conjunction.of(
            Implication.of(cond.left, cond.right),
            Implication.of(cond.right, cond.left)));
      implRule = new ElimAnd(this.envBefore, arrows, cond.left.equals_alpha(premise));
    } else {
      throw new Error(`we have uh oh, over`);
    }

    return new ModusPonens(this.envBefore, this.premRule, implRule);
// Turning this off because it can generate expressions that can't be typed in,
// specifically addition / multiplications of 3+ arguments at once.
//    const conclusion = concRule.apply();
//    const simpl = conclusion.simplify_expressions();
//    if (conclusion.equals_alpha(simpl)) {
//      return concRule;
//    } else {
//      return new Equivalent(this.envBefore, concRule, simpl);
//    }
  }
}


// === Future Derived Rules ===

// TODO(future): make the following rules operate by emiting a sequence of basic
//               rules that accomplish the same thing


/**
 * Substitutes one side of an equation (x = y) for the other in (some) places it
 * appears inside of arithmetic expressions appearing in a proposition. This
 * also evaluates any purely-constant functions in the result. That could be
 * done using the algebra rule, but this mirrors how we ask students to do
 * substitution.
 */
export class Substitute extends Rule {
  eqRule: Rule;
  right: boolean;  // substitute right for left (or vice versa if false)
  rule: Rule;
  result?: Proposition;  // result to produce if not the obvious one
  
  constructor(env: Environment, eqRule: Rule, right: boolean, rule: Rule, result?: Proposition) {
    super(RULE_SUBSTITUTE, env, eqRule, rule);

    if (result !== undefined)
      this.checkVarsInProp(result);

    if (!IsEquation(eqRule.apply())) {
      throw new InvalidRule(RULE_SUBSTITUTE,
          `first argument to substitute must be an equation, not ${eqRule.apply().to_string()}`);
    }
    const eqp = eqRule.apply() as Predicate;

    if (result !== undefined) {
      // Make sure that the given result is valid by checking that, if we
      // performed the substitution on it, replacing any remaining places where
      // the substitution could be performed, we get the usual result.
      if (right) {
        const exp_result = Substitute.subst(rule.apply(), eqp.args[0], eqp.args[1], true);
        const full_subst = Substitute.subst(result, eqp.args[0], eqp.args[1], true);
        if (!full_subst.equals_alpha(exp_result)) {
            throw new InvalidRule(RULE_SUBSTITUTE,
                `provided result ${result.to_string()} cannot be produced by substitute`);
        }
      } else {
        const exp_result = Substitute.subst(rule.apply(), eqp.args[1], eqp.args[0], true);
        const full_subst = Substitute.subst(result, eqp.args[1], eqp.args[0], true);
        if (!full_subst.equals_alpha(exp_result)) {
            throw new InvalidRule(RULE_SUBSTITUTE,
                `provided result ${result.to_string()} cannot be produced by substitute`);
        }
      }
    }

    this.eqRule = eqRule;
    this.right = right;
    this.rule = rule;
    this.result = result;

    // Make sure this actually substitutes something.
    if (rule.apply().equals_alpha(this.apply()))
      throw new InvalidRule(RULE_SUBSTITUTE, "no substitutions were found");
  }

  doApply(): Proposition {
    if (this.result !== undefined) {
      return this.result;
    } else {
      const eqp = this.eqRule.apply() as Predicate;
      if (this.right) {
        return Substitute.subst(this.rule.apply(), eqp.args[0], eqp.args[1], false);
      } else {
        return Substitute.subst(this.rule.apply(), eqp.args[1], eqp.args[0], false);
      }
    }
  }

  /**
   * Returns a copy of prop but with all (free) instances of the given
   * expression replaced by the given value. Optionally, this can also simplify
   * each of the expressions in the result.
   */
  static subst(
      prop: Proposition, expr: Expression, value: Expression,
      simplify: boolean): Proposition {
    switch (prop.variety) {
      case props.PROP_TRUE:
      case props.PROP_FALSE:
        return prop;  // no expressions

      case props.PROP_PREDICATE:
        const pred = prop as Predicate;
        let args = pred.args.map((arg) => arg.subst(expr, value));
        if (simplify)
          args = args.map((arg) => arg.simplify());
        return new Predicate(pred.name, args);

      case props.PROP_NOT:
        const neg = prop as Negation;
        return Negation.of(
            Substitute.subst(neg.prop, expr, value, simplify));

      case props.PROP_AND:
        const conj = prop as Conjunction;
        return Conjunction.of(
            Substitute.subst(conj.left, expr, value, simplify),
            Substitute.subst(conj.right, expr, value, simplify));

      case props.PROP_OR:
        const disj = prop as Disjunction;
        return Disjunction.of(
            Substitute.subst(disj.left, expr, value, simplify),
            Substitute.subst(disj.right, expr, value, simplify));

      case props.PROP_IMPLIES:
        const impl = prop as Implication;
        return Implication.of(
            Substitute.subst(impl.premise, expr, value, simplify),
            Substitute.subst(impl.conclusion, expr, value, simplify));

      case props.PROP_IFF:
        const iff = prop as Biconditional;
        return Biconditional.of(
            Substitute.subst(iff.left, expr, value, simplify),
            Substitute.subst(iff.right, expr, value, simplify));

      case props.PROP_FORALL:
      case props.PROP_EXISTS:
        let quant = prop as Quantifier;
        if (expr.vars().has(quant.name)) {
          return prop;  // expression cannot appear since one of its variables
                        // is bound (so the free variable cannot be referenced)
        } else {
          // If the value being substituted uses this variable name, then we can
          // fix this by changing it to a new name.
          if (value.vars().has(quant.name)) {
            const newName = NewVarNameVariation(quant.name, quant.body.free_vars());
            const newBody = quant.body.subst(quant.name, Variable.of(newName));
            quant = (quant.variety === props.PROP_FORALL) ?
                ForAll.of(newName, newBody) : Exists.of(newName, newBody);
          }
          const body = Substitute.subst(quant.body, expr, value, simplify);
          return (prop.variety === props.PROP_FORALL) ?
              ForAll.of(quant.name, body) : Exists.of(quant.name, body);
        }

      default:
        throw new Error(`unknown variety ${prop.variety}`);
    }
  }
}


/**
 * Substitutes one side of a (forall quantified) iff for the other in (some)
 * places it appears inside of a proposition.
 *
 * NOTE: To make this a derived rule. Each place where unification arises, use
 * elim-forall to produce the right from the left (or vice versa). Then build up
 * the whole expression from those facts (see my notes on this).
 */
export class Definition extends Rule {
  defn: Proposition;  // definition to apply
  right: boolean;     // substitute right for left (or vice versa if false)
  rule: Rule;
  result?: Proposition;
  
  constructor(env: Environment, name: string, right: boolean, rule: Rule,
      result?: Proposition) {
    super(RULE_DEFINITION, env, rule);

    // Find the definition with this name.
    let defn = Definition.getDefinition(env, name);

    // Give the variables unique names so that unification doesn't confuse these
    // with variables in the other formula.
    defn = UniquifyQuantifiers(defn);

    if (result !== undefined) {
      this.checkVarsInProp(result);

      // Make sure that the given result is valid by checking that, if we
      // performed the substitution on it, replacing any remaining places where
      // the substitution could be performed, we get the usual result.
      const [vars, body] = props.SplitQuantifiers(defn);
      const svars = new Set(vars);
      const iff = body as Biconditional;
      const exp_result = right ?
          Definition.subst(rule.apply(), iff.left, iff.right, svars) :
          Definition.subst(rule.apply(), iff.right, iff.left, svars);
      const full_subst = right ?
          Definition.subst(result, iff.left, iff.right, svars) :
          Definition.subst(result, iff.right, iff.left, svars);
      if (!full_subst.equals_alpha(exp_result)) {
          throw new InvalidRule(RULE_SUBSTITUTE,
              `provided result ${result.to_string()} cannot be produced by def`);
      }
    }

    this.defn = defn;
    this.right = right;
    this.rule = rule;
    this.result = result;

    // Make sure this actually substitutes something.
    if (rule.apply().equals_alpha(this.apply())) {
      throw new InvalidRule(RULE_DEFINITION, this.right ?
          `no uses of ${name} were found` :
          `no definitions of ${name} were found`);
    }
  }

  doApply(): Proposition {
    if (this.result !== undefined) {
      return this.result;
    } else {
      const [vars, body] = props.SplitQuantifiers(this.defn);
      const svars = new Set(vars);
      const iff = body as Biconditional;
      return this.right ?
          Definition.subst(this.rule.apply(), iff.left, iff.right, svars) :
          Definition.subst(this.rule.apply(), iff.right, iff.left, svars);
    }
  }

  /**
   * Returns a copy of prop but with all propositions that can be unified with
   * left (using only the given variables) replaced by the right side with the
   * same set of substitutions.
   */
  static subst(
      prop: Proposition, left: Proposition, right: Proposition,
      vars: Set<string>): Proposition {

    // Attempt to unify this with the left side. If it succeeds, then return the
    // right side with the appropriate substitutions.
    if (prop.variety === left.variety) {
      const subst = UnifyProps(prop, left, vars);
      if (subst !== undefined) {
        let result = right;
        for (const v of subst.keys()) {
          result = result.subst(v, subst.get(v)!);
        }
        return result;
      }
    }

    // Otherwise, attempt to perform substitution in the children. This is
    // slightly optimized to avoid unnecessary copying.
    switch (prop.variety) {
      case props.PROP_TRUE:
      case props.PROP_FALSE:
      case props.PROP_PREDICATE:
        return prop;  // no sub-propositions

      case props.PROP_NOT:
        const neg = prop as Negation;
        const nprop = Definition.subst(neg.prop, left, right, vars);
        return (nprop === neg.prop) ? prop : Negation.of(nprop);

      case props.PROP_AND:
        const conj = prop as Conjunction;
        const conj_left = Definition.subst(conj.left, left, right, vars);
        const conj_right = Definition.subst(conj.right, left, right, vars);
        return (conj_left === conj.left && conj_right === conj.right) ?
            prop : Conjunction.of(conj_left, conj_right);

      case props.PROP_OR:
        const disj = prop as Disjunction;
        const disj_left = Definition.subst(disj.left, left, right, vars);
        const disj_right = Definition.subst(disj.right, left, right, vars);
        return (disj_left === disj.left && disj_right === disj.right) ?
            prop : Disjunction.of(disj_left, disj_right);

      case props.PROP_IMPLIES:
        const impl = prop as Implication;
        const impl_prem = Definition.subst(impl.premise, left, right, vars);
        const impl_conc = Definition.subst(impl.conclusion, left, right, vars);
        return (impl_prem === impl.premise && impl_conc === impl.conclusion) ?
            prop : Implication.of(impl_prem, impl_conc);

      case props.PROP_IFF:
        const iff = prop as Biconditional;
        const iff_left = Definition.subst(iff.left, left, right, vars);
        const iff_right = Definition.subst(iff.right, left, right, vars);
        return (iff_left === iff.left && iff_right === iff.right) ?
            prop : Biconditional.of(iff_left, iff_right);

      case props.PROP_FORALL:
      case props.PROP_EXISTS:
        const quant = prop as Quantifier;
        const body = Definition.subst(quant.body, left, right, vars);
        if (body === quant.body) {
          return prop;
        } else {
          return (prop.variety === props.PROP_FORALL) ?
              ForAll.of(quant.name, body) : Exists.of(quant.name, body);
        }

      default:
        throw new Error(`unknown variety ${prop.variety}`);
    }
  }

  static getDefinition(env: Environment, name: string): Proposition {
    // Retrieve the actual definition from its name.
    if (!env.hasDefinition(name)) {
      throw new InvalidRule(RULE_DEFINITION, `no definition of "${name}"`);
    }
    return env.getDefinition(name);
  }
}


/** Generates an equation or inequality if it follows from other known facts. */
export class Algebra extends Rule {
  eq: Predicate;  // equation/inequality to prove
  known: Rule[];  // list of known equations/inequalities

  constructor(env: Environment, eq: Proposition, ...known: Rule[]) {
    super(RULE_ALGEBRA, env);

    this.checkVarsInProp(eq);

    // Make sure the fact to be proven is an equation or inequality.
    if (!IsEquation(eq) && !IsInequality(eq)) {
      throw new InvalidRule(RULE_ALGEBRA,
          `first argument to algebra must be an equation or inequality, not ${eq.to_string()}`);
    }

    // Make sure all the cited facts are equations or inequalities.
    const known_preds: Predicate[] = [];
    for (const eqn of known) {
      if (!IsEquation(eqn.apply()) && !IsInequality(eqn.apply())) {
        throw new InvalidRule(RULE_ALGEBRA,
            `all arguments to algebra must be equations or inequalities, not ${eqn.apply().to_string()}`);
      }
      known_preds.push(eqn.apply() as Predicate);
    }

    // Decide whether to use inequality or equation solver.
    const useInequality = IsInequality(eq) ||
        known_preds.some((p) => IsInequality(p));

    if (useInequality) {
      if (!IsInequalityImplied(known_preds, eq as Predicate)) {
        const facts = known_preds.map((p) => p.to_string());
        throw new InvalidRule(RULE_ALGEBRA,
            `${eq.to_string()} does not appear to be implied by the cited facts: ${facts.join(" | ")}`);
      }
    } else {
      // Pure equations: add an irrelevant equation if none was given so the
      // Smith normal form solver has something to work with.
      const eqs = known_preds.slice(0);
      if (eqs.length === 0) {
        const varNames = Array.from((eq as Predicate).free_vars());
        const varName = (varNames.length === 0) ? props.NewVarName() : varNames[0];
        const varExpr = new Variable(varName);
        eqs.push(Predicate.equal(varExpr, varExpr));
      }

      if (!IsEquationImplied(eqs, eq as Predicate)) {
        const facts = eqs.map((eqn) => eqn.to_string());
        throw new InvalidRule(RULE_ALGEBRA,
            `${eq.to_string()} does not appear to be implied by the cited equations: ${facts.join(" | ")}`);
      }
    }

    this.eq = eq as Predicate;
    this.known = known;
  }

  doApply(): Proposition {
    return this.eq;
  }
}