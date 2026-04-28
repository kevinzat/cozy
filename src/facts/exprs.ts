export const EXPR_CONSTANT = 1;
export const EXPR_VARIABLE = 2;
export const EXPR_FUNCTION = 3;


// Functions related to integer arithmetic.
export const FUNC_EXPONENTIATE = "_exp_";
export const FUNC_MULTIPLY = "_mult_";
export const FUNC_ADD = "_add_";
export const FUNC_SUBTRACT = "_sub_";
export const FUNC_NEGATE = "_neg_";

// Functions related to sets
export const FUNC_SET_UNION = "_union_"
export const FUNC_SET_INTERSECTION = "_intersect_"
export const FUNC_SET_COMPLEMENT = "_set_comp_"
export const FUNC_SET_DIFFERENCE = "_set_diff_"


/** Base class for all types of expressions. */
export abstract class Expression {
  variety: number;

  constructor(variety: number) {
    this.variety = variety;
  }

  /** Returns a precedence number for the outer operator. */
  abstract precedence(): number;

  /** Returns a string that would parse back to this proposition. */
  abstract to_string(): string;

  /** Determines if this prop is literally equal to the given one. */
  abstract equals(_: Expression): boolean;

  /** Returns a list of all variable references in the expression. */
  abstract var_refs(): string[];

  /** Returns a set containing all the variables in the expression. */
  vars(): Set<string> {
    return new Set(this.var_refs());
  }

  /**
   * Returns this expression with all instances of the given expression (expr)
   * replaced by the given value.
   */
  abstract subst(expr: Expression, value: Expression): Expression;

  /**
   * Returns an expression equivalent to this one but simplified. This will not
   * perform any operation that might make the expression larger such as
   * distributing multiplication over addition.
   * 
   * In more detail, this performs the following simplifications in this order:
   *  (1) evaluating any expressions that can be evaluated
   *  (2) combining common terms
   *  (3) arithmetic simplifications: 0x = 0, 1x = x, 0+x = x, -1*x = -x
   */
  simplify(): Expression {
    let expr: Expression = this;
    expr = expr.eval_constants();
    expr = expr.remove_negation();
    expr = expr.associate();
    expr = expr.combine_arguments();
    expr = expr.apply_identities();
    expr = expr.add_negation();
    return expr;
  }

  /**
   * Returns an expression that is a sum of products, each of which is a
   * a product of unique, possibly exponentiated variables and function calls.
   */
  normalize(): Expression {
    let expr: Expression = this;
    expr = expr.eval_constants();
    expr = expr.apply_identities();
    expr = expr.remove_exponents();
    expr = expr.remove_negation();
    expr = expr.associate();
    for (let i = 0; i < 20; i++) {
      const next = expr.distribute().associate();
      if (next.equals(expr)) {
        expr = next;
        expr = expr.combine_arguments();
        expr = expr.apply_identities();
        return expr;
      }
      expr = next;
    }
    throw new Error(`expression normalization did not converge after 20 distribution passes`);
  }

  /** Returns this expression but evaluating any expressions with known values. */
  eval_constants(): Expression { /* default version */ return this; }

  /**
   * Returns an expression with no add of add or multiply of multiply. Instead,
   * those are turned into a single, many-argument add or multiply, resp.
   */
  associate(): Expression { /* default version */ return this; }

  /**
   * Returns an expression with no subtraction or negation. These are replaced
   * by multiplication by negative one.
   */
  remove_negation(): Expression { /* default version */ return this; }

  /**
   * Returns an expression that replaces -1x by the negation of x and that uses
   * subtraction to lieu of x + (-y).
   */
  add_negation(): Expression { /* default version */ return this; }

  /** Applies basic identities involving multiplication and addition by 0/1. */
  apply_identities(): Expression { /* default version */ return this; }

  /**
   * Combines common factors using exponents and terms using constants. The end
   * result is that each factor and term is unique.
   */
  combine_arguments(): Expression { /* default version */ return this; }

  /** Replaces all (small) exponents of sums with multiplication. */
  remove_exponents(): Expression { /* default version */ return this; }

