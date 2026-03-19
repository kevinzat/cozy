import {
    Predicate, Proposition, Disjunction, Conjunction, Negation, Implication,
    SplitQuantifiers, RenameQuantifiers, UniquifyQuantifiers, IsEquation, IsInequality
  } from '../facts/props';
import { UnifyProps } from '../facts/unify';
import { UserError } from '../facts/user_error';
import { IsEquationImplied } from '../decision/equation';
import { IsInequalityImplied } from '../decision/inequality';
import { Call, Constant, EXPR_CONSTANT, EXPR_VARIABLE, Expression, Variable } from '../facts/exprs';
import { Biconditional, Exists, ForAll } from '../facts/props';
import { CheckEquivalent } from '../decision/equivalent';
import { Environment, SubproofEnv } from './env';
import { RuleAst, LineRef } from './rules_ast';
import * as props from '../facts/props';
import * as ast from './rules_ast';
import { Substitute as SubstituteRule, Definition as DefinitionRule } from './rules';


// NOTE: It's useful to have these match the forward rule numbers, so that we
// can refer to both the rule and tactic with one number.

export const TACTIC_GIVEN = 1;
export const TACTIC_CITE = 2;

export const TACTIC_MODUS_PONENS = 4;
export const TACTIC_DIRECT_PROOF = 5;
export const TACTIC_ELIM_AND = 6;
export const TACTIC_INTRO_AND = 7;
export const TACTIC_ELIM_OR = 8;
export const TACTIC_SIMPLE_CASES = 9;
export const TACTIC_CASES = 10;
export const TACTIC_INTRO_OR = 11;

export const TACTIC_CONTRADICTION = 12;
export const TACTIC_ABSURDUM = 13;
export const TACTIC_EX_FALSO = 14;
export const TACTIC_VERUM = 15;

export const TACTIC_TAUTOLOGY = 16;
export const TACTIC_EQUIVALENT = 17;

export const TACTIC_INTRO_FORALL = 18;
export const TACTIC_ELIM_FORALL = 19;
export const TACTIC_INTRO_EXISTS = 20;
export const TACTIC_ELIM_EXISTS = 21;

export const TACTIC_INDUCTION = 22;

export const TACTIC_SUBSTITUTE = 23;
export const TACTIC_DEFINITION = 24;
export const TACTIC_APPLY = 25;
export const TACTIC_ALGEBRA = 26;
export const TACTIC_SET_FUNCTION = 27;
export const TACTIC_SET_RELATION = 28;


/**
 * Returns a name for the tactic with the given variety. This is only used for
 * error messages, but it should match the names from infer_backward_parser.g.
 */
function TacticName(variety: number): string {
  switch (variety) {
    case TACTIC_GIVEN:            return "given";
    case TACTIC_CITE:             return "cite";

    case TACTIC_MODUS_PONENS:     return "modus ponens";
    case TACTIC_DIRECT_PROOF:     return "direct proof";
    case TACTIC_ELIM_AND:         return "elim and";
    case TACTIC_INTRO_AND:        return "intro and";
    case TACTIC_ELIM_OR:          return "elim or";
    case TACTIC_SIMPLE_CASES:     return "by simple cases";
    case TACTIC_CASES:            return "by cases";
    case TACTIC_INTRO_OR:         return "intro or";

    case TACTIC_CONTRADICTION:    return "conradiction";
    case TACTIC_ABSURDUM:         return "absurdum";
    case TACTIC_EX_FALSO:         return "exfalso";
    case TACTIC_VERUM:            return "verum";

    case TACTIC_TAUTOLOGY:        return "tautology";
    case TACTIC_EQUIVALENT:       return "equivalent";

    case TACTIC_ELIM_FORALL:      return "elim forall";
    case TACTIC_INTRO_FORALL:     return "intro forall";
    case TACTIC_ELIM_EXISTS:      return "elim exists";
    case TACTIC_INTRO_EXISTS:     return "intro exists";

    case TACTIC_INDUCTION:        return "induction";

    case TACTIC_SUBSTITUTE:       return "substitute";
    case TACTIC_DEFINITION:       return "definition";
    case TACTIC_APPLY:            return "apply";
    case TACTIC_ALGEBRA:          return "algebra";

    default:                      return "unknown";
  }
}


/**
 * Represents a tactic that can be used for backwards reasoning. The varieties
 * of tactics are listed above.
 */
export abstract class Tactic {
  variety: number;        // which type of tactic
  env: Environment;       // environment we intend to prove the goal in
  goal: Proposition;      // the goal to be proved by the tactic

  constructor(variety: number, env: Environment, goal: Proposition) {
    this.variety = variety;
    this.env = env;
    this.goal = goal;
  }

