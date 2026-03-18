import { Proposition } from '../facts/props';
import { ParseProp } from '../facts/props_parser';
import { UserError } from '../facts/user_error';
import { Environment } from '../infer/env';
import { isRecord } from '../infer/rules_ast';
import { TacticAst } from '../infer/tactics_ast';
import { Tactic } from '../infer/tactics';
import { CreateTactic, ParseBackwardRule } from '../infer/infer_backward';


/**
 * Represents a tree of goals and their premises. Each node includes a goal. The
 * rule field will be present if the goal has been produced by backward reasoning.
 * We will call the latter type of nodes "closed" and the others "open".
 */
export type ProofGoal = {
  // proposition to prove
  readonly prop: Proposition,

  // tactic that will produce the proposition above (if we have one)
  // NOTE: this tactic must not require a subproof
  readonly resn?: {
      readonly env: Environment,
      readonly parsed: TacticAst,
      readonly subgoals: ProofGoal[]  // = CreateTactic(env, parsed, prop).premises()
    }
}

// Represents a line of reverse reasoning (as appears in ProofGoal above).
export type Resolution = {
  readonly parsed: TacticAst;
  readonly subgoals: ProofGoal[];
};


/**
 * Visits the nodes of the tree bottom-up. This will invoke visitClosed on
 * leaves with no associated rule and visitOpen on all other nodes.
 */
export function VisitGoals<R>(
    goal: ProofGoal,
    visitOpen: (goal: Proposition) => R,
    visitClosed: (goal: Proposition, resn: Resolution, children: R[]) => R): R {

  if (goal.resn === undefined) {
    return visitOpen(goal.prop);
  } else {
    const children: R[] = [];
    for (let i = 0; i < goal.resn.subgoals.length; i++)
      children.push(VisitGoals(goal.resn.subgoals![i], visitOpen, visitClosed));
    return visitClosed(goal.prop, goal.resn, children);
  }
}


/**
 * Determines whether the given goal tree is complete. The second argument is a
 * map whose keys are facts already known to be true.
 */
export function IsGoalComplete(
    goal: ProofGoal,
    outerKnowns: Map<string, number[]>): boolean {

  return VisitGoals<boolean>(goal,
      (prop: Proposition) => outerKnowns.has(prop.to_string_alpha()),
      (prop: Proposition, __: Resolution, children: boolean[]) =>
          children.indexOf(false) < 0 ||             // all premises are known or
          outerKnowns.has(prop.to_string_alpha()));  // this fact is known directly
}


/**
 * Returns a copy of the tree with any open nodes having the given goal replaced
 * by closed nodes with the given parameters. All environments used will be
 * changed to the given one, which could potentially change some nodes.
 */
export function CloseGoal(goal: ProofGoal, tactic: Tactic,
    env: Environment, parsed: TacticAst): ProofGoal {
  if (goal.prop.equals_alpha(tactic.goal)) {
    const subgoals = tactic.premises().map((q) => { return {prop: q}; });
    return {prop: tactic.goal, resn: {env, parsed, subgoals}};
  } else if (goal.resn === undefined) {
    return {prop: goal.prop};
  } else {
    // Recalculate each of the children of the current tactic in this env.
    const subKnown: Map<string, ProofGoal> = new Map();
    for (const sub of goal.resn.subgoals) {
      subKnown.set(sub.prop.to_string_alpha(),
          CloseGoal(sub, tactic, env, parsed));
    }
    return RemakeSubgoals(goal.prop, env, goal.resn.parsed, subKnown);
  }
}


/**
 * Returns a copy of the tree with any closed nodes having the given goal
 * replaced by open nodes. All environments used will be changed to the given
 * one, which could potentially change some nodes.
 */
export function OpenGoal(
    goal: ProofGoal, prop: Proposition, env: Environment): ProofGoal {
  if (goal.resn === undefined) {
    return {prop: goal.prop};
  } else if (goal.prop.equals_alpha(prop)) {  // substitute if matching
    return {prop: prop};
  } else {
    // Recalculate each of the children of the current tactic in this env.
    const subKnown: Map<string, ProofGoal> = new Map();
    for (const sub of goal.resn.subgoals) {
      subKnown.set(sub.prop.to_string_alpha(), OpenGoal(sub, prop, env));
    }
    return RemakeSubgoals(goal.prop, env, goal.resn.parsed, subKnown);
  }
}

/**
 * Returns a copy of the tree with all resolved goals now using this new
 * environment. This will throw a UserError if that fails.
 */
