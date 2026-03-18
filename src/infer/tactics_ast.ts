import {
  Constant,
  EXPR_CONSTANT,
    Expression, FUNC_SET_COMPLEMENT, FUNC_SET_DIFFERENCE, FUNC_SET_INTERSECTION,
    FUNC_SET_UNION
  } from '../facts/exprs';
import { Predicate, Proposition, PRED_SAME_SET, PRED_SUBSET } from '../facts/props';
import { isStringArray, isPropArray, isExprArray } from './rules_ast';
import * as tactics from './tactics';


/**
 * Represents a parsed line of text describing a backward reasoning rule.
 * This will become a Tactic object.
 */
export abstract class TacticAst {
  variety: number;         // which type of tactic

  constructor(variety: number) {
    this.variety = variety;
  }

  /** Returns text that would parse back into this AST. */
  abstract to_string(): string;
}

export class GivenAst extends TacticAst {
  constructor() {
    super(tactics.TACTIC_GIVEN);
  }

  to_string(): string {
    return 'given';
  }
}

export class CiteAst extends TacticAst {
  name: string;

  constructor(name: unknown) {
    super(tactics.TACTIC_CITE);

    if (typeof name !== 'string')
      throw new Error('first argument should be a string');

    this.name = name;
  }

  to_string(): string {
    return `cite ${this.name}`;
  }
}

export class ModusPonensAst extends TacticAst {
  prop: Proposition;

  constructor(prop: unknown) {
    super(tactics.TACTIC_MODUS_PONENS);

    if (!(prop instanceof Proposition))
      throw new Error('first argument should be a Proposition');

    this.prop = prop;
  }

  to_string(): string {
    return `modus ponens (${this.prop.to_string()})`;
  }
}

export class DirectProofAst extends TacticAst {
  constructor() {
    super(tactics.TACTIC_DIRECT_PROOF);
  }

  to_string(): string {
    return 'direct proof';
  }
}

export class ElimAndAst extends TacticAst {
  alt: Proposition;
  left: boolean;

  constructor(alt: unknown, left: unknown) {
    super(tactics.TACTIC_ELIM_AND);

    if (!(alt instanceof Proposition))
      throw new Error('first argument should be a Proposition');
    if (typeof left !== 'boolean')
      throw new Error('second argument should be a boolean');

    this.alt = alt;
    this.left = left;
  }

  to_string(): string {
    return `elim and (${this.alt.to_string()}) ${this.left ? 'left' : 'right'}`;
  }
}

export class IntroAndAst extends TacticAst {
  constructor() {
    super(tactics.TACTIC_INTRO_AND);
  }

  to_string(): string {
    return 'intro and';
  }
}

export class ElimOrAst extends TacticAst {
  alt: Proposition;
  left: boolean;

  constructor(alt: unknown, left: unknown) {
    super(tactics.TACTIC_ELIM_OR);

    if (!(alt instanceof Proposition))
      throw new Error('first argument should be a Proposition');
    if (typeof left !== 'boolean')
      throw new Error('second argument should be a boolean');

    this.alt = alt;
    this.left = left;
  }

  to_string(): string {
    return `elim or (${this.alt.to_string()}) ${this.left ? 'left' : 'right'}`;
  }
}

export class SimpleCasesAst extends TacticAst {
  prop: Proposition;

  constructor(prop: unknown) {
    super(tactics.TACTIC_SIMPLE_CASES);

    if (!(prop instanceof Proposition))
      throw new Error('first argument should be a Proposition');

    this.prop = prop;
  }

  to_string(): string {
    return `simple cases (${this.prop.to_string()})`;
  }
}

export class CasesAst extends TacticAst {
  prop: Proposition;

  constructor(prop: unknown) {
    super(tactics.TACTIC_CASES);

    if (!(prop instanceof Proposition))
      throw new Error('first argument should be a Proposition');

    this.prop = prop;
  }

  to_string(): string {
    return `cases (${this.prop.to_string()})`;
  }
}

export class IntroOrAst extends TacticAst {
  prop: Proposition;

  constructor(prop: unknown) {
    super(tactics.TACTIC_INTRO_OR);

    if (!(prop instanceof Proposition))
      throw new Error('first argument should be a Proposition');

    this.prop = prop;
  }

  to_string(): string {
    return `intro or (${this.prop.to_string()})`;
  }
}

export class PrincipiumContradictionisAst extends TacticAst {
  prop: Proposition;

  constructor(prop: unknown) {
    super(tactics.TACTIC_CONTRADICTION);

    if (!(prop instanceof Proposition))
      throw new Error('first argument should be a Proposition');

    this.prop = prop;
  }

  to_string(): string {
    return `contradiction (${this.prop.to_string()})`;
  }
}

export class ReductioAdAbsurdumAst extends TacticAst {
  constructor() {
    super(tactics.TACTIC_ABSURDUM);
  }

  to_string(): string {
    return 'absurdum';
  }
}

