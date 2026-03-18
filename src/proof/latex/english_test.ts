import * as assert from 'assert';
import { ParseProp } from '../../facts/props_parser';
import { TopLevelEnv } from '../../infer/env';
import { Proof, ProofFromJson } from '../proof';
import { EnglishProof } from './english';
import * as sets from '../../infer/sets';


const ENV = new TopLevelEnv(sets.DEFINITIONS.concat([
    ["Even", ParseProp("forall x, Even(x) <-> (exists y, x = 2*y)")],
  ]), [
    ["Thm1", ParseProp("P -> Q")],
    ["Thm2", ParseProp("Q -> R")],
  ], undefined, ["a", "b", "c", "A", "B", "C"]);


// Parses the JSON into a proof using the environment above.
function MakeProof(desc: any): Proof {
  return ProofFromJson(ENV, desc);
}


describe('english', function() {

  it('cite', function() {
    const text = EnglishProof(MakeProof([
        ["P", "given (P)"],
        ["P -> Q", "cite Thm1"],
        ["Q -> R", "cite Thm2"],
        ["Q", "modus ponens 1 2"],
        ["R", "modus ponens 4 3"]
      ])).join("\n\n");
    assert.strictEqual(text,
        "We are given that $P$ is true. " +
        "We know from Thm1 that $P$ implies $Q$. " +
        "Since we know that $P$ is true, we get that $Q$ is also true. " +
        "We know from Thm2 that $Q$ implies $R$. " +
        "Since we know that $Q$ is true, we get that $R$ is also true.");
  });

  it('cases', function() {
    const text = EnglishProof(MakeProof([
        ["A -> B", "given (A -> B)"],
        ["not A -> B", "given (not A -> B)"],
        ["B", "simple cases 1 2"],
      ])).join("\n\n");
    assert.strictEqual(text,
        "We argue by cases.\n\n" +
        "We are given that $A$ implies $B$.\n\n" +
        "We are given that $\\neg A$ implies $B$.\n\n" +
        "Since we know that either $A$ or $\\neg A$ is true, we can see that $B$ is always true.");

    const text2 = EnglishProof(MakeProof([
        ["A -> B", "given (A -> B)"],
        ["not A -> B", "given (not A -> B)"],
        ["A or not A", "tautology (A or not A)"],
        ["B", "cases 3 1 2"],
      ])).join("\n\n");
    assert.strictEqual(text2,
        "We know that $A \\vee \\neg A$ is always true. We now argue by cases.\n\n" +
        "We are given that $A$ implies $B$.\n\n" +
        "We are given that $\\neg A$ implies $B$.\n\n" +
        "Since we know that either $A$ or $\\neg A$ is true, we can see that $B$ is always true.");
  });

  it('contradiction', function () {
    const text = EnglishProof(MakeProof([
        ["P", "given (P)"],
        ["not P", "given (not P)"],
        ["false", "contradiction 1 2"]
      ])).join("\n\n");
    assert.strictEqual(text,
        "We are given that $P$ is true. We are given that $\\neg P$ holds. " +
        "Since $P$ and $\\neg P$ cannot both be true, we have proven false.");
  });

  it('absurdum', function () {
    const text = EnglishProof(MakeProof([
        ["P", "given (P)"],
        [
          ["not P", "assumption"],
          ["false", "contradiction 1 ^1"],
        ],
        ["not not P", "absurdum (not not P)"],
      ])).join("\n\n");
    assert.strictEqual(text,
        "Suppose that $\\neg P$ holds. " +
        "We are given that $P$ is true. " +
        "Since $P$ and $\\neg P$ cannot both be true, we have proven false. " +
        "This is absurd, so we have shown that $\\neg \\neg P$ must hold.");
  });

  it('exfalso', function () {
    const text = EnglishProof(MakeProof([
        ["false", "given (false)"],
        ["forall x, P(x)", "exfalso ^1 (forall x, P(x))"],
      ])).join("\n\n");
    assert.strictEqual(text,
        "We are given that $\\bot$ holds. " +
        "Since false proves anything, it follows that $\\forall\\,x, P(x)$ holds.");
  });

  it('verum', function () {
    const text = EnglishProof(MakeProof([
        ["true -> P", "given (true -> P)"],
        ["true", "verum"],
        ["P", "modus ponens 2 1"]
      ])).join("\n\n");
    assert.strictEqual(text,
        "We are given that $\\top$ implies $P$. " +
        "Since we know that $\\top$ holds, we get that $P$ is also true.");
  });

  it('tautology', function() {
    const text = EnglishProof(MakeProof([
        ["a - a = 0", "tautology (a-a=0)"]
      ])).join("\n\n");
    assert.strictEqual(text,
        "We know that $a - a = 0$ is always true.");

    const text2 = EnglishProof(MakeProof([
        ["P or not P", "tautology (P or not P)"],
      ])).join("\n\n");
    assert.strictEqual(text2,
        "We know that $P \\vee \\neg P$ is always true.");
  });

  it('substitute', function() {
    const proof = MakeProof([
        ["a = 3", "given (a = 3)"],
        ["c - a = b", "given (c - a = b)"],
        ["c - 3 = b", "substitute 1 right 2"]
      ]);
    const text = EnglishProof(proof).join("\n\n");
    assert.strictEqual(text,
        "We are given that $a = 3$. We are given that $c - a = b$. " +
        "Substituting $a = 3$ into $c - a = b$ gives us $c - 3 = b$.");
  });

  it('definition', function() {
    const text = EnglishProof(MakeProof([
        ["Even(a)", "given (Even(a))"],
        ["exists y, a = 2*y", "defof Even 1"],
        ["a = 2*r", "elim exists 2 r"],
      ])).join("\n\n");
    assert.strictEqual(text,
        "We are given that $\\textsf{Even}(a)$ is true. " +
        "By the definition of Even, we can restate $\\textsf{Even}(a)$ as $\\exists\\,y, a = 2\\,y$. " +
        "We thus know that $a = 2\\,r$ holds for some $r$.");
  });

  it('set functions', function() {
    const text = EnglishProof(MakeProof([
        ["a in A",      "given (a in A)"],
        ["a in ~B",     "given (a in ~B)"],
        ["not a in B",  "defof Complement 2"],
        ["(a in A) and not (a in B)", "intro and 1 3"],
        ["a in A \\ B", "undef SetDifference 4"],
      ])).join("\n\n");
    assert.strictEqual(text,
        "We are given that $a \\in A$. " +
        "We are given that $a \\in \\overline{B}$. " +
        "By the definition of Complement, we can restate $a \\in \\overline{B}$ as $\\neg (a \\in B)$. " +
        "Putting the previous facts together, we see that $a \\in A \\wedge \\neg (a \\in B)$ holds. " +
        "By the definition of SetDifference, we can restate $a \\in A \\wedge \\neg (a \\in B)$ as $a \\in A\\,\\setminus\\,B$.");
  });

  it('set relations', function() {
    const text = EnglishProof(MakeProof([
        ["forall x, x in B", "given (forall x, x in B)"],
        [
          [
            ["x in A",  "assumption"],
            ["x in B",  "elim forall ^^^1 {x}"]
          ],
          ["x in A -> x in B", "direct proof (x in A -> x in B)"],
        ],
        ["forall x, x in A -> x in B", "intro forall (forall x, x in A -> x in B)"],
        ["A subset B", "undef Subset ^2"]
      ])).join("\n\n");
    assert.strictEqual(text,
        "Let $x$ be arbitrary.\n\n" +
        "Suppose that $x \\in A$. " +
        "We are given that $\\forall\\,x, x \\in B$ holds. " +
        "Since it holds for all objects, we know that $x \\in B$.\n\n" +
        "Since $x$ was arbitrary, we have shown that $x \\in A \\to x \\in B$ holds for all $x$.\n\n" +
        "By the definition of Subset, we can restate $\\forall\\,x, x \\in A \\to x \\in B$ as $A \\subseteq B$.");
  });

  it('apply', function() {
    const text = EnglishProof(MakeProof([
        ["P", "given (P)"],
        ["Q", "apply Thm1 1"],
        ["R", "apply Thm2 2"]
      ])).join("\n\n");
    assert.strictEqual(text,
        "We are given that $P$ is true. " +
        "From Thm1 and the fact that $P$ is true, we get that $Q$ is true. " +
        "From Thm2 and the fact that $Q$ is true, we get that $R$ is true.");
  });

  it('algebra', function() {
    const text = EnglishProof(MakeProof([
        ["a + b^2 = 3",     "given (a+b^2=3)"],
        ["b^2 + c + 5 = 0", "given (b^2+c+5=0)"],
        ["a - c = 8",       "algebra (a-c=8) 1 2"]
      ])).join("\n\n");
    assert.strictEqual(text,
        "We are given that $a + b^2 = 3$. We are given that $b^2 + c + 5 = 0$. " +
        "After some algebra, these facts tell us that $a - c = 8$.");
  });

  it('induction', function() {
    const text = EnglishProof(MakeProof([
        ["Divides(2, 2*0^2 + 2*0)", "given (Divides(2, 2*0^2 + 2*0))"],
        ["forall n, Divides(2, 2*n^2 + 2*n) -> Divides(2, 2*(n + 1)^2 + 2*(n + 1))",
         "given (forall n, Divides(2, 2*n^2 + 2*n) -> Divides(2, 2*(n + 1)^2 + 2*(n + 1)))"],
        ["forall n, 0 <= n -> Divides(2, 2*n^2 + 2*n)", "induction 1 2"]
      ])).join("\n\n");
    assert.strictEqual(text,
        "We are given that $2\\ \\mid\\ 2{\\cdot}0^2 + 2{\\cdot}0$ is true. " +
        "We are given that $\\forall\\,n, 2\\ \\mid\\ 2\\,n^2 + 2\\,n \\to 2\\ \\mid\\ 2\\,(n + 1)^2 + 2\\,(n + 1)$ holds. " +
        "It follows that $2\\ \\mid\\ 2\\,n^2 + 2\\,n$ is true for all $n \ge 0$ by induction.");
  });

  // More examples...

  it('proof1', function() {
    const text = EnglishProof(MakeProof([
        ["P", "given (P)"],
        ["P -> Q", "given (P -> Q)"],
        ["Q -> R", "given (Q -> R)"],
        ["Q", "modus ponens 1 2"],
        ["R", "modus ponens 4 3"]
      ])).join("\n\n");
    assert.strictEqual(text,
        "We are given that $P$ is true. We are given that $P$ implies $Q$. " +
        "Since we know that $P$ is true, we get that $Q$ is also true. " +
        "We are given that $Q$ implies $R$. " +
        "Since we know that $Q$ is true, we get that $R$ is also true.");
  });

  it('proof2', function() {
    const text = EnglishProof(MakeProof([
        ["Q", "given (Q)"],
        ["P and Q -> R", "given (P and Q -> R)"],
        [
          ["P", "assumption"],
          ["P and Q", "intro and 3.1 1"],
          ["R", "modus ponens 3.2 2"],
        ],
        ["P -> R", "direct proof (P -> R)"],
      ])).join("\n\n");
    assert.strictEqual(text,
        "Suppose that $P$ is true. We are given that $Q$ is true. " +
        "Putting the previous facts together, we see that $P \\wedge Q$ holds. " +
        "We are given that $P \\wedge Q$ implies $R$. " +
        "Since we know that $P \\wedge Q$ holds, we get that $R$ is also true.");
  });

  it('proof3', function() {
    const text = EnglishProof(MakeProof([
        [
          ["(P -> Q) and (Q -> R)", "assumption"],
          ["P -> Q", "elim and 1.1 left"],
          ["Q -> R", "elim and 1.1 right"],
          [
            ["P", "assumption"],
            ["Q", "modus ponens 1.4.1 1.2"],
            ["R", "modus ponens 1.4.2 1.3"],
          ],
          ["P -> R", "direct proof (P -> R)"]
        ],
        ["((P -> Q) and (Q -> R)) -> P -> R",
         "direct proof (((P -> Q) and (Q -> R)) -> P -> R)"]
      ])).join("\n\n");
    assert.strictEqual(text,
        "Suppose that $(P \\to Q) \\wedge (Q \\to R)$ holds.\n\n" +
        "Suppose that $P$ is true. " +
        "In particular, we see that $P$ implies $Q$. " +
        "Since we know that $P$ is true, we get that $Q$ is also true. " +
        "In particular, we see that $Q$ implies $R$. " +
        "Since we know that $Q$ is true, we get that $R$ is also true.");
  });

  it('proof4', function() {
    const text = EnglishProof(MakeProof([
        ["forall x, T(x) -> M(x)", "given (forall x, T(x) -> M(x))"],
        [
          ["exists x, T(x)", "assumption"],
          ["T(g)", "elim exists 2.1 g"],
          ["T(g) -> M(g)", "elim forall 1 {g}"],
          ["M(g)", "modus ponens 2.2 2.3"],
          ["exists y, M(y)", "intro exists 2.4 {g} y"],
        ],
        ["(exists x, T(x)) -> (exists y, M(y))",
         "direct proof ((exists x, T(x)) -> (exists y, M(y)))"]
      ])).join("\n\n");
    assert.strictEqual(text,
        "Suppose that $\\exists\\,x, T(x)$ holds. " +
        "We thus know that $T(g)$ holds for some $g$. " +
        "We are given that $\\forall\\,x, T(x) \\to M(x)$ holds. " +
        "Since it holds for all objects, we know that $T(g)$ implies $M(g)$. " +
        "Since we know that $T(g)$ is true, we get that $M(g)$ is also true. " +
        "This shows that there exists a $y$ such that $M(y)$ is true.");
  });

  it('2fc1au HW3 4(c)', function() {
    const text = EnglishProof(MakeProof([
        ["P -> R and not S", "given (P -> R and not S)"],
        ["S or T", "given (S or T)"],
        ["R and T -> U", "given (R and T -> U)"],
        [
          ["P", "assumption"],
          ["R and not S", "modus ponens 4.1 1"],
          ["R", "elim and 4.2 left"],
          ["not S", "elim and 4.2 right"],
          ["T", "elim or 2 4.4"],
          ["R and T", "intro and 4.3 4.5"],
          ["U", "modus ponens 4.6 3"]
        ],
        ["(P -> U)", "direct proof (P -> U)"]
      ])).join("\n\n");
    assert.strictEqual(text,
        "Suppose that $P$ is true. " +
        "We are given that $P$ implies $R \\wedge \\neg S$. " +
        "Since we know that $P$ is true, we get that $R \\wedge \\neg S$ also holds. " +
        "In particular, we see that $R$ is true. In particular, we see that $\\neg S$ holds. " +
        "We are given that $S \\vee T$ holds. " +
        "Since we saw that $S$ is false, we know that $T$ must be true. " +
        "Putting the previous facts together, we see that $R \\wedge T$ holds. " +
        "We are given that $R \\wedge T$ implies $U$. " +
        "Since we know that $R \\wedge T$ holds, we get that $U$ is also true.");
  });

  it('2fc1au HW3 4(d)', function() {
    const text = EnglishProof(MakeProof([
        ["P -> (S <-> T)",              "given (P -> (S <-> T))"],
        [
          ["P and S",                   "assumption"],
          ["P",                         "elim and 2.1 left"],
          ["S <-> T",                   "modus ponens 2.2 1"],
          ["(S -> T) and (T -> S)",     "equivalent 2.3 ((S -> T) and (T -> S))"],
          ["S -> T",                    "elim and 2.4 left"],
          ["S",                         "elim and 2.1 right"],
          ["T",                         "modus ponens 2.6 2.5"],
          ["P and T",                   "intro and 2.2 2.7"],
        ],
        ["P and S -> P and T",          "direct proof (P and S -> P and T)"],
        [
          ["P and T",                   "assumption"],
          ["P",                         "elim and 3.1 left"],
          ["S <-> T",                   "modus ponens 3.2 1"],
          ["(S -> T) and (T -> S)",     "equivalent 3.3 ((S -> T) and (T -> S))"],
          ["T -> S",                    "elim and 3.4 right"],
          ["T",                         "elim and 3.1 right"],
          ["S",                         "modus ponens 3.6 3.5"],
          ["P and S",                   "intro and 3.2 3.7"],
        ],
        ["P and T -> P and S",          "direct proof (P and T -> P and S)"],
        ["((P and S) -> (P and T)) and ((P and T) -> (P and S))",
                                        "intro and 2 3"],
        ["P and S <-> P and T",         "equivalent 4 (P and S <-> P and T)"],
      ])).join("\n\n");
    assert.strictEqual(text,
        "Suppose that $P \\wedge S$ holds. In particular, we see that $P$ is true. " +
        "In particular, we see that $S$ is true. " +
        "We are given that $P$ implies $S \\leftrightarrow T$. " +
        "Since we know that $P$ is true, we get that $S \\leftrightarrow T$ also holds. " +
        "This is equivalent to $(S \\to T) \\wedge (T \\to S)$. " +
        "In particular, we see that $S$ implies $T$. " +
        "Since we know that $S$ is true, we get that $T$ is also true. " +
        "Putting the previous facts together, we see that $P \\wedge T$ holds.\n" +
        "\n" +
        "Suppose that $P \\wedge T$ holds. In particular, we see that $P$ is true. " +
        "In particular, we see that $T$ is true. " +
        "We are given that $P$ implies $S \\leftrightarrow T$. " +
        "Since we know that $P$ is true, we get that $S \\leftrightarrow T$ also holds. " +
        "This is equivalent to $(S \\to T) \\wedge (T \\to S)$. " +
        "In particular, we see that $T$ implies $S$. " +
        "Since we know that $T$ is true, we get that $S$ is also true. " +
        "Putting the previous facts together, we see that $P \\wedge S$ holds.\n" +
        "\n" +
        "Putting the previous facts together, we see that $(P \\wedge S \\to P \\wedge T) \\wedge (P \\wedge T \\to P \\wedge S)$ holds. " +
        "This is equivalent to $P \\wedge S \\leftrightarrow P \\wedge T$.");
  });

 it('backward reasoned subproofs', function() {
    const text = EnglishProof(MakeProof([
        ["forall x, P(x) and Q(x)", "given (forall x, P(x) and Q(x))"],
        [
          ["P(z) and Q(z)", "elim forall 1 {z}"],
          ["P(z)", "elim and 2.1 left"]
        ],
        ["forall x, P(x)", "intro forall (forall x, P(x)) z"],
        [
          ["P(z) and Q(z)", "elim forall ^^1 {z}"],
          ["Q(z)", "elim and ^1 right"]
        ],
        ["forall x, Q(x)", "intro forall (forall x, Q(x)) z"],
        ["(forall x, P(x)) and (forall x, Q(x))", "intro and 2 3"]
      ])).join("\n\n");
    assert.strictEqual(text,
        "Let $z$ be arbitrary. We are given that $\\forall\\,x, P(x) \\wedge Q(x)$ holds. " +
        "Since it holds for all objects, we know that $P(z) \\wedge Q(z)$ must hold. " +
        "In particular, we see that $P(z)$ is true. " +
        "Since $z$ was arbitrary, we have shown that $P(x)$ holds for all $x$.\n\n" +
        "Let $z$ be arbitrary. We are given that $\\forall\\,x, P(x) \\wedge Q(x)$ holds. " +
        "Since it holds for all objects, we know that $P(z) \\wedge Q(z)$ must hold. " +
        "In particular, we see that $Q(z)$ is true. " +
        "Since $z$ was arbitrary, we have shown that $Q(x)$ holds for all $x$.\n\n" +
        "Putting the previous facts together, we see that $(\\forall\\,x, P(x)) \\wedge (\\forall\\,x, Q(x))$ holds.");
  });

});