  /** Distributes multiplication over addition. */
  distribute(): Expression { /* default version */ return this; }

  /** 
   * Returns to_string() wrapped by (..) if necessary.
   * 
   * * outer_prec: the precedence of the parent operator
   * * wrap_eq: if false (the default), do not parenthesize operators with equal precedence
   *            (NOTE: the default value differs from Proposition.wrap!)
   */
  wrap(outer_prec: number, wrap_eq?: boolean): string {
    if (outer_prec > this.precedence() ||
        (wrap_eq && outer_prec === this.precedence())) {
      return "(" + this.to_string() + ")";
    } else {
      return this.to_string();
    }
  }
}


/** Represents an integer value. */
export class Constant extends Expression {
  value: bigint;

  constructor(value: bigint) {
    super(EXPR_CONSTANT);
    this.value = value;
  }

  static ZERO = Constant.of(0n);
  static ONE = Constant.of(1n);
  static MINUS_ONE = Constant.of(-1n);

  /** Returns a variable with the given value. */
  static of(value: bigint): Constant {
    return new Constant(value);
  }

  precedence(): number {
    return this.value < 0n ? 2 : 5;  // treat negatives as negated positives
  }

  to_string(): string {
    return String(this.value);
  }

  equals(e: Expression): boolean {
    if (e.variety !== EXPR_CONSTANT)
      return false;

    const c: Constant = e as Constant;
    return c.value === this.value;
  }

  var_refs(): string[] {
    return [];
  }

  subst(expr: Expression, value: Expression): Expression {
    return this.equals(expr) ? value : this;
  }
}


/** Represents a variable. */
export class Variable extends Expression {
  name: string;

  constructor(name: string) {
    super(EXPR_VARIABLE);
    this.name = name;
  }

  /** Returns a variable with the given name. */
  static of(name: string): Variable {
    return new Variable(name);
  }

  precedence(): number {
    return 5;
  }

  to_string(): string {
    return this.name;
  }

  equals(e: Expression): boolean {
    if (e.variety !== EXPR_VARIABLE)
      return false;

    const c: Variable = e as Variable;
    return c.name === this.name;
  }

  var_refs(): string[] {
    return [this.name];
  }

  subst(expr: Expression, value: Expression): Expression {
    return this.equals(expr) ? value : this;
  }
}

/** Represents a function call, which can be a basic arithmetic operation. */
export class Call extends Expression {
  name: string;
  args: Expression[];

  constructor(name: string, args: Expression[]) {
    super(EXPR_FUNCTION);
    this.name = name;
    this.args = args.slice(0);
  }

  /** Returns a function call representing negation (minus the given value). */
  static negate(arg: Expression): Call {
    return new Call(FUNC_NEGATE, [arg]);
  }

  /** Returns a function call representing addition. */
  static add(left: Expression, right: Expression): Call {
    return new Call(FUNC_ADD, [left, right]);
  }

  /** Returns a function call representing subtraction. */
  static subtract(left: Expression, right: Expression): Call {
    return new Call(FUNC_SUBTRACT, [left, right]);
  }

  /** Returns a function call representing multiplication. */
  static multiply(left: Expression, right: Expression): Call {
    return new Call(FUNC_MULTIPLY, [left, right]);
  }

  /** Returns a function call representing exponentiation. */
  static exponentiate(base: Expression, exponent: Constant): Call {
    return new Call(FUNC_EXPONENTIATE, [base, exponent]);
  }

  /** Returns a function call representing set complement. */
  static setComplement(arg: Expression): Call {
    return new Call(FUNC_SET_COMPLEMENT, [arg]);
  }

  /** Returns a function call representing union. */
  static setUnion(left: Expression, right: Expression): Call {
    return new Call(FUNC_SET_UNION, [left, right]);
  }

  /** Returns a function call representing intersection. */
  static setIntersection(left: Expression, right: Expression): Call {
    return new Call(FUNC_SET_INTERSECTION, [left, right]);
  }

