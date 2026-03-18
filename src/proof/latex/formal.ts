import { Proposition } from '../../facts/props';
import * as props from '../../facts/props';
import { Expression, Call } from '../../facts/exprs';
import * as exprs from '../../facts/exprs';
import * as rules from '../../infer/rules';
import { Proof, GetDepth, RelToAbsLineRef } from '../proof';
import {
    isAbsLineRef, isRelLineRef, AbsLineRef, RuleAst, AssumptionAst, CiteAst,
    GivenAst, RepeatAst, ModusPonensAst, DirectProofAst, ElimAndAst,
    IntroAndAst, ElimOrAst, SimpleCasesAst, CasesAst, IntroOrAst,
    PrincipiumContradictionisAst, ReductioAdAbsurdumAst, ExFalsoQuodlibetAst,
    AdLitteramVerumAst, TautologyAst, EquivalentAst, ElimForAllAst,
    IntroForAllAst, ElimExistsAst, IntroExistsAst, SubstituteAst, DefinitionAst,
    ApplyAst, AlgebraAst, InductionAst
  } from '../../infer/rules_ast';


/** Returns text to render this formal proof in LaTeX. */
export function FormalProof(proof: Proof): string {
  const lines = [];
  lines.push("$$ \\begin{aligned}");
  lines.push("& \\begin{aligned}");
  AddPropLines(proof, [], lines);
  lines.push("\\end{aligned} & \\qquad & \\begin{aligned}")
  AddRuleLines(proof, [], GetDepth(proof), lines, false);
  lines.push("\\end{aligned}")
  lines.push("\\end{aligned} $$")
  return lines.join("\n");
}


/** Adds a line describing each proposition in the given subproof. */
function AddPropLines(
    proof: Proof, outerNum: number[], lines: string[]): void {

  if (!proof.env.isTopLevel()) {
    const vars = proof.env.getVariables().map((n) => "$" + n + "$");
    if (vars.length === 1) {
      lines.push(`& \\text{Let ${vars[0]} be arbitrary.} \\\\`);
    } else if (vars.length === 2) {
      lines.push(`& \\text{Let ${vars[0]} and ${vars[1]} be arbitrary.} \\\\`);
    } else if (vars.length > 2) {
      const n = vars.length;
      lines.push(`& \\text{Let ${vars.slice(0, n-1).join(", ")}, and ${vars[n-1]} be arbitrary.} \\\\`);
    }
  }

  for (let i = 0; i < proof.lines.length; i++) {
    const num = outerNum.concat([i+1]);

    const sub = proof.lines[i].sub;
    if (sub !== undefined) {
      lines.push("& \\begin{aligned}");
      AddPropLines(sub, num, lines);
      lines.push("\\end{aligned} \\\\");
    }

    const desc = DescribeProp(proof.lines[i].rule.apply());
    const end = (i + 1 == proof.lines.length) ? "" : " \\\\";
    lines.push(`${num.join(".")}.\\quad& ${desc}${end}`);
  }
}


/** Adds a line describing each rule in the given subproof. */
function AddRuleLines(
    proof: Proof, outerNum: number[], depth: number, lines: string[],
    not_end: boolean): void {

  if (!proof.env.isTopLevel()) {
    const vars = proof.env.getVariables();
    if (vars.length > 0)
      lines.push("& \\text{} \\\\")
  }

  const parts = [];
  for (let i = 0; i < depth; i++) {
    parts.push(" \\qquad");
  }
  const indent = parts.join("");

  for (let i = 0; i < proof.lines.length; i++) {
    const num = outerNum.concat([i+1]);

    const sub = proof.lines[i].sub;
    if (sub !== undefined)
      AddRuleLines(sub ,num, depth - 1, lines, true);

    const desc = DescribeRule(proof.lines[i].parsed, num);
    const end = (!not_end && i + 1 == proof.lines.length) ? "" : " \\\\";
    lines.push(`&${indent} \\text{${desc}}${end}`);
  }
}


/**
 * Returns LaTeX that displays the given proposition. This assumes it will be
 * placed in math mode.
 */
