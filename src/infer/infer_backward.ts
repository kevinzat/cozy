// Routines for doing backward reasoning. The grammar allows rules to be
// described more economically since we can infer some arguments from the
// proposition that we are trying to prove. Since Rule objects can only be
// created in a forward manner, we provide routines to translate a backward rule
// into a forward one (see ReverseRule below).

import { Proposition } from '../facts/props';
import { ParseError } from '../facts/props_parser';
import { Environment } from './env';
import { UserError } from '../facts/user_error';
import { Tactic } from './tactics';
import { TacticAst } from './tactics_ast';
import grammar from './infer_backward_grammar';
import * as nearley from 'nearley';
import * as tactics from './tactics';
import * as ast from './tactics_ast';


/**
 * Parses a rule, throwing 'syntax error' if not possible. This returns an array
 * of parsed elements. The actual rule is created by CreateTactic below, which
 * must be passed a way to retrieve propositions from their line numbers.
 */
export function ParseBackwardRule(text: string): TacticAst {
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
    if (parser.results[0] instanceof TacticAst) {
      return parser.results[0];
    } else {
      throw new Error(`parsing "${text}" did not produce a TacticAst`);
    }
  } else {
    throw new ParseError(text, parser.results.length);
  }
}


/** Creates the tactic described by the backward rule for producing this goal. */
export function CreateTactic(
    env: Environment, parsed: TacticAst, goal: Proposition): Tactic {

  switch (parsed.variety) {
    case tactics.TACTIC_GIVEN:
      if (parsed instanceof ast.GivenAst)
        return new tactics.Given(env, goal);

    case tactics.TACTIC_CITE:
      if (parsed instanceof ast.CiteAst)
        return new tactics.Cite(env, goal, parsed.name);

    case tactics.TACTIC_MODUS_PONENS:
      if (parsed instanceof ast.ModusPonensAst)
        return new tactics.ModusPonens(env, goal, parsed.prop);

    case tactics.TACTIC_DIRECT_PROOF:
      if (parsed instanceof ast.DirectProofAst)
        return new tactics.DirectProof(env, goal);

    case tactics.TACTIC_ELIM_AND:
      if (parsed instanceof ast.ElimAndAst)
        return new tactics.ElimAnd(env, goal, parsed.alt, parsed.left);

    case tactics.TACTIC_INTRO_AND:
      if (parsed instanceof ast.IntroAndAst)
        return new tactics.IntroAnd(env, goal);

    case tactics.TACTIC_ELIM_OR:
      if (parsed instanceof ast.ElimOrAst)
        return new tactics.ElimOr(env, goal, parsed.alt, parsed.left);

    case tactics.TACTIC_SIMPLE_CASES:
      if (parsed instanceof ast.SimpleCasesAst)
        return new tactics.SimpleCases(env, goal, parsed.prop);

    case tactics.TACTIC_CASES:
      if (parsed instanceof ast.CasesAst)
        return new tactics.Cases(env, goal, parsed.prop);

    case tactics.TACTIC_INTRO_OR:
      if (parsed instanceof ast.IntroOrAst)
        return new tactics.IntroOr(env, goal, parsed.prop);

    case tactics.TACTIC_CONTRADICTION:
      if (parsed instanceof ast.PrincipiumContradictionisAst)
        return new tactics.PrincipiumContradictionis(env, goal, parsed.prop);

    case tactics.TACTIC_ABSURDUM:
      if (parsed instanceof ast.ReductioAdAbsurdumAst)
        return new tactics.ReductioAdAbsurdum(env, goal);

    case tactics.TACTIC_EX_FALSO:
      if (parsed instanceof ast.ExFalsoQuodlibetAst)
        return new tactics.ExFalsoQuodlibet(env, goal);

    case tactics.TACTIC_VERUM:
      if (parsed instanceof ast.AdLitteramVerumAst)
        return new tactics.AdLitteramVerum(env, goal);

    case tactics.TACTIC_TAUTOLOGY:
      if (parsed instanceof ast.TautologyAst)
        return new tactics.Tautology(env, goal);

    case tactics.TACTIC_EQUIVALENT:
      if (parsed instanceof ast.EquivalentAst)
        return new tactics.Equivalent(env, goal, parsed.prop);

    case tactics.TACTIC_ELIM_FORALL:
      if (parsed instanceof ast.ElimForAllAst)
        return new tactics.ElimForAll(env, goal, parsed.expr, parsed.name);

    case tactics.TACTIC_INTRO_FORALL:
      if (parsed instanceof ast.IntroForAllAst)
        return new tactics.IntroForAll(env, goal, parsed.innerNames);

    case tactics.TACTIC_ELIM_EXISTS:
      if (parsed instanceof ast.ElimExistsAst)
        return new tactics.ElimExists(env, goal, parsed.varName, parsed.newName);

    case tactics.TACTIC_INTRO_EXISTS:
      if (parsed instanceof ast.IntroExistsAst)
        return new tactics.IntroExists(env, goal, parsed.expr);

    case tactics.TACTIC_INDUCTION:
      if (parsed instanceof ast.InductionAst)
        return new tactics.Induction(env, goal);

    case tactics.TACTIC_SUBSTITUTE:
      if (parsed instanceof ast.SubstituteAst)
        return new tactics.Substitute(env, goal, parsed.eq, parsed.right);

    case tactics.TACTIC_DEFINITION:
      if (parsed instanceof ast.DefinitionAst)
        return new tactics.Definition(env, goal, parsed.defName, parsed.right);

    case tactics.TACTIC_APPLY:
      if (parsed instanceof ast.ApplyAst)
        return new tactics.Apply(env, goal, parsed.thmName);

    case tactics.TACTIC_ALGEBRA:
      if (parsed instanceof ast.AlgebraAst)
        return new tactics.Algebra(env, goal, ...parsed.props);

    default:
      throw new Error(`unsupported variety ${parsed.variety}`);
  }
}
