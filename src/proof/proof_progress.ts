import { Proposition, SplitQuantifiers, RenameQuantifiers, FALSE, TRUE } from '../facts/props';
import { ParseProp } from '../facts/props_parser';
import { Environment } from '../infer/env';
import { Assumption, Repeat, RULE_ASSUMPTION, RuleName } from '../infer/rules';
import { CreateTactic } from '../infer/infer_backward';
import {
    CreateRule, CreateSubproofEnv, ParseForwardRule, LookupByRef
  } from '../infer/infer_forward';
import {
    AbsLineRef, AssumptionAst, DirectProofAst, IntroForAllAst, LineRef,
    ReductioAdAbsurdumAst, RepeatAst, RuleAst, isAbsLineRef, isRecord,
  } from '../infer/rules_ast';
import {
    ProofGoal, Resolution, IsGoalComplete, VisitGoals, ProofGoalJson,
    ProofGoalFromJson, ProofGoalToJson
  } from './proof_goal';
import {
    Proof, Line, GetLine, AbsToRelLineRef, isRegularLine, AddLine,
    InvalidForwardStep, InvalidLineRef, RelToAbsLineRef
  } from './proof';


/**
 * Represents a (sub)proof. This is stored as a list of facts proven forward,
 * which can grow at the end, and a goal tree, which can grow at the leaves.
 * In this representation, mutations do not ever change line numbers:
 *  - forward rules can only refer to earlier lines and those do not change
 *    (we only update the end of the forward lists)
 *  - backward rules do not include line numbers at all! (The UI actually
 *    generates those while rendering.)
 */
export interface ProofProgress extends Proof {
  // env inherited from Proof
  lines: Line<ProofProgress>[];  // forward lines can use backward in subproofs
  goal: ProofGoal;               // tree of backward reasoning
}


/**
 * Map from propositions, or rather their alpha-normalized string forms, to
 * their line numbers.
 */
export type PropToLine = Map<string, number[]>;


/**
 * Visits the subproofs of the tree bottom-up, keeping track at each point of
 * what facts are known (proven forward). The forward visitor is passed the root
 * of the subproof and the facts known after forward reasoning and after both
 * types of reasoning.
 */
export function VisitKnown<R>(
    progress: ProofProgress,
    visit: (progress: ProofProgress, fwd_known: PropToLine,
            all_known: PropToLine, children: R[]) => R): R {
  return VisitKnownHelper(progress, [], new Map(), visit);
}

/** Helper for the function above that includes accumulators. */
function VisitKnownHelper<R>(
    progress: ProofProgress, line_num: number[], outer_known: Map<string, number[]>,
    visit: (progress: ProofProgress, fwd_known: PropToLine,
            all_known: PropToLine, children: R[]) => R): R {

  const known = new Map<string, number[]>();
  const children: R[] = [];

  // Visit all subproofs of forward lines and add those facts to known.
  for (let i = 0; i < progress.lines.length; i++) {
    const num = line_num.concat([i+1]);
    if (progress.lines[i].sub !== undefined) {
      children.push(VisitKnownHelper(progress.lines[i].sub!,
          num, new Map([...outer_known, ...known]), visit));
    }
    known.set(progress.lines[i].rule.apply().to_string_alpha(), num);
  }

  const fwd_known = new Map([...outer_known, ...known]);
  const is_complete = IsGoalComplete(progress.goal, fwd_known);

  // Keep track of the index for the next line. If the proof is not complete,
  // there are two lines between forward and backward lines with input boxes.
  let m = progress.lines.length + 1 + (is_complete ? 0 : 2);

  // Visit all subproofs of backward lines, adding each proposition to known
  // after we leave that subtree.
  VisitGoals<void>(progress.goal,
      (p: Proposition) => {
        if (!fwd_known.has(p.to_string_alpha())) {
          m += 1;  // open goals still get a line number
        }
      },
      (prop: Proposition, _resn: Resolution, _children: void[]) => {
        if (!known.has(prop.to_string_alpha())) {
          const num = line_num.concat([m++]);  // use next available number
          known.set(prop.to_string_alpha(), num);
        }
      });

  const all_known = new Map([...outer_known, ...known]);
  return visit(progress, fwd_known, all_known, children);
}