  /** Makes sure the given expression only references known variables. */
  checkVarsInExpr(expr: Expression): void {
    const known = new Set(this.env.getVariablesInScope());
    for (const name of expr.vars()) {
      if (!known.has(name))
        throw new InvalidTactic(this.variety, `no variable called "${name}" is in scope`);
    }
  }

  /** Makes sure the expressions in the given proposition only include known variables. */
  checkVarsInProp(prop: Proposition): void {
    const known = new Set(this.env.getVariablesInScope());
    for (const name of prop.free_vars()) {
      if (!known.has(name))
        throw new InvalidTactic(this.variety, `no variable called "${name}" is in scope`);
    }
  }

  /**
   * Returns a list of the premises that would be needed to prove this goal.
   * These same propositions should be passed to the constructor of the rule
   * created by reverse, below. (The constructor may take other propositions as
   * well, as long as those are not assumed to be true.)
   */
  abstract premises(): Proposition[];

  /**
   * Returns a forward rule that produces this goal when applied. The rules
   * producing the premises must come in the same order as premises() returned.
   */
  abstract reverse(premLines: LineRef[]): RuleAst;

  /**
   * Indicates whether the tactic uses a subproof, rather than premises, to
   * prove the goal. In that case, clients should use enclose, rather than
   * reverse, to build the rule.
   */
  hasSubproof(): boolean {
    return false;
  }

  /**
   * Returns an environment for the subproof that will be needed for the rule.
   * This holds the conclusion and either a premise or a list of variables.
   */
  subproof(_env: Environment): Environment {
    throw new Error(`${TacticName(this.variety)} does not use a subproof`);
  }
}


/**
 * Thrown when the caller attempts to use a tactic in an invalid manner.
 * Ordinary bugs should be signalled using an Error.
 */
export class InvalidTactic extends UserError {
  variety: number;  // type of rule that was applied incorrectly
  desc: string;     // description of the problem

  constructor(variety: number, desc: string) {
    super(`Error applying rule ${TacticName(variety)}: ${desc}`);

    // hack workaround of TS transpiling bug (so gross)
    Object.setPrototypeOf(this, InvalidTactic.prototype);

    this.variety = variety;
    this.desc = desc;
  }
}


/** References a fact given in the proof environment. */
export class Given extends Tactic {

  /** Environment here must be before or above the one given to reverse. */
  constructor(env: Environment, goal: Proposition) {
    super(TACTIC_GIVEN, env, goal);

    if (!env.hasHypothesis(goal)) {
      throw new InvalidTactic(TACTIC_GIVEN,
          `${this.goal.to_string()} was not given`);
    }
  }

  premises(): Proposition[] {
    return [];
  }

  reverse(premLines: LineRef[]): RuleAst {
    if (premLines.length !== 0)
      throw new Error('given has no premises');

    return new ast.GivenAst(this.goal);
  }
}


/** References a theorem known in the proof environment. */
export class Cite extends Tactic {
  name: string;  // name of the theorem

  /** Environment here must be before or above the one given to reverse. */
  constructor(env: Environment, goal: Proposition, name: string) {
    super(TACTIC_GIVEN, env, goal);

    if (!env.hasTheorem(name)) {
      throw new InvalidTactic(TACTIC_CITE, `no theorem named ${name}`);
    } else if (!env.getTheorem(name)!.equals_alpha(goal)) {
      throw new InvalidTactic(TACTIC_CITE,
          `theorem named ${name} does not prove ${this.goal.to_string()}`);
    }

    this.name = name;
  }

  premises(): Proposition[] {
    return [];
  }

  reverse(premLines: LineRef[]): RuleAst {
    if (premLines.length !== 0)
      throw new Error('cite has no premises');

    return new ast.CiteAst(this.name);
  }
}


/**
 * Produces a fact from proofs that it holds both when some other prop holds and
 * a proof that that other prop does hold.
 */
export class ModusPonens extends Tactic {
  prop: Proposition;

  constructor(env: Environment, goal: Proposition, prop: Proposition) {
    super(TACTIC_MODUS_PONENS, env, goal);

    this.checkVarsInProp(prop);

    this.prop = prop;
  }

  premises(): Proposition[] {
    return [this.prop, Implication.of(this.prop, this.goal)];
  }

  reverse(premLines: LineRef[]): RuleAst {
    if (premLines.length !== 2)
      throw new Error('modus ponens requires exactly two premises');

    const [premLine, implLine] = premLines;
    return new ast.ModusPonensAst(premLine, implLine);
  }
}


/**
 * Produces an implication from a proof that the conclusion holds when given
 * that the premise already holds.
 */
export class DirectProof extends Tactic {
  constructor(env: Environment, goal: Proposition) {
    super(TACTIC_DIRECT_PROOF, env, goal);

    if (this.goal.variety !== props.PROP_IMPLIES) {
      throw new InvalidTactic(TACTIC_DIRECT_PROOF,
          'argument to direct proof must be an implication');
    }
  }

