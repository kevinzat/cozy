import {
    Expression, FUNC_SET_COMPLEMENT, FUNC_SET_DIFFERENCE, FUNC_SET_INTERSECTION,
    FUNC_SET_UNION
  } from '../facts/exprs';
import {
    ForAll, Implication, Negation, Proposition, PRED_SAME_SET, PRED_SUBSET
  } from '../facts/props';
import * as rules from './rules';


/**
 * Determines whether the given value is a record.
 * @param val the value to check
 */
export const isRecord = (val: unknown): val is Record<string, unknown> => {
  return val !== null && typeof val === "object";
};


/**
 * References to a line, which can be either absolute or relative. The former is
 * an array of indexes to follow from the root. The latter lists how many upward
 * steps to take and then the index to follow.
 */
export type AbsLineRef = number[];
export type RelLineRef = {up: number, lineNum: number};
export type LineRef = AbsLineRef | RelLineRef;


/** Dynamically confirm that this is an absolute line reference. */
export function isAbsLineRef(ref: unknown): ref is number[] {
  if (!Array.isArray(ref))
    return false;

  for (let i = 0; i < ref.length; i++) {
    if (!(typeof ref[i] === "number") || ref[i] < 0)
      return false;
  }

  return true;
}

/** Dynamically confirm that this is a relative line reference. */
export function isRelLineRef(ref: unknown): ref is {up: number, lineNum: number} {
  return isRecord(ref) && (typeof ref.up === "number") &&
      (typeof ref.lineNum === "number");
}

/** Dynamically confirm that this is a line reference of some kind. */
export function isLineRef(ref: unknown): ref is LineRef {
  return isAbsLineRef(ref) || isRelLineRef(ref);
}


/** Determines whether val is an array of line refs. */
export function isLineRefArray(val: unknown): val is LineRef[] {
  if (!Array.isArray(val)) {
    return false;
  } else {
    for (let i = 0; i < val.length; i++) {
      if (!isLineRef(val[i]))
        return false;
    }
    return true;
  }
}

/** Determines whether val is an array of strings. */
export function isStringArray(val: unknown): val is string[] {
  if (!Array.isArray(val)) {
    return false;
  } else {
    for (let i = 0; i < val.length; i++) {
      if (typeof(val[i]) !== 'string')
        return false;
    }
    return true;
  }
}

/** Determines whether val is an array of expressions. */
export function isExprArray(val: unknown): val is Expression[] {
  if (!Array.isArray(val)) {
    return false;
  } else {
    for (let i = 0; i < val.length; i++) {
      if (!(val[i] instanceof Expression))
        return false;
    }
    return true;
  }
}

/** Determines whether val is an array of propositions. */
export function isPropArray(val: unknown): val is Proposition[] {
  if (!Array.isArray(val)) {
    return false;
  } else {
    for (let i = 0; i < val.length; i++) {
      if (!(val[i] instanceof Proposition))
        return false;
    }
    return true;
  }
}


// Coverts a LineRef back into a string that would parse to that.
function lineToString(ref: LineRef): string {
  if (isAbsLineRef(ref)) {
    return ref.join(".");
  } else {
    return "^".repeat(ref.up) + String(ref.lineNum);
  }
}


/** Returns an absolut reference to the given line. */
export type AbsolutizeRef = (ref: LineRef) => AbsLineRef;

/** Returns a relative reference to the given line. */
export type RelativizeRef = (ref: LineRef) => RelLineRef;


/**
 * Represents a parsed line of text describing a forward reasoning rule.
 * This will become a Rule object, but the text contains additional information
 * like line references that are not part of the Rule. All parts other than line
 * references should be readonly. Line references are changed by relativize.
 */
export abstract class RuleAst {
  readonly variety: number;         // which type of rule

  constructor(variety: number) {
    this.variety = variety;
  }

  /** Replaces all relative line refs with absolute ones. */
  abstract absolutize(makeAbsolute: AbsolutizeRef): void;

  /** Replaces all absolute line refs with relative ones. */
  abstract relativize(makeRelative: RelativizeRef): void;

  /** Returns text that would parse back into this AST. */
  abstract to_string(): string;

  /** Indicates whether the Rule needs a subproof when created. */
  requiresSubproof(): boolean { return false; }
}

export class AssumptionAst extends RuleAst {
  readonly prop: Proposition;

