import * as assert from 'assert';
import { Variable, Call } from '../facts/exprs';
import { Biconditional, Conjunction, ForAll, Implication, Negation, Predicate,
         Proposition, FALSE, TRUE } from '../facts/props';
import { ParseProp } from '../facts/props_parser';
import { Tactic, InvalidTactic, Given, Cite, DirectProof, ModusPonens,
         IntroAnd, ElimAnd, IntroOr, ElimOr, SimpleCases, Cases,
         PrincipiumContradictionis, ReductioAdAbsurdum,
         ExFalsoQuodlibet, AdLitteramVerum, Tautology, Equivalent,
         ElimForAll, IntroForAll, ElimExists, IntroExists, Apply,
         Substitute, Definition, Algebra, Induction} from './tactics';
import { Environment, TopLevelEnv, SubproofEnv, TrailingEnv } from './env';
import { CreateRule } from './infer_forward';
import { AbsLineRef } from './rules_ast';
import * as rules from './rules';
import * as exprs from '../facts/exprs';
import * as props from '../facts/props';


/** Default environment used for the proofs below. */
const ENV = new TopLevelEnv([
    ["Even", ParseProp("forall x, Even(x) <-> (exists y, x = 2*y)")],
    ["Prime", ParseProp("forall p, Prime(p) <-> (not (p = 1) and (forall x, Divides(x, p) -> (x = 1) or (x = p)))")],
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
    [props.PRED_SUBSET, ForAll.of("a", ForAll.of("b",
        Biconditional.of(
            Predicate.subset(Variable.of("a"), Variable.of("b")),
            ForAll.of("x",
                Implication.of(
                    Predicate.elementOf(Variable.of("x"), Variable.of("a")),
                    Predicate.elementOf(Variable.of("x"), Variable.of("b")))))))],
  ], [
    ["Thm1", ParseProp("A -> B or C")],
    ["Thm2", ParseProp("forall x, P(x) -> Q(x)")],
    ["Thm3", ParseProp("forall x, forall y, P(x, y) -> Q(y, x)")],
  ], undefined,
  ["a", "b", "c", "A", "B", "C"]);


/**
 * Make sure that the tactic produces the expected premises and, when reversed,
 * produces the goal.
 */
function CheckTactic(env: Environment, tactic: Tactic, exp_premises: Proposition[]) {
  const premRules: rules.Rule[] = [];
  const premLines: AbsLineRef[] = [];
  const act_premises = tactic.premises();
  assert.strictEqual(act_premises.length, exp_premises.length);
  for (let i = 0; i < act_premises.length; i++) {
    if (!act_premises[i].equals_alpha(exp_premises[i]))
        console.log(i, act_premises[i].to_string(), exp_premises[i].to_string());
    assert.ok(act_premises[i].equals_alpha(exp_premises[i]));

    premLines.push([premRules.length]);
    premRules.push(new rules.Given(env, act_premises[i]));  // fake the rule
  }

  const parsed = tactic.reverse(premLines);
  const rule = CreateRule(env, parsed, (l) => premRules[l[0]]);
  const prop = rule.apply();
  if (!prop.equals_alpha(tactic.goal))
      console.log(prop.to_string(), tactic.goal.to_string());
  assert.ok(prop.equals_alpha(tactic.goal));
}


