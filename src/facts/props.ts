import { Expression, Variable } from './exprs';
import * as exprs from './exprs';
import * as props from './props';


export const PROP_TRUE = 1;
export const PROP_FALSE = 2;
export const PROP_PREDICATE = 3;
export const PROP_NOT = 4;
export const PROP_AND = 5;
export const PROP_OR = 6;
export const PROP_IMPLIES = 7;
export const PROP_IFF = 8;
export const PROP_FORALL = 9;
export const PROP_EXISTS = 10;


export const PRED_EQUAL = "_eq_";
export const PRED_LESS_THAN = "_lt_";
export const PRED_LESS_EQUAL = "_le_";

export const PRED_ELEMENT_OF = "_in_";
export const PRED_SUBSET = "_subset_";
export const PRED_SAME_SET = "_sameset_";


/** Base class for all types of propositions. */
export abstract class Proposition {
  variety: number;

  constructor(variety: number) {
    this.variety = variety;
  }

  /** Returns a precedence number for the outer operator. */
  abstract precedence(): number;

  /** Returns a string that would parse back to this proposition. */
  abstract to_string(): string;

  /** 
   * Like above, but returns a string unique under equals_alpha, not equals. 
   *
   * The key property is that 
   *     a.to_string_alpha() === b.to_string_alpha() 
   * if and only if
   *     a.equals_alpha(b)
   *
   * This property allows using to_string_alpha to uniquely identify propositions
   * up to alpha equivalence. For example, storing the strings in a set will allow
   * correctly creating a set of propositions up to alpha equivalence.
   *
   * The string itself may contain strange auto-renamed variable names and more 
   * parentheses than to_string would return, so it is generally not recommended
   * to ever show a user the output of to_string_alpha.
   */
  to_string_alpha(): string {
    const old_prefix = __new_vars.prefix;
    const old_index = __new_vars.index;
    __new_vars.prefix = "_v";
    __new_vars.index = 1;

    const result = this.normalize_var_names().to_string();

    __new_vars.prefix = old_prefix;
    __new_vars.index = old_index;
    return result;
  }

  /** Returns a nicely formatted version of this proposition. */
  abstract to_unicode_string(): string;

  /** Determines if this prop is literally equal to the given one. */
  abstract equals(_: Proposition): boolean;

  /** Determines if this prop is equal to the given one after alpha conversions. */
  abstract equals_alpha(_: Proposition): boolean;

  /** Returns a list of all free variable references in the expression. */
  abstract free_var_refs(): string[];

  /** Returns a set containing all the free variables in the expression. */
  free_vars(): Set<string> {
    return new Set(this.free_var_refs());
  }

  /** Returns this expression with all free references to x replaced by val. */
  abstract subst(x: string, value: Expression): Proposition;

  /**
   * Returns an expression equivalent to this one but normalized by
   *  (1) removing implications (via the Law of Implication)
   *  (2) pushing negations downward (via De Morgan's Law)
   *  (3) give all the variables unique names
   *  (4) pulling quantifiers upward
   *  (5) evaluating any constant expressions
   */
  normalize(): Proposition {
    let prop = this.normalize_arrows()
                   .normalize_unnegate()
                   .normalize_var_names()
                   .normalize_expressions();

    // Remove all the quantifers.
    const quantifiers: Quantifier[] = [];
    prop = prop.strip_quantifiers(quantifiers);

    // Put them back at the front.
    for (let i = quantifiers.length - 1; i >= 0; i--) {
      if (quantifiers[i].variety === PROP_FORALL) {
        prop = new ForAll(quantifiers[i].name, prop);
      } else if (quantifiers[i].variety === PROP_EXISTS) {
        prop = new Exists(quantifiers[i].name, prop);
      } else {
        throw Error(`unknown quantifier variety ${quantifiers[i].variety}`);
      }
    }

    return prop;
  }

  /** Returns an equivalent version of this without -> or <->. */
  abstract normalize_arrows(): Proposition;

  /** Returns an equivalent version with negations pushed downward (De Morgan). */
  abstract normalize_unnegate(): Proposition;

  /** Like normalize_unnegate but equivalent to the negation of this. */
  abstract normalize_negate(): Proposition;

  /** Returns an equivalent version with all bound variables given unique names */
  abstract normalize_var_names(): Proposition;

  /** Returns an equivalent version with all expressions normalized. */
  abstract normalize_expressions(): Proposition;

  /** Returns an equivalent version with all expressions simplified. */
  abstract simplify_expressions(): Proposition;

  /**
   * Returns this proposition with all quantifiers removed and instead added (in
   * order) to the given list.
   */
  abstract strip_quantifiers(quantifiers: Quantifier[]): Proposition;