  hasSubproof(): boolean {
    return true;
  }

  premises(): Proposition[] {
    return [];
  }

  reverse(premLines: LineRef[]): RuleAst {
    if (premLines.length !== 0)
      throw new Error('direct proof has no premises');

    return new ast.DirectProofAst(this.goal);
  }

  subproof(env: Environment): Environment {
    const implies = this.goal as Implication;
    return new SubproofEnv(env, implies.conclusion, implies.premise);
  }
}


/**
 * Produces one part of a known conjunction. The final argument indicates
 * whether the goal appears as the left (vs right) conjunct.
 */
export class ElimAnd extends Tactic {
  alt: Proposition;
  left: boolean;

  constructor(env: Environment, goal: Proposition, alt: Proposition, left: boolean) {
    super(TACTIC_ELIM_AND, env, goal);

    this.checkVarsInProp(alt);

    this.alt = alt;
    this.left = left;
  }

  premises(): Proposition[] {
    if (this.left) {
      return [Conjunction.of(this.goal, this.alt)];
    } else {
      return [Conjunction.of(this.alt, this.goal)];
    }
  }

  reverse(premLines: LineRef[]): RuleAst {
    if (premLines.length !== 1)
      throw new Error('elim and requires exactly one premise');

    return new ast.ElimAndAst(premLines[0], this.left);
  }
}


/** Produces the conjunction of two known facts. */
export class IntroAnd extends Tactic {
  constructor(env: Environment, goal: Proposition) {
    super(TACTIC_INTRO_AND, env, goal);

    if (goal.variety !== props.PROP_AND) {
      throw new InvalidTactic(TACTIC_INTRO_AND,
          'goal of intro and must be a conjunction');
      }
  }

  premises(): Proposition[] {
    const conj = this.goal as props.Conjunction;
    return [conj.left, conj.right];
  }

  reverse(premLines: LineRef[]): RuleAst {
    if (premLines.length !== 2)
      throw new Error('intro and requires exactly two premises');

    const [left, right] = premLines;
    return new ast.IntroAndAst(left, right);
  }
}


/**
 * Produces one part of a known disjunction if we are given that the other part
 * (alt) is known to be false. The final argument indicates whether the goal
 * appears as the left (vs right) disjunct.
 */
export class ElimOr extends Tactic {
  alt: Proposition;
  left: boolean;

  constructor(env: Environment, goal: Proposition, alt: Proposition, left: boolean) {
    super(TACTIC_ELIM_OR, env, goal);

    this.checkVarsInProp(alt);

    this.alt = alt;
    this.left = left;
  }

  premises(): Proposition[] {
    if (this.left) {
      return [Disjunction.of(this.goal, this.alt), Negation.of(this.alt)];
    } else {
      return [Disjunction.of(this.alt, this.goal), Negation.of(this.alt)];
    }
  }

  reverse(premLines: LineRef[]): RuleAst {
    if (premLines.length !== 2)
      throw new Error('elim or requires exactly two premises');

    const [disjRule, negAltRule] = premLines;
    return new ast.ElimOrAst(disjRule, negAltRule);
  }
}


/**
 * Produces a fact from proofs that it holds both when some other prop is true
 * and when that same prop is false.
 */
export class SimpleCases extends Tactic {
  prop: Proposition;  // consider both when this is true and false

  constructor(env: Environment, goal: Proposition, prop: Proposition) {
    super(TACTIC_SIMPLE_CASES, env, goal);

    this.checkVarsInProp(prop);

    this.prop = prop;
  }

  premises(): Proposition[] {
    return [Implication.of(this.prop, this.goal),
            Implication.of(Negation.of(this.prop), this.goal)];
  }

  reverse(premLines: LineRef[]): RuleAst {
    if (premLines.length !== 2)
      throw new Error('by simple cases requires exactly two premises');

    const [leftRule, rightRule] = premLines;
    return new ast.SimpleCasesAst(leftRule, rightRule);
  }
}


/**
 * Produces a fact from proofs that it holds both when some other prop is true
 * and when that same prop is false.
 */
export class Cases extends Tactic {
  disj: Disjunction;  // consider both when this is true and false

  constructor(env: Environment, goal: Proposition, disj: Proposition) {
    super(TACTIC_SIMPLE_CASES, env, goal);

    this.checkVarsInProp(disj);

    if (disj.variety !== props.PROP_OR) {
      throw new InvalidTactic(TACTIC_CASES,
          'argument to by cases must be a disjunction');
    }
    this.disj = disj as Disjunction;
  }

  premises(): Proposition[] {
    return [this.disj,
            Implication.of(this.disj.left, this.goal),
            Implication.of(this.disj.right, this.goal)];
  }

  reverse(premLines: LineRef[]): RuleAst {
    if (premLines.length !== 3)
      throw new Error('by cases requires exactly three premises');

    const [disjRule, leftRule, rightRule] = premLines;
    return new ast.CasesAst(disjRule, leftRule, rightRule);
  }
}