  /** Returns a function call representing set difference. */
  static setDifference(left: Expression, right: Expression): Call {
    return new Call(FUNC_SET_DIFFERENCE, [left, right]);
  }

  /** Returns a call to the given function with the given arguments. */
  static of(name: string, ...args: Expression[]): Call {
    return new Call(name, args);
  }

  /**
   * Determines whether the given expression is negation, which means that it is
   * a call to the negation function passing in a single argument.
   */
  static isNegation(expr: Expression): boolean {
    return expr.variety == EXPR_FUNCTION &&
           (expr as Call).name === FUNC_NEGATE &&
           (expr as Call).args.length === 1;
  }

  /**
   * Determines whether the given expression is exponentiation, which means that
   * it is a call to the exponentiation function, passing in two arguments, the
   * second of which is a constant.
   */
  static isExponentiation(expr: Expression): boolean {
    return expr.variety == EXPR_FUNCTION &&
           (expr as Call).name === FUNC_EXPONENTIATE &&
           (expr as Call).args.length === 2 &&
           (expr as Call).args[1].variety === EXPR_CONSTANT;
  }

  /** Determines whether the given expression is set complement. */
  static isSetComplement(expr: Expression): boolean {
    return expr.variety == EXPR_FUNCTION &&
           (expr as Call).name === FUNC_SET_COMPLEMENT &&
           (expr as Call).args.length === 1;
  }

  /** Determines whether the given expression is set union. */
  static isSetUnion(expr: Expression): boolean {
    return expr.variety == EXPR_FUNCTION &&
           (expr as Call).name === FUNC_SET_UNION &&
           (expr as Call).args.length === 2;
  }

  /** Determines whether the given expression is set intersection. */
  static isSetIntersection(expr: Expression): boolean {
    return expr.variety == EXPR_FUNCTION &&
           (expr as Call).name === FUNC_SET_INTERSECTION &&
           (expr as Call).args.length === 2;
  }

  /** Determines whether the given expression is set difference. */
  static isSetDifference(expr: Expression): boolean {
    return expr.variety == EXPR_FUNCTION &&
           (expr as Call).name === FUNC_SET_DIFFERENCE &&
           (expr as Call).args.length === 2;
  }

  precedence(): number {
    if (this.args.length === 1) {
      if (this.name === FUNC_NEGATE) {
        return 2;
      } else if (this.name === FUNC_SET_COMPLEMENT) {
        return 4;
      }
    } else if (this.args.length === 2) {
      if (this.name === FUNC_EXPONENTIATE) {
        return 4;
      } else if (this.name === FUNC_SET_INTERSECTION ||
                 this.name === FUNC_SET_DIFFERENCE) {
        return 3;
      } else if (this.name === FUNC_SET_UNION) {
        return 1;
      }
    }

    if (this.name === FUNC_MULTIPLY) {
      return 3;
    } else if (this.name === FUNC_ADD || this.name === FUNC_SUBTRACT) {
      return 1;
    }

    return 5;
  }

  to_string(): string {
    if (this.args.length === 1) {
      const arg = this.args[0].wrap(this.precedence());
      if (this.name === FUNC_NEGATE) {
        return `-${arg}`
      } else if (this.name === FUNC_SET_COMPLEMENT) {
        return `~${arg}`
      }
    } else if (this.args.length === 2) {
      if (this.name === FUNC_EXPONENTIATE) {
        const arg1 = this.args[0].wrap(this.precedence(), true);
        const arg2 = this.args[1].wrap(this.precedence());
        return `${arg1}^${arg2}`;
      } else {
        const arg1 = this.args[0].wrap(this.precedence());
        const arg2 = this.args[1].wrap(this.precedence(), true);  // assoc left
        if (this.name === FUNC_SET_INTERSECTION) {
          return `${arg1} cap ${arg2}`;
        } else if (this.name === FUNC_SET_DIFFERENCE) {
          return `${arg1} \\ ${arg2}`;
        } else if (this.name === FUNC_SET_UNION) {
          return `${arg1} cup ${arg2}`;
        }
      }
    }

    if (this.name === FUNC_MULTIPLY) {
      const argStrs = [this.args[0].wrap(this.precedence())];
      for (let i = 1; i < this.args.length; i++) {
        argStrs.push(this.args[i].wrap(this.precedence(), true));
      }
      return argStrs.join("*");
    } else if (this.name === FUNC_ADD) {
      const argStrs = [this.args[0].wrap(this.precedence())];
      for (let i = 1; i < this.args.length; i++) {
        argStrs.push(this.args[i].wrap(this.precedence(), true));
      }
      return argStrs.join(" + ");
    } else if (this.name === FUNC_SUBTRACT) {
      const argStrs = [this.args[0].wrap(this.precedence())];
      for (let i = 1; i < this.args.length; i++) {
        argStrs.push(this.args[i].wrap(this.precedence(), true));
      }
      return argStrs.join(" - ");
    } else {
      const argStrs = this.args.map((arg) => arg.to_string());
      return `${this.name}(${argStrs.join(", ")})`;
    }
  }

