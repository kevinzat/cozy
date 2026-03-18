import {
    Exists, ForAll, Implication, Negation, Proposition, IsEquation,
    IsInequality, IsSubset, IsSameSet, IsElementOf
  } from '../../facts/props';
import {
    LineRef, isAbsLineRef, AssumptionAst, CiteAst, GivenAst, RepeatAst,
    ModusPonensAst, DirectProofAst, ElimAndAst, IntroAndAst, ElimOrAst,
    SimpleCasesAst, CasesAst, IntroOrAst, PrincipiumContradictionisAst,
    ReductioAdAbsurdumAst, ExFalsoQuodlibetAst, AdLitteramVerumAst,
    TautologyAst, EquivalentAst, ElimForAllAst, IntroForAllAst, ElimExistsAst,
    IntroExistsAst, SubstituteAst, DefinitionAst,
    ApplyAst, AlgebraAst, InductionAst
  } from '../../infer/rules_ast';
import { Proof } from '../proof';
import { DescribeProp } from './formal';
import * as exprs from '../../facts/exprs';
import * as props from '../../facts/props';
import * as rules from '../../infer/rules';
import { Induction } from '../../infer/tactics';


/** Returns LaTeX to render this proof as a list of English paragraphs. */
export function EnglishProof(proof: Proof): string[] {
  const text: string[][] = [[]];
  AddEnglishForLine([proof], proof.lines.length - 1, text, new Set());

  // If we added an empty paragraph that was never filled in, we can drop it.
  while (text[text.length-1].length === 0)
    text.pop();

  return text.map((p) => p.join(" "));
}

/** Adds text (sentences inside paragraphs) explaining this rule. */
function AddEnglishForLineRef(
    proofs: Proof[], ref: LineRef, text: string[][], known: Set<string>): Proposition {

  let newProofs: Proof[];
  let lineNum: number;
  if (isAbsLineRef(ref)) {
    newProofs = proofs.slice(0, ref.length);
    lineNum = ref[ref.length-1];
  } else {
    newProofs = proofs.slice(0, proofs.length - ref.up + 1);
    lineNum = ref.lineNum;
  }

  if (newProofs.length === proofs.length) {
    AddEnglishForLine(proofs, lineNum - 1, text, known);
  } else {
    AddEnglishForLine(newProofs, lineNum - 1, text, new Set());
  }

  const proof = newProofs[newProofs.length-1];
  const line = proof.lines[lineNum - 1];
  return line.rule.apply();
}

