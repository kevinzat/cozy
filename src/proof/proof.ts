import { Proposition } from '../facts/props';
import { ParseProp } from '../facts/props_parser';
import { UserError } from '../facts/user_error';
import { Environment } from '../infer/env';
import { LineRef, AbsLineRef, RelLineRef, isAbsLineRef, AssumptionAst,
         DirectProofAst, ReductioAdAbsurdumAst, IntroForAllAst } from '../infer/rules_ast';
import { ParseForwardRule, CreateRule, CreateSubproofEnv } from '../infer/infer_forward';
import { RULE_ASSUMPTION, Assumption, Rule, RuleName } from '../infer/rules';
import { RuleAst } from '../infer/rules_ast';


/**
 * Represents a line of a proof. This has an invariant that all line references
 * should be in relative form. This is ensured by AddLine, below.
 */
export interface Line<P> {
  parsed: RuleAst;  // parsed version of the rule description
  sub?: P;          // subproof if any needed for this line
  rule: Rule;       // rule produced from the parsed text
}

/**
 * Represents a proof (or subproof) as a list of rules applied in order.
 * This has an invariant that lines only refer to those before them. This is
 * ensured by GetLine, below, used to build the rules in the proof.
 */
export interface Proof {
  env: Environment;      // environment at the start of this proof
  lines: Line<Proof>[];  // lines of forward reasoning
}


/** Checks if given a complete proof of the given conclusion. */
export function IsComplete(proof: Proof, conclusion: Proposition): boolean {
  // Make sure all subproofs are completed.
  for (const line of proof.lines) {
    if (line.sub) {
      const conc = line.sub.env.getConclusion();
      if (conc === undefined)
        throw new Error('subproof missing conclusion')
      if (!IsComplete(line.sub, conc))
        return false;
    }
  }

  // Make sure this proves the conclusion.
  const last = proof.lines[proof.lines.length-1].rule.apply();
  return conclusion.equals_alpha(last);
}


/** Returns the maximum number of steps to a leaf subproof. */
export function GetDepth(proof: Proof): number {
  let d = 0;
  for (let i = 0; i < proof.lines.length; i++) {
    const sub = proof.lines[i].sub;
    if (sub !== undefined)
      d = Math.max(d, GetDepth(sub) + 1);
  }
  return d;
}


/**
 * Adds a line to the innermost proof in the given stack by parsing the rule
 * description and constructing the rule it describes (which is returned). Each
 * additional proof on the stack is intended to be used in the next line of the
 * outer proof; hence, the innermost proof is allowed to see all of these lines.
 */
export function AddLine(proofs: Proof[], desc: string, subproof?: Proof,
    relativize?: boolean): Rule {
  if (proofs.length === 0)
    throw new Error('no proof was given');
  const proof = proofs[proofs.length-1];

  // Find the environment after the last line.
  const env = proof.lines.length === 0 ? proof.env :
      proof.lines[proof.lines.length-1].rule.envAfter;

  // Parse the rule description and create the rule.
  const parsed = ParseForwardRule(desc,
      relativize ? ((r: LineRef) => Relativize(proofs, r)) : undefined);
  const rule = CreateRule(env, parsed, (ref: LineRef) => GetLine(proofs, ref),
      (subproof === undefined) ? undefined : subproof.env);

  // Make sure every free variable is in scope.
  const known = new Set(rule.envAfter.getVariablesInScope());
  for (const name of rule.apply().free_vars()) {
    if (!known.has(name)) {
      throw new Error(`rule produced ${rule.apply().to_string()}, ` +
          `which uses ${name} that is not in scope`);
    }
  }

  // Add this rule to the innermost proof.
  proof.lines.push({parsed: parsed, sub: subproof, rule: rule});

  return rule;
}


/** Thrown when the caller attempts to reference an invalid line. */
export class InvalidLineRef extends UserError {
  ref: LineRef;
  desc: string;

  // Indicates an invalid line reference.
  constructor(ref: LineRef, desc: string) {
    super(`invalid line ${InvalidLineRef.describe(ref)}: ${desc}`);

    // hack workaround of TS transpiling bug (so gross)
    Object.setPrototypeOf(this, InvalidLineRef.prototype);

    this.ref = ref;
    this.desc = desc;
  }

  static describe(ref: LineRef): string {
    if (isAbsLineRef(ref)) {
      return ref.join('.');
    } else {
      return "^".repeat(ref.up) + ref.lineNum;
    }
  }
}


/** Returns the rule at the given line. */
export function GetLine(proofs: Proof[], ref: LineRef): Rule {
  if (isAbsLineRef(ref)) {
    let proof = GetProofContaining(proofs, ref);

    const lineNum = ref[ref.length - 1];
    if (lineNum <= 0 || proof.lines.length < lineNum)
      throw new InvalidLineRef(ref, "no such line");
    return proof.lines[lineNum-1].rule;

  } else {
    if (ref.up <= 0)
      throw new Error('up value must be positive in a relative line ref');
    if (ref.up > proofs.length)
      throw new InvalidLineRef(ref, `cannot move up ${ref.up} times`);
    const proof = proofs[proofs.length - ref.up];

    if (ref.lineNum <= 0 || proof.lines.length < ref.lineNum)
      throw new InvalidLineRef(ref, "no such line");
    return proof.lines[ref.lineNum-1].rule;
  }
}

/**
 * Returns the proof containing the last line in the reference. The proofs on
 * the stack, beyond the first, will go at the index just past the end of the
 * prior proof on the stack.
 */