/** Returns a copy of the given proof but with the given subproof replaced. */
export function ReplaceSubproof(progress: ProofProgress,
    old_subproof: ProofProgress, new_subproof: ProofProgress): ProofProgress {

  // If the given proof is the whole proof, then replace it all.
  if (progress === old_subproof)
    return new_subproof;

  const new_progress: ProofProgress =
      {env: progress.env, lines: [], goal: progress.goal};

  // Replace any subproofs in the forward rules.
  const lines = new_progress.lines;
  for (let i = 0; i < progress.lines.length; i++) {
    const line = progress.lines[i];
    if (line.sub === undefined) {
      lines.push(line);
    } else if (progress.lines[i].sub === old_subproof) {
      lines.push({parsed: line.parsed, rule: line.rule, sub: new_subproof});
    } else {
      const newSub = ReplaceSubproof(line.sub, old_subproof, new_subproof);
      lines.push({parsed: line.parsed, rule: line.rule, sub: newSub});
    }
  }

  return new_progress;
}


/**
 * Determines whether the given proof is complete, which requires that there are
 * no open goals in any subproof. (This should give the same result as
 * GetCompletedProof(env, progress) === undefined, but it is slightly faster.)
 */
export function IsComplete(progress: ProofProgress): boolean {
  return VisitKnown<boolean>(progress,
    (progress: ProofProgress, fwd_known: PropToLine,
     _: PropToLine, children: boolean[]) => {
      return IsGoalComplete(progress.goal, fwd_known) &&
             children.indexOf(false) < 0;
    });
}


/**
 * Returns a completed proof (one with only forward reasoning), by turning all
 * tactics into rules, or undefined if the proof is not yet complete.
 */
export function GetCompletedProof(progress: ProofProgress): Proof|undefined {
  if (!IsComplete(progress)) {
    return undefined;
  } else {
    const known: Map<string, AbsLineRef> = new Map();
    return GetCompletedProofHelper(progress, known, []);
  }
} 

function GetCompletedProofHelper(
    progress: ProofProgress, known: Map<string, AbsLineRef>, proofs: Proof[]): Proof {

  const proof: Proof = {env: progress.env, lines: []};
  proofs.push(proof);

  // Make a new list of lines, replacing subproofs with completed proofs.
  for (const line of progress.lines) {
    if (line.sub === undefined) {
      proof.lines.push(line);  // no change
    } else {
      const sub = GetCompletedProofHelper(line.sub, known, proofs);
      proof.lines.push({parsed: line.parsed, rule: line.rule, sub});
    }
    known.set(line.rule.apply().to_string_alpha(),
        proofs.map((p) => p.lines.length));
  }

  // Important special case: if no rule is found on the goal and yet the proof
  // is complete, it must be the case that the goal was proven earlier. In
  // order to make sure the expected conclusion exists in the subproof,
  // we will add a rule that simply repeats the earlier fact here.
  let goal = progress.goal;
  const n = progress.lines.length;
  if (goal.resn === undefined &&
      (progress.lines.length === 0 ||
       !progress.lines[n - 1].rule.apply().equals_alpha(goal.prop))) {
    const prev_line = known.get(progress.goal.prop.to_string_alpha());
    if (prev_line === undefined)
      throw new Error(`no line found for ${progress.goal.prop.to_string()}`);

    const env = (proof.lines.length === 0) ? progress.env :
        proof.lines[n - 1].rule.envAfter;
    const parsed = new RepeatAst(AbsToRelLineRef(proofs.length, prev_line));
    const rule = new Repeat(env, GetLine(proofs, prev_line));
    proof.lines.push({parsed, rule});

  } else {
    // Add the results form backward reasoning into these lists.
    const line_num = proofs.map((p) => p.lines.length + 1);
    ConvertBackwardToForward(
        goal, known, progress.env,
        line_num.slice(0, line_num.length - 1), (l) => GetLine(proofs, l),
        (_e, _c) => { throw new Error('subproofs not supported here'); },
        proof.lines);
  }

  if (proofs.pop() !== proof)
    throw new Error("proofs stack corrupted");
  return proof;
}


/**
 * Adds all the facts proven in the given goal tree to the given list of lines
 * in an order that will be valid forward reasoning.
 */