describe('tactics', function() {

  it('given', function() {
    const env = new TopLevelEnv([], [], [ParseProp("(A or B) and C")])
    CheckTactic(env, new Given(env, ParseProp("(A or B) and C")), []);

    assert.throws(() => new Given(env, ParseProp("(A or D) and C")), InvalidTactic);
  });

  it('cite', function() {
    CheckTactic(ENV, new Cite(ENV, ParseProp("A -> B or C"), "Thm1"), []);

    assert.throws(() => new Cite(ENV, ParseProp("A -> B or C"), "Thm2"), InvalidTactic);
    assert.throws(() => new Cite(ENV, ParseProp("A -> D or C"), "Thm1"), InvalidTactic);
  });

  it('modus ponens', function() {
    CheckTactic(ENV, new ModusPonens(ENV, ParseProp("B"), ParseProp("A")),
        [ParseProp("A"), ParseProp("A -> B")]);
  });

  it('direct proof', function() {
    const dp = new DirectProof(ENV, ParseProp("A -> B"));  // check no exception
    const sub = dp.subproof(ENV);
    assert.notStrictEqual(sub, undefined);
    assert.deepStrictEqual(sub.getVariables(), []);
    assert.strictEqual(sub.getPremise()?.to_string_alpha(), "A");

    const assn = new rules.Assumption(sub, ParseProp("A"));
    const conc = new rules.Given(sub, ParseProp("B"));
    assert.deepStrictEqual(conc.apply().to_string(), sub.getConclusion()?.to_string());

    const parsed = dp.reverse([]);
    const rule = CreateRule(ENV, parsed, (l) => { throw new Error('impossible') }, sub);
    assert.deepStrictEqual(rule.apply().to_string_alpha(), "A -> B");

    assert.throws(() => new DirectProof(ENV, ParseProp("A or B")), InvalidTactic);
  });

  it('elim or', function() {
    CheckTactic(ENV, new ElimOr(ENV, ParseProp("A"), ParseProp("B"), true),
        [ParseProp("A or B"), ParseProp("not B")]);

    CheckTactic(ENV, new ElimOr(ENV, ParseProp("A"), ParseProp("B"), false),
        [ParseProp("B or A"), ParseProp("not B")]);
  });

  it('by simple cases', function() {
    CheckTactic(ENV, new SimpleCases(ENV, ParseProp("B"), ParseProp("A")),
        [ParseProp("A -> B"), ParseProp("not A -> B")]);
  });

  it('by cases', function() {
    CheckTactic(ENV, new Cases(ENV, ParseProp("C"), ParseProp("A or B")),
        [ParseProp("A or B"), ParseProp("A -> C"), ParseProp("B -> C")]);
  });

  it('intro or', function() {
    CheckTactic(ENV, new IntroOr(ENV, ParseProp("A or C"), ParseProp("C")),
        [ParseProp("C")]);
    CheckTactic(ENV, new IntroOr(ENV, ParseProp("C or A"), ParseProp("C")),
        [ParseProp("C")]);

    assert.throws(() => new IntroOr(ENV, ParseProp("A or B"), ParseProp("C")), InvalidTactic);
  });

  it('intro and', function() {
    CheckTactic(ENV, new IntroAnd(ENV, ParseProp("(A or B) and C")),
        [ParseProp("A or B"), ParseProp("C")]);
  });

  it('elim and', function() {
    CheckTactic(ENV, new ElimAnd(ENV, ParseProp("A"), ParseProp("B"), true),
        [ParseProp("A and B")]);

    CheckTactic(ENV, new ElimAnd(ENV, ParseProp("A"), ParseProp("B"), false),
        [ParseProp("B and A")]);
  });

  it('contradiction', function() {
    CheckTactic(ENV, new PrincipiumContradictionis(ENV, FALSE, ParseProp("A or B")),
        [ParseProp("A or B"), ParseProp("not (A or B)")]);
    CheckTactic(ENV, new PrincipiumContradictionis(ENV, FALSE, ParseProp("A and not B")),
        [ParseProp("A and not B"), ParseProp("not (A and not B)")]);
  });

  it('absurdum', function() {
    const dp = new ReductioAdAbsurdum(ENV, ParseProp("not A"));

    const sub = dp.subproof(ENV);
    assert.notStrictEqual(sub, undefined);
    assert.deepStrictEqual(sub.getVariables(), []);
    assert.strictEqual(sub.getPremise()?.to_string_alpha(), "A");

    const assn = new rules.Assumption(sub, ParseProp("A"));
    const conc = new rules.Given(sub, FALSE);
    assert.deepStrictEqual(conc.apply().to_string(), sub.getConclusion()?.to_string());

    const parsed = dp.reverse([]);
    const rule = CreateRule(ENV, parsed, (l) => { throw new Error('impossible') }, sub);
    assert.deepStrictEqual(rule.apply().to_string_alpha(), "not A");

    assert.throws(() => new ReductioAdAbsurdum(ENV, ParseProp("A or B")), InvalidTactic);
    assert.throws(() => new ReductioAdAbsurdum(ENV, ParseProp("A -> B")), InvalidTactic);
  });

  it('exfalso', function() {
    CheckTactic(ENV, new ExFalsoQuodlibet(ENV, ParseProp("A or B")), [FALSE]);
    CheckTactic(ENV, new ExFalsoQuodlibet(ENV, ParseProp("A and not B")), [FALSE]);
  });

  it('verum', function() {
    CheckTactic(ENV, new AdLitteramVerum(ENV, TRUE), []);
  });

  it('tautology', function() {
    const disj = ParseProp("(A and B) or not (A and B)");
    CheckTactic(ENV, new Tautology(ENV, disj), []);

    const disj2 = ParseProp("not (A and B) or (A and B)");
    CheckTactic(ENV, new Tautology(ENV, disj2), []);

    const disj3 = ParseProp("(A and B) or not (B and A)");
    CheckTactic(ENV, new Tautology(ENV, disj3), []);

    const disj4 = ParseProp("(A and B) or not (A or B)");
    assert.throws(() => new Tautology(ENV, disj4), InvalidTactic);
  });

  it('equivalent', function() {
    CheckTactic(ENV, new Equivalent(ENV, ParseProp("A and B"), ParseProp("B and A")),
        [ParseProp("B and A")]);

    assert.throws(() => new Equivalent(ENV, ParseProp("A and B"), ParseProp("A or B")),
        InvalidTactic);
  });

  it('elim forall', function() {
    CheckTactic(ENV, new ElimForAll(ENV, ParseProp("P(a)"), Variable.of("a"), "z"),
        [ParseProp("forall z, P(z)")]);
    CheckTactic(ENV, new ElimForAll(ENV, ParseProp("P(a) -> Q(a)"), Variable.of("a"), "z"),
        [ParseProp("forall z, P(z) -> Q(z)")]);

    assert.throws(() => new ElimForAll(ENV, ParseProp("P(x)"), Variable.of("x"), "z"),
        InvalidTactic);  // no such variable in scope
  });

  it('intro forall', function() {
    const intro = new IntroForAll(ENV, ParseProp("forall x, P(x)"));

    const sub = intro.subproof(ENV);
    assert.notStrictEqual(sub, undefined);
    assert.deepStrictEqual(sub.getVariables(), ["x"]);
    assert.strictEqual(sub.getPremise(), undefined);

    const conc = new rules.Given(sub, ParseProp("P(x)"));
    assert.deepStrictEqual(conc.apply().to_string(), sub.getConclusion()?.to_string());

    const parsed = intro.reverse([]);
    const rule = CreateRule(ENV, parsed, (l) => { throw new Error('impossible') }, sub);
    assert.deepStrictEqual(rule.apply().to_string(), "forall x, P(x)");

    assert.throws(() => new IntroForAll(ENV, ParseProp("P(x)")), InvalidTactic);

    const intro2 = new IntroForAll(ENV, ParseProp("forall x, P(x, b)"));

    const sub2 = intro2.subproof(ENV);
    assert.notStrictEqual(sub2, undefined);
    assert.deepStrictEqual(sub2.getVariables(), ["x"]);
    assert.strictEqual(sub2.getPremise(), undefined);

    const conc2 = new rules.Given(sub2, ParseProp("P(x, b)"));
    assert.deepStrictEqual(conc2.apply().to_string(), sub2.getConclusion()?.to_string());

    const parsed2 = intro2.reverse([]);
    const rule2 = CreateRule(ENV, parsed2, (l) => { throw new Error('impossible') }, sub2);
    assert.deepStrictEqual(rule2.apply().to_string(), "forall x, P(x, b)");

    const intro3 = new IntroForAll(ENV, ParseProp("forall x, forall y, P(x, y)"), ["x"]);

    const sub3 = intro3.subproof(ENV);
    assert.notStrictEqual(sub3, undefined);
    assert.deepStrictEqual(sub3.getVariables(), ["x"]);
    assert.strictEqual(sub3.getConclusion()?.to_string(), "forall y, P(x, y)");

    // Trying to re-use a variable name should fail
    assert.throws(() => {
      new IntroForAll(sub3, ParseProp("forall y, P(a, y)"), ["x"]);
    }, InvalidTactic);
  });

  it('elim exists', function() {
    CheckTactic(ENV, new ElimExists(ENV, ParseProp("P(x,b)"), "x", "z"),
        [ParseProp("exists z, P(z,b)")]);
    CheckTactic(ENV, new ElimExists(ENV, ParseProp("P(a,y)"), "y", "z"),
        [ParseProp("exists z, P(a,z)")]);

    const env = new TrailingEnv(ENV, "w");
    assert.throws(() => new ElimExists(env, ParseProp("P(w,b)"), "w", "z"),
        InvalidTactic);
  });

  it('intro exists', function() {
    CheckTactic(ENV, new IntroExists(ENV, ParseProp("exists x, P(x,b)"), Variable.of("a")),
        [ParseProp("P(a,b)")]);

    assert.throws(() => new IntroExists(ENV, ParseProp("P(x,b)"), Variable.of("y")),
        InvalidTactic);
  });

  it('apply', function() {
    CheckTactic(ENV, new Apply(ENV, ParseProp("B or C"), "Thm1"),
        [ParseProp("A")]);

    assert.throws(() => new Apply(ENV, ParseProp("B or C"), "Thm0"), InvalidTactic);
    assert.throws(() => new Apply(ENV, ParseProp("B or D"), "Thm1"), InvalidTactic);

    CheckTactic(ENV, new Apply(ENV, ParseProp("Q(3)"), "Thm2"),
        [ParseProp("P(3)")]);

    assert.throws(() => new Apply(ENV, ParseProp("P(3)"), "Thm2"), InvalidTactic);

    CheckTactic(ENV, new Apply(ENV, ParseProp("Q(2, 3)"), "Thm3"),
        [ParseProp("P(3, 2)")]);

    assert.throws(() => new Apply(ENV, ParseProp("Q(2)"), "Thm3"), InvalidTactic);
  });

  it('substitute', function() {
    CheckTactic(ENV,
        new Substitute(ENV, ParseProp("b - (a + 3) = 7"), ParseProp("a + 3 = c"), false),
        [ParseProp("a + 3 = c"), ParseProp("b - c = 7")]);

    CheckTactic(ENV,
        new Substitute(ENV, ParseProp("b - (a + 3) = 7"), ParseProp("c = a + 3"), true),
        [ParseProp("c = a + 3"), ParseProp("b - c = 7")]);

    assert.throws(() => new Substitute(
            ENV, ParseProp("b - (a + 3) = 7"), ParseProp("c < a + 3"), false),
        InvalidTactic);
  });

  it('definition', function() {
    assert.throws(() => new Definition(
            ENV, ParseProp("exists y, a = 2*y"), "MyDef", false),
        InvalidTactic);

    CheckTactic(ENV,
        new Definition(ENV, ParseProp("Even(a)"), "Even", false),
        [ParseProp("exists y, a = 2*y")]);

    CheckTactic(ENV,
        new Definition(ENV, ParseProp("exists z, a = 2*z"), "Even", true),
        [ParseProp("Even(a)")]);

    CheckTactic(ENV,
        new Definition(ENV, ParseProp("not Prime(a)"), "Prime", false),
        [ParseProp("not (not (a = 1) and (forall x, Divides(x, a) -> (x = 1) or (x = a)))")]);
  });

  it('algebra', function() {
    const eq1 = ParseProp("a + b = 5");
    const eq2 = ParseProp("b - c = 2");
    const eq3 = ParseProp("a + c = 3");
    CheckTactic(ENV, new Algebra(ENV, eq3, eq1, eq2), [eq1, eq2]);

    assert.throws(() => new Algebra(ENV, ParseProp("a + c = 0"), eq1, eq2), InvalidTactic);
  });

  it('induction', function() {
    const prop1 = ParseProp("forall n, 0 <= n -> P(n)");
    const prop2 = ParseProp("P(0)");
    const prop3 = ParseProp("forall n, P(n) -> P(n+1)");
    CheckTactic(ENV, new Induction(ENV, prop1), [prop2, prop3]);

    const prop4 = ParseProp("forall m, 5 <= m -> Q(m)");
    const prop5 = ParseProp("Q(5)");
    const prop6 = ParseProp("forall m, Q(m) -> Q(m+1)");
    CheckTactic(ENV, new Induction(ENV, prop4), [prop5, prop6]);

    const prop7 = ParseProp( "forall n, 0 <= n -> Divides(2, 2*n^2 + 2*n)");
    const prop8 = ParseProp("Divides(2, 2*0^2 + 2*0)");
    const prop9 = ParseProp("forall n, Divides(2, 2*n^2 + 2*n) -> Divides(2, 2*(n+1)^2 + 2*(n+1))");
    CheckTactic(ENV, new Induction(ENV, prop7), [prop8, prop9]);
  });

  // Examples are from lectures (21au):

  it('prop proof4 reversed', function() {
    const mp = new ModusPonens(ENV, ParseProp("not R"), ParseProp("Q"));
    assert.deepStrictEqual(mp.premises().map(p => p.to_string()),
        ["Q", "Q -> not R"]);

    const elimOr = new ElimOr(ENV, ParseProp("Q"), ParseProp("not S"), false);
    assert.deepStrictEqual(elimOr.premises().map(p => p.to_string()),
        ["not S or Q", "not not S"]);

    const eqv = new Equivalent(ENV, ParseProp("not not S"), ParseProp("S"));
    assert.deepStrictEqual(eqv.premises().map(p => p.to_string()),
        ["S"]);

    const elimAnd = new ElimAnd(ENV, ParseProp("S"), ParseProp("P"), false);
    assert.deepStrictEqual(elimAnd.premises().map(p => p.to_string()),
        ["P and S"]);

    const assn1 = new rules.Given(ENV, ParseProp("P and S"));
    const assn2 = new rules.Given(ENV, ParseProp("Q -> not R"));
    const assn3 = new rules.Given(ENV, ParseProp("not S or Q"));

    const lines: any[] = [undefined, assn1, assn2, assn3];
    const getLine = (l: any) => lines[l[0]];

    const parsed1 = elimAnd.reverse([[1]]);  // S
    const rule1 = CreateRule(ENV, parsed1, getLine)
    lines.push(rule1);

    const parsed2 = eqv.reverse([[4]]);  // not not S
    const rule2 = CreateRule(ENV, parsed2, getLine)
    lines.push(rule2);

    const parsed3 = elimOr.reverse([[3], [5]]);  // Q
    const rule3 = CreateRule(ENV, parsed3, getLine);
    lines.push(rule3);

    const parsed4 = mp.reverse([[6], [2]]); // not R
    const rule4 = CreateRule(ENV, parsed4, getLine);
    assert.strictEqual(rule4.apply().to_string(), "not R");
  });

});