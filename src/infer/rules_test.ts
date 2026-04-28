import * as assert from 'assert';
import * as exprs from '../facts/exprs';
import { Call, Constant, Variable } from '../facts/exprs';
import { Biconditional, Conjunction, ForAll, Implication, Negation, Predicate } from '../facts/props';
import { ParseProp } from '../facts/props_parser';
import {
    Assumption, Given, Cite, Repeat, ModusPonens, DirectProof, ElimAnd,
    IntroAnd, ElimOr, SimpleCases, Cases, IntroOr, PrincipiumContradictionis,
    ReductioAdAbsurdum, ExFalsoQuodlibet, AdLitteramVerum, ElimForAll,
    IntroForAll, ElimExists, IntroExists, Tautology, Equivalent, Substitute,
    InvalidRule, Definition, Apply, SetFunction, SetRelation, Algebra,
    Induction, RuleName, RuleVariety
  } from './rules';
import { SubproofEnv, TopLevelEnv, TrailingEnv } from './env';
import * as props from '../facts/props';
import * as rules from './rules';


/** Environment used for the proofs below. */
const ENV = new TopLevelEnv([
    ["Even", ParseProp("forall x, Even(x) <-> (exists y, x = 2*y)")],
    [exprs.FUNC_SET_COMPLEMENT, ForAll.of("a", ForAll.of("x",
        Biconditional.of(
            Predicate.elementOf(Variable.of("x"),
                Call.setComplement(Variable.of("a"))),
            Negation.of(
                Predicate.elementOf(Variable.of("x"), Variable.of("a")))))) ],
    [exprs.FUNC_SET_INTERSECTION, ForAll.of("a", ForAll.of("b", ForAll.of("x",
        Biconditional.of(
            Predicate.elementOf(Variable.of("x"),
                Call.setIntersection(Variable.of("a"), Variable.of("b"))),
            Conjunction.of(
                Predicate.elementOf(Variable.of("x"), Variable.of("a")),
                Predicate.elementOf(Variable.of("x"), Variable.of("b"))))))) ],
    [exprs.FUNC_SET_DIFFERENCE, ForAll.of("a", ForAll.of("b", ForAll.of("x",
        Biconditional.of(
            Predicate.elementOf(Variable.of("x"),
                Call.setDifference(Variable.of("a"), Variable.of("b"))),
            Conjunction.of(
                Predicate.elementOf(Variable.of("x"), Variable.of("a")),
                Negation.of(
                    Predicate.elementOf(Variable.of("x"), Variable.of("b")))))))) ],
    [props.PRED_SUBSET, ForAll.of("a", ForAll.of("b",
        Biconditional.of(
            Predicate.subset(Variable.of("a"), Variable.of("b")),
            ForAll.of("x",
                Implication.of(
                    Predicate.elementOf(Variable.of("x"), Variable.of("a")),
                    Predicate.elementOf(Variable.of("x"), Variable.of("b")))))))],
    [props.PRED_SAME_SET, ForAll.of("a", ForAll.of("b",
        Biconditional.of(
            Predicate.sameSet(Variable.of("a"), Variable.of("b")),
            ForAll.of("x",
                Biconditional.of(
                    Predicate.elementOf(Variable.of("x"), Variable.of("a")),
                    Predicate.elementOf(Variable.of("x"), Variable.of("b")))))))],
  ], [
    ["Thm1", ParseProp("P -> Q")],
    ["Thm2", ParseProp("forall x, forall y, P(x, y) -> Q(x + y)")],
  ],
  undefined /* any hypotheses alowed */,
  ["a", "b", "c", "A", "B", "C"]);