export function ConvertBackwardToForward<P extends Proof>(
    goal: ProofGoal, known: PropToLine,
    outerEnv: Environment, outerNum: AbsLineRef, getLine: LookupByRef,
    makeSubproof: (env: Environment, parsed: RuleAst, subEnv?: Environment) => P,
    lines: Line<P>[]): void {

  VisitGoals<AbsLineRef | undefined>(goal,
      (prop: Proposition) => {
        return known.get(prop.to_string_alpha());
      },
      (prop: Proposition, resn: Resolution, childResults: (AbsLineRef | undefined)[]) => {
        const prev_line = known.get(prop.to_string_alpha());
        if (prev_line !== undefined)
          return prev_line;  // already known
        if (resn === undefined)
          return undefined;  // never proven

        const childLines: AbsLineRef[] = [];
        for (let i = 0; i < childResults.length; i++) {
          const result = childResults[i];
          if (result === undefined) {
            const childProp = resn.subgoals[i].prop;
            throw new Error(`no line found for ${childProp.to_string}`);
          }
          childLines.push(result);
        }

        const env = (lines.length === 0) ? outerEnv :
            lines[lines.length - 1].rule.envAfter;
        const tactic = CreateTactic(env, resn.parsed, prop);
        const parsed = tactic.reverse(childLines);

        let rule;
        let sub: P|undefined = undefined;
        if (!tactic.hasSubproof()) {
          rule = CreateRule(env, parsed, getLine);
        } else {
          const subEnv = tactic.subproof(env);
          const conclusion = subEnv.getConclusion();
          if (conclusion === undefined)
            throw new Error("subproof has no conclusion");

          rule = CreateRule(env, parsed, getLine, subEnv);
          sub = makeSubproof(env, parsed, subEnv);
        }

        const lineNum = outerNum.concat(lines.length + 1);
        known.set(rule.apply().to_string_alpha(), lineNum);
        lines.push({parsed, rule, sub});
        return lineNum;
      });
}

/** Returns the given line if it is legal to access from the given line. */
export function GetLineFrom(
    proof: ProofProgress, from: AbsLineRef, ref: LineRef): Line<ProofProgress> {

  const absRef = isAbsLineRef(ref) ? ref : RelToAbsLineRef(from, ref);

  if (from.length < absRef.length)
    throw new InvalidLineRef(ref, "cannot see inside subproofs");

  // Work our way down to the proof containing this line.
  for (let i = 0; i < absRef.length-1; i++) {
    if (absRef[i] < from[i]) {
      const at = absRef.slice(0, i+1).join(".");
      throw new InvalidLineRef(ref, `cannot see inside subproof at ${at}`);
    } else if (absRef[i] > from[i]) {
      const at = absRef.slice(0, i+1).join(".");
      throw new InvalidLineRef(ref, `cannot see later line ${at}`);
    }

    const sub = proof.lines[absRef[i]-1].sub;
    if (sub === undefined) {
      const at = absRef.slice(0, i+1).join(".");
      throw new Error(`at ${from.join(".")} but there is no subproof at ${at}`);
    }
    proof = sub;
  }

  const num = absRef[absRef.length-1];
  if (num < 1)
    throw new InvalidLineRef(ref, `invalid line number ${num}`);
  if (from[absRef.length-1] <= num)
    throw new InvalidLineRef(ref, `cannot see later line ${num}`);
  return proof.lines[num-1];
}

/**
 * JSON for a proof progress combines that of ProofJson (an array of lines) and
 * ProofGoalJson (a record) together in a single record.
 */
export type ProofProgressJson = {
  lines: Array<[string, string] | ProofProgressJson>;
  goal: ProofGoalJson
};


/**
 * Parses a description of proof pgress (see ProofProgressJson above) into an
 * object. This will throw an Error if the shape is wrong. This will throw an
 * InvalidForwardStep if any line of the proof does not prove what is claimed
 * and an InvalidBackwardStep if the tactic premises do not match those given.
 */
export function ProofProgressFromJson(env: Environment, desc: unknown): ProofProgress {
  if (!isProofProgressJson(desc))
    throw new Error('does not look like proof progress JSON');

  const proof: ProofProgress = {env, lines: [], goal: {prop: TRUE}};
  ParseLines([proof], desc.lines);

  const env2 = (proof.lines.length == 0) ? proof.env :
      proof.lines[proof.lines.length-1].rule.envAfter;
  proof.goal = ProofGoalFromJson(env2, desc.goal);
  return proof;
}

