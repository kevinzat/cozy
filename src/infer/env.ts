import { Proposition, IsDefinition, IsTheorem } from "../facts/props";
import { UserError } from "../facts/user_error";


/**
 * Describes the high-level struture of the environment in which rules are
 * operating. This is a tree with a subproofs as children of a top-level node.
 * In addition, each subproof can have ("trailing") environments inside of it
 * that declare local variables.
 * 
 * Subproof environments can be thought of as subroutines. Their premises /
 * variables and conclusions are included, making them proof "declarations".
 * Rules can use a subproof environment without having to look inside the
 * subproof and see how it is proven.
 *
 * Within an individual subproof, rules can be built in a tree-like manner,
 * either forward or backaward, and the environment is used to enforce
 * linearizability. Specifically, each rule executes within an environment and
 * its premises must be from environments before it in the linearized sequence
 * of trailing environments. Hence, clients are allowed to build distinct chains
 * of trailing environments, but if they attempt to use the results as premises
 * of the same rule, they will get an Error.
 */
export interface Environment {

  /** Determines if this is a top-level environment (not a subproof) */
  isTopLevel(): boolean;

  /** Returns the outer environment (or throws an Error). */
  getParent(): Environment;

  /** Returns the nearest enclosing subproof environment (maybe this). */
  getSubproof(): Environment;

  /**
   * Determines whether the given environment is before this one in the same
   * subproof or from a parent environment.
   */
  isParentOrBefore(env: Environment): boolean;

  /** Determines whether the environment has the given hypothesis. */
  hasHypothesis(prop: Proposition): boolean;

  /** Determines whether the environment has a definition with the given name. */
  hasDefinition(name: string): boolean;

  /** Returns the definition with the given name (throws an Error if not). */
  getDefinition(name: string): Proposition;

  /** Determines whether the environment has a theorem with the given name. */
  hasTheorem(name: string): boolean;

  /** Returns the theorem with the given name (throws an Error if not). */
  getTheorem(name: string): Proposition;

  /** Returns the variables declared by this environment. */
  getVariables(): string[];

  /** Returns the premise declared for this subproof if any */
  getPremise(): Proposition|undefined;

  /** Returns the conclusion declared for this subproof (if it is a subproof) */
  getConclusion(): Proposition|undefined;

  /** Determines whether a new variable with the given name can be created. */
  isAvailableName(name: string): boolean;

  /** Returns the names of all variables in scope. */
  getVariablesInScope(): string[];
}


/**
 * Describes a top-level environment, outside of any subproofs. This includes
 * definitions, theorems, and hypotheses (givens).
 */
export class TopLevelEnv implements Environment {

  /**
   * Hypotheses provided to the environment. For testing purposes, we allow
   * undefined which will then accept any hypothesis.
   */
  hypotheses: Proposition[] | undefined;

  /**
   * Contains postulates that are (quantified) biconditionals. These are the
   * facts that can be used by "defof" and "undef".
   */
  definitions: Map<string, Proposition>;

  /**
   * Contains postulates that are (quantified) implications. These are the facts
   * that can be used by "apply".
   */
  theorems: Map<string, Proposition>;

  /** Names of top-level global variables. */
  varNames: string[];

  /** Creates an environment with the given definitions and theorems. */
  constructor(
      definitions: [string, Proposition][], theorems: [string, Proposition][],
      hypotheses?: Proposition[], varNames?: string[]) {

    this.definitions = new Map<string, Proposition>();
    if (definitions !== undefined) {
      for (const [name, prop] of definitions) {
        if (!IsDefinition(prop))
          throw new Error(`${name} does not look like a definition: ${prop.to_string()}`);
        this.definitions.set(name, prop);
      }
    }

    this.theorems = new Map<string, Proposition>();
    if (theorems !== undefined) {
      for (const [name, prop] of theorems) {
        if (!IsTheorem(prop))
          throw new Error(`${name} does not look like a theorem: ${prop.to_string()}`);
        this.theorems.set(name, prop);
      }
    }

    this.hypotheses = (hypotheses !== undefined) ? hypotheses.slice(0) : undefined;
    this.varNames = (varNames !== undefined) ? varNames.slice(0) : [];
  }

  isTopLevel(): boolean {
    return true;
  }

  getParent(): Environment {
    throw new Error('TopLevelEnv has no parent.')
  }

  getSubproof(): Environment {
    throw new Error('TopLevelEnv is not in a subproof.')
  }

  isParentOrBefore(env: Environment): boolean {
    return env === this;
  }

  hasHypothesis(prop: Proposition): boolean {
    if (this.hypotheses === undefined) {
      return true;
    } else {
      for (const hyp of this.hypotheses) {
        if (hyp.equals_alpha(prop))
          return true;
      }
      return false;
    }
  }