  /** Returns to_string() wrapped by (..) if necessary.
   * 
   *  * outer_prec: the precedence of the parent operator
   *  * wrap_eq: if true (the default), parenthesize operators with equal precedence
   *             (NOTE: the default value differs from Expression.wrap!)
   */
  wrap(outer_prec: number, wrap_eq?: boolean): string {
    if (wrap_eq === undefined)
      wrap_eq = true;

    if ((outer_prec < this.precedence()) ||
        (outer_prec === this.precedence() && wrap_eq)) {
      return "(" + this.to_string() + ")";
    } else {
      return this.to_string();
    }
  }

  /** Returns to_unicode_string() wrapped by (..) if necessary. */
  wrap_unicode(outer_prec: number, wrap_eq?: boolean): string {
    if (wrap_eq === undefined)
      wrap_eq = true;

    if ((outer_prec < this.precedence()) ||
        (outer_prec === this.precedence() && wrap_eq)) {
      return "(" + this.to_unicode_string() + ")";
    } else {
      return this.to_unicode_string();
    }
  }
}

/** True or False */
export class Constant extends Proposition {
  constructor(variety: number) {
    super(variety);

    if ((variety !== PROP_TRUE) && (variety != PROP_FALSE))
      throw new Error("bad variety for constant: " + variety);
  }

  precedence(): number { return 1; }

  to_string(): string {
    return this.variety === PROP_TRUE ? "true" : "false";
  }
  
  to_unicode_string(): string {
    return this.variety === PROP_TRUE ? "\u22A4" : "\u22A5";
  }
  
  equals(p: Proposition): boolean {
    return this.variety === p.variety;
  }

  equals_alpha(p: Proposition): boolean {
    return this.equals(p);  // leaf node, so no difference
  }
 
  free_var_refs(): string[] {
    return [];
  }

  subst(_: string, __: Expression): Constant {
    return this;
  }

  normalize_arrows(): Proposition {
    return this;
  }

  normalize_unnegate(): Proposition {
    return this;
  }

  normalize_negate(): Proposition {
    return (this.variety === PROP_TRUE) ? FALSE : TRUE;
  }

  normalize_var_names(): Proposition {
    return this;
  }

  normalize_expressions(): Proposition {
    return this;
  }

  simplify_expressions(): Proposition {
    return this;
  }

  strip_quantifiers(_: Quantifier[]): Proposition {
    return this;
  }
}

export const TRUE = new Constant(PROP_TRUE);
export const FALSE = new Constant(PROP_FALSE);

/** Predicate reference */
export class Predicate extends Proposition {
  name: string;
  args: Expression[]

  constructor(name: string, args: (string|Expression)[]) {
    super(PROP_PREDICATE);

    this.name = name;
    this.args = [];
    for (const arg of args) {
      this.args.push(typeof(arg) === 'string' ? new Variable(arg) : arg);
    }
  }

  /** Returns the "equals" predicate with the two expressions as arguments. */
  static equal(left: Expression, right: Expression): Predicate {
    return new Predicate(PRED_EQUAL, [left, right]);
  }

  /** Returns the "equals" predicate with the two expressions as arguments. */
  static lessThan(left: Expression, right: Expression): Predicate {
    return new Predicate(PRED_LESS_THAN, [left, right]);
  }

  /** Returns the "equals" predicate with the two expressions as arguments. */
  static lessOrEqual(left: Expression, right: Expression): Predicate {
    return new Predicate(PRED_LESS_EQUAL, [left, right]);
  }

  /** Returns the "element of" predicate with the two expressions as arguments. */
  static elementOf(left: Expression, right: Expression): Predicate {
    return new Predicate(PRED_ELEMENT_OF, [left, right]);
  }

  /** Returns the "subset" predicate with the two expressions as arguments. */
  static subset(left: Expression, right: Expression): Predicate {
    return new Predicate(PRED_SUBSET, [left, right]);
  }

  /** Returns the "same set" predicate with the two expressions as arguments. */
  static sameSet(left: Expression, right: Expression): Predicate {
    return new Predicate(PRED_SAME_SET, [left, right]);
  }

  static of(name: string, ...args: (string|Expression)[]): Predicate {
    return new Predicate(name, args);
  }

  precedence(): number {
    switch (this.name) {
      case PRED_EQUAL:
      case PRED_LESS_THAN:
      case PRED_LESS_EQUAL:
      case PRED_ELEMENT_OF:
      case PRED_SUBSET:
      case PRED_SAME_SET:
        return 3;  // only need parens when negation is involved
      default:
        return 1;  // not needed when written P(x)
    }
  }