/** Adds text (sentences inside paragraphs) explaining this rule. */
function AddEnglishForLine(
    proofs: Proof[], index: number, text: string[][], known: Set<string>): void {

  const proof = proofs[proofs.length-1];
  if (index < 0 || proof.lines.length <= index)
    throw new Error(`index ${index} should be less than ${proof.lines.length}`);

  const line = proof.lines[index];
  const prop = line.rule.apply();
  if (known.has(prop.to_string_alpha()))
    return;  // do not repeat

  const parsed = line.parsed;
  switch (parsed.variety) {
    case rules.RULE_ASSUMPTION:
      if (parsed instanceof AssumptionAst) {
        break;  // nothing to say because the direct proof already prints this
      }

    case rules.RULE_GIVEN:
      if (parsed instanceof GivenAst) {
          AddSentence(`We are given that ${PropHolds(parsed.prop)}.`, text);
        break;
      }

    case rules.RULE_CITE:
      if (parsed instanceof CiteAst) {
        AddSentence(`We know from ${parsed.name} that ${PropHolds(prop)}.`, text);
        break;
      }

    case rules.RULE_REPEAT:
      if (parsed instanceof RepeatAst) {
        AddSentence(`We saw above that ${PropHolds(prop)}.`, text);
        break;
      }

    case rules.RULE_MODUS_PONENS:
      if (parsed instanceof ModusPonensAst) {
        const premProp = AddEnglishForLineRef(proofs, parsed.ref1, text, known);
        AddEnglishForLineRef(proofs, parsed.ref2, text, known);
        AddSentence(`Since we know that ${PropHolds(premProp)}, we get that ${PropHolds(prop, 'also')}.`, text);
        break;
      }

    case rules.RULE_DIRECT_PROOF:
      if (parsed instanceof DirectProofAst) {
        if (line.sub === undefined)
          throw new Error('subproof missing from direct proof line')
        AddParagraph(text);
        AddSentence(`Suppose that ${PropHolds((prop as Implication).premise)}.`, text);
        AddEnglishForLine(proofs.concat(line.sub), line.sub.lines.length - 1, text, new Set());
        AddParagraph(text);
        break;
      }

    case rules.RULE_ELIM_AND:
      if (parsed instanceof ElimAndAst) {
        AddEnglishForLineRef(proofs, parsed.ref, text, known);
        AddSentence(`In particular, we see that ${PropHolds(prop)}.`, text);
        break;
      }

    case rules.RULE_INTRO_AND:
      if (parsed instanceof IntroAndAst) {
        AddEnglishForLineRef(proofs, parsed.ref1, text, known);
        AddEnglishForLineRef(proofs, parsed.ref2, text, known);
        AddSentence(`Putting the previous facts together, we see that ${PropHolds(prop)}.`, text);
        break;
      }

    case rules.RULE_ELIM_OR:
      if (parsed instanceof ElimOrAst) {
        const negAlt = AddEnglishForLineRef(proofs, parsed.ref2, text, known);
        AddEnglishForLineRef(proofs, parsed.ref1, text, known);
        AddSentence(`Since we saw that $${DescribeProp((negAlt as Negation).prop)}$ is false, we know that ${PropHolds(prop, 'must')}.`, text);
        break;
      }

    case rules.RULE_SIMPLE_CASES:
      if (parsed instanceof SimpleCasesAst) {
        AddParagraph(text);
        AddSentence("We argue by cases.", text);
        AddParagraph(text);
        const caseT = AddEnglishForLineRef(proofs, parsed.ref1, text, new Set()) as Implication;
        AddParagraph(text);
        const caseF = AddEnglishForLineRef(proofs, parsed.ref2, text, new Set()) as Implication;
        AddParagraph(text);
        AddSentence(`Since we know that either \$${DescribeProp(caseT.premise)}\$ or \$${DescribeProp(caseF.premise)}\$ is true, we can see that ${PropHolds(prop, 'always')}.`, text);
        AddParagraph(text);
        break;
      }

    case rules.RULE_CASES:
      if (parsed instanceof CasesAst) {
        AddParagraph(text);
        AddEnglishForLineRef(proofs, parsed.ref1, text, known);
        AddSentence("We now argue by cases.", text);
        AddParagraph(text);
        const case1 = AddEnglishForLineRef(proofs, parsed.ref2, text, new Set()) as Implication;
        AddParagraph(text);
        const case2 = AddEnglishForLineRef(proofs, parsed.ref3, text, new Set()) as Implication;
        AddParagraph(text);
        AddSentence(`Since we know that either \$${DescribeProp(case1.premise)}\$ or \$${DescribeProp(case2.premise)}\$ is true, we can see that ${PropHolds(prop, 'always')}.`, text);
        AddParagraph(text);
        break;
      }

    case rules.RULE_INTRO_OR:
      if (parsed instanceof IntroOrAst) {
        const opt = AddEnglishForLineRef(proofs, parsed.ref, text, known);
        AddSentence(`Since we know that $${DescribeProp(opt)}$ holds, it follows that ${PropHolds(prop)}.`, text);
        break;
      }

    case rules.RULE_CONTRADICTION:
      if (parsed instanceof PrincipiumContradictionisAst) {
        const opt1 = AddEnglishForLineRef(proofs, parsed.ref1, text, known);
        const opt2 = AddEnglishForLineRef(proofs, parsed.ref2, text, known);
        AddSentence(`Since $${DescribeProp(opt1)}$ and $${DescribeProp(opt2)}$ cannot both be true, we have proven false.`, text);
        break;
      }

    case rules.RULE_ABSURDUM:
      if (parsed instanceof ReductioAdAbsurdumAst) {
        if (line.sub === undefined)
          throw new Error('subproof missing from absurdum line')
        AddParagraph(text);
        AddSentence(`Suppose that $${DescribeProp(parsed.prop.prop)}$ holds.`, text);
        AddEnglishForLine(proofs.concat(line.sub), line.sub.lines.length - 1, text, new Set());
        AddSentence(`This is absurd, so we have shown that ${PropHolds(prop, 'must')}.`, text);
        AddParagraph(text);
        break;
      }

    case rules.RULE_EX_FALSO:
      if (parsed instanceof ExFalsoQuodlibetAst) {
        AddEnglishForLineRef(proofs, parsed.ref, text, known);
        AddSentence(`Since false proves anything, it follows that ${PropHolds(prop)}.`, text);
        break;
      }

    case rules.RULE_VERUM:
      if (parsed instanceof AdLitteramVerumAst) {
        break;  // no need to explain why true is true
      }

    case rules.RULE_TAUTOLOGY:
      if (parsed instanceof TautologyAst) {
        AddSentence(`We know that $${DescribeProp(prop)}$ is always true.`, text);
        break;
      }

    case rules.RULE_EQUIVALENT:
      if (parsed instanceof EquivalentAst) {
        AddEnglishForLineRef(proofs, parsed.ref, text, known);
        AddSentence(`This is equivalent to $${DescribeProp(prop)}$.`, text);
        break;
      }

    case rules.RULE_ELIM_FORALL:
      if (parsed instanceof ElimForAllAst) {
        AddEnglishForLineRef(proofs, parsed.ref, text, known);
        AddSentence(`Since it holds for all objects, we know that ${PropHolds(prop, 'must')}.`, text);
        break;
      }

    case rules.RULE_INTRO_FORALL:
      if (parsed instanceof IntroForAllAst) {
        if (line.sub === undefined)
          throw new Error('subproof missing from intro or line')
        AddParagraph(text);
        const vars = line.sub.env.getVariables();
        const innerNames = DescribeVariables(vars);
        const [outerVars, body] = props.SplitQuantifiers(prop as ForAll, innerNames.length);
        const outerNames = DescribeVariables(outerVars);
        AddSentence(`Let ${innerNames} be arbitrary.`, text);
        AddEnglishForLine(proofs.concat(line.sub), line.sub.lines.length - 1, text, new Set());
        AddSentence(`Since ${innerNames} ${vars.length > 1 ? 'were' : 'was'} arbitrary, ` +
            `we have shown that $${DescribeProp(body)}$ holds for all ${outerNames}.`, text);
        AddParagraph(text);
        break;
      }

    case rules.RULE_ELIM_EXISTS:
      if (parsed instanceof ElimExistsAst) {
        AddEnglishForLineRef(proofs, parsed.ref, text, known);
        AddSentence(`We thus know that \$${DescribeProp(prop)}\$ holds for some \$${parsed.varName}\$.`, text);
        break;
      }

    case rules.RULE_INTRO_EXISTS:
      if (parsed instanceof IntroExistsAst) {
        AddEnglishForLineRef(proofs, parsed.ref, text, known);
        const ex = prop as Exists;
        AddSentence(`This shows that there exists a $${ex.name}$ such that ${PropHolds(ex.body)}.`, text);
        break;
      }

    case rules.RULE_SUBSTITUTE:
      if (parsed instanceof SubstituteAst) {
        const eq = AddEnglishForLineRef(proofs, parsed.eqRef, text, known);
        const fact = AddEnglishForLineRef(proofs, parsed.ref, text, known);
        AddSentence(`Substituting $${DescribeProp(eq)}$ into $${DescribeProp(fact)}$ gives us $${DescribeProp(prop)}$.`, text);
        break;
      }

    case rules.RULE_DEFINITION:
      if (parsed instanceof DefinitionAst) {
        const oldVer1 = AddEnglishForLineRef(proofs, parsed.ref, text, known);
        AddSentence(`By the definition of ${parsed.name}, we can restate $${DescribeProp(oldVer1)}$ as $${DescribeProp(prop)}$.`, text);
        break;
      }

    case rules.RULE_APPLY:
      if (parsed instanceof ApplyAst) {
        const thmPrem = AddEnglishForLineRef(proofs, parsed.ref, text, known);
        AddSentence(`From ${parsed.name} and the fact that ${PropHolds(thmPrem)}, we get that ${PropHolds(prop)}.`, text);
        break;
      }

    case rules.RULE_ALGEBRA:
      if (parsed instanceof AlgebraAst) {
        if (parsed.refs.length === 0) {
          AddSentence(`Some algebra shows that $${DescribeProp(prop)}$.`, text);
          break;
        } else {
          for (let i = 0; i < parsed.refs.length; i++)
            AddEnglishForLineRef(proofs, parsed.refs[i], text, known);
          AddSentence(`After some algebra, these facts tell us that $${DescribeProp(prop)}$.`, text);
          break;
        }
      }

    case rules.RULE_INDUCTION:
      if (parsed instanceof InductionAst) {
        const [hyp, base] = Induction.parseInductionClaim(prop);
        AddEnglishForLineRef(proofs, parsed.ref1, text, known);
        AddEnglishForLineRef(proofs, parsed.ref2, text, known);
        AddSentence(`It follows that ${PropHolds(hyp.body)} for all $${hyp.name} \ge ${base}$ by induction.`, text);
        break;
      }

    default:
      throw new Error(`unknown rule variety ${parsed.variety}`);
  }

  // This is now known 
  known.add(prop.to_string_alpha());
}


