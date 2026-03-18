import { Proposition } from './props';
import { ParseProp, ParseError } from './props_parser';
import * as props from './props';
import * as exprs from './exprs';
import * as assert from 'assert';


/** Ensures that the given string parses into the given proposition. */
function AssertParseEqual(text: string, prop: Proposition): void {
  const result = ParseProp(text);
  assert.ok(result.equals(prop));
}


describe('props_parser', function() {

  it('parser', function() {
    AssertParseEqual("true", props.TRUE);
    AssertParseEqual("false", props.FALSE);

    const P = props.Predicate.of("P");
    const Px = props.Predicate.of("P", "x");
    const Pxy = props.Predicate.of("P", "x", "y");
    const Q = props.Predicate.of("Q");
    AssertParseEqual("P", P);
    AssertParseEqual("P(x)", Px);
    AssertParseEqual("P(x, y)", Pxy);
    AssertParseEqual("Q", Q);

    AssertParseEqual("not P", props.Negation.of(P));
    AssertParseEqual("not P(x)", props.Negation.of(Px));
    AssertParseEqual("not Q", props.Negation.of(Q));
    AssertParseEqual("not not P(x)", props.Negation.of(props.Negation.of(Px)));

    AssertParseEqual("P and Q", props.Conjunction.of(P, Q));
    AssertParseEqual("Q and P", props.Conjunction.of(Q, P));
    AssertParseEqual("P(x) and Q", props.Conjunction.of(Px, Q));
    AssertParseEqual("P(x) and not P(x)",
        props.Conjunction.of(Px, props.Negation.of(Px)));
    AssertParseEqual("P(x) and (P or Q)",
        props.Conjunction.of(Px, props.Disjunction.of(P, Q)));
    AssertParseEqual("(P or Q) and P(x)",
        props.Conjunction.of(props.Disjunction.of(P, Q), Px));
    AssertParseEqual("P(x) and (P and Q)",
        props.Conjunction.of(Px, props.Conjunction.of(P, Q)));
    AssertParseEqual("P and Q and P(x)",
        props.Conjunction.of(props.Conjunction.of(P, Q), Px));
    AssertParseEqual("not (Q and P) and (P and Q)",
        props.Conjunction.of(
            props.Negation.of(props.Conjunction.of(Q, P)),
            props.Conjunction.of(P, Q)));

    AssertParseEqual("P or Q", props.Disjunction.of(P, Q));
    AssertParseEqual("Q or P", props.Disjunction.of(Q, P));
    AssertParseEqual("P(x) or Q", props.Disjunction.of(Px, Q));
    AssertParseEqual("P(x) or not P(x)",
        props.Disjunction.of(Px, props.Negation.of(Px)));
    AssertParseEqual("P(x) or P and Q",
        props.Disjunction.of(Px, props.Conjunction.of(P, Q)));
    AssertParseEqual("P(x) or (P or Q)",
        props.Disjunction.of(Px, props.Disjunction.of(P, Q)));
    AssertParseEqual("P or Q or P(x)",
        props.Disjunction.of(props.Disjunction.of(P, Q), Px));
    AssertParseEqual("not (Q or P) or P and Q",
        props.Disjunction.of(
            props.Negation.of(props.Disjunction.of(Q, P)),
            props.Conjunction.of(P, Q)));

    AssertParseEqual("P -> Q", props.Implication.of(P, Q));
    AssertParseEqual("Q -> P", props.Implication.of(Q, P));
    AssertParseEqual("P(x) -> Q", props.Implication.of(Px, Q));
    AssertParseEqual("P(x) -> not P(x)",
        props.Implication.of(Px, props.Negation.of(Px)));
    AssertParseEqual("P(x) -> P and Q",
        props.Implication.of(Px, props.Conjunction.of(P, Q)));
    AssertParseEqual("P(x) -> P or Q",
        props.Implication.of(Px, props.Disjunction.of(P, Q)));
    AssertParseEqual("P -> Q -> P",
        props.Implication.of(P, props.Implication.of(Q, P)));
    AssertParseEqual("(P -> Q) -> P",
        props.Implication.of(props.Implication.of(P, Q), P));
    AssertParseEqual("not P -> Q -> P and Q",
        props.Implication.of(
            props.Negation.of(P),
            props.Implication.of(Q,
                props.Conjunction.of(P, Q))));

    AssertParseEqual("forall x, P(x)", props.ForAll.of("x", Px));
    AssertParseEqual("forall x, P(x, y)", props.ForAll.of("x", Pxy));
    AssertParseEqual("forall y, P(x, y)", props.ForAll.of("y", Pxy));
    AssertParseEqual("forall x, forall y, P(x, y)",
        props.ForAll.of("x", props.ForAll.of("y", Pxy)));
    AssertParseEqual("forall x, exists y, P(x, y)",
        props.ForAll.of("x", props.Exists.of("y", Pxy)));
    AssertParseEqual("forall x, P(x) and (exists y, P(x, y))",
        props.ForAll.of("x",
            props.Conjunction.of(Px,
                props.Exists.of("y", Pxy))));

    AssertParseEqual("exists x, P(x)", props.Exists.of("x", Px));
    AssertParseEqual("exists x, P(x, y)", props.Exists.of("x", Pxy));
    AssertParseEqual("exists y, P(x, y)", props.Exists.of("y", Pxy));
    AssertParseEqual("exists x, forall y, P(x, y)",
        props.Exists.of("x", props.ForAll.of("y", Pxy)));
    AssertParseEqual("exists x, exists y, P(x, y)",
        props.Exists.of("x", props.Exists.of("y", Pxy)));
    AssertParseEqual("exists x, P(x) and (exists y, P(x, y))",
        props.Exists.of("x",
            props.Conjunction.of(Px,
                props.Exists.of("y", Pxy))));

    AssertParseEqual("P -> Q <-> P",
        props.Implication.of(P, props.Biconditional.of(Q, P)));
    AssertParseEqual("(P <-> Q) -> P",
        props.Implication.of(props.Biconditional.of(P, Q), P));
    AssertParseEqual("not P <-> Q <-> P and Q",
        props.Biconditional.of(
            props.Negation.of(P),
            props.Biconditional.of(Q,
                props.Conjunction.of(P, Q))));

    AssertParseEqual("a = b and a+b < c",
        props.Conjunction.of(
            props.Predicate.equal(exprs.Variable.of("a"), exprs.Variable.of("b")),
            props.Predicate.lessThan(
                exprs.Call.add(exprs.Variable.of("a"), exprs.Variable.of("b")),
                exprs.Variable.of("c"))));

    AssertParseEqual("x+y in A cap B cup ~ C \\ D \\ (A cup B)",
        props.Predicate.elementOf(
            exprs.Call.add(exprs.Variable.of("x"), exprs.Variable.of("y")),
            exprs.Call.setUnion(
                exprs.Call.setIntersection(
                    exprs.Variable.of("A"), exprs.Variable.of("B")),
                exprs.Call.setDifference(
                    exprs.Call.setDifference(
                        exprs.Call.setComplement(exprs.Variable.of("C")),
                        exprs.Variable.of("D")),
                    exprs.Call.setUnion(
                        exprs.Variable.of("A"), exprs.Variable.of("B"))))));

    AssertParseEqual("Symmetric(r) and Reflexive(R) and Transitive(R cap S)",
        props.Conjunction.of(
            props.Conjunction.of(
                props.Predicate.of("Symmetric", "r"),
                props.Predicate.of("Reflexive", "R")),
            props.Predicate.of("Transitive",
                exprs.Call.setIntersection(
                    exprs.Variable.of("R"), exprs.Variable.of("S")))));
  });

  it('parser - syntax errors', function() {
    assert.throws(() => ParseProp("x +"), ParseError);
    assert.throws(() => ParseProp("x + 1 ="), ParseError);
    assert.throws(() => ParseProp("x + 1 = 2 and "), ParseError);
  });

});