  to_string(): string {
    if (this.args.length === 0) {
      return this.name;
    } else {
      const args = this.args.map((x) => x.to_string());
      if (this.name === PRED_EQUAL && args.length === 2) {
        return `${args[0]} = ${args[1]}`;
      } else if (this.name === PRED_LESS_THAN && args.length === 2) {
        return `${args[0]} < ${args[1]}`;
      } else if (this.name === PRED_LESS_EQUAL && args.length === 2) {
        return `${args[0]} <= ${args[1]}`;
      } else if (this.name === PRED_ELEMENT_OF && args.length === 2) {
        return `${args[0]} in ${args[1]}`;
      } else if (this.name === PRED_SUBSET && args.length === 2) {
        return `${args[0]} subset ${args[1]}`;
      } else if (this.name === PRED_SAME_SET && args.length === 2) {
        return `${args[0]} sameset ${args[1]}`;
      } else {
        return `${this.name}(${args.join(", ")})`;
      }
    }
  }
  
  to_unicode_string(): string {
    if (this.args.length === 0) {
      return this.name;
    } else {
      const args = this.args.map((x) => x.to_string());
      if (this.name === PRED_EQUAL && args.length === 2) {
        return `${args[0]} = ${args[1]}`;
      } else if (this.name === PRED_LESS_THAN && args.length === 2) {
        return `${args[0]} < ${args[1]}`;
      } else if (this.name === PRED_LESS_EQUAL && args.length === 2) {
        return `${args[0]} \u2264 ${args[1]}`;
      } else if (this.name === PRED_ELEMENT_OF && args.length === 2) {
        return `${args[0]} \u2208 ${args[1]}`;
      } else if (this.name === PRED_SUBSET && args.length === 2) {
        return `${args[0]} \u2286 ${args[1]}`;
      } else if (this.name === PRED_SAME_SET && args.length === 2) {
        return `${args[0]} = ${args[1]}`;
      } else {
        return `${this.name}(${args.join(", ")})`;
      }
    }
  }

  equals(prop: Proposition): boolean {
    if (prop.variety !== this.variety)
      return false;

    let pred = prop as Predicate;
    if (this.name !== pred.name)
      return false;
    if (this.args.length !== pred.args.length)
      return false;

    for (let i: number = 0; i < this.args.length; i++) {
      if (!this.args[i].equals(pred.args[i]))
        return false;
    }

    return true; 
  }

  equals_alpha(prop: Proposition): boolean {
    return this.equals(prop);  // leaf node, so no difference
  }

  free_var_refs(): string[] {
    return Array.from(this.free_vars());
  }

  free_vars(): Set<string> {
    const refs = new Set<string>();
    for (const arg of this.args) {
      for (const name of arg.var_refs())
        refs.add(name);
    }
    return refs;
  }

  subst(x: string, value: Expression): Predicate {
    const expr = Variable.of(x);
    const newArgs: Expression[] = [];
    let changed = false;
    for (let i = 0; i < this.args.length; i++) {
      const newArg = this.args[i].subst(expr, value);
      newArgs.push(newArg);
      if (this.args[i] !== newArg)
        changed = true;
    }
    return !changed ? this :
        new Predicate(this.name, this.args.map((ex) => ex.subst(expr, value)));
  }

  normalize_arrows(): Proposition {
    return this;
  }

  normalize_unnegate(): Proposition {
    return this;
  }

  normalize_negate(): Proposition {
    return new Negation(this);
  }

  normalize_var_names(): Proposition {
    return this;
  }

  normalize_expressions(): Proposition {
    return this.simplify_args(true, true);
  }

  simplify_expressions(): Proposition {
    return this.simplify_args(false, false);
  }

  /**
   * Returns an expression with all args simplified or normalized. Furthermore,
   * if all arguments are constant, this can evaluate the argument as well.
   */
  private simplify_args(normalize: boolean, evaluate: boolean): Proposition {
    let changed = false;
    let constant = true;
    const newArgs: Expression[] = [];
    for (let i = 0; i < this.args.length; i++) {
      const newArg = normalize ?  this.args[i].normalize() : this.args[i].simplify();
      if (newArg !== this.args[i])
        changed = true;
      if (newArg.variety !== exprs.EXPR_CONSTANT)
        constant = false;
      newArgs.push(newArg);
    }
    if (evaluate && constant && newArgs.length === 2) {
      const left = (newArgs[0] as exprs.Constant).value;
      const right = (newArgs[1] as exprs.Constant).value;
      if (this.name === PRED_EQUAL) {
        return (left === right) ? props.TRUE : props.FALSE;
      } else if (this.name === PRED_LESS_THAN) {
        return (left < right) ? props.TRUE : props.FALSE;
      } else if (this.name === PRED_LESS_EQUAL) {
        return (left <= right) ? props.TRUE : props.FALSE;
      }
    }
    return !changed ? this : new Predicate(this.name, newArgs);
  }

  strip_quantifiers(_: Quantifier[]): Proposition {
    return this;
  }
}

/** Negation of a proposition. */
export class Negation extends Proposition {
  prop: Proposition;