export function GetProofContaining(proofs: Proof[], ref: AbsLineRef): Proof {
  if (ref.length === 0)
    throw new Error('absolute line reference must have at least one index');

  // Move through all the references to the new proofs on the stack.
  let index = 0;
  while (index < ref.length - 1 && index+1 < proofs.length &&
         ref[index] === proofs[index].lines.length + 1) {
    index += 1;
  }

  // Make sure we have only one index left.
  if (index < ref.length - 1)
    throw new InvalidLineRef(ref.slice(0, index+2), "inside of another subproof");

  return proofs[index];
}


/**
 * Returns a relative reference to the given line from a position that is depth
 * steps from the top, with 1 being the top-most proof.
 */
export function AbsToRelLineRef(depth: number, ref: AbsLineRef): RelLineRef {
  if (depth < ref.length)
    throw new Error('reference is deeper than the line itself');
  return {up: depth - ref.length + 1, lineNum: ref[ref.length-1] };
}

/** Returns an absolute reference to the given line from this position. */
export function RelToAbsLineRef(from: AbsLineRef, ref: RelLineRef): AbsLineRef {
  if (ref.up > from.length)
    throw new Error('not deep enough to go up this many steps')
  return from.slice(0, from.length - ref.up).concat([ref.lineNum]);
}


/** Returns a relative reference to the given line. */
function Relativize(proofs: Proof[], ref: LineRef): RelLineRef {
  return isAbsLineRef(ref) ? AbsToRelLineRef(proofs.length, ref) : ref;
}


/**
 * Returns a subproof to be used for the given rule or throws an exception if it
 * does not use a subproof.
 */
export function CreateSubproof(env: Environment, parsed: RuleAst): Proof {
  if (parsed instanceof DirectProofAst) {
    const sub = CreateSubproofEnv(env, parsed);
    return {env: sub, lines: [
        {parsed: new AssumptionAst(parsed.prop.premise),
         rule: new Assumption(sub, parsed.prop.premise)}
      ]};

  } else if (parsed instanceof ReductioAdAbsurdumAst) {
    const sub = CreateSubproofEnv(env, parsed);
    return {env: sub, lines: [
        {parsed: new AssumptionAst(parsed.prop.prop),
         rule: new Assumption(sub, parsed.prop.prop)}
      ]};

  } else if (parsed instanceof IntroForAllAst) {
    const sub = CreateSubproofEnv(env, parsed);
    return {env: sub, lines: []};

  } else {
    throw new Error(`unknown rule using subproof: ${RuleName(parsed.variety)}`);
  }
}


/**
 * JSON for a proof is an array, where each line is either an individual line or
 * a subproof (itself an array). An individual line consists of a proposition
 * and rule pair, both given as strings.
 */
export type ProofJson = Array<[string, string] | ProofJson>;


/**
 * Parses a description of a proof (see ProofJson above) into a Proof object.
 * This will throw an Error if the shape is wrong. This will throw an
 * InvalidStep if any line of the proof does not prove what is claimed.
 */
export function ProofFromJson(env: Environment, desc: unknown): Proof {
  if (!Array.isArray(desc))
    throw new Error('a proof should be an array');

  const proof = {env, lines: []};
  ParseLines([proof], desc);
  return proof;
}

// Helper function for above that parses the lines of a proof
function ParseLines(proofs: Proof[], lineDescs: unknown[]): void {
  let subproof: Proof | undefined = undefined;
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
        if (!rule.apply().equals_alpha(expProp)) {
          throw new InvalidForwardStep(ruleDesc, rule.apply(), expProp);
        }
      }

      subproof = undefined;

    } else if (isSubproofLine(line)) {
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
      ParseLines(proofs, line);
      proofs.pop();

    } else {
      throw new Error(`expecting an array not ${typeof line}`);
    }
  }
}

/** Checks if this is a regular line with a prop and rule. */
export function isRegularLine(line: unknown): line is [string, string] {
  if (!Array.isArray(line))
    return false;
  if (line.length !== 2)
    return false;
  return typeof line[0] === 'string' && typeof line[1] === 'string';
}


// Checks if this is a subproof line.
function isSubproofLine(line: unknown): line is unknown[] {
  return Array.isArray(line);
}


/** Thrown when a line of the proof does not prove what it claims. */
export class InvalidForwardStep extends UserError {
  desc: string;
  actProp: Proposition;
  expProp: Proposition;

  constructor(desc: string, actProp: Proposition, expProp: Proposition) {
    super(`rule ${desc} proves ${expProp.to_string()} not ${actProp.to_string()}`);

    // hack workaround of TS transpiling bug (so gross)
    Object.setPrototypeOf(this, InvalidForwardStep.prototype);

    this.desc = desc;
    this.actProp = actProp;
    this.expProp = expProp;
  }
}


/** Converts a proof object into JSON that would parse back into that proof. */
export function ProofToJson(proof: Proof): ProofJson {
  const desc: ProofJson = [];

  const prem = proof.env.getPremise();
  if (prem !== undefined)
    desc.push([prem.to_string(), "assumption"]);

  for (const line of proof.lines) {
    if (line.sub !== undefined)
      desc.push(ProofToJson(line.sub));
    if (line.parsed.variety !== RULE_ASSUMPTION)
      desc.push([line.rule.apply().to_string(), line.parsed.to_string()]);
  }
  return desc;
}