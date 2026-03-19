import * as assert from 'assert';
import * as props from './props';
import { Quantifier, NewVarNameVariation, SplitQuantifiers, RenameQuantifiers,
         UniquifyQuantifiers } from './props';
import * as exprs from './exprs';

const t = props.TRUE;
const f = props.FALSE;

const P = props.Predicate.of("P");
const Px = props.Predicate.of("P", "x");
const Pxy = props.Predicate.of("P", "x", "y");
const Q = props.Predicate.of("Q");

const notP = props.Negation.of(P);
const notQ = props.Negation.of(Q);

const andPQ = props.Conjunction.of(P, Q);
const andQP = props.Conjunction.of(Q, P);
const andPxQ = props.Conjunction.of(Px, Q);

const orPQ = props.Disjunction.of(P, Q);
const orQP = props.Disjunction.of(Q, P);
const orPxQ = props.Disjunction.of(Px, Q);

const impPQ = props.Implication.of(P, Q);
const impQP = props.Implication.of(Q, P);
const impPxQ = props.Implication.of(Px, Q);

const allPxx = props.ForAll.of("x", Px);
const allPxyx = props.ForAll.of("x", Pxy);
const allPxyy = props.ForAll.of("y", Pxy);

const exPxx = props.Exists.of("x", Px);
const exPxyx = props.Exists.of("x", Pxy);
const exPxyy = props.Exists.of("y", Pxy);

const a = exprs.Variable.of("a");
const b = exprs.Variable.of("b");
const c = exprs.Variable.of("c");
const abc1 = exprs.Call.multiply(exprs.Call.multiply(a, b), c);
const abc2 = exprs.Call.multiply(a, exprs.Call.multiply(b, c));
const eqABC11 = props.Predicate.equal(abc1, abc1);
const eqABC12 = props.Predicate.equal(abc1, abc2);
const eqABC22 = props.Predicate.equal(abc2, abc2);

const abc3 = exprs.Call.add(exprs.Call.add(a, b), c);
const abc4 = exprs.Call.add(a, exprs.Call.add(b, c));
const eqABC33 = props.Predicate.equal(abc3, abc3);
const eqABC34 = props.Predicate.equal(abc3, abc4);
const eqABC44 = props.Predicate.equal(abc4, abc4);

const R = props.Predicate.of("R");
const andPQR1 = props.Conjunction.of(andPQ, R);
const andPQR2 = props.Conjunction.of(P, props.Conjunction.of(Q, R));
const orPQR1 = props.Disjunction.of(orPQ, R);
const orPQR2 = props.Disjunction.of(P, props.Disjunction.of(Q, R));

const EXAMPLES = [
    t, f, P, Px, Pxy, Q, notP, notQ, andPQ, andQP, andPxQ, orPQ, orQP, orPxQ,
    impPQ, impQP, impPxQ, allPxx, allPxyx, allPxyy, exPxx, exPxyx, exPxyy,
    eqABC11, eqABC12, eqABC22, eqABC33, eqABC34, eqABC44,
    andPQR1, andPQR2, orPQR1, orPQR2,
  ];