/** Produces the disjunction of a known fact and any other fact. */
export class IntroOr extends Tactic {
  known: Proposition;  // fact that will be already known

  constructor(env: Environment, goal: Proposition, known: Proposition) {
    super(TACTIC_INTRO_OR, env, goal);

    this.checkVarsInProp(known);

    if (goal.variety !== props.PROP_OR) {
      throw new InvalidTactic(TACTIC_INTRO_OR,
          'goal of intro or must be a disjunction');
    }

    const disj = goal as Disjunction;
    if (!known.equals_alpha(disj.left) && !known.equals_alpha(disj.right)) {
      throw new InvalidTactic(TACTIC_INTRO_OR,
          `neither disjunct is ${known.to_string()}`);
    }

    this.known = known;
  }

  premises(): Proposition[] {
    return [this.known];
  }

  reverse(premLines: LineRef[]): RuleAst {
    if (premLines.length !== 1)
      throw new Error('intro or requires exactly one premise');

    const disj = this.goal as Disjunction;
    if (this.known.equals_alpha(disj.left)) {
      return new ast.IntroOrAst(premLines[0], disj.right, true);
    } else if (this.known.equals_alpha(disj.right)) {
      return new ast.IntroOrAst(premLines[0], disj.left, false);
    } else {
       throw new Error("impossible");
    }
  }
}


/** Produces false from known contradicting facts. */
export class PrincipiumContradictionis extends Tactic {
  alt: Proposition;  // fact whose contradiction (negation) is also proved

  constructor(env: Environment, goal: Proposition, alt: Proposition) {
    super(TACTIC_CONTRADICTION, env, goal);

    this.checkVarsInProp(alt);

    if (goal.variety !== props.PROP_FALSE) {
      throw new InvalidTactic(TACTIC_CONTRADICTION,
          'goal of principium contradictionis must be false');
    }

    this.alt = alt;
  }

  premises(): Proposition[] {
    return [this.alt, Negation.of(this.alt)];
  }

  reverse(premLines: LineRef[]): RuleAst {
    if (premLines.length !== 2)
      throw new Error('intro and requires exactly two premises');

    const [left, right] = premLines;
    return new ast.PrincipiumContradictionisAst(left, right);
  }
}


/** Produces a negated fact from a proof that it implies false. */
export class ReductioAdAbsurdum extends Tactic {
  constructor(env: Environment, goal: Proposition) {
    super(TACTIC_ABSURDUM, env, goal);

    if (this.goal.variety !== props.PROP_NOT) {
      throw new InvalidTactic(TACTIC_ABSURDUM,
          'argument to direct proof must be a negation');
    }
  }

  hasSubproof(): boolean {
    return true;
  }

  premises(): Proposition[] {
    return [];
  }

  reverse(premLines: LineRef[]): RuleAst {
    if (premLines.length !== 0)
      throw new Error('reductio has no premises');

    return new ast.ReductioAdAbsurdumAst(this.goal);
  }

  subproof(env: Environment): Environment {
    const neg = this.goal as Negation;
    return new SubproofEnv(env, props.FALSE, neg.prop);
  }
}


/** Produces any other fact from false. */
export class ExFalsoQuodlibet extends Tactic {
  constructor(env: Environment, goal: Proposition) {
    super(TACTIC_EX_FALSO, env, goal);
  }

  premises(): Proposition[] {
    return [props.FALSE];
  }

  reverse(premLines: LineRef[]): RuleAst {
    if (premLines.length !== 1)
      throw new Error('exfalso requires exactly one premises');

    const [rule] = premLines;
    return new ast.ExFalsoQuodlibetAst(rule, this.goal);
  }
}


/** Produces the self-evident proposition "true". */
export class AdLitteramVerum extends Tactic {
  constructor(env: Environment, goal: Proposition) {
    super(TACTIC_VERUM, env, goal);

    if (this.goal.variety !== props.PROP_TRUE) {
      throw new InvalidTactic(TACTIC_VERUM, 'argument to verum must be "true"');
    }
  }

  premises(): Proposition[] {
    return [];
  }

  reverse(premLines: LineRef[]): RuleAst {
    if (premLines.length !== 0)
      throw new Error('verum requires no premises');

    return new ast.AdLitteramVerumAst();
  }
}


/** Generates a given fact provided that it is always true. */
export class Tautology extends Tactic {
  constructor(env: Environment, goal: Proposition) {
    super(TACTIC_TAUTOLOGY, env, goal);

    const reason = CheckEquivalent(this.goal, props.TRUE);
    if (reason != null) {
      throw new InvalidTactic(TACTIC_TAUTOLOGY,
          `${this.goal.to_string()} does not appear to be a tautology (${reason})`);
    }
  }

