import React from 'react';
import { Expression, Call } from '../facts/exprs';
import { Proposition, IsEquation, IsInequality } from '../facts/props';
import { RuleAst, isAbsLineRef, LineRef } from '../infer/rules_ast';
import { TacticAst } from '../infer/tactics_ast';
import * as exprs from '../facts/exprs';
import * as props from '../facts/props';
import * as rules from '../infer/rules';
import * as rulesAst from '../infer/rules_ast';
import * as tactics from '../infer/tactics';
import * as tacticsAst from '../infer/tactics_ast';
import { StartsWithConstant } from '../proof/latex/formal';


/** Returns HTML that displays the given proposition as text. */
export function PropToText(prop: Proposition): JSX.Element {
  return <span className="text-prop">{prop.to_string()}</span>;
}

/** Returns HTML that displays the given proposition. */
export function PropToHtml(prop: Proposition): JSX.Element {
  const parts: any[] = [];
  AddHtml(prop, parts);
  return <span className="prop">{parts}</span>;
}

/** Adds HTML that displays the given proposition to the given parts array. */
function AddHtml(prop: Proposition, parts: any[]): void {
  switch (prop.variety) {

    case props.PROP_TRUE:
      parts.push(<span className="prop-constant">T</span>);
      break;
    case props.PROP_FALSE:
      parts.push(<span className="prop-constant">F</span>);
      break;

    case props.PROP_PREDICATE:
      const pred = prop as props.Predicate;
      if (pred.args.length === 0) {
        parts.push(<span className="prop-predicate">{pred.name}</span>);
      } else if (pred.args.length === 2 && pred.name == props.PRED_EQUAL) {
        parts.push(
            <span className="prop-predicate">
              {ExprToHtml(pred.args[0])} = {ExprToHtml(pred.args[1])}
            </span>);
      } else if (pred.args.length === 2 && pred.name == props.PRED_LESS_THAN) {
        parts.push(
            <span className="prop-predicate">
              {ExprToHtml(pred.args[0])} &lt; {ExprToHtml(pred.args[1])}
            </span>);
      } else if (pred.args.length === 2 && pred.name == props.PRED_LESS_EQUAL) {
        parts.push(
            <span className="prop-predicate">
              {ExprToHtml(pred.args[0])} &le; {ExprToHtml(pred.args[1])}
            </span>);
      } else if (pred.args.length === 2 && pred.name == props.PRED_ELEMENT_OF) {
        parts.push(
            <span className="prop-predicate">
              {ExprToHtml(pred.args[0])} &isin; {ExprToHtml(pred.args[1])}
            </span>);
      } else if (pred.args.length === 2 && pred.name == props.PRED_SAME_SET) {
        parts.push(
            <span className="prop-predicate">
              {ExprToHtml(pred.args[0])} = {ExprToHtml(pred.args[1])}
            </span>);
      } else if (pred.args.length === 2 && pred.name == props.PRED_SUBSET) {
        parts.push(
            <span className="prop-predicate">
              {ExprToHtml(pred.args[0])} &sube; {ExprToHtml(pred.args[1])}
            </span>);
      } else {
        parts.push(<span className="prop-predicate">{pred.name}</span>);
        parts.push("(");
        parts.push(ExprToHtml(pred.args[0]));
        for (let i = 1; i < pred.args.length; i++) {
          parts.push(", ");
          parts.push(<span className="prop-expression">{ExprToHtml(pred.args[i])}</span>);
        }
        parts.push(")");
      }
      break;

    case props.PROP_NOT:
      const neg = prop as props.Negation;
      parts.push(<span className="prop-op">&not;</span>);
      AddWrappedHtml(neg.prop, neg.precedence(), false, parts);
      break;

    case props.PROP_AND:
      const conj = prop as props.Conjunction;
      AddWrappedHtml(conj.left, conj.precedence(), false, parts);
      parts.push(" ");
      parts.push(<span className="prop-op">&and;</span>);
      parts.push(" ");
      AddWrappedHtml(conj.right, conj.precedence(), true, parts);
      break;

    case props.PROP_OR:
      const disj = prop as props.Disjunction;
      AddWrappedHtml(disj.left, disj.precedence(), false, parts);
      parts.push(" ");
      parts.push(<span className="prop-op">&or;</span>);
      parts.push(" ");
      AddWrappedHtml(disj.right, disj.precedence(), true, parts);
      break;

    case props.PROP_IMPLIES:
      const cond = prop as props.Implication;
      AddWrappedHtml(cond.premise, cond.precedence(), true, parts);
      parts.push(" ");
      parts.push(<span className="prop-op">&rarr;</span>);
      parts.push(" ");
      AddWrappedHtml(cond.conclusion, cond.precedence(), false, parts);
      break;

    case props.PROP_IFF:
      const bicond = prop as props.Biconditional;
      AddWrappedHtml(bicond.left, bicond.precedence(), true, parts);
      parts.push(" ");
      parts.push(<span className="prop-op">&#x27F7;</span>);
      parts.push(" ");
      AddWrappedHtml(bicond.right, bicond.precedence(), false, parts);
      break;

    case props.PROP_FORALL:
      const forall = prop as props.ForAll;
      parts.push(<span className="prop-quantifier">&forall;</span>);
      parts.push(<span className="prop-variable">{forall.name}</span>);
      parts.push(", ");
      AddWrappedHtml(forall.body, forall.precedence(), false, parts);
      break;
  
    case props.PROP_EXISTS:
      const exists = prop as props.Exists;
      parts.push(<span className="prop-quantifier">&exist;</span>);
      parts.push(<span className="prop-variable">{exists.name}</span>);
      parts.push(", ");
      AddWrappedHtml(exists.body, exists.precedence(), false, parts);
      break;

    default:
      throw new Error(`unknown prop variety ${prop.variety}`);
  }
}

/** 
 * Like AddHtml but surrounded by (..) if necessary.
 *
 * * outer_prec: the precedence of the parent operator
 * * wrap_eq: if false (the default), do not parenthesize operators with equal precedence
 */
function AddWrappedHtml(
    prop: Proposition, outer_prec: number, wrap_eq: boolean, parts: any[]): void {
  if ((outer_prec < prop.precedence()) ||
      (outer_prec === prop.precedence() && wrap_eq) ||
       IsEquation(prop) || IsInequality(prop)) {
    parts.push("(");
    AddHtml(prop, parts);
    parts.push(")");
  } else {
    AddHtml(prop, parts);
  }
}


/** Adds HTML that displays the given proposition to the given array. */
export function ExprToHtml(expr: Expression): JSX.Element {
  switch (expr.variety) {
    case exprs.EXPR_CONSTANT:
      return <span className="expr-constant">{expr.to_string()}</span>;

    case exprs.EXPR_VARIABLE:
      return <span className="expr-variable">{expr.to_string()}</span>;

    case exprs.EXPR_FUNCTION:
      const call = expr as Call;
      const prec = call.precedence();
      if (Call.isNegation(expr)) {
        return <span className="expr">-{WrapExprToHtml(call.args[0], prec)}</span>;
      } else if (Call.isExponentiation(expr)) {
        return <span className="expr">{WrapExprToHtml(call.args[0], prec, true)}<sup>{call.args[1].to_string()}</sup></span>;
      } else if (Call.isSetComplement(expr)) {
        return <span className="expr">{WrapExprToHtml(call.args[0], prec)}<sup>C</sup></span>;
      } else if (Call.isSetUnion(expr)) {
        return (<span className="expr">
            {WrapExprToHtml(call.args[0], prec)} &cup;{' '}
            {WrapExprToHtml(call.args[1], prec, true)}
          </span>);
      } else if (Call.isSetIntersection(expr)) {
        return (<span className="expr">
            {WrapExprToHtml(call.args[0], prec)} &cap;{' '}
            {WrapExprToHtml(call.args[1], prec, true)}
          </span>);
      } else if (Call.isSetDifference(expr)) {
        return (<span className="expr">
            {WrapExprToHtml(call.args[0], prec)} \{' '}
            {WrapExprToHtml(call.args[1], prec, true)}
          </span>);
      } else if (call.name === exprs.FUNC_ADD || call.name === exprs.FUNC_SUBTRACT) {
        const parts: (string|JSX.Element)[] = [WrapExprToHtml(call.args[0], prec)];
        for (let i = 1; i < call.args.length; i++) {
          parts.push(call.name === exprs.FUNC_SUBTRACT ? " - " : " + ");
          parts.push(WrapExprToHtml(call.args[i], prec, true));
        }
        return <span className="expr">{parts}</span>;
      } else if (call.name === exprs.FUNC_MULTIPLY) {
        const parts: (string|JSX.Element)[] = [WrapExprToHtml(call.args[0], prec)];
        for (let i = 1; i < call.args.length; i++) {
          if (call.args[i-1].variety === exprs.EXPR_CONSTANT &&
              StartsWithConstant(call.args[i])) {
            parts.push(<span className="expr-dot">&bull;</span>);  // dot
          } else {
            parts.push(<span className="expr-mult">&thinsp;</span>);  // juxtaposition
          }
          parts.push(WrapExprToHtml(call.args[i], prec, true));
        }
        return <span className="expr">{parts}</span>;
      } else if (call.args.length == 0) {
        return <span className="expr-function">{call.name}</span>;
      } else {
        const parts: (string|JSX.Element)[] = [
            <span className="expr-function">{call.name}</span>,
            "(", ExprToHtml(call.args[0])
          ];
        for (let i = 1; i < call.args.length; i++) {
          parts.push(", ");
          parts.push(ExprToHtml(call.args[i]));
        }
        parts.push(")");
        return <span className="expr">{parts}</span>;
      }

    default:
      throw new Error(`unknown variety: ${expr.variety}`);
  }
}

/** 
 * Like above but adds parentheses if necessary.
 * 
 * * outer_prec: the precedence of the parent operator
 * * wrap_eq: if false (the default), do not parenthesize operators with equal precedence
 */
function WrapExprToHtml(
    expr: Expression, outer_prec: number, wrap_eq?: boolean): JSX.Element {
  const html = ExprToHtml(expr);
  if (outer_prec > expr.precedence() ||
      (wrap_eq && outer_prec === expr.precedence())) {
    return <span>({html})</span>;
  } else {
    return html;
  }
}


/** Returns HTML that displays the given rule as text. */
export function RuleToText(parsed: RuleAst): JSX.Element {
  if (parsed.variety === rules.RULE_ASSUMPTION) {
    return <span className="text-rule">assumption</span>;
  } else {
    return <span className="text-rule">{parsed.to_string()}</span>;
  }
}

/** Returns HTML that displays a rule. */
export function RuleToHtml(parsed: RuleAst): JSX.Element {
  switch (parsed.variety) {
    case rules.RULE_ASSUMPTION:
      if (parsed instanceof rulesAst.AssumptionAst)
        return <span className="rule">Assumption</span>;

    case rules.RULE_GIVEN:
      if (parsed instanceof rulesAst.GivenAst)
        return <span className="rule">Given</span>;

    case rules.RULE_CITE:
      if (parsed instanceof rulesAst.CiteAst)
        return <span className="rule">Cite {parsed.name}</span>;

    case rules.RULE_REPEAT:
      if (parsed instanceof rulesAst.RepeatAst)
        return <span className="rule">Repeat {LineToHtml(parsed.ref)}</span>;

    case rules.RULE_DIRECT_PROOF:
      if (parsed instanceof rulesAst.DirectProofAst)
      return <span className="rule">Direct Proof</span>;

    case rules.RULE_MODUS_PONENS:
      if (parsed instanceof rulesAst.ModusPonensAst) {
        return <span className="rule">Modus Ponens:{' '}
            {LineToHtml(parsed.ref1)}, {LineToHtml(parsed.ref2)}
          </span>;
      }

    case rules.RULE_INTRO_AND:
      if (parsed instanceof rulesAst.IntroAndAst) {
        return <span className="rule">
            Intro <span className="prop-op">&and;</span>:{' '}
            {LineToHtml(parsed.ref1)}, {LineToHtml(parsed.ref2)}
          </span>;
      }

    case rules.RULE_ELIM_AND:
      if (parsed instanceof rulesAst.ElimAndAst) {
        return <span className="rule">
            Elim <span className="prop-op">&and;</span>:{' '}
            {LineToHtml(parsed.ref)}
          </span>;
      }

    case rules.RULE_INTRO_OR:
      if (parsed instanceof rulesAst.IntroOrAst) {
        return <span className="rule">
            Intro <span className="prop-op">&or;</span>:{' '}
            {LineToHtml(parsed.ref)}
          </span>;
      }

    case rules.RULE_ELIM_OR:
      if (parsed instanceof rulesAst.ElimOrAst) {
        return <span className="rule">
            Elim <span className="prop-op">&or;</span>:{' '}
            {LineToHtml(parsed.ref1)}, {LineToHtml(parsed.ref2)}
          </span>;
      }

    case rules.RULE_SIMPLE_CASES:
      if (parsed instanceof rulesAst.SimpleCasesAst) {
        return <span className="rule">Simple Cases:{' '}
            {LineToHtml(parsed.ref1)}, {LineToHtml(parsed.ref2)}
          </span>;
      }

    case rules.RULE_CASES:
      if (parsed instanceof rulesAst.CasesAst) {
        return <span className="rule">Cases:{' '}
            {LineToHtml(parsed.ref1)}, {LineToHtml(parsed.ref2)}, {LineToHtml(parsed.ref3)}
          </span>;
      }

    case rules.RULE_CONTRADICTION:
      if (parsed instanceof rulesAst.PrincipiumContradictionisAst) {
        return <span className="rule">Principium Contradictionis{' '}
            {LineToHtml(parsed.ref1)} {LineToHtml(parsed.ref2)} 
          </span>;
      }

    case rules.RULE_ABSURDUM:
      if (parsed instanceof rulesAst.ReductioAdAbsurdumAst)
        return <span className="rule">Reductio Ad Absurdum</span>;

    case rules.RULE_EX_FALSO:
      if (parsed instanceof rulesAst.ExFalsoQuodlibetAst) {
        return <span className="rule">Ex Falso Quodlibet{' '}
            {LineToHtml(parsed.ref)}
          </span>;
      }

    case rules.RULE_VERUM:
      if (parsed instanceof rulesAst.AdLitteramVerumAst)
        return <span className="rule">Ad Litteram Verum</span>;

    case rules.RULE_TAUTOLOGY:
      if (parsed instanceof rulesAst.TautologyAst)
        return <span className="rule">Tautology</span>;

    case rules.RULE_EQUIVALENT:
      if (parsed instanceof rulesAst.EquivalentAst) {
        return <span className="rule">Equivalent:{' '}
            {LineToHtml(parsed.ref)}
          </span>;
      }

    case rules.RULE_INTRO_FORALL:
      if (parsed instanceof rulesAst.IntroForAllAst) {
        return <span className="rule">
            Intro <span className="prop-quantifier">&forall;</span>
          </span>;
      }

    case rules.RULE_ELIM_FORALL:
      if (parsed instanceof rulesAst.ElimForAllAst) {
        return <span className="rule">
            Elim <span className="prop-quantifier">&forall;</span>:{' '}
            {LineToHtml(parsed.ref)}
          </span>;
      }

    case rules.RULE_INTRO_EXISTS:
      if (parsed instanceof rulesAst.IntroExistsAst) {
        return <span className="rule">
            Intro <span className="prop-quantifier">&exist;</span>:{' '}
            {LineToHtml(parsed.ref)}
          </span>;
      }

    case rules.RULE_ELIM_EXISTS:
      if (parsed instanceof rulesAst.ElimExistsAst) {
        return <span className="rule">
            Elim <span className="prop-quantifier">&exist;</span>:{' '}
            {LineToHtml(parsed.ref)}
          </span>;
      }

    case rules.RULE_INDUCTION:
      if (parsed instanceof rulesAst.InductionAst) {
        return <span className="rule">Induction:{' '}
            {LineToHtml(parsed.ref1)}, {LineToHtml(parsed.ref2)}
          </span>;
      }
    case rules.RULE_SUBSTITUTE:
      if (parsed instanceof rulesAst.SubstituteAst) {
        return <span className="rule">Substitute:{' '}
            {LineToHtml(parsed.eqRef)}, {LineToHtml(parsed.ref)}
          </span>;
      }

    case rules.RULE_DEFINITION:
      if (parsed instanceof rulesAst.DefinitionAst) {
        return <span className="rule">Def of {parsed.name}:{' '}
            {LineToHtml(parsed.ref)}
          </span>;
      }

    case rules.RULE_APPLY:
      if (parsed instanceof rulesAst.ApplyAst) {
        return <span className="rule">Apply {parsed.name}:{' '}
            {LineToHtml(parsed.ref)}
          </span>;
      }

    case rules.RULE_ALGEBRA:
      if (parsed instanceof rulesAst.AlgebraAst) {
        if (parsed.refs.length === 0)
          return <span className="rule">Algebra</span>;

        const lines: (string|JSX.Element)[] = [];
        for (let i = 0; i < parsed.refs.length; i++) {
          if (i > 0)
            lines.push(', ');
          lines.push(LineToHtml(parsed.refs[i]));
        }
        return <span className="rule">Algebra: <span>{lines}</span></span>;
      }

    default:
      throw new Error(`uknown rule variety ${rules.RuleName(parsed.variety)}`);
  }
}


/** Returns HTML that displays the given tactic as text. */
export function TacticToText(parsed: TacticAst): JSX.Element {
  return <span className="text-rule">{parsed.to_string()}</span>;
}

/** Returns HTML that displays a tactic. */
export function TacticToHtml(parsed: TacticAst): JSX.Element {
  switch (parsed.variety) {
    case tactics.TACTIC_GIVEN:
      if (parsed instanceof tacticsAst.GivenAst)
        return <span className="rule">Given</span>;

    case tactics.TACTIC_CITE:
      if (parsed instanceof tacticsAst.CiteAst)
        return <span className="rule">Cite {parsed.name}</span>;

    case tactics.TACTIC_DIRECT_PROOF:
      if (parsed instanceof tacticsAst.DirectProofAst)
      return <span className="rule">Direct Proof</span>;

    case tactics.TACTIC_MODUS_PONENS:
      if (parsed instanceof tacticsAst.ModusPonensAst)
        return <span className="rule">Modus Ponens</span>;

    case tactics.TACTIC_INTRO_AND:
      if (parsed instanceof tacticsAst.IntroAndAst) {
        return <span className="rule">
            Intro <span className="prop-op">&and;</span>:
          </span>;
      }

    case tactics.TACTIC_ELIM_AND:
      if (parsed instanceof tacticsAst.ElimAndAst) {
        return <span className="rule">
            Elim <span className="prop-op">&and;</span>
          </span>;
      }

    case tactics.TACTIC_INTRO_OR:
      if (parsed instanceof tacticsAst.IntroOrAst) {
        return <span className="rule">
            Intro <span className="prop-op">&or;</span>
          </span>;
      }

    case tactics.TACTIC_ELIM_OR:
      if (parsed instanceof tacticsAst.ElimOrAst) {
        return <span className="rule">
            Elim <span className="prop-op">&or;</span>
          </span>;
      }

    case tactics.TACTIC_SIMPLE_CASES:
      if (parsed instanceof tacticsAst.SimpleCasesAst)
        return <span className="rule">Simple Cases</span>;

    case tactics.TACTIC_CASES:
      if (parsed instanceof tacticsAst.CasesAst)
        return <span className="rule">Cases</span>;

    case tactics.TACTIC_CONTRADICTION:
      if (parsed instanceof tacticsAst.PrincipiumContradictionisAst)
        return <span className="rule">Principium Contradictionis</span>;

    case tactics.TACTIC_ABSURDUM:
      if (parsed instanceof tacticsAst.ReductioAdAbsurdumAst)
        return <span className="rule">Reductio Ad Absurdum</span>;

    case tactics.TACTIC_EX_FALSO:
      if (parsed instanceof tacticsAst.ExFalsoQuodlibetAst)
        return <span className="rule">Ex Falso Quodlibet</span>;

    case tactics.TACTIC_VERUM:
      if (parsed instanceof tacticsAst.AdLitteramVerumAst)
        return <span className="rule">Ad Litteram Verum</span>;

    case tactics.TACTIC_TAUTOLOGY:
      if (parsed instanceof tacticsAst.TautologyAst)
        return <span className="rule">Tautology</span>;

    case tactics.TACTIC_EQUIVALENT:
      if (parsed instanceof tacticsAst.EquivalentAst)
        return <span className="rule">Equivalent</span>;

    case tactics.TACTIC_INTRO_FORALL:
      if (parsed instanceof tacticsAst.IntroForAllAst) {
        return <span className="rule">
            Intro <span className="prop-quantifier">&forall;</span>
          </span>;
      }

    case tactics.TACTIC_ELIM_FORALL:
      if (parsed instanceof tacticsAst.ElimForAllAst) {
        return <span className="rule">
            Elim <span className="prop-quantifier">&forall;</span>
          </span>;
      }

    case tactics.TACTIC_INTRO_EXISTS:
      if (parsed instanceof tacticsAst.IntroExistsAst) {
        return <span className="rule">
            Intro <span className="prop-quantifier">&exist;</span>
          </span>;
      }

    case tactics.TACTIC_ELIM_EXISTS:
      if (parsed instanceof tacticsAst.ElimExistsAst) {
        return <span className="rule">
            Elim <span className="prop-quantifier">&exist;</span>
          </span>;
      }

    case tactics.TACTIC_INDUCTION:
      if (parsed instanceof tacticsAst.InductionAst)
        return <span className="rule">Induction</span>;

    case tactics.TACTIC_SUBSTITUTE:
      if (parsed instanceof tacticsAst.SubstituteAst)
        return <span className="rule">Substitute</span>;

    case tactics.TACTIC_DEFINITION:
      if (parsed instanceof tacticsAst.DefinitionAst)
        return <span className="rule">Def of {parsed.defName}</span>;

    case tactics.TACTIC_APPLY:
      if (parsed instanceof tacticsAst.ApplyAst)
        return <span className="rule">Apply {parsed.thmName}</span>;

    case tactics.TACTIC_ALGEBRA:
      if (parsed instanceof tacticsAst.AlgebraAst)
        return <span className="rule">Algebra</span>;

    default:
      throw new Error(`uknown rule variety ${rules.RuleName(parsed.variety)}`);
  }
}

/** Translates [1, 2, 3] to "1.2.3". */
export function LineToHtml(arg: LineRef): string {
  if (isAbsLineRef(arg)) {
    return arg.join(".");
  } else if (arg.up) {
    const parts = [];
    for (let i = 0; i < arg.up; i++) {
      parts.push("^");
    }
    parts.push(String(arg.lineNum));
    return parts.join("");
  } else {
    throw new Error("argument not an absolute or relative line reference");
  }
}