  constructor(prop: Proposition) {
    super(PROP_NOT);

    this.prop = prop;
  }

  static of(prop: Proposition): Negation {
    return new Negation(prop);
  }

  precedence(): number { return 2; }

  to_string(): string {
    return "not " + this.prop.wrap(this.precedence(), false);
  }

  to_unicode_string(): string {
    return "\u00AC" + this.prop.wrap_unicode(this.precedence(), false);
  }

  equals(prop: Proposition): boolean {
    return prop.variety === this.variety &&
        this.prop.equals((prop as Negation).prop);
  }

  equals_alpha(prop: Proposition): boolean {
    return prop.variety === this.variety &&
        this.prop.equals_alpha((prop as Negation).prop);
  }

  free_var_refs(): string[] {
    return this.prop.free_var_refs();
  }

  subst(x: string, value: Expression): Negation {
    const prop = this.prop.subst(x, value);
    return (prop === this.prop) ? this : new Negation(prop);
  }

  normalize_arrows(): Proposition {
    const prop = this.prop.normalize_arrows()
    return (prop === this.prop) ? this : new Negation(prop);
  }

  normalize_unnegate(): Proposition {
    return this.prop.normalize_negate();  // push negation down
  }

  normalize_negate(): Proposition {
    return this.prop.normalize_unnegate();  // double negation eliminates this
  }

  normalize_var_names(): Proposition {
    const prop = this.prop.normalize_var_names()
    return (prop === this.prop) ? this : new Negation(prop);
  }

  normalize_expressions(): Proposition {
    const prop = this.prop.normalize_expressions()
    return (prop === this.prop) ? this : new Negation(prop);
  }

  simplify_expressions(): Proposition {
    const prop = this.prop.simplify_expressions()
    return (prop === this.prop) ? this : new Negation(prop);
  }

  strip_quantifiers(quantifiers: Quantifier[]): Proposition {
    const prop = this.prop.strip_quantifiers(quantifiers);
    return (prop === this.prop) ? this : new Negation(prop);
  }
}

/** Conjunction of two propositions. */
export class Conjunction extends Proposition {
  left: Proposition;
  right: Proposition;

  constructor(left: Proposition, right: Proposition) {
    super(PROP_AND);

    this.left = left;
    this.right = right;
  }

  /** Returns the conjunction of the two given propositions. */
  static of(left: Proposition, right: Proposition): Conjunction {
    return new Conjunction(left, right);
  }

  precedence(): number { return 4; }

  to_string(): string {
    return this.left.wrap(this.precedence(), false) + " and " +
           this.right.wrap(this.precedence());
  }

  to_unicode_string(): string {
    return this.left.wrap_unicode(this.precedence(), false) + " \u2227 " +
           this.right.wrap_unicode(this.precedence());
  }

  equals(prop: Proposition): boolean {
    return prop.variety === this.variety &&
        this.left.equals((prop as Conjunction).left) &&
        this.right.equals((prop as Conjunction).right);
  }

  equals_alpha(prop: Proposition): boolean {
    return prop.variety === this.variety &&
        this.left.equals_alpha((prop as Conjunction).left) &&
        this.right.equals_alpha((prop as Conjunction).right);
  }

  free_var_refs(): string[] {
    return this.left.free_var_refs().concat(this.right.free_var_refs());
  }

  subst(x: string, value: Expression): Conjunction {
    const left = this.left.subst(x, value);
    const right = this.right.subst(x, value);
    return (left === this.left && right === this.right) ?
        this : new Conjunction(left, right);
  }

  normalize_arrows(): Proposition {
    const left = this.left.normalize_arrows();
    const right = this.right.normalize_arrows();
    return (left === this.left && right === this.right) ?
        this : new Conjunction(left, right);
  }

  normalize_unnegate(): Proposition {
    const left = this.left.normalize_unnegate();
    const right = this.right.normalize_unnegate();
    return (left === this.left && right === this.right) ?
        this : new Conjunction(left, right);
  }

  normalize_negate(): Proposition {
    return new Disjunction(  // De Morgan
        this.left.normalize_negate(),
        this.right.normalize_negate());
  }

  normalize_var_names(): Proposition {
    const left = this.left.normalize_var_names();
    const right = this.right.normalize_var_names();
    return (left === this.left && right === this.right) ?
        this : new Conjunction(left, right);
  }

  normalize_expressions(): Proposition {
    const left = this.left.normalize_expressions();
    const right = this.right.normalize_expressions();
    return (left === this.left && right === this.right) ?
        this : new Conjunction(left, right);
  }

  simplify_expressions(): Proposition {
    const left = this.left.simplify_expressions();
    const right = this.right.simplify_expressions();
    return (left === this.left && right === this.right) ?
        this : new Conjunction(left, right);
  }