  constructor(prop: unknown) {
    super(rules.RULE_ASSUMPTION);

    if (!(prop instanceof Proposition))
      throw new Error('first argument should be a Proposition')

    this.prop = prop;
  }

  absolutize(_: AbsolutizeRef): void {}  // no refs
  relativize(_: RelativizeRef): void {}  // no refs

  to_string(): string {
    throw new Error('assumptions cannot be written by hand');
  }
}

export class GivenAst extends RuleAst {
  readonly prop: Proposition;

  constructor(prop: unknown) {
    super(rules.RULE_GIVEN);

    if (!(prop instanceof Proposition))
      throw new Error('first argument should be a Proposition')

    this.prop = prop;
  }

  absolutize(_: AbsolutizeRef): void {}  // no refs
  relativize(_: RelativizeRef): void {}  // no refs

  to_string(): string {
    return `given (${this.prop.to_string()})`;
  }
}

export class CiteAst extends RuleAst {
  readonly name: string;

  constructor(name: unknown) {
    super(rules.RULE_CITE);

    if (typeof name !== 'string')
      throw new Error('first argument should be a string');

    this.name = name;
  }

  absolutize(_: AbsolutizeRef): void {}  // no refs
  relativize(_: RelativizeRef): void {}  // no refs

  to_string(): string {
    return `cite ${this.name}`;
  }
}

export class RepeatAst extends RuleAst {
  ref: LineRef;

  constructor(ref: unknown) {
    super(rules.RULE_REPEAT);

    if (!isLineRef(ref))
      throw new Error('first argument should be a LineRef');

    this.ref = ref;
  }

  absolutize(makeAbs: AbsolutizeRef): void {
    if (isRelLineRef(this.ref))
      this.ref = makeAbs(this.ref);
  }

  relativize(makeRel: RelativizeRef): void {
    if (isAbsLineRef(this.ref))
      this.ref = makeRel(this.ref);
  }

  to_string(): string {
    return `repeat ${lineToString(this.ref)}`;
  }
}

export class ModusPonensAst extends RuleAst {
  ref1: LineRef;
  ref2: LineRef;

  constructor(ref1: unknown, ref2: unknown) {
    super(rules.RULE_MODUS_PONENS);

    if (!isLineRef(ref1))
      throw new Error('first argument should be a LineRef');
    if (!isLineRef(ref2))
      throw new Error('second argument should be a LineRef');

    this.ref1 = ref1;
    this.ref2 = ref2;
  }

  absolutize(makeAbs: AbsolutizeRef): void {
    if (isRelLineRef(this.ref1))
      this.ref1 = makeAbs(this.ref1);
    if (isRelLineRef(this.ref2))
      this.ref2 = makeAbs(this.ref2);
  }

  relativize(makeRel: RelativizeRef): void {
    if (isAbsLineRef(this.ref1))
      this.ref1 = makeRel(this.ref1);
    if (isAbsLineRef(this.ref2))
      this.ref2 = makeRel(this.ref2);
  }

  to_string(): string {
    return `modus ponens ${lineToString(this.ref1)} ${lineToString(this.ref2)}`;
  }
}

export class DirectProofAst extends RuleAst {
  readonly prop: Implication;

  constructor(prop: unknown) {
    super(rules.RULE_DIRECT_PROOF);

    if (!(prop instanceof Implication)) {
      if (prop instanceof Proposition) {
        throw new rules.InvalidRule(rules.RULE_DIRECT_PROOF,
            `first argument should be an implication not ${prop.to_string()}`);
      } else {
        throw new Error('first argument should be a Proposition');
      }
    }

    this.prop = prop;
  }

  absolutize(_: AbsolutizeRef): void {}  // no refs
  relativize(_: RelativizeRef): void {}  // no refs

  to_string(): string {
    return `direct proof (${this.prop.to_string()})`;
  }

  requiresSubproof(): boolean { return true; }
}

export class ElimAndAst extends RuleAst {
  ref: LineRef;
  readonly left: boolean;

  constructor(ref: unknown, left: unknown) {
    super(rules.RULE_ELIM_AND);

    if (!isLineRef(ref))
      throw new Error('first argument should be a LineRef');
    if (typeof left !== 'boolean')
      throw new Error('second argument should be a boolean');

    this.ref = ref;
    this.left = left;
  }