  equals(e: Expression): boolean {
    if (e.variety !== EXPR_FUNCTION)
      return false;

    const c: Call = e as Call;
    if (c.name !== this.name)
      return false;

    if (c.args.length !== this.args.length)
      return false;

    for (let i = 0; i < this.args.length; i++) {
      if (!this.args[i].equals(c.args[i]))
        return false;
    }

    return true;
  }

  var_refs(): string[] {
    return Array.from(this.vars());
  }

  vars(): Set<string> {
    const vars = new Set<string>();
    for (let i = 0; i < this.args.length; i++) {
      for (const name of this.args[i].var_refs()) {
        vars.add(name);
      }
    }
    return vars;
  }

  subst(expr: Expression, value: Expression): Expression {
    if (this.equals(expr))
      return value;

    let changed: boolean = false;
    let newArgs: Expression[] = [];
    for (let i = 0; i < this.args.length; i++) {
      const newArg = this.args[i].subst(expr, value);
      if (this.args[i] !== newArg)
        changed = true;
      newArgs.push(newArg);
    }
    return !changed ? this : new Call(this.name, newArgs);
  }

  eval_constants(): Expression {
    let numConst = 0;
    let newArgs: Expression[] = [];
    for (let i = 0; i < this.args.length; i++) {
      const newArg = this.args[i].eval_constants();
      if (newArg.variety === EXPR_CONSTANT)
        numConst += 1;
      newArgs.push(newArg);
    }

    if (this.name === FUNC_NEGATE) {
      if (numConst === 1 && newArgs.length === 1) {
        const val = (newArgs[0] as Constant).value;
        return new Constant(-val);
      }
    } else if (this.name === FUNC_EXPONENTIATE) {
      if (numConst === 2 && newArgs.length === 2) {
        const val1 = (newArgs[0] as Constant).value;
        const val2 = (newArgs[1] as Constant).value;
        return new Constant(val1 ** val2);
      }
    } else if (this.name === FUNC_SUBTRACT) {
      if (numConst === 2 && newArgs.length === 2) {
        const val1 = (newArgs[0] as Constant).value;
        const val2 = (newArgs[1] as Constant).value;
        return new Constant(val1 - val2);
      } else if (newArgs.length == 2 && newArgs[1].variety === EXPR_CONSTANT) {
        return new Call(FUNC_ADD,
            [newArgs[0], new Constant(-(newArgs[1] as Constant).value)]);
      }
    }

    if (this.name === FUNC_MULTIPLY) {
      if (numConst === newArgs.length) {
        let val = 1n;
        for (const newArg of newArgs) {
          val *= (newArg as Constant).value;
        }
        return new Constant(val);
      } else if (numConst > 0) {
        const args: Expression[] = [];
        let val = 1n;
        for (const newArg of newArgs) {
          if (newArg.variety === EXPR_CONSTANT) {
            val *= (newArg as Constant).value;
          } else {
            args.push(newArg);
          }
        }
        args.unshift(new Constant(val));
        return new Call(FUNC_MULTIPLY, args);
      }
    } else if (this.name === FUNC_ADD) {
      if (numConst === newArgs.length) {
        let val = 0n;
        for (const newArg of newArgs) {
          val += (newArg as Constant).value;
        }
        return new Constant(val);
      } else if (numConst > 1) {
        const args: Expression[] = [];
        let val = 0n;
        for (const newArg of newArgs) {
          if (newArg.variety === EXPR_CONSTANT) {
            val += (newArg as Constant).value;
          } else {
            args.push(newArg);
          }
        }
        args.unshift(new Constant(val));
        return new Call(FUNC_ADD, args);
      }
    }

    return new Call(this.name, newArgs);
  }