  strip_quantifiers(quantifiers: Quantifier[]): Proposition {
    const left = this.left.strip_quantifiers(quantifiers);
    const right = this.right.strip_quantifiers(quantifiers);
    return (left === this.left && right === this.right) ?
        this : new Conjunction(left, right);
  }
}

/** Disjunction of two propositions. */
export class Disjunction extends Proposition {
  left: Proposition;
  right: Proposition;

  constructor(left: Proposition, right: Proposition) {
    super(PROP_OR);

    this.left = left;
    this.right = right;
  }

  /** Returns the disjunction of the two given propositions. */
  static of(left: Proposition, right: Proposition): Disjunction {
    return new Disjunction(left, right);
  }

  precedence(): number { return 5; }

  to_string(): string {
    return this.left.wrap(this.precedence(), false) + " or " +
           this.right.wrap(this.precedence());
  }

  to_unicode_string(): string {
    return this.left.wrap_unicode(this.precedence(), false) + " \u2228 " +
           this.right.wrap_unicode(this.precedence());
  }

  equals(prop: Proposition): boolean {
    return prop.variety === this.variety &&
        this.left.equals((prop as Disjunction).left) &&
        this.right.equals((prop as Disjunction).right);
  }

  equals_alpha(prop: Proposition): boolean {
    return prop.variety === this.variety &&
        this.left.equals_alpha((prop as Disjunction).left) &&
        this.right.equals_alpha((prop as Disjunction).right);
  }

  free_var_refs(): string[] {
    return this.left.free_var_refs().concat(this.right.free_var_refs());
  }

  subst(x: string, value: Expression): Disjunction {
    const left = this.left.subst(x, value);
    const right = this.right.subst(x, value);
    return (left === this.left && right === this.right) ?
        this : new Disjunction(left, right);
  }

  normalize_arrows(): Proposition {
    const left = this.left.normalize_arrows();
    const right = this.right.normalize_arrows();
    return (left === this.left && right === this.right) ?
        this : new Disjunction(left, right);
  }

  normalize_unnegate(): Proposition {
    const left = this.left.normalize_unnegate();
    const right = this.right.normalize_unnegate();
    return (left === this.left && right === this.right) ?
        this : new Disjunction(left, right);
  }

  normalize_negate(): Proposition {
    return new Conjunction(  // De Morgan
        this.left.normalize_negate(),
        this.right.normalize_negate());
  }

  normalize_var_names(): Proposition {
    const left = this.left.normalize_var_names();
    const right = this.right.normalize_var_names();
    return (left === this.left && right === this.right) ?
        this : new Disjunction(left, right);
  }

  normalize_expressions(): Proposition {
    const left = this.left.normalize_expressions();
    const right = this.right.normalize_expressions();
    return (left === this.left && right === this.right) ?
        this : new Disjunction(left, right);
  }

  simplify_expressions(): Proposition {
    const left = this.left.simplify_expressions();
    const right = this.right.simplify_expressions();
    return (left === this.left && right === this.right) ?
        this : new Disjunction(left, right);
  }

  strip_quantifiers(quantifiers: Quantifier[]): Proposition {
    const left = this.left.strip_quantifiers(quantifiers);
    const right = this.right.strip_quantifiers(quantifiers);
    return (left === this.left && right === this.right) ?
        this : new Disjunction(left, right);
  }
}

/** Implication of two propositions. */
export class Implication extends Proposition {
  premise: Proposition;
  conclusion: Proposition;

  constructor(premise: Proposition, conclusion: Proposition) {
    super(PROP_IMPLIES);

    this.premise = premise;
    this.conclusion = conclusion;
  }

  /** Returns the disjunction of the two given propositions. */
  static of(premise: Proposition, conclusion: Proposition): Implication {
    return new Implication(premise, conclusion);
  }

  precedence(): number { return 6; }

  to_string(): string {
    return this.premise.wrap(this.precedence()) + " -> " +
           this.conclusion.wrap(this.precedence(), false);
  }

  to_unicode_string(): string {
    return this.premise.wrap_unicode(this.precedence()) + " \u2192 " +
           this.conclusion.wrap_unicode(this.precedence(), false);
  }

  equals(prop: Proposition): boolean {
    return prop.variety === this.variety &&
        this.premise.equals((prop as Implication).premise) &&
        this.conclusion.equals((prop as Implication).conclusion);
  }

  equals_alpha(prop: Proposition): boolean {
    return prop.variety === this.variety &&
        this.premise.equals_alpha((prop as Implication).premise) &&
        this.conclusion.equals_alpha((prop as Implication).conclusion);
  }

  free_var_refs(): string[] {
    return this.premise.free_var_refs().concat(this.conclusion.free_var_refs());
  }