  premises(): Proposition[] {
    return [];
  }

  reverse(premLines: LineRef[]): RuleAst {
    if (premLines.length !== 0)
      throw new Error('tautology requires no premises');

    return new ast.TautologyAst(this.goal);
  }
}


/** Produces a fact from a known fact that is equivalent (but not identical). */
export class Equivalent extends Tactic {
  prop: Proposition;  // fact that is equivalent to the goal

  constructor(env: Environment, goal: Proposition, prop: Proposition) {
    super(TACTIC_EQUIVALENT, env, goal);

    this.checkVarsInProp(prop);
    
    const reason = CheckEquivalent(this.goal, prop);
    if (reason != null) {
      throw new InvalidTactic(TACTIC_EQUIVALENT,
          `${this.goal.to_string()} does not appear to be equivalent to ${prop.to_string()} (${reason})`);
    }

    this.prop = prop;
  }

  premises(): Proposition[] {
    return [this.prop];
  }

  reverse(premLines: LineRef[]): RuleAst {
    if (premLines.length !== 1)
      throw new Error('equivalent requires exactly one premiss');

    const [rule] = premLines;
    return new ast.EquivalentAst(rule, this.goal);
  }
}


/**
 * Produces a fact from the fact that it holds for all objects. var_name should
 * be a variable appearing in the goal. new_name is the name of the variable
 * representing an arbitrary object.
 */
export class ElimForAll extends Tactic {
  expr: Expression;
  name: string;

  constructor(env: Environment, goal: Proposition, expr: Expression, name: string) {
    super(TACTIC_ELIM_FORALL, env, goal);

    this.checkVarsInExpr(expr);

    this.expr = expr;
    this.name = name;
  }

  premises(): Proposition[] {
    const new_body =
        SubstituteRule.subst(this.goal, this.expr, Variable.of(this.name), false);
    return [ForAll.of(this.name, new_body)];
  }

  reverse(premLines: LineRef[]): RuleAst {
    if (premLines.length !== 1)
      throw new Error('elim forall requires exactly one premise');

    const [rule] = premLines;
    return new ast.ElimForAllAst(rule, [this.expr]);
  }
}


/** Produces a fact from a subproof that holds for an arbitrary variable. */
export class IntroForAll extends Tactic {
  innerNames: string[];  // names for the variables in the subproof

  constructor(env: Environment, goal: Proposition, innerNames?: string[]) {
    super(TACTIC_INTRO_FORALL, env, goal);

    if (goal.variety !== props.PROP_FORALL) {
      throw new InvalidTactic(TACTIC_INTRO_FORALL,
          'goal of intro exists must be a forall');
    }

    const [vars, _body] = SplitQuantifiers(goal);
    if (innerNames === undefined) {
      // Introduce all of the variables with their existing names.
      this.innerNames = vars;
    } else {
      // Make sure the goal has at least as many variables as will be introduced
      if (innerNames.length === 0) {
        throw new Error("intro forall must introduce at least one variable")
      } else if (vars.length < innerNames.length) {
        throw new InvalidTactic(TACTIC_INTRO_FORALL,
            `cannot introduce ${innerNames.length} variables: only ${vars.length} in goal`);
      } else if (new Set(innerNames).size < innerNames.length ||
          new Set(vars.slice(0, innerNames.length)).size < innerNames.length) {
        throw new InvalidTactic(TACTIC_INTRO_FORALL, 'variable names must be distinct');
      } else {
        this.innerNames = innerNames.slice(0);
      }
    }

    // Make sure the names that will be used inside the subproof are available.
    for (const varName of this.innerNames) {
      if (!env.isAvailableName(varName)) {
        throw new InvalidTactic(TACTIC_INTRO_FORALL,
            `the name ${varName} is already in use`);
      }
    }
  }

  hasSubproof(): boolean {
    return true;
  }

  premises(): Proposition[] {
    return [];
  }

  reverse(premLines: LineRef[]): RuleAst {
    if (premLines.length !== 0)
      throw new Error("intro forall has no premises");

    return new ast.IntroForAllAst(this.goal, this.innerNames);
  }

  subproof(env: Environment): Environment {
    const prop = RenameQuantifiers(this.goal, this.innerNames);
    let [innerNames, innerBody] = SplitQuantifiers(prop, this.innerNames.length);
    return new SubproofEnv(env, innerBody, undefined, innerNames);
  }

  /** Returns the proposition to be proven in the subproof. */
  conclusion(): Proposition {
      const prop = RenameQuantifiers(this.goal, this.innerNames);
      let [_innerNames, innerBody] = SplitQuantifiers(prop, this.innerNames.length);
      return innerBody;
  }
}


/**
 * Produces a fact that gives a name to an object known to exist. The name of
 * this object is passed in as var_name, while new_name is the name for the
 * (bounded) existential variable.
 */