  hasDefinition(name: string): boolean {
    return this.definitions.get(name) !== undefined;
  }

  getDefinition(name: string): Proposition {
    const defn = this.definitions.get(name);
    if (defn === undefined)
      throw new Error(`no definition named "${name}"`);
    return defn;
  }

  hasTheorem(name: string): boolean {
    return this.theorems.get(name) !== undefined;
  }

  getTheorem(name: string): Proposition {
    const thm = this.theorems.get(name);
    if (thm === undefined)
      throw new Error(`no theorem named "${name}"`);
    return thm;
  }

  getVariables(): string[] {
    return this.varNames.slice(0);
  }

  getPremise(): Proposition|undefined {
    return undefined;
  }

  getConclusion(): Proposition|undefined {
    return undefined;
  }

  isAvailableName(name: string): boolean {
    return !this.varNames.includes(name);
  }

  getVariablesInScope(): string[] {
    return this.varNames.slice(0);
  }
}


/**
 * Describes the environment of a subproof, which proves some conclusion. Each
 * has an optional variable introduction and an optional (single) premise. The
 * former is used when using intro forall / elim exists and the latter when
 * using direct proof.
 */
export class SubproofEnv implements Environment {
  parent: Environment;
  conclusion: Proposition;
  premise?: Proposition;
  varNames?: string[];

  constructor(parent: Environment, conclusion: Proposition,
      premise?: Proposition, varNames?: string[]) {
    this.parent = parent
    this.conclusion = conclusion;
    this.premise = premise;
    this.varNames = varNames ? varNames.slice(0) : undefined;

    // Names cannot be reused.
    if (varNames) {
      for (const varName of varNames) {
        if (!parent.isAvailableName(varName))
          throw new UserError(`name ${varName} is unavailable`);
      }
    }
  }

  isTopLevel(): boolean {
    return false;
  }

  getParent(): Environment {
    return this.parent;
  }

  getSubproof(): Environment {
    return this;
  }

  isParentOrBefore(env: Environment): boolean {
    if (env === this) {
      return true;
    } else {
      return this.parent.isParentOrBefore(env);
    }
  }

  hasHypothesis(prop: Proposition): boolean {
    return this.parent.hasHypothesis(prop);
  }

  hasDefinition(name: string): boolean {
    return this.parent.hasDefinition(name);
  }

  getDefinition(name: string): Proposition {
    return this.parent.getDefinition(name);
  }

  hasTheorem(name: string): boolean {
    return this.parent.hasTheorem(name);
  }

  getTheorem(name: string): Proposition {
    return this.parent.getTheorem(name);
  }

  getVariables(): string[] {
    return this.varNames ? this.varNames.slice(0) : [];
  }

  getPremise(): Proposition|undefined {
    return this.premise;
  }

  getConclusion(): Proposition|undefined {
    return this.conclusion;
  }

  isAvailableName(name: string): boolean {
    if (this.varNames && this.varNames.includes(name)) {
      return false;
    } else {
      return this.parent.isAvailableName(name);
    }
  }

  getVariablesInScope(): string[] {
    const above = this.parent.getVariablesInScope();
    if (this.varNames)
      above.push(...this.varNames);
    return above;
  }
}

/** Describes the environment of the rest of a proof after a variable is added. */
export class TrailingEnv implements Environment {
  before: Environment;
  varName: string;

  constructor(before: Environment, varName: string) {
    this.before = before;
    this.varName = varName;

    // Names cannot be reused.
    if (!before.isAvailableName(varName))
      throw new UserError(`name ${varName} is unavailable`);
  }

  isTopLevel(): boolean {
    return false;
  }

  getParent(): Environment {
    return this.before.getParent();
  }

  getSubproof(): Environment {
    return this.before.getSubproof();
  }

  isParentOrBefore(env: Environment): boolean {
    if (env === this) {
      return true;
    } else {
      return this.before.isParentOrBefore(env);
    }
  }

  hasHypothesis(prop: Proposition): boolean {
    return this.before.hasHypothesis(prop);
  }

  hasDefinition(name: string): boolean {
    return this.before.hasDefinition(name);
  }

  getDefinition(name: string): Proposition {
    return this.before.getDefinition(name);
  }

  hasTheorem(name: string): boolean {
    return this.before.hasTheorem(name);
  }

  getTheorem(name: string): Proposition {
    return this.before.getTheorem(name);
  }

  getVariables(): string[] {
    return [this.varName];
  }

  getPremise(): Proposition|undefined {
    return undefined;
  }

  getConclusion(): Proposition|undefined {
    return undefined;
  }

  isAvailableName(name: string): boolean {
    if (this.varName === name) {
      return false;
    } else {
      return this.before.isAvailableName(name);
    }
  }

  getVariablesInScope(): string[] {
    const above = this.before.getVariablesInScope();
    above.push(this.varName);
    return above;
  }
}