  associate(): Expression {
    if (this.name === FUNC_MULTIPLY || this.name === FUNC_ADD) {
      const args: Expression[] = [];
      this.add_arguments(args)
      return new Call(this.name, args.map((a) => a.associate()));
    } else {
      return this;
    }
  }

  /**
   * Adds to args all arguments to this function to the given list or, if those
   * arguments are themselves calls to this same function, then their arguments
   * are recursively added to the given list.
   */
  add_arguments(args: Expression[]): void {
    for (let i = 0; i < this.args.length; i++) {
      if (this.args[i].variety === EXPR_FUNCTION &&
          (this.args[i] as Call).name === this.name) {
        (this.args[i] as Call).add_arguments(args); 
      } else {
        args.push(this.args[i]);
      }
    }
  }

  remove_negation(): Expression {
    if (this.name === FUNC_NEGATE && this.args.length == 1) {
      return new Call(FUNC_MULTIPLY,
          [Constant.MINUS_ONE, this.args[0].remove_negation()]);
    } else if (this.name === FUNC_SUBTRACT && this.args.length == 2) {
      return new Call(FUNC_ADD, [this.args[0],
          new Call(FUNC_MULTIPLY,
              [Constant.MINUS_ONE, this.args[1].remove_negation()])]);
    } else {
      return new Call(this.name, this.args.map((x) => x.remove_negation()));
    }
  }

  add_negation(): Expression {
    const newArgs = this.args.map((x) => x.add_negation());
    if (this.name === FUNC_MULTIPLY) {
      if (newArgs[0].equals(Constant.MINUS_ONE)) {
        return new Call(FUNC_NEGATE,
            (newArgs.length === 2) ? [newArgs[1]] :
                [new Call(FUNC_MULTIPLY, newArgs.slice(1))]);
      }
    } else if (this.name === FUNC_ADD) {
      const negArgs: Expression[] = [];
      for (let i = 1; i < newArgs.length; i++) {
        if (newArgs[i].variety === EXPR_CONSTANT &&
            (newArgs[i] as Constant).value < 0n) {
          negArgs.push(new Constant(-(newArgs[i] as Constant).value));
        } else if (newArgs[i].variety === EXPR_FUNCTION &&
            (newArgs[i] as Call).name === FUNC_NEGATE &&
            (newArgs[i] as Call).args.length === 1) {
          negArgs.push((newArgs[i] as Call).args[0]);
        }
      }

      if (negArgs.length + 1 === newArgs.length) {
        return new Call(FUNC_SUBTRACT, [newArgs[0]].concat(negArgs));
      }
    }
    return new Call(this.name, newArgs);
  }
 
  apply_identities(): Expression {
    if (this.name === FUNC_ADD) {
      const nonZero = this.args
          .map((x) => x.apply_identities())
          .filter((x) => !x.equals(Constant.ZERO));
      return (nonZero.length == 1) ? nonZero[0] : new Call(FUNC_ADD, nonZero);
    } else if (this.name === FUNC_MULTIPLY) {
      const newArgs = this.args.map((x) => x.apply_identities());
      if (newArgs.length > 1 && newArgs[0].variety === EXPR_CONSTANT) {
        if (newArgs[0].equals(Constant.ZERO)) {
          return Constant.ZERO;
        } else if (newArgs[0].equals(Constant.ONE)) {
          if (newArgs.length === 2) {
            return newArgs[1];
          } else {
            return new Call(FUNC_MULTIPLY, newArgs.slice(1));
          }
        }
      }
    } else if (Call.isExponentiation(this)) {
      const val = (this.args[1] as Constant).value;
      if (val === 0n) {
        return Constant.ONE;
      } else if (val === 1n) {
        return this.args[0].apply_identities();
      } 
    }
    return new Call(this.name, this.args.map((x) => x.apply_identities()));
  }