export class ElimExists extends Tactic {
  varName: string;
  newName: string;

  /** Environment here must be before or above the one given to reverse. */
  constructor(env: Environment, goal: Proposition, varName: string, newName: string) {
    super(TACTIC_ELIM_EXISTS, env, goal);

    // Using an existing name could change the meaning of the formula, so we
    // require a new name to be used.
    if (!env.isAvailableName(varName)) {
      throw new InvalidTactic(TACTIC_ELIM_EXISTS,
          `the name ${varName} is already in use`);
    }

    this.varName = varName;
    this.newName = newName;
  }

  premises(): Proposition[] {
    const body = this.goal.subst(this.varName, Variable.of(this.newName));
    return [Exists.of(this.newName, body)];
  }

  reverse(premLines: LineRef[]): RuleAst {
    if (premLines.length !== 1)
      throw new Error('elim exists requires exactly one premise');

    const [rule] = premLines;
    return new ast.ElimExistsAst(rule, this.varName);
  }
}


/**
 * Produces an existential claim from the fact that it holds for a known object.
 * The name of this object is passed as an argument.
 */
export class IntroExists extends Tactic {
  expr: Expression;

  constructor(env: Environment, goal: Proposition, expr: Expression) {
    super(TACTIC_INTRO_EXISTS, env, goal);

    this.checkVarsInExpr(expr);

    if (goal.variety !== props.PROP_EXISTS) {
      throw new InvalidTactic(TACTIC_INTRO_EXISTS,
          'goal of intro exists must be an existential');
    }

    this.expr = expr;
  }

  premises(): Proposition[] {
    const exists = this.goal as Exists;
    return [exists.body.subst(exists.name, this.expr)];
  }

  reverse(premLines: LineRef[]): RuleAst {
    if (premLines.length !== 1)
      throw new Error('intro exists requires exactly one premise');

    // Find the result of performing a blanket substitution of the bound
    // variable name for the free variable in the premise.
    const exists = this.goal as Exists;
    const premise = exists.body.subst(exists.name, this.expr);
    const result = Exists.of(exists.name,
        SubstituteRule.subst(premise, this.expr, Variable.of(exists.name), false));

    // If this gives us what we want, then we can omit providing the statement
    // that we want the rule to generate. Otherwise, we must include it so the
    // rule knows which free variables references should be replaced.
    const [premRule] = premLines;
    return new ast.IntroExistsAst(premRule, this.expr, exists.name,
        result.equals_alpha(exists) ? undefined : exists);
  }
}


/**
 * Produces the claim about all integers at least as large as a given number,
 * given proof that it holds for that number and proof that, if it holds for one
 * number, it holds for the next number.
 */
export class Induction extends Tactic {
  indHyp: ForAll;
  baseCase: bigint;

  constructor(env: Environment, goal: Proposition) {
    super(TACTIC_MODUS_PONENS, env, goal);

    [this.indHyp, this.baseCase] = Induction.parseInductionClaim(goal);
  }

  premises(): Proposition[] {
    return [
        this.indHyp.body.subst(this.indHyp.name, new Constant(this.baseCase)),
        ForAll.of(this.indHyp.name, Implication.of(
            this.indHyp.body,
            this.indHyp.body.subst(this.indHyp.name,
                Call.add(Variable.of(this.indHyp.name), Constant.ONE))))
      ];
  }

  reverse(premLines: LineRef[]): RuleAst {
    if (premLines.length !== 2)
      throw new Error('modus ponens requires exactly two premises');

    const [baseLine, indLine] = premLines;
    return new ast.InductionAst(baseLine, indLine);
  }

  /**
   * Parses a statement that can be proven by induction on the integers.
   * @throws InvalidTactic if the proposition is not if the right form
   * @returns claim for for all integers paired with the first integer for
   *    which it actually is known to hold.
   */
  static parseInductionClaim(goal: Proposition): [ForAll, bigint] {
    if (goal.variety !== props.PROP_FORALL) {
      throw new InvalidTactic(TACTIC_INDUCTION,
          'goal of induction must be a forall');
    }
    const indStmt = goal as ForAll;
    if (indStmt.body.variety !== props.PROP_IMPLIES) {
      throw new InvalidTactic(TACTIC_INDUCTION,
          'goal of induction must be of the form "forall n, (# <= n) -> P(n)');
    }
    const indBody = indStmt.body as Implication;
    if (indBody.premise.variety !== props.PROP_PREDICATE) {
      throw new InvalidTactic(TACTIC_INDUCTION,
          'goal of induction must be of the form "forall n, (# <= n) -> P(n)');
    }
    const baseCheck = indBody.premise as Predicate;
    if (baseCheck.args.length !== 2 ||
        baseCheck.args[0].variety !== EXPR_CONSTANT ||
        baseCheck.args[1].variety !== EXPR_VARIABLE ||
        (baseCheck.args[1] as Variable).name !== indStmt.name) {
      throw new InvalidTactic(TACTIC_INDUCTION,
          'goal of induction must be of the form "forall n, (# <= n) -> P(n)');
    }

    return [
        ForAll.of(indStmt.name, indBody.conclusion),
        (baseCheck.args[0] as Constant).value
      ];
  }

}