  absolutize(makeAbs: AbsolutizeRef): void {
    if (isRelLineRef(this.ref))
      this.ref = makeAbs(this.ref);
  }

  relativize(makeRel: RelativizeRef): void {
    if (isAbsLineRef(this.ref))
      this.ref = makeRel(this.ref);
  }

  to_string(): string {
    return `elim and ${lineToString(this.ref)} ${this.left ? 'left' : 'right'}`;
  }
}

export class IntroAndAst extends RuleAst {
  ref1: LineRef;
  ref2: LineRef;

  constructor(ref1: unknown, ref2: unknown) {
    super(rules.RULE_INTRO_AND);

    if (!isLineRef(ref1))
      throw new Error('first argument should be a LineRef');
    if (!isLineRef(ref2))
      throw new Error('second argument should be a LineRef');

    this.ref1 = ref1;
    this.ref2 = ref2;
  }

  absolutize(makeAbs: AbsolutizeRef): void {
    if (isRelLineRef(this.ref1))
      this.ref1 = makeAbs(this.ref1);
    if (isRelLineRef(this.ref2))
      this.ref2 = makeAbs(this.ref2);
  }

  relativize(makeRel: RelativizeRef): void {
    if (isAbsLineRef(this.ref1))
      this.ref1 = makeRel(this.ref1);
    if (isAbsLineRef(this.ref2))
      this.ref2 = makeRel(this.ref2);
  }

  to_string(): string {
    return `intro and ${lineToString(this.ref1)} ${lineToString(this.ref2)}`;
  }
}

export class ElimOrAst extends RuleAst {
  ref1: LineRef;
  ref2: LineRef;

  constructor(ref1: unknown, ref2: unknown) {
    super(rules.RULE_ELIM_OR);

    if (!isLineRef(ref1))
      throw new Error('first argument should be a LineRef');
    if (!isLineRef(ref2))
      throw new Error('second argument should be a LineRef');

    this.ref1 = ref1;
    this.ref2 = ref2;
  }

  absolutize(makeAbs: AbsolutizeRef): void {
    if (isRelLineRef(this.ref1))
      this.ref1 = makeAbs(this.ref1);
    if (isRelLineRef(this.ref2))
      this.ref2 = makeAbs(this.ref2);
  }

  relativize(makeRel: RelativizeRef): void {
    if (isAbsLineRef(this.ref1))
      this.ref1 = makeRel(this.ref1);
    if (isAbsLineRef(this.ref2))
      this.ref2 = makeRel(this.ref2);
  }

  to_string(): string {
    return `elim or ${lineToString(this.ref1)} ${lineToString(this.ref2)}`;
  }
}

export class SimpleCasesAst extends RuleAst {
  ref1: LineRef;
  ref2: LineRef;

  constructor(ref1: unknown, ref2: unknown) {
    super(rules.RULE_SIMPLE_CASES);

    if (!isLineRef(ref1))
      throw new Error('first argument should be a LineRef');
    if (!isLineRef(ref2))
      throw new Error('second argument should be a LineRef');

    this.ref1 = ref1;
    this.ref2 = ref2;
  }

  absolutize(makeAbs: AbsolutizeRef): void {
    if (isRelLineRef(this.ref1))
      this.ref1 = makeAbs(this.ref1);
    if (isRelLineRef(this.ref2))
      this.ref2 = makeAbs(this.ref2);
  }

  relativize(makeRel: RelativizeRef): void {
    if (isAbsLineRef(this.ref1))
      this.ref1 = makeRel(this.ref1);
    if (isAbsLineRef(this.ref2))
      this.ref2 = makeRel(this.ref2);
  }

  to_string(): string {
    return `simple cases ${lineToString(this.ref1)} ${lineToString(this.ref2)}`;
  }
}

export class CasesAst extends RuleAst {
  ref1: LineRef;
  ref2: LineRef;
  ref3: LineRef;

  constructor(ref1: unknown, ref2: unknown, ref3: unknown) {
    super(rules.RULE_CASES);

    if (!isLineRef(ref1))
      throw new Error('first argument should be a LineRef');
    if (!isLineRef(ref2))
      throw new Error('second argument should be a LineRef');
    if (!isLineRef(ref3))
      throw new Error('third argument should be a LineRef');

    this.ref1 = ref1;
    this.ref2 = ref2;
    this.ref3 = ref3;
  }