  combine_arguments(): Expression {
    const args = this.args.map((x) => x.combine_arguments());
    if (this.name === FUNC_ADD) {
      const terms = Call.combine_terms(args);
      return (terms.length === 1) ? terms[0] : new Call(FUNC_ADD, terms);
    } else if (this.name === FUNC_MULTIPLY) {
      const [factors, value] =  Call.combine_factors(args);
      if (factors.length === 0) {
        return Constant.of(value);
      } else if (value === 1n && factors.length === 1) {
        return factors[0];
      } else if (value === 1n) {
        return new Call(FUNC_MULTIPLY, factors);
      } else if (factors.length === 1) {
        return Call.multiply(Constant.of(value), factors[0]);
      } else {  // value != 1 and factors.length > 1
        return new Call(FUNC_MULTIPLY,
            [Constant.of(value) as Expression].concat(factors));
      }
    } else {
      return new Call(this.name, args);
    }
  }

  /** Groups common terms by changing their constant factor. */
  static combine_terms(args: Expression[]): Expression[] {
    // Keep track of terms and the sum of their constant factors. The keys are
    // the string representation of the terms, which should be unique.
    const count = new Map<string, [Expression|null, bigint]>();

    for (const arg of args) {
      // Turn this argument into a constant factor times the rest.
      let val: bigint = 1n;
      let expr: Expression|null = arg;
      if (arg.variety == EXPR_CONSTANT) {
        val = (arg as Constant).value;
        expr = null;
      } else if (arg.variety == EXPR_FUNCTION &&
          (arg as Call).name === FUNC_MULTIPLY &&
          (arg as Call).args.length > 0 &&
          (arg as Call).args[0].variety === EXPR_CONSTANT) {
        val = ((arg as Call).args[0] as Constant).value;
        const numArgs = (arg as Call).args.length;
        if (numArgs === 1) {
          expr = Constant.ONE;
        } else if (numArgs === 2) {
          expr = (arg as Call).args[1];
        } else {
          expr = new Call(FUNC_MULTIPLY, (arg as Call).args.slice(1));
        }
      }

      // Add the constant factor of this term into the sum.
      const key = (expr === null) ? "" : expr.to_string();
      if (!count.has(key))
        count.set(key, [expr, 0n]);
      count.set(key, [expr, val + count.get(key)![1]]);
    }

    // If we didn't consolidate any of the arguments, then leave them as is
    // (i.e., do not reorder them).
    if (count.size === args.length)
      return args;

    const keys = Array.from(count.keys());
    keys.sort();  // normalize by always adding in a fixed order

    // Return a list of the combined terms multiplied by their sums.
    const newArgs: Expression[] = [];
    for (const key of keys) {
      const [expr, val] = count.get(key)!;
      if (expr === null) {
        newArgs.push(new Constant(val));
      } else if (expr.variety === EXPR_FUNCTION &&
          (expr as Call).name === FUNC_MULTIPLY) {
        newArgs.push(new Call(FUNC_MULTIPLY,
            [new Constant(val) as Expression].concat((expr as Call).args)));
      } else {
        newArgs.push(new Call(FUNC_MULTIPLY, [new Constant(val), expr]));
      }
    }
    return newArgs;
  }