/** Makes sure that the text ends with an empty paragarph. */
function AddParagraph(text: string[][]): void {
  if (text[text.length-1].length > 0)
    text.push([]);
}


/** Adds the given sentence to the end of the last paragraph. */
function AddSentence(sentence: string, text: string[][]): void {
  text[text.length-1].push(sentence);
}


/** Returns text explaining that the given proposition holds. */
function PropHolds(prop: Proposition, adj?: 'also' | 'must' | 'must also' | 'always'): string {
  if (prop.variety === props.PROP_IMPLIES) {
    const impl = prop as Implication;
    return `$${DescribeProp(impl.premise)}$ implies $${DescribeProp(impl.conclusion)}$`;
  } else if (IsEquation(prop) || IsInequality(prop) ||
             IsElementOf(prop) || IsSubset(prop) || IsSameSet(prop)) {
    return `$${DescribeProp(prop)}$`;
  } else if (prop.variety === props.PROP_PREDICATE) {
    if (adj == 'also' || adj == 'always') {
      return `$${DescribeProp(prop)}$ is ${adj} true`;
    } else if (adj == 'must' || adj == 'must also') {
      return `$${DescribeProp(prop)}$ ${adj} be true`;
    } else {
      return `$${DescribeProp(prop)}$ is true`;
    }
  } else {
    if (adj == 'also' || adj == 'always') {
      return `$${DescribeProp(prop)}$ ${adj} holds`;
    } else if (adj == 'must' || adj == 'must also') {
      return `$${DescribeProp(prop)}$ ${adj} hold`;
    } else {
      return `$${DescribeProp(prop)}$ holds`;
    }
  }
}


// Returns text giving a list of the given variable names.
function DescribeVariables(vars: string[]): string {
  if (vars.length === 0) {
    throw new Error('missing variable names')
  } else if (vars.length === 1) {
    return `$${vars[0]}$`;
  } else if (vars.length === 2) {
    return `$${vars[0]} and ${vars[1]}`;
  } else {
    const n = vars.length;
    return `${vars.slice(0, n-1).join(", ")}, and ${vars[n-1]}`;
  }
}

// Returns a LaTeX description of the set function.
function DescribeSetFunction(name: string): string {
  switch (name) {
    case exprs.FUNC_SET_COMPLEMENT:   return "set complement";
    case exprs.FUNC_SET_UNION:        return "union";
    case exprs.FUNC_SET_INTERSECTION: return "intersection";
    case exprs.FUNC_SET_DIFFERENCE:   return "set difference";
    default: throw new Error(`unknown set function: ${name}`)
  }
}

// Returns a LaTeX description of the set relation.
function DescribeSetRelation(name: string): string {
  switch (name) {
    case props.PRED_SUBSET:   return "subset";
    case props.PRED_SAME_SET: return "set equality";
    default: throw new Error(`unknown set relation: ${name}`)
  }
}