// Helper function for above that parses lines of a proof
function ParseLines(proofs: ProofProgress[], lineDescs: unknown[]): void {
  let subproof: ProofProgress | undefined = undefined;
  for (let i = 0; i < lineDescs.length; i++) {
    const line = lineDescs[i];
    if (isRegularLine(line)) {
      const [propDesc, ruleDesc] = line;

      // Add the next line to the proof (except assumptions, which is already
      // added... we just included it in the list for double checking).
      if (ruleDesc !== "assumption") {
        const rule = AddLine(proofs, ruleDesc, subproof);

        // Make sure it produced the proposition given.
        let expProp = ParseProp(propDesc);
        if (!rule.apply().equals_alpha(expProp))
          throw new InvalidForwardStep(ruleDesc, rule.apply(), expProp);
      }

      subproof = undefined;

    } else if (isProofProgressJson(line)) {
      if (i+1 === lineDescs.length)
        throw new Error('subproof must be followed by another line')
      const nextLine = lineDescs[i+1];
      if (!isRegularLine(nextLine))
        throw new Error('subproof must be followed by regular line')
      const [_propDesc, ruleDesc] = nextLine;

      // Create the subproof needed for the next line.
      const proof = proofs[proofs.length-1];
      const env = (proof.lines.length == 0) ? proof.env :
          proof.lines[proof.lines.length-1].rule.envAfter;
      subproof = CreateSubproof(env, ParseForwardRule(ruleDesc));

      // Recursively check that subproof.
      proofs.push(subproof);
      ParseLines(proofs, line.lines);
      proofs.pop();

    } else {
      throw new Error(`expecting an array not ${typeof line}`);
    }
  }
}


// Checks if this looks like a proof progress (or a subproof of one).
function isProofProgressJson(obj: unknown): obj is {lines: unknown[], goal: Record<string, unknown>} {
  if (!isRecord(obj))
    return false;
  return Array.isArray(obj.lines) && isRecord(obj.goal);
}


/**
 * Returns a subproof to be used for the given rule or throws an exception if it
 * does not use a subproof.
 */
export function CreateSubproof(
    env: Environment, parsed: RuleAst, subEnv?: Environment): ProofProgress {
  if (parsed instanceof DirectProofAst) {
    const sub = (subEnv !== undefined) ? subEnv : CreateSubproofEnv(env, parsed);
    return {env: sub, lines: [
        {parsed: new AssumptionAst(parsed.prop.premise),
         rule: new Assumption(sub, parsed.prop.premise)}
      ], goal: {prop: parsed.prop.conclusion}};

  } else if (parsed instanceof ReductioAdAbsurdumAst) {
    const sub = (subEnv !== undefined) ? subEnv : CreateSubproofEnv(env, parsed);
    return {env: sub, lines: [
        {parsed: new AssumptionAst(parsed.prop.prop),
         rule: new Assumption(sub, parsed.prop.prop)}
      ], goal: {prop: FALSE}};

  } else if (parsed instanceof IntroForAllAst) {
    const sub = (subEnv !== undefined) ? subEnv : CreateSubproofEnv(env, parsed);
    if (parsed.innerNames === undefined) {
      let [_varNames, body] = SplitQuantifiers(parsed.prop);
      return {env: sub, lines: [], goal: {prop: body}};
    } else {
      const prop = RenameQuantifiers(parsed.prop, parsed.innerNames);
      let [_innerNames, innerBody] = SplitQuantifiers(prop, parsed.innerNames.length);
      return {env: sub, lines: [], goal: {prop: innerBody}};
    }

  } else {
    throw new Error(`unknown rule using subproof: ${RuleName(parsed.variety)}`);
  }
}


/** Converts a proof progress into JSON that would parse back into that object. */
export function ProofProgressToJson(proof: ProofProgress): ProofProgressJson {
  const desc: ProofProgressJson = {lines: [], goal: ProofGoalToJson(proof.goal)};

  const prem = proof.env.getPremise();
  if (prem !== undefined)
    desc.lines.push([prem.to_string(), "assumption"]);

  for (const line of proof.lines) {
    if (line.sub !== undefined)
      desc.lines.push(ProofProgressToJson(line.sub));
    if (line.parsed.variety !== RULE_ASSUMPTION)
      desc.lines.push([line.rule.apply().to_string(), line.parsed.to_string()]);
  }
  return desc;
}