  /**
   * Groups common factors by changing their exponents. Constant values are also
   * combined and returned in the second argument.
   */
  static combine_factors(args: Expression[]): [Expression[], bigint] {
    // Keep track of factors and the sum of their exponents. The keys are the
    // string representation of the factors, which should be unique.
    const count = new Map<string, [Expression, bigint]>();

    // Multiply together all the constants as we go through, removing them from
    // any further processing.
    let newConst = 1n;

    for (const arg of args) {
      if (arg.variety === EXPR_CONSTANT) {
        newConst *= (arg as Constant).value
      } else {
        // Turn this argument into a factor and an exponent.
        let val: bigint = 1n;
        let expr: Expression = arg;
        if (Call.isExponentiation(arg)) {
          expr = (arg as Call).args[0];
          val = ((arg as Call).args[1] as Constant).value;
        }

        // Add the exponent of this factor into the sum.
        const key = expr.to_string();
        if (!count.has(key))
          count.set(key, [arg, 0n]);
        count.set(key, [expr, val + count.get(key)![1]]);
      }
    }

    const keys = Array.from(count.keys());
    keys.sort();  // normalize by always adding in a fixed order

    // Return a list of the combined terms multiplied by their sums.
    const newArgs: Expression[] = [];
    for (const key of keys) {
      const [expr, val] = count.get(key)!;
      if (expr.variety === EXPR_CONSTANT) {
        throw Error(`we have uh-oh, over`)
      } else if (val == 1n) {
        newArgs.push(expr);
      } else {
        newArgs.push(new Call(FUNC_EXPONENTIATE, [expr, new Constant(val)]));
      }
    }
    return [newArgs, newConst];
  }

  remove_exponents(): Expression {
    if (Call.isExponentiation(this) &&
        this.args[0].variety === EXPR_FUNCTION) {
      const arg = this.args[0] as Call;
      const exp = (this.args[1] as Constant).value;

      // Replace exponentiation of exponentiation with a single exponentiation
      // and then remove that exponent.
      if (Call.isExponentiation(arg)) {
        const exp2 = (arg.args[1] as Constant).value;
        return new Call(FUNC_EXPONENTIATE,
            [arg.args[0], new Constant(exp * exp2)]).remove_exponents();

      // If the argument is any other arithmetic operation, replace
      // exponentiation with a repeated product of the base.
      } else if (2n <= exp && exp <= 10n &&
                 (arg.name === FUNC_MULTIPLY || arg.name === FUNC_ADD ||
                  arg.name === FUNC_SUBTRACT || arg.name === FUNC_NEGATE)) {
        const newArgs = [];
        const base = this.args[0].remove_exponents();
        for (let i = 0n; i < exp; i++) {
          newArgs.push(base);
        }
        return new Call(FUNC_MULTIPLY, newArgs);  // exp copies of args[0]
      }
    }

    // In all other cases, apply recursively to the arguments but otherwise
    // leave as is.
    return new Call(this.name, this.args.map((x) => x.remove_exponents()));
  }

  distribute(): Expression {
    if (this.name === FUNC_MULTIPLY && this.args.length >= 2) {
      const args = this.args.map((x) => x.distribute());
      const terms: Expression[] = [];
      Call.distribute_factors([], args, 0, terms);
      return (terms.length == 1) ? terms[0] : new Call(FUNC_ADD, terms);
    } else {
      return new Call(this.name, this.args.map((x) => x.distribute()));
    }

  }

  /**
   * Builds every product that can be formed by multiplying the elements of
   * rest[index:] that are non-sums with individual terms from those that are
   * sums, along with all the factors in the given list, and adds them into the
   * given list of terms.
   */
  private static distribute_factors(
      factors: Expression[], rest: Expression[], index: number,
      terms: Expression[]) {
    if (index < rest.length) {
      const next = rest[index];
      if (next.variety === EXPR_FUNCTION &&
          (next as Call).name === FUNC_ADD) {
        const args = (next as Call).args;
        for (let i = 0; i < args.length; i++) {
          factors.push(args[i]);
          Call.distribute_factors(factors, rest, index + 1, terms);
          factors.pop();
        }
      } else {
        factors.push(next);
        Call.distribute_factors(factors, rest, index + 1, terms);
        factors.pop();
      }
    } else {
      terms.push(new Call(FUNC_MULTIPLY, factors.slice(0)));
    }
  }
}