  absolutize(makeAbs: AbsolutizeRef): void {
    if (isRelLineRef(this.ref1))
      this.ref1 = makeAbs(this.ref1);
    if (isRelLineRef(this.ref2))
      this.ref2 = makeAbs(this.ref2);
    if (isRelLineRef(this.ref3))
      this.ref3 = makeAbs(this.ref3);
  }

  relativize(makeRel: RelativizeRef): void {
    if (isAbsLineRef(this.ref1))
      this.ref1 = makeRel(this.ref1);
    if (isAbsLineRef(this.ref2))
      this.ref2 = makeRel(this.ref2);
    if (isAbsLineRef(this.ref3))
      this.ref3 = makeRel(this.ref3);
  }

  to_string(): string {
    return `cases ${lineToString(this.ref1)} ${lineToString(this.ref2)} ${lineToString(this.ref3)}`;
  }
}

export class IntroOrAst extends RuleAst {
  ref: LineRef;
  readonly prop: Proposition;
  readonly right: boolean;

  constructor(ref: LineRef, prop: Proposition, right: boolean) {
    super(rules.RULE_INTRO_OR);
    this.ref = ref;
    this.prop = prop;
    this.right = right;
  }

  absolutize(makeAbs: AbsolutizeRef): void {
    if (isRelLineRef(this.ref))
      this.ref = makeAbs(this.ref);
  }

  relativize(makeRel: RelativizeRef): void {
    if (isAbsLineRef(this.ref))
      this.ref = makeRel(this.ref);
  }

  to_string(): string {
    return `intro or ${lineToString(this.ref)} (${this.prop.to_string()})` +
        ` ${this.right ? 'right' : 'left'}`;
  }
}

export class PrincipiumContradictionisAst extends RuleAst {
  ref1: LineRef;
  ref2: LineRef;

  constructor(ref1: unknown, ref2: unknown) {
    super(rules.RULE_CONTRADICTION);

    if (!isLineRef(ref1))
      throw new Error('first argument should be a LineRef');
    if (!isLineRef(ref2))
      throw new Error('second argument should be a LineRef');

    this.ref1 = ref1;
    this.ref2 = ref2;
  }

  absolutize(makeAbs: AbsolutizeRef): void {
    if (isRelLineRef(this.ref1))
      this.ref1 = makeAbs(this.ref1);
    if (isRelLineRef(this.ref2))
      this.ref2 = makeAbs(this.ref2);
  }

  relativize(makeRel: RelativizeRef): void {
    if (isAbsLineRef(this.ref1))
      this.ref1 = makeRel(this.ref1);
    if (isAbsLineRef(this.ref2))
      this.ref2 = makeRel(this.ref2);
  }

  to_string(): string {
    return `contradiction ${lineToString(this.ref1)} ${lineToString(this.ref2)}`;
  }
}

export class ReductioAdAbsurdumAst extends RuleAst {
  readonly prop: Negation;

  constructor(prop: unknown) {
    super(rules.RULE_ABSURDUM);

    if (!(prop instanceof Negation)) {
      if (prop instanceof Proposition) {
        throw new rules.InvalidRule(rules.RULE_ABSURDUM,
            `first argument should be a negation not ${prop.to_string()}`);
      } else {
        throw new Error('first argument should be a Negation');
      }
    }

    this.prop = prop;
  }

  absolutize(_: AbsolutizeRef): void {}  // no refs
  relativize(_: RelativizeRef): void {}  // no refs

  to_string(): string {
    return `absurdum (${this.prop.to_string()})`;
  }

  requiresSubproof(): boolean { return true; }
}

export class ExFalsoQuodlibetAst extends RuleAst {
  ref: LineRef;
  readonly prop: Proposition

  constructor(ref: unknown, prop: unknown) {
    super(rules.RULE_EX_FALSO);

    if (!isLineRef(ref))
      throw new Error('first argument should be a LineRef');
    if (!(prop instanceof Proposition))
      throw new Error('second argument should be a Proposition');

    this.ref = ref;
    this.prop = prop;
  }

  absolutize(makeAbs: AbsolutizeRef): void {
    if (isRelLineRef(this.ref))
      this.ref = makeAbs(this.ref);
  }

