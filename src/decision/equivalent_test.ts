import * as assert from 'assert';
import { ParseProp } from '../facts/props_parser';
import { CheckEquivalent } from './equivalent';


describe('equivalent', function() {

  it('check', function() {
    assert.strictEqual(CheckEquivalent(
        ParseProp("forall x, P(x) -> (exists y, Q(x, y))"),
        ParseProp("forall x, exists y, P(x) -> Q(x, y)")),
        null);
    assert.strictEqual(CheckEquivalent(
        ParseProp("forall x, exists y, P(x) -> Q(x, y)"),
        ParseProp("forall x, P(x) -> (exists y, Q(x, y))")),
        null);

    assert.strictEqual(CheckEquivalent(
        ParseProp("forall x, P(x) -> (exists y, Q(x, y))"),
        ParseProp("forall x, P(x) -> Q(x, y)")),
        "quantifiers differ after normalization");
    assert.strictEqual(CheckEquivalent(
        ParseProp("forall x, P(x) -> Q(x, y)"),
        ParseProp("forall x, P(x) -> (exists y, Q(x, y))")),
        "quantifiers differ after normalization");

    assert.strictEqual(CheckEquivalent(
        ParseProp("forall x, P(x) -> (exists y, Q(x, y))"),
        ParseProp("forall x, exists y, Q(x, y) -> P(x)")),
        "different values under some assignment");
    assert.strictEqual(CheckEquivalent(
        ParseProp("forall x, exists y, Q(x, y) -> P(x)"),
        ParseProp("forall x, P(x) -> (exists y, Q(x, y))")),
        "different values under some assignment");

    assert.strictEqual(CheckEquivalent(
        ParseProp("P <-> Q"),
        ParseProp("(not P or Q) and (not Q or P)")),
        null);
    assert.strictEqual(CheckEquivalent(
        ParseProp("forall x, P(x) <-> Q(x)"),
        ParseProp("forall x, (not P(x) or Q(x)) and (P(x) or not Q(x))")),
        null);
    assert.strictEqual(CheckEquivalent(
        ParseProp("exists x, P(x) <-> Q(x)"),
        ParseProp("exists x, (P(x) and Q(x)) or (not P(x) and not Q(x))")),
        null);

    // Contrapositive with quantifiers
    assert.strictEqual(CheckEquivalent(
        ParseProp("(forall x, P(x)) -> (forall x, Q(x))"),
        ParseProp("not (forall x, P(x)) -> not (forall x, Q(x))")),  // inverse
        "quantifiers differ after normalization");
    assert.strictEqual(CheckEquivalent(
        ParseProp("(forall x, P(x)) -> (forall x, Q(x))"),
        ParseProp("(forall x, Q(x)) -> (forall x, P(x))")),          // converse
        "different values under some assignment");
    assert.strictEqual(CheckEquivalent(
        ParseProp("(forall x, P(x)) -> (forall x, Q(x))"),
        ParseProp("not (forall x, Q(x)) -> not (forall x, P(x))")), // contrapositive
        null);

    // tautology
    assert.strictEqual(CheckEquivalent(
        ParseProp("6 = 2 * 3"),
        ParseProp("true")),
        null);

    // Cases from homework
    assert.strictEqual(CheckEquivalent(
        ParseProp("Prime(p) -> (forall n, forall m, (p = n*m) -> (n = 1) or (m = 1))"),
        ParseProp("not (forall n, forall m, (p = n*m) -> (n = 1) or (m = 1)) -> not Prime(p)")),
        null);
    assert.strictEqual(CheckEquivalent(
        ParseProp("not (forall n, forall m, (p = n*m) -> (n = 1) or (m = 1)) -> not Prime(p)"),
        ParseProp("(exists n, exists m, (p = n*m) and not (n = 1) and not (m = 1)) -> not Prime(p)")),
        null);
    assert.strictEqual(CheckEquivalent(
        ParseProp("not (forall n, forall m, (p = n*m) -> (n = 1) or (m = 1)) -> not Prime(p)"),
        ParseProp("(exists n, exists m, (p = n*m) and not (n = 1) and not (m = 1)) -> not Prime(p)")),
        null);
  });

});