  subst(x: string, value: Expression): Implication {
    const prem = this.premise.subst(x, value);
    const conc = this.conclusion.subst(x, value);
    return (prem === this.premise && conc === this.conclusion) ?
        this : new Implication(prem, conc);
  }

  normalize_arrows(): Proposition {
    return new Disjunction(
        new Negation(this.premise.normalize_arrows()),
        this.conclusion.normalize_arrows());
  }

  normalize_unnegate(): Proposition {
    throw new Error("implications should be removed before unnegate");
  }

  normalize_negate(): Proposition {
    throw new Error("implications should be removed before negate");
  }

  normalize_var_names(): Proposition {
    const premise = this.premise.normalize_var_names();
    const conclusion = this.conclusion.normalize_var_names();
    return (premise === this.premise && conclusion === this.conclusion) ?
        this : new Implication(premise, conclusion);
  }

  normalize_expressions(): Proposition {
    const premise = this.premise.normalize_expressions();
    const conclusion = this.conclusion.normalize_expressions();
    return (premise === this.premise && conclusion === this.conclusion) ?
        this : new Implication(premise, conclusion);
  }

  simplify_expressions(): Proposition {
    const premise = this.premise.simplify_expressions();
    const conclusion = this.conclusion.simplify_expressions();
    return (premise === this.premise && conclusion === this.conclusion) ?
        this : new Implication(premise, conclusion);
  }

  strip_quantifiers(quantifiers: Quantifier[]): Proposition {
    const premise = this.premise.strip_quantifiers(quantifiers);
    const conclusion = this.conclusion.strip_quantifiers(quantifiers);
    return (premise === this.premise && conclusion === this.conclusion) ?
        this : new Implication(premise, conclusion);
  }
}

/** Biconditional between two propositions. */
export class Biconditional extends Proposition {
  left: Proposition;
  right: Proposition;

  constructor(left: Proposition, right: Proposition) {
    super(PROP_IFF);

    this.left = left;
    this.right = right;
  }

  /** Returns the biconditional between the two given propositions. */
  static of(left: Proposition, right: Proposition): Biconditional {
    return new Biconditional(left, right);
  }

  precedence(): number { return 6; }

  to_string(): string {
    return this.left.wrap(this.precedence()) + " <-> " +
           this.right.wrap(this.precedence(), false);
  }

  to_unicode_string(): string {
    return this.left.wrap_unicode(this.precedence()) + " \u2194 " +
           this.right.wrap_unicode(this.precedence(), false);
  }

  equals(prop: Proposition): boolean {
    return prop.variety === this.variety &&
        this.left.equals((prop as Biconditional).left) &&
        this.right.equals((prop as Biconditional).right);
  }

  equals_alpha(prop: Proposition): boolean {
    return prop.variety === this.variety &&
        this.left.equals_alpha((prop as Biconditional).left) &&
        this.right.equals_alpha((prop as Biconditional).right);
  }

  free_var_refs(): string[] {
    return this.left.free_var_refs().concat(this.right.free_var_refs());
  }

  subst(x: string, value: Expression): Biconditional {
    const left = this.left.subst(x, value);
    const right = this.right.subst(x, value);
    return (left === this.left && right === this.right) ?
        this : new Biconditional(left, right);
  }

  normalize_arrows(): Proposition {
    const left = this.left.normalize_arrows();
    const right = this.right.normalize_arrows();
    return new Conjunction(
        new Disjunction(new Negation(left), right),
        new Disjunction(new Negation(right), left));
  }

  normalize_unnegate(): Proposition {
    throw new Error("biconditionals should be removed before unnegate");
  }

  normalize_negate(): Proposition {
    throw new Error("biconditionals should be removed before negate");
  }

  normalize_var_names(): Proposition {
    const left = this.left.normalize_var_names();
    const right = this.right.normalize_var_names();
    return (left === this.left && right === this.right) ?
        this : new Biconditional(left, right);
  }

  normalize_expressions(): Proposition {
    const left = this.left.normalize_expressions();
    const right = this.right.normalize_expressions();
    return (left === this.left && right === this.right) ?
        this : new Biconditional(left, right);
  }

  simplify_expressions(): Proposition {
    const left = this.left.simplify_expressions();
    const right = this.right.simplify_expressions();
    return (left === this.left && right === this.right) ?
        this : new Biconditional(left, right);
  }

  strip_quantifiers(quantifiers: Quantifier[]): Proposition {
    const left = this.left.strip_quantifiers(quantifiers);
    const right = this.right.strip_quantifiers(quantifiers);
    return (left === this.left && right === this.right) ?
        this : new Biconditional(left, right);
  }
}

/** Superclass for ForAll and Exists. */
export abstract class Quantifier extends Proposition {
  name: string;
  body: Proposition;

