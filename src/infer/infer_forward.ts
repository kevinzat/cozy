// Routines for doing forward reasoning. Each completed line of reasoning
// includes a rule and the fact (proposition) that it proves. Each is given
// a line number describing its location in the proof. Rules refer to their
// required premises using line numbers.
//
// Note that this module does not refer to Proof objects, which are defined
// elsewhere. Instead, it abstracts over them by talking only about Lines
// and ways of looking up Lines (via line numbers and other means).

import { SplitQuantifiers, RenameQuantifiers, FALSE } from '../facts/props';
import { ParseError } from '../facts/props_parser';
import { Environment, SubproofEnv } from './env';
import { UserError } from '../facts/user_error';
import { Rule } from './rules';
import { LineRef, RuleAst, RelativizeRef } from './rules_ast';
import grammar from './infer_forward_grammar';
import * as nearley from 'nearley';
import * as rules from './rules';
import * as ast from './rules_ast';


/**
 * Returns the line referred to throws an exception. In the former case, this
 * also returns the line ref to be stored, allowing normalization if desired.
 */
export type LookupByRef = (ref: LineRef) => Rule;


/**
 * Parses a rule, throwing 'syntax error' if not possible. This returns an array
 * of parsed elements. The actual rule is created by CreateRule below, which
 * must be passed a way to retrieve propositions from their line numbers.
 */
export function ParseForwardRule(text: string, makeRel?: RelativizeRef): RuleAst {
  const parser =
      new nearley.Parser(nearley.Grammar.fromCompiled(grammar as any));
  try {
    parser.feed(text);
  } catch (e) {
    if (e instanceof UserError) {
      throw e;
    } else {
      throw new ParseError(text, 0);
    }
  }
  if (parser.results.length === 1) {
    if (parser.results[0] instanceof RuleAst) {
      let parsed = parser.results[0];
      if (makeRel !== undefined)
        parsed.relativize(makeRel);
      return parsed;
    } else {
      throw new Error(`parsing "${text}" did not produce a RuleAst`);
    }
  } else {
    throw new ParseError(text, parser.results.length);
  }
}


/**
 * Returns an instance of the rule described or throws a string describing an
 * error that prevented its creation. The first argument is the environment in
 * which the proof is being created.
 * 
 * Note that this will also mutate parsed by replacing any line references with
 * the ones returned by the getLine_ function passed in.
 * 
 * Note that this rule does not handle assumption, which users should not be
 * creating, but it does allow given, which an be used anywhere. This rule also
 * does not allowe direct proof / intro forall, which require special handling.
 */