  relativize(makeRel: RelativizeRef): void {
    if (isAbsLineRef(this.ref))
      this.ref = makeRel(this.ref);
  }

  to_string(): string {
    return `exfalso ${lineToString(this.ref)} (${this.prop.to_string()})`;
  }
}

export class AdLitteramVerumAst extends RuleAst {
  constructor() {
    super(rules.RULE_VERUM);
  }

  absolutize(_: AbsolutizeRef): void {}  // no refs
  relativize(_: RelativizeRef): void {}  // no refs

  to_string(): string {
    return 'verum';
  }
}

export class TautologyAst extends RuleAst {
  readonly prop: Proposition;

  constructor(prop: unknown) {
    super(rules.RULE_TAUTOLOGY);

    if (!(prop instanceof Proposition))
      throw new Error('first argument should be a Proposition');

    this.prop = prop;
  }

  absolutize(_: AbsolutizeRef): void {}  // no refs
  relativize(_: RelativizeRef): void {}  // no refs

  to_string(): string {
    return `tautology (${this.prop.to_string()})`;
  }
}

export class EquivalentAst extends RuleAst {
  ref: LineRef;
  readonly prop: Proposition;

  constructor(ref: unknown, prop: unknown) {
    super(rules.RULE_EQUIVALENT);

    if (!isLineRef(ref))
      throw new Error('first argument should be a LineRef');
    if (!(prop instanceof Proposition))
      throw new Error('second argument should be a Proposition');

    this.ref = ref;
    this.prop = prop;
  }

  absolutize(makeAbs: AbsolutizeRef): void {
    if (isRelLineRef(this.ref))
      this.ref = makeAbs(this.ref);
  }

  relativize(makeRel: RelativizeRef): void {
    if (isAbsLineRef(this.ref))
      this.ref = makeRel(this.ref);
  }

  to_string(): string {
    return `equivalent ${lineToString(this.ref)} (${this.prop.to_string()})`;
  }
}

export class ElimForAllAst extends RuleAst {
  ref: LineRef;
  readonly exprs: Array<Expression>;

  constructor(ref: unknown, exprs: unknown) {
    super(rules.RULE_ELIM_FORALL);

    if (!isLineRef(ref))
      throw new Error('first argument should be a LineRef');
    if (!isExprArray(exprs))
      throw new Error('second argument should be an array of Expressions');

    this.ref = ref;
    this.exprs = exprs;
  }

  absolutize(makeAbs: AbsolutizeRef): void {
    if (isRelLineRef(this.ref))
      this.ref = makeAbs(this.ref);
  }

  relativize(makeRel: RelativizeRef): void {
    if (isAbsLineRef(this.ref))
      this.ref = makeRel(this.ref);
  }

  to_string(): string {
    const exprs = this.exprs.map((e) => e.to_string()).join(", ");
    return `elim forall ${lineToString(this.ref)} {${exprs}}`;
  }
}

export class IntroForAllAst extends RuleAst {
  readonly prop: ForAll
  readonly innerNames?: string[];

  constructor(prop: unknown, innerNames: unknown) {
    super(rules.RULE_INTRO_FORALL);

    if (!(prop instanceof ForAll)) {
      if (prop instanceof Proposition) {
        throw new rules.InvalidRule(rules.RULE_INTRO_FORALL,
            `first argument should be a forall not ${prop.to_string()}`);
      } else {
        throw new Error('first argument should be a ForAll');
      }
    }

    if (innerNames !== undefined && !isStringArray(innerNames))
      throw new Error('second argument should be a string array');

    this.prop = prop;
    this.innerNames = (innerNames === undefined) ? undefined : innerNames.slice(0);
  }

  absolutize(_: AbsolutizeRef): void {}  // no refs
  relativize(_: RelativizeRef): void {}  // no refs

  to_string(): string {
    if (this.innerNames !== undefined) {
      return `intro forall (${this.prop.to_string()}) ${this.innerNames.join(" ")}`;
    } else {
      return `intro forall (${this.prop.to_string()})`;
    }
  }

  requiresSubproof(): boolean { return true; }
}

export class ElimExistsAst extends RuleAst {
  ref: LineRef;
  readonly varName: string;