/** Produces a fact by substituting an equal value for a variable. */
export class Substitute extends Tactic {
  eq: Predicate;
  right: boolean;  // substitute right for left (or vice versa if false)

  constructor(env: Environment, goal: Proposition, eq: Proposition, right: boolean) {
    super(TACTIC_SUBSTITUTE, env, goal);
    
    this.checkVarsInProp(eq);

    if (eq.variety !== props.PROP_PREDICATE ||
        ((eq as props.Predicate).name !== props.PRED_EQUAL) ||
        ((eq as props.Predicate).args.length !== 2)) {
      throw new InvalidTactic(TACTIC_SUBSTITUTE,
          `first argument to substitute must be an equality, not ${eq.to_string()}`);
    }

    this.eq = eq as Predicate;
    this.right = right;
  }

  premises(): Proposition[] {
    const premise = this.right ?
        SubstituteRule.subst(this.goal, this.eq.args[1], this.eq.args[0], true) :
        SubstituteRule.subst(this.goal, this.eq.args[0], this.eq.args[1], true);
    return [this.eq, premise];
  }

  reverse(premLines: LineRef[]): RuleAst {
    if (premLines.length !== 2)
      throw new Error('substitute requires exactly two premises');

    // See what a blanket substitution of the premise would produce.
    const premise = this.right ?
        SubstituteRule.subst(this.goal, this.eq.args[1], this.eq.args[0], true) :
        SubstituteRule.subst(this.goal, this.eq.args[0], this.eq.args[1], true);
    const result = this.right ?
        SubstituteRule.subst(premise, this.eq.args[0], this.eq.args[1], true) :
        SubstituteRule.subst(premise, this.eq.args[1], this.eq.args[0], true);

    // If this gives the goal, then we can do a normal substitution. If not, we
    // need to tell the rule exactly what we want it to produce.
    const [eqRule, premRule] = premLines;
    return new ast.SubstituteAst(eqRule, this.right, premRule,
        result.equals_alpha(this.goal) ? undefined : this.goal);
  }
}


/** Applies a definition found by its name in the environment. */
export class Definition extends Tactic {
  defName: string;  // name of the definition to be used
  defn: Proposition;
  right: boolean;  // substitute right for left (or vice versa if false)

  constructor(env: Environment, goal: Proposition, defName: string, right: boolean) {
    super(TACTIC_DEFINITION, env, goal);

    this.defName = defName;
    this.defn = UniquifyQuantifiers(Definition.getDefinition(env, defName));
    this.right = right;
    
    const prems = this.premises();  // shhh... don't tell anyone
    if (prems.length === 1 && prems[0].equals_alpha(this.goal)) {
      throw new InvalidTactic(TACTIC_DEFINITION, right ?
          `no uses of ${defName} were found` :
          `no definitions of ${defName} were found`);
      }
  }

  premises(): Proposition[] {
    const [vars, body] = SplitQuantifiers(this.defn);
    const svars = new Set(vars);
    const iff = body as Biconditional;
    const premise = this.right ?
        DefinitionRule.subst(this.goal, iff.right, iff.left, svars) :
        DefinitionRule.subst(this.goal, iff.left, iff.right, svars);
    return [premise];
  }

  reverse(premLines: LineRef[]): RuleAst {
    if (premLines.length !== 1)
      throw new Error('definition requires exactly one premise');

    const [vars, body] = SplitQuantifiers(this.defn);
    const svars = new Set(vars);
    const iff = body as Biconditional;
    const premise = this.right ?
        DefinitionRule.subst(this.goal, iff.right, iff.left, svars) :
        DefinitionRule.subst(this.goal, iff.left, iff.right, svars);

    // See what a blanket substitution of the premise would produce.
    const result = this.right ?
        DefinitionRule.subst(premise, iff.left, iff.right, svars) :
        DefinitionRule.subst(premise, iff.right, iff.left, svars);

    // If this gives the goal, then we can do a normal substitution. If not, we
    // need to tell the rule exactly what we want it to produce.
    const [premLine] = premLines;
    return this.createRuleAst(premLine, 
        result.equals_alpha(this.goal) ? undefined : this.goal);
  }

  static getDefinition(env: Environment, defName: string): Proposition {
    if (!env.hasDefinition(defName)) {
      throw new InvalidTactic(TACTIC_DEFINITION, `no definition of ${defName}`);
    }
    return env.getDefinition(defName);
  }