describe('rules', function() {

  it('rule name', function() {
    assert.strictEqual(RuleName(rules.RULE_MODUS_PONENS), "modus ponens");
    assert.strictEqual(RuleName(rules.RULE_INTRO_AND), "intro and");
    assert.strictEqual(RuleName(rules.RULE_VERUM), "verum");
    assert.strictEqual(RuleName(1e10), "unknown");
  });

  it('rule variety', function() {
    assert.strictEqual(RuleVariety("modus ponens"), rules.RULE_MODUS_PONENS);
    assert.strictEqual(RuleVariety("intro and"), rules.RULE_INTRO_AND);
    assert.strictEqual(RuleVariety("verum"), rules.RULE_VERUM);
    assert.strictEqual(RuleVariety("oink"), undefined);

    assert.strictEqual(RuleVariety(" modus ponens "), rules.RULE_MODUS_PONENS);
    assert.strictEqual(RuleVariety("modus \t ponens"), rules.RULE_MODUS_PONENS);
    assert.strictEqual(RuleVariety("  modus \t ponens\t"), rules.RULE_MODUS_PONENS);
  });

  it('premises', function() {
    const top = new TopLevelEnv([], [], []);
    const fact1 = new AdLitteramVerum(top);

    const sub1 = new SubproofEnv(top, ParseProp("Q"), ParseProp("P")); 
    const assn1 = new Assumption(sub1, ParseProp("P"));
    const trail1 = new TrailingEnv(sub1, "x");
    const or1 = new IntroOr(trail1, assn1, ParseProp("Q"), true);

    // can't use a fact from a subproof
    assert.throws(() => new IntroAnd(top, fact1, assn1), Error);

    const sub2 = new SubproofEnv(top, ParseProp("R"), ParseProp("not P")); 
    const assn2 = new Assumption(sub2, ParseProp("not P"));
    const trail3 = new TrailingEnv(sub2, "x");
    const or3 = new IntroOr(trail3, assn2, ParseProp("R"), true);

    const trail4 = new TrailingEnv(sub2, "y");
    const or4 = new IntroOr(trail4, assn2, ParseProp("R"), false);

    // can't use a fact from two different trailing environments
    assert.throws(() => new IntroAnd(trail3, or3, or4), Error);

    // does work if we extend from the other trailing environment
    const trail5 = new TrailingEnv(trail3, "y");
    const or5 = new IntroOr(trail5, assn2, ParseProp("R"), false);
    const and5 = new IntroAnd(trail5, or3, or5);
    assert.strictEqual(and5.apply().to_string(), "(not P or R) and (R or not P)");
  });

  it('assumption', function() {
    assert.throws(() => new Assumption(ENV, ParseProp("P or not P")), InvalidRule);

    const sub = new SubproofEnv(ENV, ParseProp("Q"), ParseProp("P or not P"));
    const assn = new Assumption(sub, ParseProp("P or not P"));
    assert.strictEqual(assn.apply().to_string(), "P or not P");
  });

  it('given', function() {
    const env2 = new TopLevelEnv([], [], [ParseProp("P")]);
    const assn1 = new Given(env2, ParseProp("P"));
    assert.strictEqual(assn1.apply().to_string(), "P");

    assert.throws(() => new Given(env2, ParseProp("Q")), InvalidRule);

    const assn2 = new Given(ENV, ParseProp("P or not P"));  // anything
    assert.strictEqual(assn2.apply().to_string(), "P or not P");
  });

  it('cite', function() {
    const thm = new Cite(ENV, "Thm1");
    assert.strictEqual(thm.apply().to_string(), "P -> Q");

    assert.throws(() => new Cite(ENV, "NoSuchThm"), InvalidRule);
  });

  it('repeat', function() {
    const assn = new Given(ENV, ParseProp("P or not P"));
    const rep = new Repeat(ENV, assn);
    assert.strictEqual(rep.apply().to_string(), "P or not P");
  });

  it('modus ponens', function() {
    const assn = new Given(ENV, ParseProp("P"));
    const thm = new Cite(ENV, "Thm1");
    const mp = new ModusPonens(ENV, assn, thm);
    assert.strictEqual(mp.apply().to_string(), "Q");

    const assn2 = new Given(ENV, ParseProp("R"));
    assert.throws(() => new ModusPonens(ENV, assn2, thm), InvalidRule);
  });

  it('direct proof', function() {
    const assn = new Given(ENV, ParseProp("Q"));

    const sub = new SubproofEnv(ENV, ParseProp("Q"), ParseProp("P"));
    const prem = new Assumption(sub, ParseProp("P"));
    const conc = new Repeat(sub, assn);
    assert.strictEqual(conc.apply().to_string(), sub.conclusion.to_string());

    const dp = new DirectProof(ENV, sub);
    assert.strictEqual(dp.apply().to_string(), "P -> Q");

    const sub2 = new SubproofEnv(ENV, ParseProp("Q(a)"), ParseProp("P(a)"));
    const dp2 = new DirectProof(ENV, sub2);  // a is in scope
    assert.strictEqual(dp2.apply().to_string(), "P(a) -> Q(a)")

    const sub3 = new SubproofEnv(ENV, ParseProp("Q(x)"), ParseProp("P(x)"));
    assert.throws(() => new DirectProof(ENV, sub3), InvalidRule);  // no x in scope
  });

  it('elim and', function() {
    const conj = new Given(ENV, ParseProp("P and Q"));
    const left = new ElimAnd(ENV, conj, true);
    assert.strictEqual(left.apply().to_string(), "P");

    const right = new ElimAnd(ENV, conj, false);
    assert.strictEqual(right.apply().to_string(), "Q");
  });

  it('intro and', function() {
    const left = new Given(ENV, ParseProp("Q"));
    const right = new Given(ENV, ParseProp("P"));
    const conj = new IntroAnd(ENV, left, right);
    assert.strictEqual(conj.apply().to_string(), "Q and P");
  });

  it('elim or', function() {
    const assn = new Given(ENV, ParseProp("P or Q"));
    const not1 = new Given(ENV, ParseProp("not P"));
    const res1 = new ElimOr(ENV, assn, not1);
    assert.strictEqual(res1.apply().to_string(), "Q");

    const not2 = new Given(ENV, ParseProp("not Q"));
    const res2 = new ElimOr(ENV, assn, not2);
    assert.strictEqual(res2.apply().to_string(), "P");

    const not3 = new Given(ENV, ParseProp("not R"));
    assert.throws(() => new ElimOr(ENV, assn, not3), InvalidRule);
  });

  it('simple cases', function() {
    const thm = new Cite(ENV, "Thm1");
    const assn = new Given(ENV, ParseProp("not P -> Q"));
    const res1 = new SimpleCases(ENV, thm, assn);
    assert.strictEqual(res1.apply().to_string(), "Q");

    const res2 = new SimpleCases(ENV, assn, thm);
    assert.strictEqual(res2.apply().to_string(), "Q");

    const assn2 = new Given(ENV, ParseProp("R -> Q"));
    assert.throws(() => new SimpleCases(ENV, thm, assn2), InvalidRule);

    const assn3 = new Given(ENV, ParseProp("not P -> R"));
    assert.throws(() => new SimpleCases(ENV, thm, assn3), InvalidRule);
  });

  it('cases', function() {
    const assn = new Given(ENV, ParseProp("P or R"));
    const thm1 = new Cite(ENV, "Thm1");
    const assn2 = new Given(ENV, ParseProp("R -> Q"));
    const res1 = new Cases(ENV, assn, thm1, assn2);
    assert.strictEqual(res1.apply().to_string(), "Q");

    assert.throws(() => new Cases(ENV, assn, assn2, thm1), InvalidRule);
  });

  it('intro or', function() {
    const assn = new Given(ENV, ParseProp("P"));
    const disj1 = new IntroOr(ENV, assn, ParseProp("Q"), true);
    assert.strictEqual(disj1.apply().to_string(), "P or Q");

    const disj2 = new IntroOr(ENV, assn, ParseProp("Q"), false);
    assert.strictEqual(disj2.apply().to_string(), "Q or P");
  });

  it('contradiction', function() {
    const assn1 = new Given(ENV, ParseProp("P"));
    const assn2 = new Given(ENV, ParseProp("not P"));
    const res1 = new PrincipiumContradictionis(ENV, assn1, assn2);
    assert.strictEqual(res1.apply().to_string(), "false");

    const res2 = new PrincipiumContradictionis(ENV, assn2, assn1);
    assert.strictEqual(res2.apply().to_string(), "false");

    const assn3 = new Given(ENV, ParseProp("not Q"));
    assert.throws(() => new PrincipiumContradictionis(ENV, assn1, assn3));
  });

  it('reductio', function() {
    const assn = new Given(ENV, ParseProp("false"));

    const sub1 = new SubproofEnv(ENV, ParseProp("false"), ParseProp("P"));
    const prem1 = new Assumption(sub1, ParseProp("P"));
    const conc1 = new Repeat(sub1, assn);
    assert.strictEqual(conc1.apply().to_string(), sub1.conclusion.to_string());

    const res1 = new ReductioAdAbsurdum(ENV, sub1);
    assert.strictEqual(res1.apply().to_string(), "not P");

    const sub2 = new SubproofEnv(ENV, ParseProp("false"), ParseProp("not Q"));
    const prem2 = new Assumption(sub2, ParseProp("not Q"));
    const conc2 = new Repeat(sub2, assn);
    assert.strictEqual(conc2.apply().to_string(), sub2.conclusion.to_string());

    const res2 = new ReductioAdAbsurdum(ENV, sub2);
    assert.strictEqual(res2.apply().to_string(), "not not Q");
  });

  it('exfalso', function() {
    const assn = new Given(ENV, ParseProp("false"));
    const res1 = new ExFalsoQuodlibet(ENV, assn, ParseProp("Q -> P"));
    assert.strictEqual(res1.apply().to_string(), "Q -> P");

    const assn2 = new Given(ENV, ParseProp("true"));
    assert.throws(() => new ExFalsoQuodlibet(ENV, assn2, ParseProp("Q -> P")));
  });

  it('verum', function() {
    const res = new AdLitteramVerum(ENV);
    assert.strictEqual(res.apply().to_string(), "true");
  });

  it('tautology', function() {
    const a = new Tautology(ENV, ParseProp("P or not P"));
    assert.strictEqual(a.apply().to_string(), "P or not P");

    const b = new Tautology(ENV, ParseProp("not P or P"));
    assert.strictEqual(b.apply().to_string(), "not P or P");

    assert.throws(
        () => new Tautology(ENV, ParseProp("P or not Q")),
        InvalidRule);
  });

  it('equivalent', function() {
    const v1 = new Given(ENV, ParseProp("not not P"));
    const v2 = new Equivalent(ENV, v1, ParseProp("P"));
    assert.strictEqual(v2.apply().to_string(), "P");

    const w1 = new Given(ENV, ParseProp("P <-> Q"));
    const w2 = new Equivalent(ENV, w1, ParseProp("(P -> Q) and (Q -> P)"));
    assert.strictEqual(w2.apply().to_string(), "(P -> Q) and (Q -> P)");

    assert.throws(
        () => new Equivalent(ENV, w1, ParseProp("(P -> Q) or (Q -> P)")),
        InvalidRule);
  });

  it('elim forall', function() {
    const assn1 = new Given(ENV, ParseProp("forall x, P(x) -> Q(x)"));
    const res1 = new ElimForAll(ENV, assn1, [Variable.of("a")]);
    assert.strictEqual(res1.apply().to_string(), "P(a) -> Q(a)");

    const assn2 = new Given(ENV, ParseProp("forall y, P(y) or Q(y)"));
    const res2 = new ElimForAll(ENV, assn2, [Variable.of("b")]);
    assert.strictEqual(res2.apply().to_string(), "P(b) or Q(b)");
  });

  it('intro forall', function() {
    const assn1 = new Given(ENV, ParseProp("forall x, P(x) or Q(x)"));
    const assn2 = new Given(ENV, ParseProp("forall x, forall y, P(x) -> Q(y)"));

    const sub1 = new SubproofEnv(ENV, ParseProp("P(x) or Q(x)"), undefined, ["x"]);
    const conc1 = new ElimForAll(sub1, assn1, [Variable.of("x")]);
    assert.strictEqual(conc1.apply().to_string(), sub1.conclusion.to_string());

    const res1 = new IntroForAll(ENV, sub1);
    assert.strictEqual(res1.apply().to_string(), "forall x, P(x) or Q(x)");

    const sub2 = new SubproofEnv(ENV, ParseProp("P(x) -> Q(y)"), undefined, ["x", "y"]);
    const conc2 = new ElimForAll(sub2, assn2, [Variable.of("x"), Variable.of("y")]);
    assert.strictEqual(conc2.apply().to_string(), sub2.conclusion.to_string());

    const res2 = new IntroForAll(ENV, sub2);
    assert.strictEqual(res2.apply().to_string(), "forall x, forall y, P(x) -> Q(y)");

    const sub3 = new SubproofEnv(ENV, ParseProp("P(x) -> Q(y)"), undefined, ["y", "x"]);
    const conc3 = new ElimForAll(sub3, assn2, [Variable.of("x"), Variable.of("y")]);
    assert.strictEqual(conc3.apply().to_string(), sub3.conclusion.to_string());

    const res3 = new IntroForAll(ENV, sub3);
    assert.strictEqual(res3.apply().to_string(), "forall y, forall x, P(x) -> Q(y)");

    // test changing the names of the variables

    const sub4 = new SubproofEnv(ENV, ParseProp("P(x) -> Q(y)"), undefined, ["x", "y"]);
    const conc4 = new ElimForAll(sub4, assn2, [Variable.of("x"), Variable.of("y")]);
    assert.strictEqual(conc4.apply().to_string(), sub4.conclusion.to_string());

    const res4 = new IntroForAll(ENV, sub4, ["a", "b"]);
    assert.strictEqual(res4.apply().to_string(), "forall a, forall b, P(a) -> Q(b)");

    const sub5 = new SubproofEnv(ENV, ParseProp("forall b, P(x) -> Q(b)"), undefined, ["x"]);
    const res5 = new IntroForAll(ENV, sub5, ["a"]);
    assert.strictEqual(res5.apply().to_string(), "forall a, forall b, P(a) -> Q(b)");

    const sub6 = new SubproofEnv(ENV, ParseProp("P(x) -> Q(y)"), undefined, ["x"]);
    assert.throws(() => new IntroForAll(ENV, sub6, ["a"]), InvalidRule);  // no y in scope
  });

  it('elim exists', function() {
    const assn1 = new Given(ENV, ParseProp("exists x, P(x) -> Q(a)"));
    const res1 = new ElimExists(ENV, assn1, "d");
    assert.strictEqual(res1.apply().to_string(), "P(d) -> Q(a)");

    const assn2 = new Given(res1.envAfter, ParseProp("exists x, P(x)"));
    assert.throws(() => new ElimExists(res1.envAfter, assn2, "d"), InvalidRule);

    const res2 = new ElimExists(res1.envAfter, assn2, "e");
    assert.strictEqual(res2.apply().to_string(), "P(e)");
  });

  it('intro exists', function() {
    const assn = new Given(ENV, ParseProp("not P(c, c)"));
    const exist1 = new IntroExists(ENV, assn, Variable.of("c"), "x");
    assert.strictEqual(exist1.apply().to_string(), "exists x, not P(x, x)");

    const exist2 = new IntroExists(ENV, assn, Variable.of("c"), "x",
        ParseProp("exists x, not P(c, x)"));
    assert.strictEqual(exist2.apply().to_string(), "exists x, not P(c, x)");

    const exist3 = new IntroExists(ENV, assn, Variable.of("c"), "x",
        ParseProp("exists x, not P(x, c)"));
    assert.strictEqual(exist3.apply().to_string(), "exists x, not P(x, c)");

    const assn2 = new Given(ENV, ParseProp("not P(c, a)"));
    assert.throws(() => new IntroExists(ENV, assn2, Variable.of("c"), "x",
        ParseProp("exists x, not P(x, x)")), InvalidRule);

    const assn3 = new Given(ENV, ParseProp("not P(c, a)"));
    assert.throws(() => new IntroExists(ENV, assn3, Variable.of("c"), "a"), InvalidRule);
  });

  it('subst', function() {
    const eq1 = new Given(ENV, ParseProp("a = b + 3"));
    const eq2 = new Given(ENV, ParseProp("2*a = 7 and 7 - a < 5"));
    const res = new Substitute(ENV, eq1, true, eq2);
    assert.strictEqual(res.apply().to_string(),
        "2*(b + 3) = 7 and 7 - (b + 3) < 5");

    // no substitutions apply
    const eq3 = new Given(ENV, ParseProp("c = c"));
    assert.throws(() => new Substitute(ENV, eq1, true, eq3), InvalidRule);

    // substitution requires a rename
    const eq4 = new Given(ENV, ParseProp("a = 2*b"));
    const ex = new Given(ENV, ParseProp("exists b, c < b*a"));
    const res2 = new Substitute(ENV, eq4, true, ex)
    assert.strictEqual(res2.apply().to_string(), "exists b0, c < b0*(2*b)");
  });

  it('defof', function() {
    const assn1 = new Given(ENV, ParseProp("Even(a)"));
    const def1 = new Definition(ENV, "Even", true, assn1);
    assert.strictEqual(def1.apply().to_string(), "exists y, a = 2*y");

    const assn2 = new Given(ENV, ParseProp("Odd(a) or Even(b)"));
    const def2 = new Definition(ENV, "Even", true, assn2);
    assert.strictEqual(def2.apply().to_string(), "Odd(a) or (exists y, b = 2*y)");
  });

  it('undef', function() {
    const assn1 =new Given(ENV,
        ParseProp("(exists y, a = 2*y) and (exists y, b = 2*y)"));
    const undef1 = new Definition(ENV, "Even", false, assn1);
    assert.strictEqual(undef1.apply().to_string(), "Even(a) and Even(b)");

    const undef2 = new Definition(ENV, "Even", false, assn1,
        ParseProp("(exists y, a = 2*y) and Even(b)"));
    assert.strictEqual(undef2.apply().to_string(), "(exists y, a = 2*y) and Even(b)");

    const undef3 = new Definition(ENV, "Even", false, assn1,
        ParseProp("Even(a) and (exists y, b = 2*y)"));
    assert.strictEqual(undef3.apply().to_string(), "Even(a) and (exists y, b = 2*y)");

    // no definitions apply
    const assn2 = new Given(ENV, ParseProp("a = b"));
    assert.throws(() => new Definition(ENV, "Even", true, assn2), InvalidRule);
    assert.throws(() => new Definition(ENV, "Even", false, assn2), InvalidRule);
  });

  it('apply', function() {
    const assn1 = new Given(ENV, ParseProp("P"));
    const res1 = new Apply(ENV, "Thm1", assn1);
    assert.strictEqual(res1.apply().to_string(), "Q");

    const assn2 = new Given(ENV, ParseProp("P(1, 2)"));
    const res2 = new Apply(ENV, "Thm2", assn2, Constant.of(1n), Constant.of(2n));
    const res3 = new Equivalent(ENV, res2, ParseProp("Q(3)"));
    assert.strictEqual(res3.apply().to_string(), "Q(3)");
  });

  it('algebra', function() {
    const assn1 = new Given(ENV, ParseProp("a + b^2 = 3"));
    const assn2 = new Given(ENV, ParseProp("b^2 + c + 5 = 0"));
    const res1 = new Algebra(ENV, ParseProp("a - c = 8"), assn1, assn2)
    assert.strictEqual(res1.apply().to_string(), "a - c = 8");

    const assn3 = new Given(ENV, ParseProp("(1+b)*a + b*(b - a) = 3"));
    const assn4 = new Given(ENV, ParseProp("b^2 + c + 5 = 0"));
    const res2 = new Algebra(ENV, ParseProp("a - c = 8"), assn3, assn4)
    assert.strictEqual(res2.apply().to_string(), "a - c = 8");

    const res3 = new Algebra(ENV, ParseProp("a - a + 1 = 1"))
    assert.strictEqual(res3.apply().to_string(), "a - a + 1 = 1");

    const res4 = new Algebra(ENV, ParseProp("1 - 1 = 0"))
    assert.strictEqual(res4.apply().to_string(), "1 - 1 = 0");

    const env2 = new TopLevelEnv([], [], undefined, ["n", "q"]);
    const assn5 = new Given(
        env2, ParseProp("(n+1)*(n^2+n+n+1+2) = 3*(q+n^2+n+1)"));
    const res5 = new Algebra(
        env2,
        ParseProp("(n+1)*(n*(n+1)+1*(n+1)+2) = 3*(q+n^2+n+1)"),
        assn5);
    assert.strictEqual(
        res5.apply().to_string(),
        "(n + 1)*(n*(n + 1) + 1*(n + 1) + 2) = 3*(q + n^2 + n + 1)");
  });

  it('algebra – constant equations, no variables', function() {
    const res1 = new Algebra(ENV, ParseProp("0 = 0"));
    assert.strictEqual(res1.apply().to_string(), "0 = 0");

    const res2 = new Algebra(ENV, ParseProp("2 + 3 = 5"));
    assert.strictEqual(res2.apply().to_string(), "2 + 3 = 5");

    assert.throws(() => new Algebra(ENV, ParseProp("1 = 2")), InvalidRule);
    assert.throws(() => new Algebra(ENV, ParseProp("2 + 3 = 6")), InvalidRule);
  });

  it('algebra – constant inequalities, no variables', function() {
    const res1 = new Algebra(ENV, ParseProp("0 <= 1"));
    assert.strictEqual(res1.apply().to_string(), "0 <= 1");

    const res2 = new Algebra(ENV, ParseProp("3 < 5"));
    assert.strictEqual(res2.apply().to_string(), "3 < 5");

    const res3 = new Algebra(ENV, ParseProp("7 <= 7"));
    assert.strictEqual(res3.apply().to_string(), "7 <= 7");

    assert.throws(() => new Algebra(ENV, ParseProp("5 <= 3")), InvalidRule);
    assert.throws(() => new Algebra(ENV, ParseProp("3 < 3")), InvalidRule);
    assert.throws(() => new Algebra(ENV, ParseProp("10 < 2")), InvalidRule);
  });

  it('induction', function() {
    const assn1 = new Given(ENV, ParseProp("P(0)"));
    const assn2 = new Given(ENV, ParseProp("forall n, P(n) -> P(n+1)"));
    const res1 = new Induction(ENV, assn1, assn2);
    assert.strictEqual(res1.apply().to_string(), "forall n, 0 <= n -> P(n)");

    const assn3 = new Given(ENV, ParseProp("Q(5)"));
    const assn4 = new Given(ENV, ParseProp("forall m, Q(m) -> Q(m+1)"));
    const res2 = new Induction(ENV, assn3, assn4);
    assert.strictEqual(res2.apply().to_string(), "forall m, 5 <= m -> Q(m)");

    const assn5 = new Given(ENV, ParseProp("Divides(2, 2*0^2 + 2*0)"));
    const assn6 = new Given(ENV,
        ParseProp("forall n, Divides(2, 2*n^2 + 2*n) -> Divides(2, 2*(n+1)^2 + 2*(n+1))"));
    const res3 = new Induction(ENV, assn5, assn6);
    assert.strictEqual(res3.apply().to_string(), "forall n, 0 <= n -> Divides(2, 2*n^2 + 2*n)");
  });

  // Larger tests -- examples are from lectures (21au):

  it('prop proof1', function() {
    const assn1 = new Given(ENV, ParseProp("P"));
    const assn2 = new Given(ENV, ParseProp("P -> Q"));
    const assn3 = new Given(ENV, ParseProp("Q -> R"));
    const mp1 = new ModusPonens(ENV, assn1, assn2);
    const mp2 = new ModusPonens(ENV, mp1, assn3);
    assert.strictEqual(mp2.apply().to_string(), "R");
  });

  it('prop proof2', function() {
    const assn1 = new Given(ENV, ParseProp("P -> Q"));
    const assn2 = new Given(ENV, ParseProp("not Q"));
    const eqv = new Equivalent(ENV, assn1, ParseProp("not Q -> not P"));
    const mp = new ModusPonens(ENV, assn2, eqv);
    assert.strictEqual(mp.apply().to_string(), "not P");
  });

  it('prop proof3', function() {
    const assn1 = new Given(ENV, ParseProp("P"));
    const assn2 = new Given(ENV, ParseProp("P -> Q"));
    const mp1 = new ModusPonens(ENV, assn1, assn2);
    const and = new IntroAnd(ENV, assn1, mp1);
    const assn3 = new Given(ENV, ParseProp("P and Q -> R"));
    const mp2 = new ModusPonens(ENV, and, assn3);
    assert.strictEqual(mp2.apply().to_string(), "R");
  });

  it('prop proof4', function() {
    const assn1 = new Given(ENV, ParseProp("P and S"));
    const assn2 = new Given(ENV, ParseProp("Q -> not R"));
    const assn3 = new Given(ENV, ParseProp("not S or Q"));
    const and = new ElimAnd(ENV, assn1, false);
    const eqv = new Equivalent(ENV, and, ParseProp("not not S"));
    const or = new ElimOr(ENV, assn3, eqv);
    const mp = new ModusPonens(ENV, or, assn2);
    assert.strictEqual(mp.apply().to_string(), "not R");
  });

  it('prop proof5', function() {
    const sub = new SubproofEnv(ENV, ParseProp("P or Q"), ParseProp("P"));
    const assn1 = new Assumption(sub, ParseProp("P"));
    const or = new IntroOr(sub, assn1, ParseProp("Q"), true);
    assert.strictEqual(or.apply().to_string(), sub.conclusion.to_string());

    const dp = new DirectProof(ENV, sub);
    assert.strictEqual(dp.apply().to_string(), "P -> P or Q");
  });

  it('prop proof6', function() {
    const assn2 = new Given(ENV, ParseProp("P and Q -> R"));
    const assn3 = new Given(ENV, ParseProp("P"));

    const sub = new SubproofEnv(ENV, ParseProp("R"), ParseProp("Q"));
    const assn1 = new Assumption(sub, ParseProp("Q"));
    const and = new IntroAnd(sub, assn3, assn1);
    const mp = new ModusPonens(sub, and, assn2);
    assert.strictEqual(mp.apply().to_string(), sub.conclusion.to_string());

    const dp = new DirectProof(ENV, sub);
    assert.strictEqual(dp.apply().to_string(), "Q -> R");
  });

  it('prop proof7', function() {
    const sub = new SubproofEnv(ENV, ParseProp("P or Q"), ParseProp("P and Q"));
    const assn = new Assumption(sub, ParseProp("P and Q"));
    const left = new ElimAnd(sub, assn, true);
    const or = new IntroOr(sub, left, ParseProp("Q"), true);
    assert.strictEqual(or.apply().to_string(), sub.conclusion.to_string());

    const dp = new DirectProof(sub, sub);
    assert.strictEqual(dp.apply().to_string(), "P and Q -> P or Q");
  });

  it('prop proof8', function() {
    const sub1 = new SubproofEnv(ENV, ParseProp("P -> R"), ParseProp("(P -> Q) and (Q -> R)"));
    const assn1 = new Assumption(sub1, ParseProp("(P -> Q) and (Q -> R)"));
    const imp1 = new ElimAnd(sub1, assn1, true);
    const imp2 = new ElimAnd(sub1, assn1, false);

    const sub2 = new SubproofEnv(sub1, ParseProp("R"), ParseProp("P"));
    const assn2 = new Assumption(sub2, ParseProp("P"));
    const mp1 = new ModusPonens(sub2, assn2, imp1);
    const mp2 = new ModusPonens(sub2, mp1, imp2);
    assert.strictEqual(mp2.apply().to_string(), sub2.conclusion.to_string());

    const dp2 = new DirectProof(sub1, sub2);
    assert.strictEqual(dp2.apply().to_string(), "P -> R");

    const dp1 = new DirectProof(ENV, sub1);
    assert.strictEqual(dp1.apply().to_string(), "(P -> Q) and (Q -> R) -> P -> R");
  });

  it('pred proof1', function() {
    const sub = new SubproofEnv(ENV, ParseProp("exists x, P(x)"), ParseProp("forall x, P(x)"));
    const assn = new Assumption(sub, ParseProp("forall x, P(x)"));
    const elim = new ElimForAll(sub, assn, [Variable.of("a")]);
    const exist = new IntroExists(sub, elim, Variable.of("a"), "x");
    assert.strictEqual(exist.apply().to_string(), sub.conclusion.to_string());

    const dp = new DirectProof(sub, sub);
    assert.strictEqual(dp.apply().to_string(), "(forall x, P(x)) -> (exists x, P(x))");
  });

  it('pred proof2', function() {
    const sub = new SubproofEnv(ENV, ParseProp("exists y, P(y, a)"),
        ParseProp("forall x, exists y, P(y, x)"));
    const assn = new Assumption(sub, ParseProp("forall x, exists y, P(y, x)"));
    const elim1 = new ElimForAll(sub, assn, [Variable.of("a")]);
    assert.strictEqual(elim1.apply().to_string(), sub.conclusion.to_string());

    const dp1 = new DirectProof(ENV, sub);
    assert.strictEqual(dp1.apply().to_string(),
        "(forall x, exists y, P(y, x)) -> (exists y, P(y, a))");

    const elim2 = new ElimExists(sub, elim1, "d");  // NOTE: makes new environment
    assert.notStrictEqual(elim2.apply().to_string(), sub.conclusion.to_string());
  });

});