export function CopyGoal(goal: ProofGoal, env: Environment): ProofGoal {
  if (goal.resn === undefined) {
    return {prop: goal.prop};
  } else {
    // Recalculate each of the children of the current tactic in this env.
    const subKnown: Map<string, ProofGoal> = new Map();
    for (const sub of goal.resn.subgoals) {
      subKnown.set(sub.prop.to_string_alpha(), CopyGoal(sub, env));
    }
    return RemakeSubgoals(goal.prop, env, goal.resn.parsed, subKnown);
  }
}

// Returns a closed goal using the given tactic, with any subgoals found in the
// given map using those subgoals rather than newly constructed ones.
function RemakeSubgoals(
    prop: Proposition, env: Environment, parsed: TacticAst,
    subKnown: Map<string, ProofGoal>): ProofGoal {
  const tactic = CreateTactic(env, parsed, prop);
  const subgoals: ProofGoal[] = tactic.premises().map((q) => {
    const sub = subKnown.get(q.to_string_alpha());
    return (sub !== undefined) ? sub : {prop: q};
  });
  return {prop, resn: {parsed, env, subgoals}};
}


/** JSON description of a proof goal. */
export type ProofGoalJson = {
  prop: string,      // parses to a proposition
  resn?: {
    tactic: string,  // parses to a tactic
    subgoals: ProofGoalJson[]
  }
};


/**
 * Parses a description of a proof goal (see above) into a ProofGoal object.
 * This will throw an Error if the shape is wrong. This will also throw an
 * InvalidBackwardStep if any resolution has subgoals that do not match the
 * premises of the tactic.
 */
export function ProofGoalFromJson(env: Environment, desc: unknown): ProofGoal {
  if (!isRecord(desc))
    throw new Error('a proof goal should be a record');

  if (typeof desc.prop !== 'string')
    throw new Error('a proof goal should have "prop" field that is a string');
  const prop = ParseProp(desc.prop);

  if (desc.resn === undefined) {
    return {prop};
  }

  if (!isRecord(desc.resn))
    throw new Error('a goal resolution should be a record');
  if (typeof desc.resn.tactic !== 'string')
    throw new Error('a goal resolution should have "tactic" field that is a string');
  const parsed = ParseBackwardRule(desc.resn.tactic);
  const tactic = CreateTactic(env, parsed, prop);

  if (!Array.isArray(desc.resn.subgoals))
    throw new Error('a goal resolution should have a "subgoals" field that is an array');

  // Parse all the goals in the JSON.
  const subs: Map<string, ProofGoal> = new Map();
  for (const sub of desc.resn.subgoals) {
    const goal = ProofGoalFromJson(env, sub);
    subs.set(goal.prop.to_string_alpha(), goal);
  }

  // Make sure every required premise was given. (And put them together in the
  // correct order.)
  const premises = tactic.premises();
  const subgoals: ProofGoal[] = [];
  for (const prem of premises) {
    const sub = subs.get(prem.to_string_alpha());
    if (sub === undefined)
      throw new InvalidBackwardStep(desc.resn.tactic, prem, true);
    subgoals.push(sub);
  }

  // Make sure no extra premises were given
  if (subs.size > premises.length) {
    const allPrems = new Set(premises.map((p) => p.to_string_alpha()));
    for (const [key, value] of subs.entries()) {
      if (!allPrems.has(key))
        throw new InvalidBackwardStep(desc.resn.tactic, value.prop, false);
    }
  }

  return {prop, resn: {env, parsed, subgoals}};
}


/** Thrown when a line of the proof does not prove what it claims. */
export class InvalidBackwardStep extends UserError {
  desc: string;
  premise: Proposition;
  missing: boolean;

  constructor(desc: string, premise: Proposition, missing: boolean) {
    super(`tactic ${desc} has ${missing ? 'a missing' : 'an extra'} premise ${premise.to_string()}`);

    // hack workaround of TS transpiling bug (so gross)
    Object.setPrototypeOf(this, InvalidBackwardStep.prototype);

    this.desc = desc;
    this.premise = premise;
    this.missing = missing;
  }
}


/** Converts a proof goal object into JSON that would parse back into that proof. */
export function ProofGoalToJson(goal: ProofGoal): ProofGoalJson {
  if (goal.resn === undefined) {
    return {prop: goal.prop.to_string()};
  } else {
    const subgoals: ProofGoalJson[] =
        goal.resn.subgoals.map((sub) => ProofGoalToJson(sub));
    return {prop: goal.prop.to_string(),
            resn: {tactic: goal.resn.parsed.to_string(), subgoals}};
  }
}