describe('props', function() {
  it('equal constants', function() {
    assert.ok(t.equals(t));
    assert.ok(f.equals(f));

    assert.ok(!t.equals(f));
    assert.ok(!f.equals(t));
  });

  it('equal predicates', function() {
    assert.ok(P.equals(P));
    assert.ok(!P.equals(Px));
    assert.ok(!P.equals(Pxy));
    assert.ok(!P.equals(Q));

    assert.ok(!Px.equals(P));
    assert.ok(Px.equals(Px));
    assert.ok(!Px.equals(Pxy));
    assert.ok(!Px.equals(Q));

    assert.ok(!Pxy.equals(P));
    assert.ok(!Pxy.equals(Px));
    assert.ok(Pxy.equals(Pxy));
    assert.ok(!Pxy.equals(Q));

    assert.ok(!Q.equals(P));
    assert.ok(!Q.equals(Px));
    assert.ok(!Q.equals(Pxy));
    assert.ok(Q.equals(Q));
  });

  it('equal negation', function() {
    assert.ok(notP.equals(notP));
    assert.ok(!notP.equals(notQ));

    assert.ok(!notQ.equals(notP));
    assert.ok(notQ.equals(notQ));
  });

  it('equal conjunction', function() {
    assert.ok(andPQ.equals(andPQ));
    assert.ok(!andPQ.equals(andQP));
    assert.ok(!andPQ.equals(andPxQ));

    assert.ok(!andQP.equals(andPQ));
    assert.ok(andQP.equals(andQP));
    assert.ok(!andQP.equals(andPxQ));

    assert.ok(!andPxQ.equals(andPQ));
    assert.ok(!andPxQ.equals(andQP));
    assert.ok(andPxQ.equals(andPxQ));
  });

  it('equal disjunction', function() {
    assert.ok(orPQ.equals(orPQ));
    assert.ok(!orPQ.equals(orQP));
    assert.ok(!orPQ.equals(orPxQ));

    assert.ok(!orQP.equals(orPQ));
    assert.ok(orQP.equals(orQP));
    assert.ok(!orQP.equals(orPxQ));

    assert.ok(!orPxQ.equals(orPQ));
    assert.ok(!orPxQ.equals(orQP));
    assert.ok(orPxQ.equals(orPxQ));
  });

  it('equal implication', function() {
    assert.ok(impPQ.equals(impPQ));
    assert.ok(!impPQ.equals(impQP));
    assert.ok(!impPQ.equals(impPxQ));

    assert.ok(!impQP.equals(impPQ));
    assert.ok(impQP.equals(impQP));
    assert.ok(!impQP.equals(impPxQ));

    assert.ok(!impPxQ.equals(impPQ));
    assert.ok(!impPxQ.equals(impQP));
    assert.ok(impPxQ.equals(impPxQ));
  });

  it('equal forall', function() {
    assert.ok(allPxx.equals(allPxx));
    assert.ok(!allPxx.equals(allPxyx));
    assert.ok(!allPxx.equals(allPxyy));

    assert.ok(!allPxyx.equals(allPxx));
    assert.ok(allPxyx.equals(allPxyx));
    assert.ok(!allPxyx.equals(allPxyy));

    assert.ok(!allPxyy.equals(allPxx));
    assert.ok(!allPxyy.equals(allPxyx));
    assert.ok(allPxyy.equals(allPxyy));
  });

  it('equal exists', function() {
    assert.ok(exPxx.equals(exPxx));
    assert.ok(!exPxx.equals(exPxyx));
    assert.ok(!exPxx.equals(exPxyy));

    assert.ok(!exPxyx.equals(exPxx));
    assert.ok(exPxyx.equals(exPxyx));
    assert.ok(!exPxyx.equals(exPxyy));

    assert.ok(!exPxyy.equals(exPxx));
    assert.ok(!exPxyy.equals(exPxyx));
    assert.ok(exPxyy.equals(exPxyy));
  });

  it('equal mixed', function() {
    for (let i = 0; i < EXAMPLES.length; i++) {
      for (let j = 0; j < EXAMPLES.length; j++) {
        assert.strictEqual(EXAMPLES[i].equals(EXAMPLES[j]), i === j);
      }
    }
  });

  it('to_string', function() {
    assert.strictEqual(t.to_string(), "true");
    assert.strictEqual(f.to_string(), "false");

    assert.strictEqual(P.to_string(), "P");
    assert.strictEqual(Px.to_string(), "P(x)");
    assert.strictEqual(Pxy.to_string(), "P(x, y)");
    assert.strictEqual(Q.to_string(), "Q");

    const notPx = props.Negation.of(Px);
    assert.strictEqual(notP.to_string(), "not P");
    assert.strictEqual(notPx.to_string(), "not P(x)");
    assert.strictEqual(notQ.to_string(), "not Q");
    assert.strictEqual(props.Negation.of(notPx).to_string(), "not not P(x)");

    assert.strictEqual(andPQ.to_string(), "P and Q");
    assert.strictEqual(andQP.to_string(), "Q and P");
    assert.strictEqual(andPxQ.to_string(), "P(x) and Q");
    assert.strictEqual(
        props.Conjunction.of(Px, notPx).to_string(),
        "P(x) and not P(x)");
    assert.strictEqual(
        props.Conjunction.of(Px, orPQ).to_string(),
        "P(x) and (P or Q)");
    assert.strictEqual(
        props.Conjunction.of(orPQ, Px).to_string(),
        "(P or Q) and P(x)");
    assert.strictEqual(
        props.Conjunction.of(Px, andPQ).to_string(),
        "P(x) and (P and Q)");
    assert.strictEqual(
        props.Conjunction.of(andPQ, Px).to_string(),
        "P and Q and P(x)");
    assert.strictEqual(
        props.Conjunction.of(props.Negation.of(andQP), andPQ).to_string(),
        "not (Q and P) and (P and Q)");

    assert.strictEqual(orPQ.to_string(), "P or Q");
    assert.strictEqual(orQP.to_string(), "Q or P");
    assert.strictEqual(orPxQ.to_string(), "P(x) or Q");
    assert.strictEqual(
        props.Disjunction.of(Px, notPx).to_string(),
        "P(x) or not P(x)");
    assert.strictEqual(
        props.Disjunction.of(Px, andPQ).to_string(),
        "P(x) or P and Q");
    assert.strictEqual(
        props.Disjunction.of(Px, orPQ).to_string(),
        "P(x) or (P or Q)");
    assert.strictEqual(
        props.Disjunction.of(orPQ, Px).to_string(),
        "P or Q or P(x)");
    assert.strictEqual(
        props.Disjunction.of(props.Negation.of(orQP), andPQ).to_string(),
        "not (Q or P) or P and Q");

    assert.strictEqual(impPQ.to_string(), "P -> Q");
    assert.strictEqual(impQP.to_string(), "Q -> P");
    assert.strictEqual(impPxQ.to_string(), "P(x) -> Q");
    assert.strictEqual(
        props.Implication.of(Px, notPx).to_string(),
        "P(x) -> not P(x)");
    assert.strictEqual(
        props.Implication.of(Px, andPQ).to_string(),
        "P(x) -> P and Q");
    assert.strictEqual(
        props.Implication.of(Px, orPQ).to_string(),
        "P(x) -> P or Q");
    assert.strictEqual(
        props.Implication.of(P, impQP).to_string(),
        "P -> Q -> P");
    assert.strictEqual(
        props.Implication.of(impPQ, P).to_string(),
        "(P -> Q) -> P");
    assert.strictEqual(
        props.Implication.of(props.Negation.of(P),
            props.Implication.of(Q, andPQ)).to_string(),
        "not P -> Q -> P and Q");

    assert.strictEqual(allPxx.to_string(), "forall x, P(x)");
    assert.strictEqual(allPxyx.to_string(), "forall x, P(x, y)");
    assert.strictEqual(allPxyy.to_string(), "forall y, P(x, y)");
    assert.strictEqual(
        props.ForAll.of("x", allPxyy).to_string(),
        "forall x, forall y, P(x, y)");
    assert.strictEqual(
        props.ForAll.of("x", exPxyy).to_string(),
        "forall x, exists y, P(x, y)");
    assert.strictEqual(
        props.ForAll.of("x", props.Conjunction.of(Px, exPxyy)).to_string(),
        "forall x, P(x) and (exists y, P(x, y))");

    assert.strictEqual(exPxx.to_string(), "exists x, P(x)");
    assert.strictEqual(exPxyx.to_string(), "exists x, P(x, y)");
    assert.strictEqual(exPxyy.to_string(), "exists y, P(x, y)");
    assert.strictEqual(
        props.Exists.of("x", allPxyy).to_string(),
        "exists x, forall y, P(x, y)");
    assert.strictEqual(
        props.Exists.of("x", exPxyy).to_string(),
        "exists x, exists y, P(x, y)");
    assert.strictEqual(
        props.Exists.of("x", props.Conjunction.of(Px, exPxyy)).to_string(),
        "exists x, P(x) and (exists y, P(x, y))");

    assert.strictEqual(eqABC11.to_string(), "a*b*c = a*b*c");
    assert.strictEqual(eqABC22.to_string(), "a*(b*c) = a*(b*c)");
    assert.strictEqual(eqABC12.to_string(), "a*b*c = a*(b*c)");
    assert.strictEqual(eqABC33.to_string(), "a + b + c = a + b + c");
    assert.strictEqual(eqABC44.to_string(), "a + (b + c) = a + (b + c)");
    assert.strictEqual(eqABC34.to_string(), "a + b + c = a + (b + c)");

    assert.strictEqual(andPQR1.to_string(), "P and Q and R");
    assert.strictEqual(andPQR2.to_string(), "P and (Q and R)");
    assert.strictEqual(orPQR1.to_string(), "P or Q or R");
    assert.strictEqual(orPQR2.to_string(), "P or (Q or R)");

    const impl2 = props.Implication.of(
        props.Predicate.of("P"),
        props.Conjunction.of(
            props.Implication.of(props.Predicate.of("S"), props.Predicate.of("T")),
            props.Implication.of(props.Predicate.of("T"), props.Predicate.of("S"))));
    assert.strictEqual(impl2.to_string(), "P -> (S -> T) and (T -> S)");
  });

  it('equals_alpha', function() {
    // All the examples above that are non-equal are not alpha-equal either.
    for (let i = 0; i < EXAMPLES.length; i++) {
      for (let j = 0; j < EXAMPLES.length; j++) {
        assert.strictEqual(EXAMPLES[i].equals_alpha(EXAMPLES[j]), i === j);
      }
    }

    const P1a = props.ForAll.of("x", props.Predicate.of("P", "x"));
    const P1b = props.ForAll.of("y", props.Predicate.of("P", "y"));
    assert.strictEqual(P1a.equals_alpha(P1b), true);
    assert.strictEqual(P1b.equals_alpha(P1a), true);

    const Pyx = props.Predicate.of("P", "y", "x");
    const P2a = props.ForAll.of("x", props.Exists.of("y", Pxy));
    const P2b = props.ForAll.of("y", props.Exists.of("x", Pxy));
    const P2c = props.ForAll.of("x", props.Exists.of("y", Pyx));
    const P2d = props.ForAll.of("y", props.Exists.of("x", Pyx));
    assert.strictEqual(P2a.equals_alpha(P2a), true);
    assert.strictEqual(P2a.equals_alpha(P2b), false);
    assert.strictEqual(P2a.equals_alpha(P2c), false);
    assert.strictEqual(P2a.equals_alpha(P2d), true);
    assert.strictEqual(P2b.equals_alpha(P2a), false);
    assert.strictEqual(P2b.equals_alpha(P2b), true);
    assert.strictEqual(P2b.equals_alpha(P2c), true);
    assert.strictEqual(P2b.equals_alpha(P2d), false);
    assert.strictEqual(P2c.equals_alpha(P2a), false);
    assert.strictEqual(P2c.equals_alpha(P2b), true);
    assert.strictEqual(P2c.equals_alpha(P2c), true);
    assert.strictEqual(P2c.equals_alpha(P2d), false);
    assert.strictEqual(P2d.equals_alpha(P2a), true);
    assert.strictEqual(P2d.equals_alpha(P2b), false);
    assert.strictEqual(P2d.equals_alpha(P2c), false);
    assert.strictEqual(P2d.equals_alpha(P2d), true);

    // Slightly more complex expression than above (but the same pattern).
    const Py = props.Predicate.of("P", "y");
    const P3a = props.ForAll.of("x", props.Conjunction.of(Px, props.Exists.of("y", Pxy)));
    const P3b = props.ForAll.of("y", props.Conjunction.of(Py, props.Exists.of("x", Pxy)));
    const P3c = props.ForAll.of("x", props.Conjunction.of(Px, props.Exists.of("y", Pyx)));
    const P3d = props.ForAll.of("y", props.Conjunction.of(Py, props.Exists.of("x", Pyx)));
    assert.strictEqual(P3a.equals_alpha(P3a), true);
    assert.strictEqual(P3a.equals_alpha(P3b), false);
    assert.strictEqual(P3a.equals_alpha(P3c), false);
    assert.strictEqual(P3a.equals_alpha(P3d), true);
    assert.strictEqual(P3b.equals_alpha(P3a), false);
    assert.strictEqual(P3b.equals_alpha(P3b), true);
    assert.strictEqual(P3b.equals_alpha(P3c), true);
    assert.strictEqual(P3b.equals_alpha(P3d), false);
    assert.strictEqual(P3c.equals_alpha(P3a), false);
    assert.strictEqual(P3c.equals_alpha(P3b), true);
    assert.strictEqual(P3c.equals_alpha(P3c), true);
    assert.strictEqual(P3c.equals_alpha(P3d), false);
    assert.strictEqual(P3d.equals_alpha(P3a), true);
    assert.strictEqual(P3d.equals_alpha(P3b), false);
    assert.strictEqual(P3d.equals_alpha(P3c), false);
    assert.strictEqual(P3d.equals_alpha(P3d), true);

    // Case: outer variable doesn't match inner and was not renamed.
    const Pxz = props.Predicate.of("P", "x", "z");
    const P4a = props.ForAll.of("x", props.Exists.of("y", Pxy));
    const P4b = props.ForAll.of("x", props.Exists.of("z", Pxz));
    assert.strictEqual(P4a.equals_alpha(P4b), true);
    assert.strictEqual(P4b.equals_alpha(P4a), true);

    // Case: outer variable doesn't match inner and was renamed to not match.
    const Pyz = props.Predicate.of("P", "y", "z");
    const Pzy = props.Predicate.of("P", "z", "y");
    const P5a = props.ForAll.of("x", props.Exists.of("y", Pxy));
    const P5b = props.ForAll.of("z", props.Exists.of("y", Pzy));
    const P5c = props.ForAll.of("z", props.Exists.of("y", Pyz));
    assert.strictEqual(P5a.equals_alpha(P5b), true);
    assert.strictEqual(P5a.equals_alpha(P5c), false);
    assert.strictEqual(P5b.equals_alpha(P5a), true);
    assert.strictEqual(P5c.equals_alpha(P5a), false);

    // Case: outer variable doesn't match inner but was renamed to match.
    const Pyy = props.Predicate.of("P", "y", "y");
    const P6a = props.ForAll.of("x", props.Exists.of("y", Pxy));
    const P6b = props.ForAll.of("y", props.Exists.of("z", Pyz));
    const P6c = props.ForAll.of("y", props.Exists.of("z", Pzy));
    const P6d = props.ForAll.of("y", props.Exists.of("y", Pyy));
    assert.strictEqual(P6a.equals_alpha(P6b), true);
    assert.strictEqual(P6a.equals_alpha(P6c), false);
    assert.strictEqual(P6a.equals_alpha(P6d), false);
    assert.strictEqual(P6b.equals_alpha(P6a), true);
    assert.strictEqual(P6c.equals_alpha(P6a), false);
    assert.strictEqual(P6d.equals_alpha(P6a), false);

    // Case: outer variable matches inner and was not renamed
    const Pxx = props.Predicate.of("P", "x", "x");
    const P7a = props.ForAll.of("x", props.Exists.of("x", Pxx));
    const P7b = props.ForAll.of("x", props.Exists.of("y", Pxy));
    const P7c = props.ForAll.of("x", props.Exists.of("y", Pxx));
    assert.strictEqual(P7a.equals_alpha(P7b), false);
    assert.strictEqual(P7a.equals_alpha(P7c), false);
    assert.strictEqual(P7b.equals_alpha(P7a), false);
    assert.strictEqual(P7c.equals_alpha(P7a), false);

    // Case: outer variable matches inner and was renamed to not match
    const P8a = props.ForAll.of("x", props.Exists.of("x", Pxx));
    const P8b = props.ForAll.of("y", props.Exists.of("x", Pxx));
    assert.strictEqual(P8a.equals_alpha(P8b), true);
    assert.strictEqual(P8b.equals_alpha(P8a), true);

    // Case: "outer variable matches inner and was renamed to match" is impossible
  });

  it('normalize_arrows', function() {
    const P = props.ForAll.of("x", props.Exists.of("y",
        props.Conjunction.of(props.TRUE,
            props.Disjunction.of(props.FALSE,
                props.Predicate.of("P", "x", "y")))));
    assert.strictEqual(P, P.normalize_arrows());

    const Q = props.ForAll.of("x", props.Exists.of("y",
        props.Conjunction.of(props.TRUE,
            props.Implication.of(props.FALSE,
                props.Predicate.of("P", "x", "y")))));
    const R = props.ForAll.of("x", props.Exists.of("y",
            props.Conjunction.of(props.TRUE,
                props.Disjunction.of(
                    props.Negation.of(props.FALSE),
                    props.Predicate.of("P", "x", "y")))));
    assert.ok(!Q.equals_alpha(Q.normalize_arrows()));
    assert.ok(R.equals_alpha(R.normalize_arrows()));
    assert.ok(Q.normalize_arrows().equals(R));

    const S = props.Implication.of(
        props.Predicate.of("P"),
        props.Biconditional.of(
            props.Predicate.of("Q"),
            props.Predicate.of("R")));
    const T = props.Disjunction.of(
        props.Negation.of(props.Predicate.of("P")),
        props.Conjunction.of(
            props.Disjunction.of(
                props.Negation.of(props.Predicate.of("Q")),
                props.Predicate.of("R")),
            props.Disjunction.of(
                props.Negation.of(props.Predicate.of("R")),
                props.Predicate.of("Q"))));
    assert.ok(S.normalize_arrows().equals(T));
  });

  it('to_string_alpha', function() {
    // If two strings have the same to_string_alpha, then they must be equals_alpha.
    // This is important because propositions are often looked up using their
    // to_string_alpha as a key.
    for (let i = 0; i < EXAMPLES.length; i++) {
      for (let j = 0; j < EXAMPLES.length; j++) {
        let tsae = EXAMPLES[i].to_string_alpha() === EXAMPLES[j].to_string_alpha();
        let ae = EXAMPLES[i].equals_alpha(EXAMPLES[j]);
        assert.ok(tsae === ae, EXAMPLES[i].to_string() + " " + EXAMPLES[j].to_string());
      }
    }

    assert.strictEqual(eqABC11.to_string_alpha(), "a*b*c = a*b*c");
    assert.strictEqual(eqABC22.to_string_alpha(), "a*(b*c) = a*(b*c)");
    assert.strictEqual(eqABC12.to_string_alpha(), "a*b*c = a*(b*c)");
    assert.strictEqual(eqABC33.to_string_alpha(), "a + b + c = a + b + c");
    assert.strictEqual(eqABC44.to_string_alpha(), "a + (b + c) = a + (b + c)");
    assert.strictEqual(eqABC34.to_string_alpha(), "a + b + c = a + (b + c)");

    assert.strictEqual(andPQR1.to_string_alpha(), "P and Q and R");
    assert.strictEqual(andPQR2.to_string_alpha(), "P and (Q and R)");
    assert.strictEqual(orPQR1.to_string_alpha(), "P or Q or R");
    assert.strictEqual(orPQR2.to_string_alpha(), "P or (Q or R)");
  });

  it('normalize_un/negate', function() {
    const P1 = props.Negation.of(props.TRUE);
    assert.ok(P1.normalize_unnegate().equals(props.FALSE));
    assert.ok(P1.normalize_negate().equals(props.TRUE));

    const P2 = props.Negation.of(props.FALSE);
    assert.ok(P2.normalize_unnegate().equals(props.TRUE));
    assert.ok(P2.normalize_negate().equals(props.FALSE));

    const Q1 = props.Negation.of(props.Conjunction.of(
        props.Predicate.of("P", "x"),
        props.Negation.of(props.TRUE)));
    assert.ok(Q1.normalize_unnegate().equals(
        props.Disjunction.of(
            props.Negation.of(props.Predicate.of("P", "x")),
            props.TRUE)));
    assert.ok(Q1.normalize_negate().equals(
        props.Conjunction.of(
            props.Predicate.of("P", "x"),
            props.FALSE)));

    const Q2 = props.Negation.of(props.Disjunction.of(
        props.Negation.of(props.FALSE),
        props.Predicate.of("P", "x")));
    assert.ok(Q2.normalize_unnegate().equals(
        props.Conjunction.of(
            props.FALSE,
            props.Negation.of(props.Predicate.of("P", "x")))));
    assert.ok(Q2.normalize_negate().equals(
        props.Disjunction.of(
            props.TRUE,
            props.Predicate.of("P", "x"))));

    const R1 = props.Negation.of(props.ForAll.of("x",
        props.Disjunction.of(
            props.Predicate.of("P", "x"),
            props.Negation.of(props.TRUE))));
    assert.ok(R1.normalize_unnegate().equals(
        props.Exists.of("x",
            props.Conjunction.of(
               props.Negation.of(props.Predicate.of("P", "x")),
               props.TRUE))));
    assert.ok(R1.normalize_negate().equals(
        props.ForAll.of("x",
            props.Disjunction.of(
                props.Predicate.of("P", "x"),
                props.FALSE))));

    const R2 = props.Negation.of(props.Exists.of("x",
        props.Conjunction.of(
            props.Negation.of(props.TRUE),
            props.Predicate.of("P", "x"))));
    assert.ok(R2.normalize_unnegate().equals(
        props.ForAll.of("x",
            props.Disjunction.of(
               props.TRUE,
               props.Negation.of(props.Predicate.of("P", "x"))))));
    assert.ok(R2.normalize_negate().equals(
        props.Exists.of("x",
            props.Conjunction.of(
                props.FALSE,
                props.Predicate.of("P", "x")))));
  });

  it('normalize_var_names', function() {
    props.__new_vars.prefix = "v";
    props.__new_vars.index = 1;

    const P = props.ForAll.of("x",
        props.Exists.of("y",
            props.Implication.of(
                props.Predicate.of("Q", "y"),
                props.Predicate.of("P", "x", "y"))));
    assert.ok(P.normalize_var_names().equals(
        props.ForAll.of("v1",
            props.Exists.of("v2",
                props.Implication.of(
                    props.Predicate.of("Q", "v2"),
                    props.Predicate.of("P", "v1", "v2"))))));

    const Q = props.Exists.of("y",
        props.ForAll.of("x",
            props.Implication.of(
                props.Predicate.of("Q", "y"),
                props.Predicate.of("P", "x", "y"))));
    assert.ok(Q.normalize_var_names().equals(
        props.Exists.of("v3",
            props.ForAll.of("v4",
                props.Implication.of(
                    props.Predicate.of("Q", "v3"),
                    props.Predicate.of("P", "v4", "v3"))))));

    const R1 = props.ForAll.of("x",
        props.Exists.of("y",
            props.Implication.of(
                props.Predicate.of("Q", "y"),
                props.Predicate.of("P", "x", "a"))));
    assert.ok(R1.normalize_var_names().equals(
        props.ForAll.of("v5",
            props.Exists.of("v6",
                props.Implication.of(
                    props.Predicate.of("Q", "v6"),
                    props.Predicate.of("P", "v5", "a"))))));

    const R2 = props.ForAll.of("x",
        props.Exists.of("y",
            props.Implication.of(
                props.Predicate.of("Q", "a"),
                props.Predicate.of("P", "x", "y"))));
    assert.ok(R2.normalize_var_names().equals(
        props.ForAll.of("v7",
            props.Exists.of("v8",
                props.Implication.of(
                    props.Predicate.of("Q", "a"),
                    props.Predicate.of("P", "v7", "v8"))))));

    const R3 = props.ForAll.of("x",
        props.Exists.of("y",
            props.Implication.of(
                props.Predicate.of("Q", "y"),
                props.Predicate.of("P", "a", "y"))));
    assert.ok(R3.normalize_var_names().equals(
        props.ForAll.of("v9",
            props.Exists.of("v10",
                props.Implication.of(
                    props.Predicate.of("Q", "v10"),
                    props.Predicate.of("P", "a", "v10"))))));
  });

  it('strip_quantifiers', function() {
    const P = props.ForAll.of("x",
        props.Implication.of(
            props.Exists.of("y",
                props.Negation.of(props.Predicate.of("Q", "y"))),
            props.ForAll.of("z",
                props.Predicate.of("P", "x", "z"))));

    const qs: Quantifier[] = [];
    const Q = P.strip_quantifiers(qs);
    assert.strictEqual(qs.length, 3);
    assert.strictEqual(qs[0].variety, props.PROP_FORALL);
    assert.strictEqual(qs[1].variety, props.PROP_EXISTS);
    assert.strictEqual(qs[2].variety, props.PROP_FORALL);
    assert.strictEqual(qs[0].name, "x");
    assert.strictEqual(qs[1].name, "y");
    assert.strictEqual(qs[2].name, "z");
    assert.ok(Q.equals(
        props.Implication.of(
            props.Negation.of(props.Predicate.of("Q", "y")),
            props.Predicate.of("P", "x", "z"))));
  });

  it('normalize', function() {
    const P = props.Implication.of(
        props.TRUE,
        props.Implication.of(
            props.Negation.of(props.Predicate.of("Q")),
            props.Predicate.of("P", "x")));
    assert.ok(P.normalize().equals(
        props.Disjunction.of(
            props.FALSE,
            props.Disjunction.of(
              props.Predicate.of("Q"),
              props.Predicate.of("P", "x")))));

    const Q = props.Implication.of(
        props.Implication.of(
            props.Predicate.of("Q"),
            props.FALSE),
        props.Predicate.of("P", "x"));
    assert.ok(Q.normalize().equals(
        props.Disjunction.of(
            props.Conjunction.of(
              props.Predicate.of("Q"),
              props.TRUE),
            props.Predicate.of("P", "x"))));

    props.__new_vars.prefix = "v";
    props.__new_vars.index = 1;
    const R = props.Implication.of(
        props.Exists.of("x",
            props.Negation.of(props.Predicate.of("Q", "x"))),
        props.ForAll.of("x",
            props.Exists.of("y",
                props.Predicate.of("P", "x", "y"))));
    assert.ok(R.normalize().equals(
        props.ForAll.of("v1",
            props.ForAll.of("v2",
                props.Exists.of("v3",
                    props.Disjunction.of(
                        props.Predicate.of("Q", "v1"),
                        props.Predicate.of("P", "v2", "v3")))))));

    const S = props.Predicate.equal(
        exprs.Call.subtract(exprs.Variable.of("x"), exprs.Variable.of("x")),
        exprs.Constant.ZERO);
    assert.ok(S.normalize().equals(props.TRUE));
  });

  it('normalize expressions', function() {
    const arg1 = exprs.Constant.of(10n);
    const arg2 = exprs.Call.add(
        exprs.Call.multiply(exprs.Constant.of(2n), exprs.Constant.of(3n)),
        exprs.Constant.of(4n));

    const eq = props.Predicate.equal(arg1, arg2);
    assert.ok(eq.normalize().equals(props.TRUE));

    const lt = props.Predicate.lessThan(arg1, arg2);
    assert.ok(lt.normalize().equals(props.FALSE));

    const le = props.Predicate.lessOrEqual(arg1, arg2);
    assert.ok(le.normalize().equals(props.TRUE));
  });

  it('subst', function() {
      const P = props.ForAll.of("x", props.Predicate.of("P", "y"));
      assert.ok(P.subst("x", exprs.Variable.of("z")).equals_alpha(P));

      const Q = props.ForAll.of("z", props.Predicate.of("P", "x"));
      assert.ok(P.subst("y", exprs.Variable.of("x")).equals_alpha(Q));
  });

  it('NewVarNameVariation', function() {
    assert.strictEqual(NewVarNameVariation("v", new Set([])), "v0");
    assert.strictEqual(NewVarNameVariation("w", new Set([])), "w0");
    assert.strictEqual(NewVarNameVariation("var", new Set([])), "var0");

    assert.strictEqual(NewVarNameVariation("v", new Set(["v0"])), "v1");
    assert.strictEqual(NewVarNameVariation("v", new Set(["v0", "v1"])), "v2");

    assert.strictEqual(NewVarNameVariation("v2", new Set([])), "v0");
    assert.strictEqual(NewVarNameVariation("v2", new Set(["v0"])), "v1");
    assert.strictEqual(NewVarNameVariation("v2", new Set(["v0", "v1"])), "v3");
  });

  it('SplitQuantifiers', function() {
    const [q1, b1] = SplitQuantifiers(props.Predicate.of("P", "y"));
    assert.deepStrictEqual(q1, []);
    assert.strictEqual(b1.to_string_alpha(), "P(y)");

    const [q2, b2] = SplitQuantifiers(
        props.ForAll.of("x", props.Predicate.of("P", "x", "y")));
    assert.deepStrictEqual(q2, ["x"]);
    assert.strictEqual(b2.to_string(), "P(x, y)");

    const [q3, b3] = SplitQuantifiers(
        props.Exists.of("x", props.Predicate.of("P", "x", "y")));
    assert.deepStrictEqual(q3, []);
    assert.strictEqual(b3.to_string(), "exists x, P(x, y)");

    const [q4, b4] = SplitQuantifiers(
        props.ForAll.of("y",
            props.Exists.of("x", props.Predicate.of("P", "x", "y"))));
    assert.deepStrictEqual(q4, ["y"]);
    assert.strictEqual(b4.to_string(), "exists x, P(x, y)");

    const [q5, b5] = SplitQuantifiers(
        props.ForAll.of("y",
            props.ForAll.of("x", props.Predicate.of("P", "x", "y"))));
    assert.deepStrictEqual(q5, ["y", "x"]);
    assert.strictEqual(b5.to_string(), "P(x, y)");

    const [q6, b6] = SplitQuantifiers(
        props.ForAll.of("y",
            props.ForAll.of("x", props.Predicate.of("P", "x", "y"))), 2);
    assert.deepStrictEqual(q6, ["y", "x"]);
    assert.strictEqual(b6.to_string(), "P(x, y)");

    const [q7, b7] = SplitQuantifiers(
        props.ForAll.of("y",
            props.ForAll.of("x", props.Predicate.of("P", "x", "y"))), 1);
    assert.deepStrictEqual(q7, ["y"]);
    assert.strictEqual(b7.to_string(), "forall x, P(x, y)");

    const [q8, b8] = SplitQuantifiers(
        props.ForAll.of("y",
            props.ForAll.of("x", props.Predicate.of("P", "x", "y"))), 0);
    assert.deepStrictEqual(q8, []);
    assert.strictEqual(b8.to_string(), "forall y, forall x, P(x, y)");
  });

  it('RenameQuantifiers', function() {
    const prop1 = props.ForAll.of("x",
        props.ForAll.of("y", props.Predicate.of("P", "x", "y")));
    assert.deepStrictEqual(prop1.to_string(), "forall x, forall y, P(x, y)");

    const prop2 = RenameQuantifiers(prop1, ["a", "b"])
    assert.deepStrictEqual(prop2.to_string(), "forall a, forall b, P(a, b)");

    const prop3 = RenameQuantifiers(prop1, ["a"])
    assert.deepStrictEqual(prop3.to_string(), "forall a, forall y, P(a, y)");
  });

  it('UniquifyQuantifiers', function() {
    props.__new_vars.prefix = "v";
    props.__new_vars.index = 1;

    const prop1 = UniquifyQuantifiers(
        props.ForAll.of("x", props.Predicate.of("P", "x")));
    assert.strictEqual(prop1.to_string(), "forall v1, P(v1)");

    const prop2 = UniquifyQuantifiers(
        props.ForAll.of("y",
            props.ForAll.of("x", props.Predicate.of("P", "x", "y"))));
    assert.strictEqual(prop2.to_string(), "forall v2, forall v3, P(v3, v2)");
  });

});