  constructor(ref: unknown, varName: unknown) {
    super(rules.RULE_ELIM_EXISTS);

    if (!isLineRef(ref))
      throw new Error('first argument should be a LineRef');
    if (typeof varName !== 'string')
      throw new Error('second argument should be a string');

    this.ref = ref;
    this.varName = varName;
  }

  absolutize(makeAbs: AbsolutizeRef): void {
    if (isRelLineRef(this.ref))
      this.ref = makeAbs(this.ref);
  }

  relativize(makeRel: RelativizeRef): void {
    if (isAbsLineRef(this.ref))
      this.ref = makeRel(this.ref);
  }

  to_string(): string {
    return `elim exists ${lineToString(this.ref)} ${this.varName}`;
  }
}

export class IntroExistsAst extends RuleAst {
  ref: LineRef;
  readonly expr: Expression;
  readonly varName: string;
  readonly result?: Proposition;

  constructor(ref: unknown, expr: unknown, varName: unknown, result: unknown) {
    super(rules.RULE_INTRO_EXISTS);

    if (!isLineRef(ref))
      throw new Error('first argument should be a LineRef');
    if (!(expr instanceof Expression))
      throw new Error('second argument should be a Expression');
    if (typeof varName !== 'string')
      throw new Error('third argument should be a string');
    if (result !== undefined && !(result instanceof Proposition))
      throw new Error('fourth argument should be a Proposition');

    this.ref = ref;
    this.expr = expr;
    this.varName = varName;
    this.result = result;
  }

  absolutize(makeAbs: AbsolutizeRef): void {
    if (isRelLineRef(this.ref))
      this.ref = makeAbs(this.ref);
  }

  relativize(makeRel: RelativizeRef): void {
    if (isAbsLineRef(this.ref))
      this.ref = makeRel(this.ref);
  }

  to_string(): string {
    if (this.result !== undefined) {
      return `intro exists ${lineToString(this.ref)} {${this.expr.to_string()}} ${this.varName}` +
          ` (${this.result.to_string()})`;
    } else {
      return `intro exists ${lineToString(this.ref)} {${this.expr.to_string()}} ${this.varName}`;
    }
  }
}

export class InductionAst extends RuleAst {
  ref1: LineRef;
  ref2: LineRef;

  constructor(ref1: unknown, ref2: unknown) {
    super(rules.RULE_INDUCTION);

    if (!isLineRef(ref1))
      throw new Error('first argument should be a LineRef');
    if (!isLineRef(ref2))
      throw new Error('second argument should be a LineRef');

    this.ref1 = ref1;
    this.ref2 = ref2;
  }

  absolutize(makeAbs: AbsolutizeRef): void {
    if (isRelLineRef(this.ref1))
      this.ref1 = makeAbs(this.ref1);
    if (isRelLineRef(this.ref2))
      this.ref2 = makeAbs(this.ref2);
  }

  relativize(makeRel: RelativizeRef): void {
    if (isAbsLineRef(this.ref1))
      this.ref1 = makeRel(this.ref1);
    if (isAbsLineRef(this.ref2))
      this.ref2 = makeRel(this.ref2);
  }

  to_string(): string {
    return `induction ${lineToString(this.ref1)} ${lineToString(this.ref2)}`;
  }
}

export class SubstituteAst extends RuleAst {
  readonly eqRef: LineRef;
  readonly right: boolean;
  ref: LineRef;
  readonly result?: Proposition;

  constructor(eqRef: unknown, right: unknown, ref: unknown, result: unknown) {
    super(rules.RULE_SUBSTITUTE);

    if (!isLineRef(eqRef))
      throw new Error('first argument should be a LineRef');
    if (typeof right !== 'boolean')
      throw new Error('second argument should be a boolean');
    if (!isLineRef(ref))
      throw new Error('third argument should be a LineRef');
    if (result !== undefined && !(result instanceof Proposition))
      throw new Error('fourth argument should be a Proposition');

    this.eqRef = eqRef;
    this.right = right;
    this.ref = ref;
    this.result = result;
  }

  absolutize(makeAbs: AbsolutizeRef): void {
    if (isRelLineRef(this.ref))
      this.ref = makeAbs(this.ref);
  }

  relativize(makeRel: RelativizeRef): void {
    if (isAbsLineRef(this.ref))
      this.ref = makeRel(this.ref);
  }