export function DescribeProp(prop: Proposition): string {
  let descLeft: string;
  let descRight: string;
  let desc: string;
  switch (prop.variety) {
    case props.PROP_TRUE:
      return "\\top";
    case props.PROP_FALSE:
      return "\\bot";

    case props.PROP_PREDICATE:
      const pred = prop as props.Predicate;
      if (pred.args.length === 0) {
        return pred.name;
      } else {
        const args = pred.args.map((ex) => DescribeExpr(ex));
        if (args.length === 2 && pred.name === props.PRED_EQUAL) {
          return `${args[0]} = ${args[1]}`;
        } else if (args.length === 2 && pred.name === props.PRED_LESS_THAN) {
          return `${args[0]} < ${args[1]}`;
        } else if (args.length === 2 && pred.name === props.PRED_LESS_EQUAL) {
          return `${args[0]} \\leq ${args[1]}`;
        } else if (args.length === 2 && pred.name === props.PRED_ELEMENT_OF) {
          return `${args[0]} \\in ${args[1]}`;
        } else if (args.length === 2 && pred.name === props.PRED_SUBSET) {
          return `${args[0]} \\subseteq ${args[1]}`;
        } else if (args.length === 2 && pred.name === props.PRED_SAME_SET) {
          return `${args[0]} = ${args[1]}`;
        } else if (args.length === 2 && pred.name === "Divides") {
          return `${args[0]}\\ \\mid\\ ${args[1]}`;
        } else if (args.length === 3 && pred.name === "Congruent") {
          return `${args[0]} \\equiv_{${args[2]}} ${args[1]}`;
        } else {
          const name = pred.name.length > 1 ? `\\textsf{${pred.name}}` : pred.name;
          return `${name}(${args.join(", ")})`;
        }
      }

    case props.PROP_NOT:
      const neg = prop as props.Negation;
      return "\\neg " + DescribeWrappedProp(neg.prop, neg.precedence(), false);

    case props.PROP_AND:
      const conj = prop as props.Conjunction;
      descLeft = DescribeWrappedProp(conj.left, conj.precedence(), false);
      descRight = DescribeWrappedProp(conj.right, conj.precedence(), true);
      return `${descLeft} \\wedge ${descRight}`;

    case props.PROP_OR:
      const disj = prop as props.Disjunction;
      descLeft = DescribeWrappedProp(disj.left, disj.precedence(), false);
      descRight = DescribeWrappedProp(disj.right, disj.precedence(), true);
      return `${descLeft} \\vee ${descRight}`;

    case props.PROP_IMPLIES:
      const cond = prop as props.Implication;
      descLeft = DescribeWrappedProp(cond.premise, cond.precedence(), true);
      descRight = DescribeWrappedProp(cond.conclusion, cond.precedence(), false);
      return `${descLeft} \\to ${descRight}`;

    case props.PROP_IFF:
      const bicond = prop as props.Biconditional;
      descLeft = DescribeWrappedProp(bicond.left, bicond.precedence(), true);
      descRight = DescribeWrappedProp(bicond.right, bicond.precedence(), false);
      return `${descLeft} \\leftrightarrow ${descRight}`;

    case props.PROP_FORALL:
      const forall = prop as props.ForAll;
      desc = DescribeWrappedProp(forall.body, forall.precedence(), false);
      return `\\forall\\,${forall.name}, ${desc}`;
  
    case props.PROP_EXISTS:
      const exists = prop as props.Exists;
      desc = DescribeWrappedProp(exists.body, exists.precedence(), false);
      return `\\exists\\,${exists.name}, ${desc}`;

    default:
      throw new Error(`unknown prop variety ${prop.variety}`);
  }
}

/** As above, but surrounded by (..) if necessary. */
function DescribeWrappedProp(
    prop: Proposition, outer_prec: number, wrap_eq: boolean): string {
  if ((outer_prec < prop.precedence()) ||
      (outer_prec === prop.precedence() && wrap_eq)) {
    return `(${DescribeProp(prop)})`;
  } else {
    return DescribeProp(prop);
  }
}


/**
 * Returns LaTeX that displays the given expression. This assumes it will be
 * placed in math mode.
 */