  constructor(variety: number, name: string, body: Proposition) {
    super(variety);

    this.name = name;
    this.body = body;

    if ((variety !== PROP_FORALL) && (variety != PROP_EXISTS))
      throw new Error("bad variety for quantifier: " + variety);
  }

  precedence(): number { return 7; }

  to_string(): string {
    const typ = (this.variety === PROP_FORALL) ? "forall" : "exists";
    return `${typ} ${this.name}, ${this.body.wrap(this.precedence(), false)}`;
  }

  to_unicode_string(): string {
    const typ = (this.variety === PROP_FORALL) ? "\u2200" : "\u2203";
    return `${typ} ${this.name}, ${this.body.wrap_unicode(this.precedence(), false)}`;
  }

  equals(prop: Proposition): boolean {
    return prop.variety === this.variety &&
        this.name === (prop as Quantifier).name &&
        this.body.equals((prop as Quantifier).body);
  }

  equals_alpha(p: Proposition): boolean {
    if (p.variety !== this.variety)
      return false;

    const prop = p as Quantifier;
    if (this.name === prop.name) {
      return this.body.equals_alpha(prop.body);
    } else {
      // Change both bodies to use the same, completely new name. Then compare.
      const name = NewVarName();
      const body1 = this.body.subst(this.name, Variable.of(name));
      const body2 = prop.body.subst(prop.name, Variable.of(name));
      return body1.equals_alpha(body2);
    }
  }

  free_var_refs(): string[] {
    return this.body.free_var_refs().filter((name) => name !== this.name);
  }

  subst(x: string, value: Expression): Quantifier {
    // If the old name matches this quantifier, then there can be no references
    // to the outer variable from within the body.
    if (this.name === x) {
      return this;

    // If the new value contains this quantifier, then this substitution would
    // create references to the wrong variable (a bound one, not the free one).
    // To avoid that, we will rename our bound variable first.
    } else if (value.vars().has(this.name)) {
      const new_name = NewVarNameVariation(this.name, this.body.free_vars());
      const new_body = this.body.subst(this.name, Variable.of(new_name));
      if (this.variety === PROP_FORALL) {
        return ForAll.of(new_name, new_body).subst(x, value);
      } else {
        return Exists.of(new_name, new_body).subst(x, value);
      }

    // Otherwise, we can safely rename to the new one in the body.
    } else {
      const body = this.body.subst(x, value);
      return (body === this.body) ?
          this : (this.variety === PROP_FORALL) ?
            ForAll.of(this.name, body) : Exists.of(this.name, body);
    }

  }

  normalize_arrows(): Proposition {
    const body = this.body.normalize_arrows();
    return (body === this.body) ?
        this : (this.variety === PROP_FORALL) ?
            ForAll.of(this.name, body) : Exists.of(this.name, body);
  }

  normalize_expressions(): Proposition {
    const body = this.body.normalize_expressions();
    return (body === this.body) ?
        this : (this.variety === PROP_FORALL) ?
            ForAll.of(this.name, body) : Exists.of(this.name, body);
  }

  simplify_expressions(): Proposition {
    const body = this.body.simplify_expressions();
    return (body === this.body) ?
        this : (this.variety === PROP_FORALL) ?
            ForAll.of(this.name, body) : Exists.of(this.name, body);
  }

  strip_quantifiers(quantifiers: Quantifier[]): Proposition {
    quantifiers.push(this);
    return this.body.strip_quantifiers(quantifiers);
  }
}

/** Universal quantification of a proposition. */
export class ForAll extends Quantifier {
  constructor(name: string, body: Proposition) {
    super(PROP_FORALL, name, body);
  }

  static of(name: string, body: Proposition): ForAll {
    return new ForAll(name, body);
  }

  normalize_unnegate(): Proposition {
    const body = this.body.normalize_unnegate();
    return (body === this.body) ?
        this : new ForAll(this.name, body);
  }

  normalize_negate(): Proposition {
    return new Exists(this.name,    // De Morgan
        this.body.normalize_negate());
  }

  normalize_var_names(): Proposition {
    const name = NewVarName();
    return new ForAll(name,
        this.body.subst(this.name, Variable.of(name)).normalize_var_names());
  }
}

/** Existential quantification of a proposition. */
export class Exists extends Quantifier {
  constructor(name: string, body: Proposition) {
    super(PROP_EXISTS, name, body);
  }

  static of(name: string, body: Proposition): Exists {
    return new Exists(name, body);
  }

  normalize_unnegate(): Proposition {
    const body = this.body.normalize_unnegate();
    return (body === this.body) ?
        this : new Exists(this.name, body);
  }

  normalize_negate(): Proposition {
    return new ForAll(this.name,    // De Morgan
        this.body.normalize_negate());
  }

  normalize_var_names(): Proposition {
    const name = NewVarName();
    return new Exists(name,
        this.body.subst(this.name, Variable.of(name)).normalize_var_names());
  }
}