  to_string(): string {
    if (this.result !== undefined) {
      return `substitute ${lineToString(this.eqRef)} ${this.right ? 'right' : 'left'}` +
          ` ${lineToString(this.ref)} (${this.result.to_string()})`;
    } else {
      return `substitute ${lineToString(this.eqRef)} ${this.right ? 'right' : 'left'}` +
          ` ${lineToString(this.ref)}`;
    }
  }
}

export class DefinitionAst extends RuleAst {
  readonly name: string;
  readonly right: boolean;
  ref: LineRef;
  readonly result?: Proposition;

  constructor(name: unknown, right: unknown, ref: unknown, result: unknown) {
    super(rules.RULE_DEFINITION);

    if (typeof name !== 'string')
      throw new Error('first argument should be a string');
    if (typeof right !== 'boolean')
      throw new Error('second argument should be a boolean');
    if (!isLineRef(ref))
      throw new Error('third argument should be a LineRef');
    if (result !== undefined && !(result instanceof Proposition))
      throw new Error('fourth argument should be a Proposition');

    this.name = name;
    this.right = right;
    this.ref = ref;
    this.result = result;
  }

  absolutize(makeAbs: AbsolutizeRef): void {
    if (isRelLineRef(this.ref))
      this.ref = makeAbs(this.ref);
  }

  relativize(makeRel: RelativizeRef): void {
    if (isAbsLineRef(this.ref))
      this.ref = makeRel(this.ref);
  }

  to_string(): string {
    if (this.right) {
      if (this.result !== undefined) {
        return `defof ${this.name} ${lineToString(this.ref)} (${this.result.to_string()})`;
      } else {
        return `defof ${this.name} ${lineToString(this.ref)}`;
      }
    } else {
      if (this.result !== undefined) {
        return `undef ${this.name} ${lineToString(this.ref)} (${this.result.to_string()})`;
      } else {
        return `undef ${this.name} ${lineToString(this.ref)}`;
      }
    }
  }
}

export class ApplyAst extends RuleAst {
  readonly name: string
  ref: LineRef;
  readonly exprs: Expression[];

  constructor(name: string, ref: unknown, exprs: unknown) {
    super(rules.RULE_APPLY);

    if (typeof name !== 'string')
      throw new Error('first argument should be a LineRef');
    if (!isLineRef(ref))
      throw new Error('second argument should be a LineRef');
    if (!isExprArray(exprs))
      throw new Error('third argument should be an array of Expressions');

    this.name = name;
    this.ref = ref;
    this.exprs = exprs.slice(0);
  }

  absolutize(makeAbs: AbsolutizeRef): void {
    if (isRelLineRef(this.ref))
      this.ref = makeAbs(this.ref);
  }

  relativize(makeRel: RelativizeRef): void {
    if (isAbsLineRef(this.ref))
      this.ref = makeRel(this.ref);
  }

  to_string(): string {
    if (this.exprs.length === 0) {
      return `apply ${this.name} ${lineToString(this.ref)}`;
    } else {
      const exprs = this.exprs.map((e) => e.to_string()).join(", ");
      return `apply ${this.name} ${lineToString(this.ref)} {${exprs}}`;
    }
  }
}

export class AlgebraAst extends RuleAst {
  readonly prop: Proposition;
  refs: LineRef[];

  constructor(prop: unknown, refs: unknown) {
    super(rules.RULE_ALGEBRA);

    if (!(prop instanceof Proposition))
      throw new Error('first argument should be a Proposition');
    if (!isLineRefArray(refs))
      throw new Error('second argument should be an array of LineRefs');

    this.prop = prop;
    this.refs = refs.slice(0);
  }

  absolutize(makeAbs: AbsolutizeRef): void {
    for (let i = 0; i < this.refs.length; i++) {
      if (isRelLineRef(this.refs[i]))
        this.refs[i] = makeAbs(this.refs[i]);
    }
  }

  relativize(makeRel: RelativizeRef): void {
    for (let i = 0; i < this.refs.length; i++) {
      if (isAbsLineRef(this.refs[i]))
        this.refs[i] = makeRel(this.refs[i]);
    }
  }

  to_string(): string {
    if (this.refs.length === 0) {
      return `algebra (${this.prop.to_string()})`;
    } else {
      const refs = this.refs.map(lineToString).join(" ");
      return `algebra (${this.prop.to_string()}) ${refs}`;
    }
  }
}