export function DescribeExpr(expr: Expression): string {
  switch (expr.variety) {
    case exprs.EXPR_CONSTANT:
      return expr.to_string();

    case exprs.EXPR_VARIABLE:
      return expr.to_string();

    case exprs.EXPR_FUNCTION: {
      const call = expr as Call;
      if (Call.isNegation(call)) {
        return `-${DescribeWrappedExpr(call.args[0], call.precedence())}`;
      } else if (Call.isExponentiation(call)) {
        return `${DescribeWrappedExpr(call.args[0], call.precedence())}^${DescribeWrappedExpr(call.args[1], call.precedence())}`;
      } else if (Call.isSetComplement(call)) {
        return `\\overline{${DescribeWrappedExpr(call.args[0], call.precedence())}}`;
      } else if (Call.isSetUnion(call)) {
        return `${DescribeWrappedExpr(call.args[0], call.precedence())} \\cup ${DescribeWrappedExpr(call.args[1], call.precedence())}`;
      } else if (Call.isSetIntersection(call)) {
        return `${DescribeWrappedExpr(call.args[0], call.precedence())} \\cap ${DescribeWrappedExpr(call.args[1], call.precedence())}`;
      } else if (Call.isSetDifference(call)) {
        return `${DescribeWrappedExpr(call.args[0], call.precedence())}\\,\\setminus\\,${DescribeWrappedExpr(call.args[1], call.precedence())}`;
      } else {
        // Group adjacent addition/subtraction and multiplication into single
        // nodes so that it looks more sensible when printed.
        expr = expr.remove_negation();
        expr = expr.associate();
        expr = expr.add_negation();

        if (call.name === exprs.FUNC_ADD || call.name === exprs.FUNC_SUBTRACT) {
          const args = call.args.map(
              (arg) => DescribeWrappedExpr(arg, call.precedence()));
          return (call.name === exprs.FUNC_SUBTRACT) ?
              args.join(" - ") : args.join(" + ");

        } else if (call.name === exprs.FUNC_MULTIPLY) {
          const args = call.args.map(
              (arg) => DescribeWrappedExpr(arg, call.precedence()));
          if (args.length === 0) return "";  // impossible but just to be safe

          const result = [args[0]];
          for (let i = 1; i < args.length; i++) {
            if (call.args[i-1].variety === exprs.EXPR_CONSTANT &&
                StartsWithConstant(call.args[i])) {
              return args.join("{\\cdot}");  // use an explicit dot
            } else {
              return args.join("\\,");  // juxtaposition as multiplication
            }
          }
          return result.join("");

        } else {
          const args = call.args.map((arg) => DescribeExpr(arg)); // no need to wrap
          const name = call.name.length > 1 ? `\\textsf{${call.name}}` : call.name;
          return `${name}(${args.join(", ")})`;
        }
      }
    }

    default:
      throw new Error(`unknown expr variety ${expr.variety}`);
  }
}

/** As above, but surrounded by (..) if necessary. */
function DescribeWrappedExpr(expr: Expression, outer_prec: number): string {
  if (outer_prec > expr.precedence()) {
    return `(${DescribeExpr(expr)})`;
  } else {
    return DescribeExpr(expr);
  }
}


/** Determines if this is a constant or constant^power. */
export function StartsWithConstant(expr: Expression): boolean {
  if (expr.variety === exprs.EXPR_CONSTANT)
    return true;

  if (expr.variety === exprs.EXPR_FUNCTION) {
    const f = expr as Call;
    if ((f.name === exprs.FUNC_EXPONENTIATE) && (f.args.length === 2) &&
        (f.args[0].variety === exprs.EXPR_CONSTANT))
      return true;
  }

  return false;
}