export function CreateRule(
    env: Environment, parsed: RuleAst, getLine: LookupByRef,
    subEnv?: Environment): Rule {
  switch (parsed.variety) {
    case rules.RULE_GIVEN:
      if (parsed instanceof ast.GivenAst)
        return new rules.Given(env, parsed.prop);

    case rules.RULE_CITE:
      if (parsed instanceof ast.CiteAst)
        return new rules.Cite(env, parsed.name);

    case rules.RULE_REPEAT:
      if (parsed instanceof ast.RepeatAst)
        return new rules.Repeat(env, getLine(parsed.ref));

    case rules.RULE_MODUS_PONENS:
      if (parsed instanceof ast.ModusPonensAst)
        return new rules.ModusPonens(env, getLine(parsed.ref1), getLine(parsed.ref2));

    case rules.RULE_DIRECT_PROOF:
      if (parsed instanceof ast.DirectProofAst) {
        if (subEnv === undefined) {
          throw new Error("direct proof requires a subproof");
        } else {
          return new rules.DirectProof(env, subEnv);
        }
      }

    case rules.RULE_ELIM_AND:
      if (parsed instanceof ast.ElimAndAst)
        return new rules.ElimAnd(env, getLine(parsed.ref), parsed.left);

    case rules.RULE_INTRO_AND:
      if (parsed instanceof ast.IntroAndAst)
        return new rules.IntroAnd(env, getLine(parsed.ref1), getLine(parsed.ref2));

    case rules.RULE_ELIM_OR:
      if (parsed instanceof ast.ElimOrAst)
        return new rules.ElimOr(env, getLine(parsed.ref1), getLine(parsed.ref2));

    case rules.RULE_SIMPLE_CASES:
      if (parsed instanceof ast.SimpleCasesAst)
        return new rules.SimpleCases(env, getLine(parsed.ref1), getLine(parsed.ref2));

    case rules.RULE_CASES:
      if (parsed instanceof ast.CasesAst)
        return new rules.Cases(env, getLine(parsed.ref1), getLine(parsed.ref2), getLine(parsed.ref3));

    case rules.RULE_INTRO_OR:
      if (parsed instanceof ast.IntroOrAst)
        return new rules.IntroOr(env, getLine(parsed.ref), parsed.prop, parsed.right);

    case rules.RULE_CONTRADICTION:
      if (parsed instanceof ast.PrincipiumContradictionisAst)
        return new rules.PrincipiumContradictionis(env, getLine(parsed.ref1), getLine(parsed.ref2));

    case rules.RULE_ABSURDUM:
      if (parsed instanceof ast.ReductioAdAbsurdumAst) {
        if (subEnv === undefined) {
          throw new Error("absurdum requires a subproof");
        } else {
          return new rules.ReductioAdAbsurdum(env, subEnv);
        }
      }

    case rules.RULE_EX_FALSO:
      if (parsed instanceof ast.ExFalsoQuodlibetAst)
        return new rules.ExFalsoQuodlibet(env, getLine(parsed.ref), parsed.prop);

    case rules.RULE_VERUM:
      if (parsed instanceof ast.AdLitteramVerumAst)
        return new rules.AdLitteramVerum(env);

    case rules.RULE_TAUTOLOGY:
      if (parsed instanceof ast.TautologyAst)
        return new rules.Tautology(env, parsed.prop);

    case rules.RULE_EQUIVALENT:
      if (parsed instanceof ast.EquivalentAst)
        return new rules.Equivalent(env, getLine(parsed.ref), parsed.prop);

    case rules.RULE_ELIM_FORALL:
      if (parsed instanceof ast.ElimForAllAst)
        return new rules.ElimForAll(env, getLine(parsed.ref), parsed.exprs);

    case rules.RULE_INTRO_FORALL:
      if (parsed instanceof ast.IntroForAllAst) {
        if (subEnv === undefined) {
          throw new Error("intro forall requires a subproof");
        } else {
          if (parsed.innerNames === undefined) {
            return new rules.IntroForAll(env, subEnv);
          } else {
            const [newNames, _body] = SplitQuantifiers(parsed.prop);
            return new rules.IntroForAll(env, subEnv,
                newNames.slice(0, parsed.innerNames.length));
          }
        }
      }

    case rules.RULE_ELIM_EXISTS:
      if (parsed instanceof ast.ElimExistsAst)
        return new rules.ElimExists(env, getLine(parsed.ref), parsed.varName);

    case rules.RULE_INTRO_EXISTS:
      if (parsed instanceof ast.IntroExistsAst)
        return new rules.IntroExists(env, getLine(parsed.ref), parsed.expr, parsed.varName, parsed.result);

    case rules.RULE_INDUCTION:
      if (parsed instanceof ast.InductionAst)
        return new rules.Induction(env, getLine(parsed.ref1), getLine(parsed.ref2));

    case rules.RULE_SUBSTITUTE:
      if (parsed instanceof ast.SubstituteAst) {
        return new rules.Substitute(
            env, getLine(parsed.eqRef), parsed.right, getLine(parsed.ref), parsed.result);
      }

    case rules.RULE_DEFINITION:
      if (parsed instanceof ast.DefinitionAst) {
        return new rules.Definition(env,
            parsed.name, parsed.right, getLine(parsed.ref), parsed.result);
      }

    case rules.RULE_APPLY:
      if (parsed instanceof ast.ApplyAst)
        return new rules.Apply(env, parsed.name, getLine(parsed.ref), ...parsed.exprs);

    case rules.RULE_ALGEBRA:
      if (parsed instanceof ast.AlgebraAst) {
        const knowns = parsed.refs.map((ref: LineRef) => getLine(ref));
        return new rules.Algebra(env, parsed.prop, ...knowns);
      }

    default:
      throw new Error(`unknown rule variety ${parsed.variety}`);
  }
}


/** Returns the environment for the subproof needed for the given rule. */
export function CreateSubproofEnv(env: Environment, parsed: RuleAst): SubproofEnv {
  if (parsed instanceof ast.DirectProofAst) {
    CheckVariableNames(rules.RULE_DIRECT_PROOF, env, parsed.prop.free_vars());
    return new SubproofEnv(env, parsed.prop.conclusion, parsed.prop.premise);

  } else if (parsed instanceof ast.ReductioAdAbsurdumAst) {
    CheckVariableNames(rules.RULE_ABSURDUM, env, parsed.prop.free_vars());
    return new SubproofEnv(env, FALSE, parsed.prop.prop);

  } else if (parsed instanceof ast.IntroForAllAst) {
    let sub: SubproofEnv;
    if (parsed.innerNames === undefined) {
      const [varNames, body] = SplitQuantifiers(parsed.prop);
      CheckAvailableNames(env, varNames);
      sub = new SubproofEnv(env, body, undefined, varNames);
    } else {
      const prop = RenameQuantifiers(parsed.prop, parsed.innerNames);
      let [_innerNames, innerBody] = SplitQuantifiers(prop, parsed.innerNames.length);
      CheckAvailableNames(env, parsed.innerNames);
      sub = new SubproofEnv(env, innerBody, undefined, parsed.innerNames);
    }

    CheckVariableNames(rules.RULE_INTRO_FORALL, sub, sub.conclusion!.free_vars());
    return sub;

  } else {
    throw new Error(`unknown rule using subproof: ${rules.RuleName(parsed.variety)}`);
  }
}

// Makes sure that all the given variable names are in scope.
function CheckVariableNames(variety: number, env: Environment, varNames: Set<string>): void {
  const known = new Set(env.getVariablesInScope());
  for (const varName of varNames) {
    if (!known.has(varName)) {
      throw new rules.InvalidRule(variety,
          `no variable called "${varName}" is in scope`);
    }
  }
}

// Makes sure that we can create a subenvironment with given variable names.
function CheckAvailableNames(env: Environment, varNames: string[]): void {
  for (const varName of varNames) {
    if (!env.isAvailableName(varName)) {
      throw new rules.InvalidRule(rules.RULE_INTRO_FORALL,
          `the name ${varName} is already in use`);
    }
  }
}