// Used for NewVarName below. Exported so tests can override.
export const __new_vars = {
  prefix: "_v",
  index: 1
};

/** Returns a variable name not used anywhere else. */
export function NewVarName(): string {
  return __new_vars.prefix + String(__new_vars.index++);
}

/**
 * Returns a name similar to the given one but not included in the given set,
 * nor equal to the original name. (Note that this is deterministic.)
 */
export function NewVarNameVariation(name: string, avoid: Set<string>): string {
  // Find the part of the name before any digits at the end.
  let i = name.length;
  while (i - 1 >= 0 && "0" <= name[i-1] && name[i-1] <= "9")
    i -= 1;
  const base_name = name.substring(0, i);

  // Form a new name by adding a number to the end.
  for (let j = 0; true; j++) {
    const new_name = base_name + j;
    if (new_name !== name && !avoid.has(new_name))
      return new_name;
  }

  throw new Error("impossible");
}

/**
 * Returns the list of variables declared using foralls at the top-most level of
 * the given expression and along with the body of the inner-most quantifier.
 */
export function SplitQuantifiers(prop: Proposition, depth?: number): [string[], Proposition] {
  if (prop.variety == PROP_FORALL &&
      (depth === undefined || depth > 0)) {
    const forall = prop as ForAll;
    const [vars, body] = SplitQuantifiers(forall.body,
        (depth === undefined) ? undefined : depth - 1);
    vars.unshift(forall.name);
    return [vars, body];
  } else {
    return [[], prop];  // no quantifiers
  }
}

/** Returns the given proposition with the top-level foralls names changed. */
export function RenameQuantifiers(prop: Proposition, names: string[]): Proposition {
  if (prop.variety == PROP_FORALL && names.length > 0) {
    const forall = prop as ForAll;
    const body = RenameQuantifiers(forall.body, names.slice(1));
    return ForAll.of(names[0], body.subst(forall.name, Variable.of(names[0])));
  } else {
    if (names.length > 0)
      throw new Error('not enough quantified variables to rename');
    return prop;
  }
}

/**
 * Returns a copy of the given proposition but with all the top-level foralls
 * names in the given set (or all if not given) changed into new variable names.
 * (In the const of Definition, those will be eliminated, so their actual values
 * are not important and can be made unique.)
 */
export function UniquifyQuantifiers(prop: Proposition): Proposition {
  if (prop.variety == props.PROP_FORALL) {
    const forall = prop as ForAll;
    const new_name = NewVarName();
    const new_body = UniquifyQuantifiers(forall.body);
    return new ForAll(new_name,
        new_body.subst(forall.name, Variable.of(new_name)));
  }
  return prop;
}


/** Determines whether the given proposition is an equation. */
export function IsEquation(eq: Proposition): boolean {
  return (eq.variety === props.PROP_PREDICATE &&
      ((eq as Predicate).name === props.PRED_EQUAL) &&
      ((eq as Predicate).args.length === 2));
}

/** Determines whether the given proposition is an inequality. */
export function IsInequality(eq: Proposition): boolean {
  return (eq.variety === props.PROP_PREDICATE &&
      (((eq as Predicate).name === props.PRED_LESS_THAN) ||
       ((eq as Predicate).name === props.PRED_LESS_EQUAL)) &&
      ((eq as Predicate).args.length === 2));
}

/** Determines whether the given proposition is an element-of relationship. */
export function IsElementOf(prop: Proposition): boolean {
  return (prop.variety === props.PROP_PREDICATE &&
      (prop as Predicate).name === props.PRED_ELEMENT_OF) &&
      (prop as Predicate).args.length === 2;
}

/** Determines whether the given proposition is subset relationship. */
export function IsSubset(prop: Proposition): boolean {
  return (prop.variety === props.PROP_PREDICATE &&
      (prop as Predicate).name === props.PRED_SUBSET) &&
      (prop as Predicate).args.length === 2;
}

/** Determines whether the given proposition is set equality. */
export function IsSameSet(prop: Proposition): boolean {
  return (prop.variety === props.PROP_PREDICATE &&
      (prop as Predicate).name === props.PRED_SAME_SET) &&
      (prop as Predicate).args.length === 2;
}


/**
 * Determines whether the given proposition is a definition, which is a
 * forall-quantified biconditional.
 */
export function IsDefinition(prop: Proposition): boolean {
  const body = SplitQuantifiers(prop)[1];
  return body.variety === PROP_IFF;
}

/**
 * Determines whether the given proposition is a theorem, which is a
 * forall-quantified implication.
 */
export function IsTheorem(prop: Proposition): boolean {
  const body = SplitQuantifiers(prop)[1];
  return body.variety === PROP_IMPLIES ||
         body.variety === PROP_IFF;
}