export class ExFalsoQuodlibetAst extends TacticAst {
  constructor() {
    super(tactics.TACTIC_EX_FALSO);
  }

  to_string(): string {
    return 'exfalso';
  }
}

export class AdLitteramVerumAst extends TacticAst {
  constructor() {
    super(tactics.TACTIC_VERUM);
  }

  to_string(): string {
    return 'verum';
  }
}

export class TautologyAst extends TacticAst {
  constructor() {
    super(tactics.TACTIC_TAUTOLOGY);
  }

  to_string(): string {
    return 'tautology';
  }
}

export class EquivalentAst extends TacticAst {
  prop: Proposition;

  constructor(prop: unknown) {
    super(tactics.TACTIC_EQUIVALENT);

    if (!(prop instanceof Proposition))
      throw new Error('first argument should be a Proposition');

    this.prop = prop;
  }

  to_string(): string {
    return `equivalent (${this.prop.to_string()})`;
  }
}

export class ElimForAllAst extends TacticAst {
  expr: Expression;
  name: string;

  constructor(expr: unknown, name: unknown) {
    super(tactics.TACTIC_ELIM_FORALL);

    if (!(expr instanceof Expression))
      throw new Error('first argument should be an Expression');
    if (typeof name !== 'string')
      throw new Error('second argument should be a string');

    this.expr = expr;
    this.name = name;
  }

  to_string(): string {
    return `elim forall {${this.expr.to_string()}} ${this.name}`;
  }
}

export class IntroForAllAst extends TacticAst {
  innerNames?: string[];

  constructor(innerNames?: unknown) {
    super(tactics.TACTIC_INTRO_FORALL);

    if (innerNames !== undefined && !isStringArray(innerNames))
      throw new Error('first argument should be an array of strings');

    this.innerNames = innerNames;
  }

  to_string(): string {
    if (this.innerNames === undefined) {
      return 'intro forall';
    } else {
      return `intro forall ${this.innerNames.join(" ")}`;
    }
  }
}

export class ElimExistsAst extends TacticAst {
  varName: string;
  newName: string;

  constructor(varName: unknown, newName: unknown) {
    super(tactics.TACTIC_ELIM_EXISTS);

    if (typeof varName !== 'string')
      throw new Error('first argument should be a string');
    if (typeof newName !== 'string')
      throw new Error('second argument should be a string');

    this.varName = varName;
    this.newName = newName;
  }

  to_string(): string {
    return `elim exists ${this.varName} ${this.newName}`;
  }
}

export class IntroExistsAst extends TacticAst {
  expr: Expression;

  constructor(expr: unknown) {
    super(tactics.TACTIC_INTRO_EXISTS);

    if (!(expr instanceof Expression))
      throw new Error('first argument should be an Expression');

    this.expr = expr;
  }

  to_string(): string {
    return `intro exists {${this.expr.to_string()}}`;
  }
}

export class InductionAst extends TacticAst {
  constructor() {
    super(tactics.TACTIC_INDUCTION);
  }

  to_string(): string {
    return 'induction';
  }
}

export class SubstituteAst extends TacticAst {
  eq: Predicate;
  right: boolean;

  constructor(eq: unknown, right: unknown) {
    super(tactics.TACTIC_SUBSTITUTE);

    if (!(eq instanceof Predicate))
      throw new Error('first argument should be an Predicate');
    if (typeof right !== 'boolean')
      throw new Error('second argument should be a boolean');

    this.eq = eq;
    this.right = right;
  }

  to_string(): string {
    return `substitute (${this.eq.to_string()}) ${this.right ? 'right' : 'left'}`;
  }
}

export class DefinitionAst extends TacticAst {
  defName: string;
  right: boolean;

  constructor(defName: unknown, right: unknown) {
    super(tactics.TACTIC_DEFINITION);

    if (typeof defName !== 'string')
      throw new Error('first argument should be an string');
    if (typeof right !== 'boolean')
      throw new Error('second argument should be a boolean');

    this.defName = defName;
    this.right = right;
  }

  to_string(): string {
    return `${this.right ? 'defof' : 'undef'} ${this.defName}`;
  }
}

export class ApplyAst extends TacticAst {
  thmName: string;

  constructor(thmName: unknown) {
    super(tactics.TACTIC_APPLY);

    if (typeof thmName !== 'string')
      throw new Error('first argument should be an string');

    this.thmName = thmName;
  }

  to_string(): string {
    return `apply ${this.thmName}`;
  }
}

export class AlgebraAst extends TacticAst {
  props: Proposition[];

  constructor(props: unknown) {
    super(tactics.TACTIC_ALGEBRA);

    if (!isPropArray(props))
      throw new Error('first argument should be an array of propositions');

    this.props = props;
  }

  to_string(): string {
    const props = this.props.map((p) => `(${p.to_string()})`);
    return `algebra ${props.join(" ")}`;
  }
}