  createRuleAst(premLine: LineRef, result?: Proposition): RuleAst {
    return new ast.DefinitionAst(this.defName, this.right, premLine, result);
  }
}


/** References a theorem known in the proof environment. */
export class Apply extends Tactic {
  thmName: string;        // name of the theorem
  thmArgs: Expression[];  // expressions to apply to the theorem in order for
                          // its conclusion to match the goal
  thmBody: Implication;   // specialization of the theorem with these args

  constructor(env: Environment, goal: Proposition, name: string) {
    super(TACTIC_APPLY, env, goal);

    // Retrieve the theorem from its name. Note that ProofEnv promises that this
    // will be a theorem per Apply.isTheorem.
    if (!env.hasTheorem(name)) {
      throw new InvalidTactic(TACTIC_APPLY, `no theorem named ${name}`);
    }

    // Make sure the conclusion of the theorem can prove this goal.
    const thm = env.getTheorem(name)!;
    const [vars, body] = SplitQuantifiers(thm);
    const impl = body as Implication;
    const subst = UnifyProps(this.goal, impl.conclusion, new Set(vars));
    if (subst === undefined) {
      throw new InvalidTactic(TACTIC_APPLY,
          `theorem named ${name} does not prove ${this.goal.to_string()}`);
    }

    // Find the list of substitutions to perform in the right order. Note that,
    // in principle, some variables may not have been needed, so they would not
    // end up in the map subst above.
    const exprs: Expression[] = [];
    for (const name of vars) {
      exprs.push(subst.has(name) ? subst.get(name)! : Constant.ZERO);
    }

    // Double check that these substitutions give us what we expect. This should
    // not fail (if unify works properly), but we'll handle it gracefully.
    const exp_impl = Apply.elimForAllRepeated(thm, exprs);
    if (exp_impl.variety !== props.PROP_IMPLIES ||
        !(exp_impl as Implication).conclusion.equals_alpha(this.goal)) {
      throw new InvalidTactic(TACTIC_APPLY,
          `theorem named ${name} does not prove ${this.goal.to_string()}`);
    }

    this.thmName = name;
    this.thmArgs = exprs;
    this.thmBody = exp_impl as Implication;
  }

  premises(): Proposition[] {
    return [this.thmBody.premise];
  }

  reverse(premLines: LineRef[]): RuleAst {
    if (premLines.length !== 1)
      throw new Error('apply requires exactly one premise');

    const [premLine] = premLines;
    return new ast.ApplyAst(this.thmName, premLine, this.thmArgs);
  }

  /**
   * Returns the result of substituting the given expressions for the
   * quantifiers in the given arguments.
   */
  static elimForAllRepeated(prop: Proposition, args: Expression[]): Proposition {
    for (let i = 0; i < args.length; i++) {
      if (prop.variety !== props.PROP_FORALL) {
        throw Error(`expected ${args.length} arguments, but found ${i}`);  // checked earlier
      } else {
        const forall = prop as ForAll;
        prop = forall.body.subst(forall.name, args[i]);
      }
    }
    return prop;
  }
}


/** Generates the goal equation or inequality from other equations/inequalities. */
export class Algebra extends Tactic {
  known: Predicate[];

  constructor(env: Environment, goal: Proposition, ...props: Proposition[]) {
    super(TACTIC_ALGEBRA, env, goal);

    for (const prop of props) {
      this.checkVarsInProp(prop);
    }

    if (!IsEquation(goal) && !IsInequality(goal)) {
      throw new InvalidTactic(TACTIC_ALGEBRA,
          `${this.goal.to_string()} is not an equation or inequality`);
    }
    const pred = this.goal as Predicate;

    const preds: Predicate[] = [];
    for (const prop of props) {
      if (IsEquation(prop) || IsInequality(prop)) {
        preds.push(prop as Predicate);
      } else {
        throw new InvalidTactic(TACTIC_ALGEBRA,
            `${prop.to_string()} is not an equation or inequality`);
      }
    }

    // Decide whether to use inequality or equation solver.
    const useInequality = IsInequality(goal) ||
        preds.some((p) => IsInequality(p));

    if (useInequality) {
      if (!IsInequalityImplied(preds, pred)) {
        throw new InvalidTactic(TACTIC_ALGEBRA,
            `${this.goal.to_string()} does not appear to follow from the given facts`);
      }
    } else {
      if (!IsEquationImplied(preds, pred)) {
        throw new InvalidTactic(TACTIC_ALGEBRA,
            `${this.goal.to_string()} does not appear to follow from the given equations`);
      }
    }

    this.known = preds;
  }

  premises(): Proposition[] {
    return this.known.slice(0);
  }

  reverse(premLines: LineRef[]): RuleAst {
    if (premLines.length !== this.known.length)
      throw new Error(`this algebra rule requires ${this.known.length} premises`);

    return new ast.AlgebraAst(this.goal, premLines);
  }
}
