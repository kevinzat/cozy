import * as assert from 'assert';
import { ParseProp } from '../../facts/props_parser';
import { FormalProof } from './formal';
import { Proof, ProofFromJson } from '../proof';
import { TopLevelEnv } from '../../infer/env';
import * as sets from '../../infer/sets';


const ENV = new TopLevelEnv(
  sets.DEFINITIONS.concat([
    ["Even", ParseProp("forall x, Even(x) <-> (exists y, x = 2*y)")],
  ]), [
    ["Thm1", ParseProp("P -> Q")],
    ["Thm2", ParseProp("Q -> R")],
  ], undefined, ["a", "b", "c", "A", "B", "C"]);


// Parses the JSON into a proof using the environment above.
function MakeProof(desc: any): Proof {
  return ProofFromJson(ENV, desc);
}


describe('formal', function() {

  it('proof1', function() {
    const text = FormalProof(MakeProof([
        ["P", "given (P)"],
        ["P -> Q", "given (P -> Q)"],
        ["Q -> R", "given (Q -> R)"],
        ["Q", "modus ponens 1 2"],
        ["R", "modus ponens 4 3"]
      ]));
    assert.strictEqual(text,
        "$$ \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "1.\\quad& P \\\\\n" +
        "2.\\quad& P \\to Q \\\\\n" +
        "3.\\quad& Q \\to R \\\\\n" +
        "4.\\quad& Q \\\\\n" +
        "5.\\quad& R\n" +
        "\\end{aligned} & \\qquad & \\begin{aligned}\n" +
        "& \\text{Given} \\\\\n" +
        "& \\text{Given} \\\\\n" +
        "& \\text{Given} \\\\\n" +
        "& \\text{Modus Ponens: 1, 2} \\\\\n" +
        "& \\text{Modus Ponens: 4, 3}\n" +
        "\\end{aligned}\n" +
        "\\end{aligned} $$");
  });

  it('proof1 – relative line refs', function() {
    const text = FormalProof(MakeProof([
        ["P", "given (P)"],
        ["P -> Q", "given (P -> Q)"],
        ["Q -> R", "given (Q -> R)"],
        ["Q", "modus ponens ^1 ^2"],
        ["R", "modus ponens ^4 ^3"]
      ]));
    assert.strictEqual(text,
        "$$ \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "1.\\quad& P \\\\\n" +
        "2.\\quad& P \\to Q \\\\\n" +
        "3.\\quad& Q \\to R \\\\\n" +
        "4.\\quad& Q \\\\\n" +
        "5.\\quad& R\n" +
        "\\end{aligned} & \\qquad & \\begin{aligned}\n" +
        "& \\text{Given} \\\\\n" +
        "& \\text{Given} \\\\\n" +
        "& \\text{Given} \\\\\n" +
        "& \\text{Modus Ponens: 1, 2} \\\\\n" +
        "& \\text{Modus Ponens: 4, 3}\n" +
        "\\end{aligned}\n" +
        "\\end{aligned} $$");
  });

  it('proof2', function() {
    const text = FormalProof(MakeProof([
        ["Q", "given (Q)"],
        ["P and Q -> R", "given (P and Q -> R)"],
        [
          ["P", "assumption"],
          ["P and Q", "intro and 3.1 1"],
          ["R", "modus ponens 3.2 2"],
        ],
        ["P -> R", "direct proof (P -> R)"],
      ]));
    assert.strictEqual(text,
        "$$ \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "1.\\quad& Q \\\\\n" +
        "2.\\quad& P \\wedge Q \\to R \\\\\n" +
        "& \\begin{aligned}\n" +
        "3.1.\\quad& P \\\\\n" +
        "3.2.\\quad& P \\wedge Q \\\\\n" +
        "3.3.\\quad& R\n" +
        "\\end{aligned} \\\\\n" +
        "3.\\quad& P \\to R\n" +
        "\\end{aligned} & \\qquad & \\begin{aligned}\n" +
        "& \\qquad \\text{Given} \\\\\n" +
        "& \\qquad \\text{Given} \\\\\n" +
        "& \\text{Assumption} \\\\\n" +
        "& \\text{Intro $\\wedge$: 3.1, 1} \\\\\n" +
        "& \\text{Modus Ponens: 3.2, 2} \\\\\n" +
        "& \\qquad \\text{Direct Proof}\n" +
        "\\end{aligned}\n" +
        "\\end{aligned} $$");
  });

  it('proof2 – relative line refs', function() {
    const text = FormalProof(MakeProof([
        ["Q", "given (Q)"],
        ["P and Q -> R", "given (P and Q -> R)"],
        [
          ["P", "assumption"],
          ["P and Q", "intro and ^1 ^^1"],
          ["R", "modus ponens ^2 ^^2"],
        ],
        ["P -> R", "direct proof (P -> R)"],
      ]));
    assert.strictEqual(text,
        "$$ \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "1.\\quad& Q \\\\\n" +
        "2.\\quad& P \\wedge Q \\to R \\\\\n" +
        "& \\begin{aligned}\n" +
        "3.1.\\quad& P \\\\\n" +
        "3.2.\\quad& P \\wedge Q \\\\\n" +
        "3.3.\\quad& R\n" +
        "\\end{aligned} \\\\\n" +
        "3.\\quad& P \\to R\n" +
        "\\end{aligned} & \\qquad & \\begin{aligned}\n" +
        "& \\qquad \\text{Given} \\\\\n" +
        "& \\qquad \\text{Given} \\\\\n" +
        "& \\text{Assumption} \\\\\n" +
        "& \\text{Intro $\\wedge$: 3.1, 1} \\\\\n" +
        "& \\text{Modus Ponens: 3.2, 2} \\\\\n" +
        "& \\qquad \\text{Direct Proof}\n" +
        "\\end{aligned}\n" +
        "\\end{aligned} $$");
  });

  it('proof3', function() {
    const text = FormalProof(MakeProof([
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
      ]));
    assert.strictEqual(text,
        "$$ \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "1.1.\\quad& (P \\to Q) \\wedge (Q \\to R) \\\\\n" +
        "1.2.\\quad& P \\to Q \\\\\n" +
        "1.3.\\quad& Q \\to R \\\\\n" +
        "& \\begin{aligned}\n" +
        "1.4.1.\\quad& P \\\\\n" +
        "1.4.2.\\quad& Q \\\\\n" +
        "1.4.3.\\quad& R\n" +
        "\\end{aligned} \\\\\n" +
        "1.4.\\quad& P \\to R\n" +
        "\\end{aligned} \\\\\n" +
        "1.\\quad& (P \\to Q) \\wedge (Q \\to R) \\to P \\to R\n" +
        "\\end{aligned} & \\qquad & \\begin{aligned}\n" +
        "& \\qquad \\text{Assumption} \\\\\n" +
        "& \\qquad \\text{Elim $\\wedge$: 1.1} \\\\\n" +
        "& \\qquad \\text{Elim $\\wedge$: 1.1} \\\\\n" +
        "& \\text{Assumption} \\\\\n" +
        "& \\text{Modus Ponens: 1.4.1, 1.2} \\\\\n" +
        "& \\text{Modus Ponens: 1.4.2, 1.3} \\\\\n" +
        "& \\qquad \\text{Direct Proof} \\\\\n" +
        "& \\qquad \\qquad \\text{Direct Proof}\n" +
        "\\end{aligned}\n" +
        "\\end{aligned} $$");
  });

  it('proof4', function() {
    const text = FormalProof(MakeProof([
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
      ]));
    assert.strictEqual(text,
        "$$ \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "1.\\quad& \\forall\\,x, T(x) \\to M(x) \\\\\n" +
        "& \\begin{aligned}\n" +
        "2.1.\\quad& \\exists\\,x, T(x) \\\\\n" +
        "2.2.\\quad& T(g) \\\\\n" +
        "2.3.\\quad& T(g) \\to M(g) \\\\\n" +
        "2.4.\\quad& M(g) \\\\\n" +
        "2.5.\\quad& \\exists\\,y, M(y)\n" +
        "\\end{aligned} \\\\\n" +
        "2.\\quad& (\\exists\\,x, T(x)) \\to (\\exists\\,y, M(y))\n" +
        "\\end{aligned} & \\qquad & \\begin{aligned}\n" +
        "& \\qquad \\text{Given} \\\\\n" +
        "& \\text{Assumption} \\\\\n" +
        "& \\text{Elim $\\exists$: 2.1} \\\\\n" +
        "& \\text{Elim $\\forall$: 1} \\\\\n" +
        "& \\text{Modus Ponens: 2.2, 2.3} \\\\\n" +
        "& \\text{Intro $\\exists$: 2.4} \\\\\n" +
        "& \\qquad \\text{Direct Proof}\n" +
        "\\end{aligned}\n" +
        "\\end{aligned} $$");
  });

  it('proof5', function() {
    const text = FormalProof(MakeProof([
        ["P", "given (P)"],
        ["P -> Q", "cite Thm1"],
        ["Q -> R", "cite Thm2"],
        ["Q", "modus ponens 1 2"],
        ["R", "modus ponens 4 3"]
      ]));
    assert.strictEqual(text,
        "$$ \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "1.\\quad& P \\\\\n" +
        "2.\\quad& P \\to Q \\\\\n" +
        "3.\\quad& Q \\to R \\\\\n" +
        "4.\\quad& Q \\\\\n" +
        "5.\\quad& R\n" +
        "\\end{aligned} & \\qquad & \\begin{aligned}\n" +
        "& \\text{Given} \\\\\n" +
        "& \\text{Cite Thm1} \\\\\n" +
        "& \\text{Cite Thm2} \\\\\n" +
        "& \\text{Modus Ponens: 1, 2} \\\\\n" +
        "& \\text{Modus Ponens: 4, 3}\n" +
        "\\end{aligned}\n" +
        "\\end{aligned} $$");
  });

  it('cases', function() {
    const text2 = FormalProof(MakeProof([
        ["A -> B", "given (A -> B)"],
        ["not A -> B", "given (not A -> B)"],
        ["A or not A", "tautology (A or not A)"],
        ["B", "cases 3 1 2"],
      ]));
    assert.strictEqual(text2,
        "$$ \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "1.\\quad& A \\to B \\\\\n" +
        "2.\\quad& \\neg A \\to B \\\\\n" +
        "3.\\quad& A \\vee \\neg A \\\\\n" +
        "4.\\quad& B\n" +
        "\\end{aligned} & \\qquad & \\begin{aligned}\n" +
        "& \\text{Given} \\\\\n" +
        "& \\text{Given} \\\\\n" +
        "& \\text{Tautology} \\\\\n" +
        "& \\text{Cases: 3, 1, 2}\n" +
        "\\end{aligned}\n" +
        "\\end{aligned} $$");
  });

  it('simple cases', function() {
    const text = FormalProof(MakeProof([
        ["A -> B", "given (A -> B)"],
        ["not A -> B", "given (not A -> B)"],
        ["B", "simple cases 1 2"],
      ]));
    assert.strictEqual(text,
        "$$ \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "1.\\quad& A \\to B \\\\\n" +
        "2.\\quad& \\neg A \\to B \\\\\n" +
        "3.\\quad& B\n" +
        "\\end{aligned} & \\qquad & \\begin{aligned}\n" +
        "& \\text{Given} \\\\\n" +
        "& \\text{Given} \\\\\n" +
        "& \\text{Simple Cases: 1, 2}\n" +
        "\\end{aligned}\n" +
        "\\end{aligned} $$");
  });

  it('contradiction', function () {
    const text = FormalProof(MakeProof([
        ["P", "given (P)"],
        ["not P", "given (not P)"],
        ["false", "contradiction 1 2"]
      ]));
    assert.strictEqual(text,
        "$$ \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "1.\\quad& P \\\\\n" +
        "2.\\quad& \\neg P \\\\\n" +
        "3.\\quad& \\bot\n" +
        "\\end{aligned} & \\qquad & \\begin{aligned}\n" +
        "& \\text{Given} \\\\\n" +
        "& \\text{Given} \\\\\n" +
        "& \\text{Contradiction: 1, 2}\n" +
        "\\end{aligned}\n" +
        "\\end{aligned} $$");
  });

  it('absurdum', function () {
    const text = FormalProof(MakeProof([
        ["P", "given (P)"],
        [
          ["not P", "assumption"],
          ["false", "contradiction 1 ^1"],
        ],
        ["not not P", "absurdum (not not P)"],
      ]));
    assert.strictEqual(text,
        "$$ \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "1.\\quad& P \\\\\n" +
        "& \\begin{aligned}\n" +
        "2.1.\\quad& \\neg P \\\\\n" +
        "2.2.\\quad& \\bot\n" +
        "\\end{aligned} \\\\\n" +
        "2.\\quad& \\neg \\neg P\n" +
        "\\end{aligned} & \\qquad & \\begin{aligned}\n" +
        "& \\qquad \\text{Given} \\\\\n" +
        "& \\text{Assumption} \\\\\n" +
        "& \\text{Contradiction: 1, 2.1} \\\\\n" +
        "& \\qquad \\text{Reductio Ad Absurdum}\n" +
        "\\end{aligned}\n" +
        "\\end{aligned} $$");
  });

  it('exfalso', function () {
    const text = FormalProof(MakeProof([
        ["false", "given (false)"],
        ["forall x, P(x)", "exfalso ^1 (forall x, P(x))"],
      ]));
    assert.strictEqual(text,
        "$$ \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "1.\\quad& \\bot \\\\\n" +
        "2.\\quad& \\forall\\,x, P(x)\n" +
        "\\end{aligned} & \\qquad & \\begin{aligned}\n" +
        "& \\text{Given} \\\\\n" +
        "& \\text{Ex Falso: 1}\n" +
        "\\end{aligned}\n" +
        "\\end{aligned} $$");
  });

  it('verum', function () {
    const text = FormalProof(MakeProof([
        ["true -> P", "given (true -> P)"],
        ["true", "verum"],
        ["P", "modus ponens 2 1"]
      ]));
    assert.strictEqual(text,
        "$$ \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "1.\\quad& \\top \\to P \\\\\n" +
        "2.\\quad& \\top \\\\\n" +
        "3.\\quad& P\n" +
        "\\end{aligned} & \\qquad & \\begin{aligned}\n" +
        "& \\text{Given} \\\\\n" +
        "& \\text{Ad Litteram Verum} \\\\\n" +
        "& \\text{Modus Ponens: 2, 1}\n" +
        "\\end{aligned}\n" +
        "\\end{aligned} $$");
  });

  it('tautology', function() {
    const text = FormalProof(MakeProof([
        ["a - a = 0", "tautology (a-a=0)"],
        ["P or not P", "tautology (P or not P)"],
      ]));
    assert.strictEqual(text,
        "$$ \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "1.\\quad& a - a = 0 \\\\\n" +
        "2.\\quad& P \\vee \\neg P\n" +
        "\\end{aligned} & \\qquad & \\begin{aligned}\n" +
        "& \\text{Tautology} \\\\\n" +
        "& \\text{Tautology}\n" +
        "\\end{aligned}\n" +
        "\\end{aligned} $$");
  });

  it('intro forall – relative lines', function () {
    const text = FormalProof(MakeProof([
        ["forall x, Q(x)", "given (forall x, Q(x))"],
        [
          ["Q(z)", "elim forall ^^1 {z}"],
          ["P(z) or Q(z)", "intro or ^1 (P(z)) left"],
        ],
        ["forall x, P(x) or Q(x)", "intro forall (forall x, P(x) or Q(x)) z"],
      ]));
    assert.strictEqual(text,
        "$$ \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "1.\\quad& \\forall\\,x, Q(x) \\\\\n" +
        "& \\begin{aligned}\n" +
        "& \\text{Let $z$ be arbitrary.} \\\\\n" +
        "2.1.\\quad& Q(z) \\\\\n" +
        "2.2.\\quad& P(z) \\vee Q(z)\n" +
        "\\end{aligned} \\\\\n" +
        "2.\\quad& \\forall\\,x, P(x) \\vee Q(x)\n" +
        "\\end{aligned} & \\qquad & \\begin{aligned}\n" +
        "& \\qquad \\text{Given} \\\\\n" +
        "& \\text{} \\\\\n" +
        "& \\text{Elim $\\forall$: 1} \\\\\n" +
        "& \\text{Intro $\\vee$: 2.1} \\\\\n" +
        "& \\qquad \\text{Intro $\\forall$}\n" +
        "\\end{aligned}\n" +
        "\\end{aligned} $$");
  });

  it('intro forall – multiple variables', function () {
    const text = FormalProof(MakeProof([
        ["forall x, Q(x)", "given (forall x, Q(x))"],
        [
          ["Q(x)", "elim forall ^^1 {x}"],
          ["Q(y)", "elim forall ^^1 {y}"],
          ["Q(x) and Q(y)", "intro and ^1 ^2"],
        ],
        ["forall x, forall y, Q(x) and Q(y)", "intro forall (forall x, forall y, Q(x) and Q(y))"],
      ]));
    assert.strictEqual(text,
        "$$ \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "1.\\quad& \\forall\\,x, Q(x) \\\\\n" +
        "& \\begin{aligned}\n" +
        "& \\text{Let $x$ and $y$ be arbitrary.} \\\\\n" +
        "2.1.\\quad& Q(x) \\\\\n" +
        "2.2.\\quad& Q(y) \\\\\n" +
        "2.3.\\quad& Q(x) \\wedge Q(y)\n" +
        "\\end{aligned} \\\\\n" +
        "2.\\quad& \\forall\\,x, \\forall\\,y, Q(x) \\wedge Q(y)\n" +
        "\\end{aligned} & \\qquad & \\begin{aligned}\n" +
        "& \\qquad \\text{Given} \\\\\n" +
        "& \\text{} \\\\\n" +
        "& \\text{Elim $\\forall$: 1} \\\\\n" +
        "& \\text{Elim $\\forall$: 1} \\\\\n" +
        "& \\text{Intro $\\wedge$: 2.1, 2.2} \\\\\n" +
        "& \\qquad \\text{Intro $\\forall$}\n" +
        "\\end{aligned}\n" +
        "\\end{aligned} $$");

    const text2 = FormalProof(MakeProof([
        ["forall x, Q(x)", "given (forall x, Q(x))"],
        [
          ["Q(x)", "elim forall ^^1 {x}"],
          ["Q(y)", "elim forall ^^1 {y}"],
          ["Q(z)", "elim forall ^^1 {z}"],
          ["Q(x) and Q(y)", "intro and ^1 ^2"],
          ["Q(x) and Q(y) and Q(z)", "intro and ^4 ^3"],
        ],
        ["forall x, forall y, forall z, Q(x) and Q(y) and Q(z)",
         "intro forall (forall x, forall y, forall z, Q(x) and Q(y) and Q(z))"],
      ]));
    assert.strictEqual(text2,
        "$$ \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "1.\\quad& \\forall\\,x, Q(x) \\\\\n" +
        "& \\begin{aligned}\n" +
        "& \\text{Let $x$, $y$, and $z$ be arbitrary.} \\\\\n" +
        "2.1.\\quad& Q(x) \\\\\n" +
        "2.2.\\quad& Q(y) \\\\\n" +
        "2.3.\\quad& Q(z) \\\\\n" +
        "2.4.\\quad& Q(x) \\wedge Q(y) \\\\\n" +
        "2.5.\\quad& Q(x) \\wedge Q(y) \\wedge Q(z)\n" +
        "\\end{aligned} \\\\\n" +
        "2.\\quad& \\forall\\,x, \\forall\\,y, \\forall\\,z, Q(x) \\wedge Q(y) \\wedge Q(z)\n" +
        "\\end{aligned} & \\qquad & \\begin{aligned}\n" +
        "& \\qquad \\text{Given} \\\\\n" +
        "& \\text{} \\\\\n" +
        "& \\text{Elim $\\forall$: 1} \\\\\n" +
        "& \\text{Elim $\\forall$: 1} \\\\\n" +
        "& \\text{Elim $\\forall$: 1} \\\\\n" +
        "& \\text{Intro $\\wedge$: 2.1, 2.2} \\\\\n" +
        "& \\text{Intro $\\wedge$: 2.4, 2.3} \\\\\n" +
        "& \\qquad \\text{Intro $\\forall$}\n" +
        "\\end{aligned}\n" +
        "\\end{aligned} $$");
  });

  it('substitute', function() {
    const text = FormalProof(MakeProof([
        ["a = 3", "given (a = 3)"],
        ["c - a = b", "given (c - a = b)"],
        ["c - 3 = b", "substitute 1 right 2"]
      ]));
    assert.strictEqual(text,
        "$$ \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "1.\\quad& a = 3 \\\\\n" +
        "2.\\quad& c - a = b \\\\\n" +
        "3.\\quad& c - 3 = b\n" +
        "\\end{aligned} & \\qquad & \\begin{aligned}\n" +
        "& \\text{Given} \\\\\n" +
        "& \\text{Given} \\\\\n" +
        "& \\text{Substitute: 1, 2}\n" +
        "\\end{aligned}\n" +
        "\\end{aligned} $$");
  });

  it('cite', function() {
    const text = FormalProof(MakeProof([
        ["P", "given (P)"],
        ["P -> Q", "cite Thm1"],
        ["Q -> R", "cite Thm2"],
        ["Q", "modus ponens 1 2"],
        ["R", "modus ponens 4 3"]
      ]));
    assert.strictEqual(text,
        "$$ \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "1.\\quad& P \\\\\n" +
        "2.\\quad& P \\to Q \\\\\n" +
        "3.\\quad& Q \\to R \\\\\n" +
        "4.\\quad& Q \\\\\n" +
        "5.\\quad& R\n" +
        "\\end{aligned} & \\qquad & \\begin{aligned}\n" +
        "& \\text{Given} \\\\\n" +
        "& \\text{Cite Thm1} \\\\\n" +
        "& \\text{Cite Thm2} \\\\\n" +
        "& \\text{Modus Ponens: 1, 2} \\\\\n" +
        "& \\text{Modus Ponens: 4, 3}\n" +
        "\\end{aligned}\n" +
        "\\end{aligned} $$");
  });

  it('apply', function() {
    const text = FormalProof(MakeProof([
        ["P", "given (P)"],
        ["Q", "apply Thm1 1"],
        ["R", "apply Thm2 2"]
      ]));
    assert.strictEqual(text,
        "$$ \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "1.\\quad& P \\\\\n" +
        "2.\\quad& Q \\\\\n" +
        "3.\\quad& R\n" +
        "\\end{aligned} & \\qquad & \\begin{aligned}\n" +
        "& \\text{Given} \\\\\n" +
        "& \\text{Apply Thm1: 1} \\\\\n" +
        "& \\text{Apply Thm2: 2}\n" +
        "\\end{aligned}\n" +
        "\\end{aligned} $$");
  });

  it('definition', function() {
    const text = FormalProof(MakeProof([
        ["Even(a)", "given (Even(a))"],
        ["exists y, a = 2*y", "defof Even 1"],
        ["a = 2*r", "elim exists 2 r"],
      ]));
    assert.strictEqual(text,
        "$$ \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "1.\\quad& \\textsf{Even}(a) \\\\\n" +
        "2.\\quad& \\exists\\,y, a = 2\\,y \\\\\n" +
        "3.\\quad& a = 2\\,r\n" +
        "\\end{aligned} & \\qquad & \\begin{aligned}\n" +
        "& \\text{Given} \\\\\n" +
        "& \\text{Def of Even: 1} \\\\\n" +
        "& \\text{Elim $\\exists$: 2}\n" +
        "\\end{aligned}\n" +
        "\\end{aligned} $$");
  });

  it('set functions', function() {
    const text = FormalProof(MakeProof([
        ["a in A",      "given (a in A)"],
        ["a in ~B",     "given (a in ~B)"],
        ["not a in B",  "defof Complement 2"],
        ["(a in A) and not (a in B)", "intro and 1 3"],
        ["a in A \\ B", "undef SetDifference 4"],
      ]));
    assert.strictEqual(text,
        "$$ \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "1.\\quad& a \\in A \\\\\n" +
        "2.\\quad& a \\in \\overline{B} \\\\\n" +
        "3.\\quad& \\neg (a \\in B) \\\\\n" +
        "4.\\quad& a \\in A \\wedge \\neg (a \\in B) \\\\\n" +
        "5.\\quad& a \\in A\\,\\setminus\\,B\n" +
        "\\end{aligned} & \\qquad & \\begin{aligned}\n" +
        "& \\text{Given} \\\\\n" +
        "& \\text{Given} \\\\\n" +
        "& \\text{Def of Complement: 2} \\\\\n" +
        "& \\text{Intro $\\wedge$: 1, 3} \\\\\n" +
        "& \\text{Undef SetDifference: 4}\n" +
        "\\end{aligned}\n" +
        "\\end{aligned} $$");
  });

  it('set relations', function() {
    const text = FormalProof(MakeProof([
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
      ]));
    assert.strictEqual(text,
        "$$ \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "1.\\quad& \\forall\\,x, x \\in B \\\\\n" +
        "& \\begin{aligned}\n" +
        "& \\text{Let $x$ be arbitrary.} \\\\\n" +
        "& \\begin{aligned}\n" +
        "2.1.1.\\quad& x \\in A \\\\\n" +
        "2.1.2.\\quad& x \\in B\n" +
        "\\end{aligned} \\\\\n" +
        "2.1.\\quad& x \\in A \\to x \\in B\n" +
        "\\end{aligned} \\\\\n" +
        "2.\\quad& \\forall\\,x, x \\in A \\to x \\in B \\\\\n" +
        "3.\\quad& A \\subseteq B\n" +
        "\\end{aligned} & \\qquad & \\begin{aligned}\n" +
        "& \\qquad \\qquad \\text{Given} \\\\\n" +
        "& \\text{} \\\\\n" +
        "& \\text{Assumption} \\\\\n" +
        "& \\text{Elim $\\forall$: 1} \\\\\n" +
        "& \\qquad \\text{Direct Proof} \\\\\n" +
        "& \\qquad \\qquad \\text{Intro $\\forall$} \\\\\n" +
        "& \\qquad \\qquad \\text{Undef Subset: 2}\n" +
        "\\end{aligned}\n" +
        "\\end{aligned} $$");
  });

  it('algebra', function() {
    const text = FormalProof(MakeProof([
        ["a + b^2 = 3",     "given (a+b^2=3)"],
        ["b^2 + c + 5 = 0", "given (b^2+c+5=0)"],
        ["a - c = 8",       "algebra (a-c=8) 1 2"]
      ]));
    assert.strictEqual(text,
        "$$ \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "1.\\quad& a + b^2 = 3 \\\\\n" +
        "2.\\quad& b^2 + c + 5 = 0 \\\\\n" +
        "3.\\quad& a - c = 8\n" +
        "\\end{aligned} & \\qquad & \\begin{aligned}\n" +
        "& \\text{Given} \\\\\n" +
        "& \\text{Given} \\\\\n" +
        "& \\text{Algebra: 1 2}\n" +
        "\\end{aligned}\n" +
        "\\end{aligned} $$");
  });

  it('induction', function() {
    const text = FormalProof(MakeProof([
        ["Divides(2, 2*0^2 + 2*0)", "given (Divides(2, 2*0^2 + 2*0))"],
        ["forall n, Divides(2, 2*n^2 + 2*n) -> Divides(2, 2*(n + 1)^2 + 2*(n + 1))",
         "given (forall n, Divides(2, 2*n^2 + 2*n) -> Divides(2, 2*(n + 1)^2 + 2*(n + 1)))"],
        ["forall n, 0 <= n -> Divides(2, 2*n^2 + 2*n)", "induction 1 2"],
      ]));
    assert.strictEqual(text,
        "$$ \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "1.\\quad& 2\\ \\mid\\ 2{\\cdot}0^2 + 2{\\cdot}0 \\\\\n" +
        "2.\\quad& \\forall\\,n, 2\\ \\mid\\ 2\\,n^2 + 2\\,n \\to 2\\ \\mid\\ 2\\,(n + 1)^2 + 2\\,(n + 1) \\\\\n" +
        "3.\\quad& \\forall\\,n, 0 \\leq n \\to 2\\ \\mid\\ 2\\,n^2 + 2\\,n\n" +
        "\\end{aligned} & \\qquad & \\begin{aligned}\n" +
        "& \\text{Given} \\\\\n" +
        "& \\text{Given} \\\\\n" +
        "& \\text{Induction: 1, 2}\n" +
        "\\end{aligned}\n" +
        "\\end{aligned} $$");
  });

  it('backward reasoned subproofs', function() {
    const text = FormalProof(MakeProof([
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
      ]));
    assert.strictEqual(text,
        "$$ \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "1.\\quad& \\forall\\,x, P(x) \\wedge Q(x) \\\\\n" +
        "& \\begin{aligned}\n" +
        "& \\text{Let $z$ be arbitrary.} \\\\\n" +
        "2.1.\\quad& P(z) \\wedge Q(z) \\\\\n" +
        "2.2.\\quad& P(z)\n" +
        "\\end{aligned} \\\\\n" +
        "2.\\quad& \\forall\\,x, P(x) \\\\\n" +
        "& \\begin{aligned}\n" +
        "& \\text{Let $z$ be arbitrary.} \\\\\n" +
        "3.1.\\quad& P(z) \\wedge Q(z) \\\\\n" +
        "3.2.\\quad& Q(z)\n" +
        "\\end{aligned} \\\\\n" +
        "3.\\quad& \\forall\\,x, Q(x) \\\\\n" +
        "4.\\quad& (\\forall\\,x, P(x)) \\wedge (\\forall\\,x, Q(x))\n" +
        "\\end{aligned} & \\qquad & \\begin{aligned}\n" +
        "& \\qquad \\text{Given} \\\\\n" +
        "& \\text{} \\\\\n" +
        "& \\text{Elim $\\forall$: 1} \\\\\n" +
        "& \\text{Elim $\\wedge$: 2.1} \\\\\n" +
        "& \\qquad \\text{Intro $\\forall$} \\\\\n" +
        "& \\text{} \\\\\n" +
        "& \\text{Elim $\\forall$: 1} \\\\\n" +
        "& \\text{Elim $\\wedge$: 3.1} \\\\\n" +
        "& \\qquad \\text{Intro $\\forall$} \\\\\n" +
        "& \\qquad \\text{Intro $\\wedge$: 2, 3}\n" +
        "\\end{aligned}\n" +
        "\\end{aligned} $$");
  });

  it('constants', function() {
    const text = FormalProof(MakeProof([
        ["4 * 0 = 0",     "algebra (4*0=0)"],
        ["4 * (-0) = 0",  "algebra (4*(-0)=0)"],
        ["4 * 0^2 = 0",   "algebra (4*0^2=0)"],
      ]));
    assert.strictEqual(text,
        "$$ \\begin{aligned}\n" +
        "& \\begin{aligned}\n" +
        "1.\\quad& 4{\\cdot}0 = 0 \\\\\n" +
        "2.\\quad& 4\\,(-0) = 0 \\\\\n" +
        "3.\\quad& 4{\\cdot}0^2 = 0\n" +
        "\\end{aligned} & \\qquad & \\begin{aligned}\n" +
        "& \\text{Algebra} \\\\\n" +
        "& \\text{Algebra} \\\\\n" +
        "& \\text{Algebra}\n" +
        "\\end{aligned}\n" +
        "\\end{aligned} $$");
  });
});