/** Returns the LaTeX description of the given parsed rule. */
function DescribeRule(parsed: RuleAst, from: AbsLineRef): string {
  switch (parsed.variety) {
    case rules.RULE_ASSUMPTION:
      if (parsed instanceof AssumptionAst)
        return `Assumption`;

    case rules.RULE_GIVEN:
      if (parsed instanceof GivenAst)
        return `Given`;

    case rules.RULE_CITE:
      if (parsed instanceof CiteAst)
        return `Cite ${parsed.name}`;

    case rules.RULE_REPEAT:
      if (parsed instanceof RepeatAst)
        return `Repeat ${DescribeLine(from, parsed.ref)}`;

    case rules.RULE_MODUS_PONENS:
      if (parsed instanceof ModusPonensAst)
        return `Modus Ponens: ${DescribeLine(from, parsed.ref1)}, ${DescribeLine(from, parsed.ref2)}`;

    case rules.RULE_DIRECT_PROOF:
      if (parsed instanceof DirectProofAst)
        return `Direct Proof`;

    case rules.RULE_ELIM_AND:
      if (parsed instanceof ElimAndAst)
        return `Elim $\\wedge$: ${DescribeLine(from, parsed.ref)}`;

    case rules.RULE_INTRO_AND:
      if (parsed instanceof IntroAndAst)
        return `Intro $\\wedge$: ${DescribeLine(from, parsed.ref1)}, ${DescribeLine(from, parsed.ref2)}`;

    case rules.RULE_ELIM_OR:
      if (parsed instanceof ElimOrAst)
        return `Elim $\\vee$: ${DescribeLine(from, parsed.ref1)}, ${DescribeLine(from, parsed.ref2)}`;

    case rules.RULE_SIMPLE_CASES:
      if (parsed instanceof SimpleCasesAst)
        return `Simple Cases: ${DescribeLine(from, parsed.ref1)}, ${DescribeLine(from, parsed.ref2)}`;

    case rules.RULE_CASES:
      if (parsed instanceof CasesAst)
        return `Cases: ${DescribeLine(from, parsed.ref1)}, ${DescribeLine(from, parsed.ref2)}, ${DescribeLine(from, parsed.ref3)}`;

    case rules.RULE_INTRO_OR:
      if (parsed instanceof IntroOrAst)
        return `Intro $\\vee$: ${DescribeLine(from, parsed.ref)}`;

    case rules.RULE_CONTRADICTION:
      if (parsed instanceof PrincipiumContradictionisAst)
        return `Contradiction: ${DescribeLine(from, parsed.ref1)}, ${DescribeLine(from, parsed.ref2)}`;

    case rules.RULE_ABSURDUM:
      if (parsed instanceof ReductioAdAbsurdumAst)
        return `Reductio Ad Absurdum`;

    case rules.RULE_EX_FALSO:
      if (parsed instanceof ExFalsoQuodlibetAst)
        return `Ex Falso: ${DescribeLine(from, parsed.ref)}`;

    case rules.RULE_VERUM:
      if (parsed instanceof AdLitteramVerumAst)
        return `Ad Litteram Verum`;

    case rules.RULE_TAUTOLOGY:
      if (parsed instanceof TautologyAst)
        return `Tautology`;

    case rules.RULE_EQUIVALENT:
      if (parsed instanceof EquivalentAst)
        return `Equivalent: ${DescribeLine(from, parsed.ref)}`;

    case rules.RULE_ELIM_FORALL:
      if (parsed instanceof ElimForAllAst)
        return `Elim $\\forall$: ${DescribeLine(from, parsed.ref)}`;

    case rules.RULE_INTRO_FORALL:
      if (parsed instanceof IntroForAllAst)
        return `Intro $\\forall$`;

    case rules.RULE_ELIM_EXISTS:
      if (parsed instanceof ElimExistsAst)
        return `Elim $\\exists$: ${DescribeLine(from, parsed.ref)}`;

    case rules.RULE_INTRO_EXISTS:
      if (parsed instanceof IntroExistsAst)
        return `Intro $\\exists$: ${DescribeLine(from, parsed.ref)}`;

    case rules.RULE_SUBSTITUTE:
      if (parsed instanceof SubstituteAst)
        return `Substitute: ${DescribeLine(from, parsed.eqRef)}, ${DescribeLine(from, parsed.ref)}`;

    case rules.RULE_DEFINITION:
      if (parsed instanceof DefinitionAst)
        return `${parsed.right?'Def of':'Undef'} ${parsed.name}: ${DescribeLine(from, parsed.ref)}`;

    case rules.RULE_APPLY:
      if (parsed instanceof ApplyAst)
        return `Apply ${parsed.name}: ${DescribeLine(from, parsed.ref)}`;

    case rules.RULE_ALGEBRA:
      if (parsed instanceof AlgebraAst) {
        if (parsed.refs.length === 0) {
          return 'Algebra';
        } else {
          const lines = parsed.refs.map((x) => DescribeLine(from, x));
          return `Algebra: ${lines.join(" ")}`;
        }
      }

    case rules.RULE_INDUCTION:
      if (parsed instanceof InductionAst)
        return `Induction: ${DescribeLine(from, parsed.ref1)}, ${DescribeLine(from, parsed.ref2)}`;

    default:
      throw new Error(`unknown rule variety ${parsed.variety}`);
  }
}

/** Returns an absolute description of the given line. */
function DescribeLine(from: AbsLineRef, ref: unknown): string {
  if (isAbsLineRef(ref)) {
    return ref.join(".");
  } else if (isRelLineRef(ref)) {
    return RelToAbsLineRef(from, ref).join(".");
  } else {
    throw new Error("argument not a valid line ref");
  }
}

// Returns a LaTeX description of the set function.
function DescribeSetFunction(name: string): string {
  switch (name) {
    case exprs.FUNC_SET_COMPLEMENT:   return "$\\overline{\\cdot}$";
    case exprs.FUNC_SET_UNION:        return "$\\cup$";
    case exprs.FUNC_SET_INTERSECTION: return "$\\cap$";
    case exprs.FUNC_SET_DIFFERENCE:   return "$\\setminus$";
    default: throw new Error(`unknown set function: ${name}`)
  }
}

// Returns a LaTeX description of the set relation.
function DescribeSetRelation(name: string): string {
  switch (name) {
    case props.PRED_SUBSET:   return "$\\subseteq$";
    case props.PRED_SAME_SET: return "$=$";
    default: throw new Error(`unknown set relation: ${name}`)
  }
}
