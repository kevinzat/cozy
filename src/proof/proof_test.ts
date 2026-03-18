import * as assert from 'assert';
import { Proposition } from '../facts/props';
import { ParseProp } from '../facts/props_parser';
import { SubproofEnv, TopLevelEnv } from '../infer/env';
import { Assumption } from '../infer/rules';
import {
    AbsToRelLineRef, RelToAbsLineRef, GetProofContaining, GetDepth, GetLine,
    InvalidLineRef, Proof, AddLine, CreateSubproof, ProofFromJson,
    InvalidForwardStep, IsComplete, ProofToJson
  } from './proof';
import * as ast from '../infer/rules_ast';
import * as sets from '../infer/sets';
import * as ints from '../infer/integers';
import { ParseForwardRule } from '../infer/infer_forward';


// Fake proof used to test the various functions on proof stacks.
const EX_PROOFS: Proof[] = [
  {lines: [
    {rule: 'A'},
    {rule: 'B', sub: {lines: [
        {rule: 'C'},
        {rule: 'D'},
        {rule: 'E', sub: {lines: [
            {rule: 'F'}
        ]}}
      ]}},
    {rule: 'G'}
  ]},
  {lines: [
    {rule: 'H', sub: {lines: [
        {rule: 'I'}
    ]}},
    {rule: 'J'},
  ]},
  {lines: [
      {rule: 'K'},
      {rule: 'L', sub: {lines: [
          {rule: 'M'},
          {rule: 'N'},
          {rule: 'O'}
      ]}},
      {rule: 'P'},
      {rule: 'Q'}
  ]},
  {lines: [
      {rule: 'R'},
      {rule: 'S'},
      {rule: 'T'}
  ]},
] as any;


/**
 * Checks that a proof, given as JSON, is valid and complete and that it
 * converts back into the same JSON.
 */
function CheckProof(desc: any,
    extraDefs?: [string, Proposition][], extraThms?: [string, Proposition][]): void {
  const proof = MakeProof(desc, extraDefs, extraThms);
  const concl = ParseProp(desc[desc.length-1][0]);
  assert.ok(IsComplete(proof, concl));

  assert.deepStrictEqual(ProofToJson(proof), desc);
}

/** Parses the given JSON into a proof using the standard top-level environment. */
function MakeProof(desc: any,
    extraDefs?: [string, Proposition][], extraThms?: [string, Proposition][]): Proof {
  const defs = sets.DEFINITIONS.concat(ints.DEFINITIONS);
  const thms = ints.THEOREMS;
  const env = new TopLevelEnv(
      extraDefs ? defs.concat(extraDefs) : defs,
      extraThms ? thms.concat(extraThms) : thms,
      undefined, ["a", "b", "c", "d", "n", "m", "p", "q", "r", "A", "B", "C"]);
  try {
    return ProofFromJson(env, desc);
  } catch (e) {
    if (e instanceof InvalidForwardStep)
      assert.strictEqual(e.actProp.to_string(), e.expProp.to_string());
    throw e;
  }
}


describe('proof', function() {

  it('AbsToRelLineRef', function() {
    assert.deepStrictEqual(AbsToRelLineRef(3, [1, 4, 3]), {up: 1, lineNum: 3});
    assert.deepStrictEqual(AbsToRelLineRef(3, [1, 4]), {up: 2, lineNum: 4});
    assert.deepStrictEqual(AbsToRelLineRef(3, [1]), {up: 3, lineNum: 1});
    assert.throws(() => AbsToRelLineRef(2, [1, 1, 1]));
  });

  it('RelToAbsLineRef', function() {
    assert.deepStrictEqual(RelToAbsLineRef([2, 4, 3], {up: 1, lineNum: 2}), [2, 4, 2]);
    assert.deepStrictEqual(RelToAbsLineRef([2, 4, 3], {up: 2, lineNum: 3}), [2, 3]);
    assert.deepStrictEqual(RelToAbsLineRef([2, 4, 3], {up: 3, lineNum: 1}), [1]);
    assert.throws(() => RelToAbsLineRef([2, 4, 3], {up: 4, lineNum: 1}));
  });

  it('GetProofContaining', function() {
    assert.strictEqual(GetProofContaining(EX_PROOFS, [1]), EX_PROOFS[0]);
    assert.strictEqual(GetProofContaining(EX_PROOFS, [4]), EX_PROOFS[0]);

    assert.throws(() => GetProofContaining(EX_PROOFS, [2, 1]), InvalidLineRef);
    assert.throws(() => GetProofContaining(EX_PROOFS, [2, 2]), InvalidLineRef);
    assert.throws(() => GetProofContaining(EX_PROOFS, [2, 3, 1]), InvalidLineRef);

    assert.strictEqual(GetProofContaining(EX_PROOFS, [4, 1]), EX_PROOFS[1]);
    assert.strictEqual(GetProofContaining(EX_PROOFS, [4, 2]), EX_PROOFS[1]);

    assert.throws(() => GetProofContaining(EX_PROOFS, [4, 1, 1]), InvalidLineRef);

    assert.strictEqual(GetProofContaining(EX_PROOFS, [4, 3, 1]), EX_PROOFS[2]);
    assert.strictEqual(GetProofContaining(EX_PROOFS, [4, 3, 4]), EX_PROOFS[2]);

    assert.throws(() => GetProofContaining(EX_PROOFS, [4, 3, 2, 1]), InvalidLineRef);
    assert.throws(() => GetProofContaining(EX_PROOFS, [4, 3, 2, 3]), InvalidLineRef);

    assert.strictEqual(GetProofContaining(EX_PROOFS, [4, 3, 5, 1]), EX_PROOFS[3]);
    assert.strictEqual(GetProofContaining(EX_PROOFS, [4, 3, 5, 3]), EX_PROOFS[3]);
  });

  it('GetLine – absolute', function() {
    assert.throws(() => GetLine(EX_PROOFS, [0]), InvalidLineRef);
    assert.deepStrictEqual(GetLine(EX_PROOFS, [1]), 'A');

    assert.deepStrictEqual(GetLine(EX_PROOFS, [2]), 'B');
    assert.throws(() => GetLine(EX_PROOFS, [2, 0]), InvalidLineRef);
    assert.throws(() => GetLine(EX_PROOFS, [2, 1]), InvalidLineRef);
    assert.throws(() => GetLine(EX_PROOFS, [2, 2]), InvalidLineRef);
    assert.throws(() => GetLine(EX_PROOFS, [2, 3, 1]), InvalidLineRef);
    assert.throws(() => GetLine(EX_PROOFS, [2, 4]), InvalidLineRef);

    assert.deepStrictEqual(GetLine(EX_PROOFS, [3]), 'G');
    assert.throws(() => GetLine(EX_PROOFS, [3, 1]), InvalidLineRef);

    assert.throws(() => GetLine(EX_PROOFS, [4]), InvalidLineRef);
    assert.throws(() => GetLine(EX_PROOFS, [4, 0]), InvalidLineRef);
    assert.deepStrictEqual(GetLine(EX_PROOFS, [4, 1]), 'H');
    assert.throws(() => GetLine(EX_PROOFS, [4, 1, 0]), InvalidLineRef);
    assert.throws(() => GetLine(EX_PROOFS, [4, 1, 1]), InvalidLineRef);
    assert.throws(() => GetLine(EX_PROOFS, [4, 1, 2]), InvalidLineRef);
    assert.deepStrictEqual(GetLine(EX_PROOFS, [4, 2]), 'J');

    assert.throws(() => GetLine(EX_PROOFS, [4, 3]), InvalidLineRef);
    assert.throws(() => GetLine(EX_PROOFS, [4, 3, 0]), InvalidLineRef);
    assert.deepStrictEqual(GetLine(EX_PROOFS, [4, 3, 1]), 'K');
    assert.deepStrictEqual(GetLine(EX_PROOFS, [4, 3, 2]), 'L');
    assert.throws(() => GetLine(EX_PROOFS, [4, 3, 2, 1]), InvalidLineRef);
    assert.throws(() => GetLine(EX_PROOFS, [4, 3, 2, 3]), InvalidLineRef);
    assert.deepStrictEqual(GetLine(EX_PROOFS, [4, 3, 3]), 'P');
    assert.deepStrictEqual(GetLine(EX_PROOFS, [4, 3, 4]), 'Q');

    assert.throws(() => GetLine(EX_PROOFS, [4, 3, 5]), InvalidLineRef);
    assert.throws(() => GetLine(EX_PROOFS, [4, 3, 5, 0]), InvalidLineRef);
    assert.deepStrictEqual(GetLine(EX_PROOFS, [4, 3, 5, 1]), 'R');
    assert.deepStrictEqual(GetLine(EX_PROOFS, [4, 3, 5, 2]), 'S');
    assert.deepStrictEqual(GetLine(EX_PROOFS, [4, 3, 5, 3]), 'T');
    assert.throws(() => GetLine(EX_PROOFS, [4, 3, 5, 4]), InvalidLineRef);

    assert.throws(() => GetLine(EX_PROOFS, [4, 3, 6]), InvalidLineRef);
    assert.throws(() => GetLine(EX_PROOFS, [4, 4]), InvalidLineRef);
    assert.throws(() => GetLine(EX_PROOFS, [5]), InvalidLineRef);
  });

  it('GetLine – relative', function() {
    assert.throws(() => GetLine(EX_PROOFS, {up: 1, lineNum: 0}), InvalidLineRef);
    assert.deepStrictEqual(GetLine(EX_PROOFS, {up: 1, lineNum: 1}), 'R');
    assert.deepStrictEqual(GetLine(EX_PROOFS, {up: 1, lineNum: 2}), 'S');
    assert.deepStrictEqual(GetLine(EX_PROOFS, {up: 1, lineNum: 3}), 'T');
    assert.throws(() => GetLine(EX_PROOFS, {up: 1, lineNum: 4}), InvalidLineRef);

    assert.throws(() => GetLine(EX_PROOFS, {up: 2, lineNum: 0}), InvalidLineRef);
    assert.deepStrictEqual(GetLine(EX_PROOFS, {up: 2, lineNum: 1}), 'K');
    assert.deepStrictEqual(GetLine(EX_PROOFS, {up: 2, lineNum: 2}), 'L');
    assert.deepStrictEqual(GetLine(EX_PROOFS, {up: 2, lineNum: 3}), 'P');
    assert.deepStrictEqual(GetLine(EX_PROOFS, {up: 2, lineNum: 4}), 'Q');
    assert.throws(() => GetLine(EX_PROOFS, {up: 2, lineNum: 5}), InvalidLineRef);

    assert.throws(() => GetLine(EX_PROOFS, {up: 3, lineNum: 0}), InvalidLineRef);
    assert.deepStrictEqual(GetLine(EX_PROOFS, {up: 3, lineNum: 1}), 'H');
    assert.deepStrictEqual(GetLine(EX_PROOFS, {up: 3, lineNum: 2}), 'J');
    assert.throws(() => GetLine(EX_PROOFS, {up: 3, lineNum: 3}), InvalidLineRef);

    assert.throws(() => GetLine(EX_PROOFS, {up: 4, lineNum: 0}), InvalidLineRef);
    assert.deepStrictEqual(GetLine(EX_PROOFS, {up: 4, lineNum: 1}), 'A');
    assert.deepStrictEqual(GetLine(EX_PROOFS, {up: 4, lineNum: 2}), 'B');
    assert.deepStrictEqual(GetLine(EX_PROOFS, {up: 4, lineNum: 3}), 'G');
    assert.throws(() => GetLine(EX_PROOFS, {up: 4, lineNum: 4}), InvalidLineRef);

    assert.throws(() => GetLine(EX_PROOFS, {up: 5, lineNum: 1}), InvalidLineRef);
  });

  it('AddLine', function() {
    const env = new TopLevelEnv([], []);
    const proofs: Proof[] = [{env, lines: []}];

    AddLine(proofs, "given (T or Q)", undefined, true);
    AddLine(proofs, "given (Q -> R)", undefined, true);
    AddLine(proofs, "given (R -> S)", undefined, true);
    assert.strictEqual(proofs[0].lines.length, 3);
    assert.ok(proofs[0].lines[0].parsed instanceof ast.GivenAst)
    assert.ok(proofs[0].lines[1].parsed instanceof ast.GivenAst)
    assert.ok(proofs[0].lines[2].parsed instanceof ast.GivenAst)

    const sub1 = new SubproofEnv(env, ParseProp("S"), ParseProp("not T"));
    proofs.push({env: sub1, lines: [
        {parsed: new ast.AssumptionAst(ParseProp("not T")),
         rule: new Assumption(sub1, ParseProp("not T"))}
      ]});

    AddLine(proofs, "elim or 1 4.1", undefined, true);
    assert.strictEqual(proofs[1].lines.length, 2);
    assert.ok(proofs[1].lines[1].parsed instanceof ast.ElimOrAst)
    if (proofs[1].lines[1].parsed instanceof ast.ElimOrAst) {
      assert.ok(ast.isRelLineRef(proofs[1].lines[1].parsed.ref1))
      assert.ok(ast.isRelLineRef(proofs[1].lines[1].parsed.ref2))
    }
    assert.strictEqual(proofs[1].lines[1].rule.apply().to_string(), "Q");

    AddLine(proofs, "modus ponens ^2 ^^2", undefined, true);
    assert.strictEqual(proofs[1].lines.length, 3);
    assert.ok(proofs[1].lines[2].parsed instanceof ast.ModusPonensAst)
    if (proofs[1].lines[2].parsed instanceof ast.ModusPonensAst) {
      assert.ok(ast.isRelLineRef(proofs[1].lines[2].parsed.ref1))
      assert.ok(ast.isRelLineRef(proofs[1].lines[2].parsed.ref2))
    }
    assert.strictEqual(proofs[1].lines[2].rule.apply().to_string(), "R");

    AddLine(proofs, "modus ponens 4.3 3", undefined, true);
    assert.strictEqual(proofs[1].lines.length, 4);
    assert.ok(proofs[1].lines[3].parsed instanceof ast.ModusPonensAst)
    if (proofs[1].lines[3].parsed instanceof ast.ModusPonensAst) {
      assert.ok(ast.isRelLineRef(proofs[1].lines[3].parsed.ref1))
      assert.ok(ast.isRelLineRef(proofs[1].lines[3].parsed.ref2))
    }
    assert.strictEqual(proofs[1].lines[3].rule.apply().to_string(), "S");

    AddLine(proofs, "direct proof (not T -> S)", proofs.pop(), true);
    assert.strictEqual(proofs.length, 1);
    assert.strictEqual(proofs[0].lines.length, 4);
    assert.ok(proofs[0].lines[3].parsed instanceof ast.DirectProofAst)
  });

  it('CreateSubproof', function() {
    const proofs: Proof[] = [{env: new TopLevelEnv([], []), lines: []}];

    proofs.push(CreateSubproof(proofs[0].env, ParseForwardRule(
        "direct proof (((P -> Q) and (Q -> R)) -> P -> R)")));

    AddLine(proofs, "elim and 1.1 left");
    assert.strictEqual(proofs[1].lines.length, 2);
    assert.strictEqual(proofs[1].lines[1].rule.apply().to_string(), "P -> Q");

    AddLine(proofs, "elim and ^1 right");
    assert.strictEqual(proofs[1].lines.length, 3);
    assert.strictEqual(proofs[1].lines[2].rule.apply().to_string(), "Q -> R");

    proofs.push(CreateSubproof(proofs[1].env,
        ParseForwardRule("direct proof (P -> R)")));

    AddLine(proofs, "modus ponens 1.4.1 ^^2");
    assert.strictEqual(proofs[2].lines.length, 2);
    assert.strictEqual(proofs[2].lines[1].rule.apply().to_string(), "Q");

    AddLine(proofs, "modus ponens ^2 1.3");
    assert.strictEqual(proofs[2].lines.length, 3);
    assert.strictEqual(proofs[2].lines[2].rule.apply().to_string(), "R");

    AddLine(proofs, "direct proof (P -> R)", proofs.pop());
    assert.strictEqual(proofs.length, 2);
    assert.strictEqual(proofs[1].lines.length, 4);

    AddLine(proofs, "direct proof (((P -> Q) and (Q -> R)) -> P -> R)", proofs.pop());
    assert.strictEqual(proofs.length, 1);
    assert.strictEqual(proofs[0].lines.length, 1);
  });

  it('GetDepth', function() {
    assert.strictEqual(GetDepth(
        {lines: [{}, {}, {}]} as any), 0);
    assert.strictEqual(GetDepth(
        {lines: [{}, {}, {sub: {lines: [{}, {}]}}]} as any), 1);
    assert.strictEqual(GetDepth(
        {lines: [{sub: {lines: [{}, {}]}}, {}, {}]} as any), 1);
    assert.strictEqual(GetDepth(
        {lines: [{sub: {lines: [{}, {}]}}, {}, {sub: {lines: [{}]}}]} as any), 1);
    assert.strictEqual(GetDepth(
        {lines: [{sub: {lines: [{}, {}]}}, {},
            {sub: {lines: [{}, {sub: {lines: [{}]}}, {}]}}]} as any), 2);
    assert.strictEqual(GetDepth(
        {lines: [{}, {sub: {lines: [{}, {}, {sub: {lines: []}}]}}, {} ]} as any), 2);
  });

  it('IsComplete ', function() {
    // NOTE: all the tests after this one check complete proofs, so here, we
    // just include some tests of incomplete proofs.

    const proof1 = MakeProof([
        ["P", "given (P)"],
        ["P -> Q", "given (P -> Q)"],
        ["Q -> R", "given (Q -> R)"],
        ["Q", "modus ponens 1 2"],
    ]);
    assert.strictEqual(IsComplete(proof1, ParseProp("R")), false)

    const proof2 = MakeProof([
      [
        ["(P -> Q) and (Q -> R)", "assumption"],
        ["P -> Q", "elim and 1.1 left"],
        ["Q -> R", "elim and 1.1 right"],
        [
          ["P", "assumption"],
          ["Q", "modus ponens 1.4.1 1.2"],
        ],
        ["P -> R", "direct proof (P -> R)"]
      ],
      ["((P -> Q) and (Q -> R)) -> P -> R",
       "direct proof (((P -> Q) and (Q -> R)) -> P -> R)"]
    ]);
    assert.strictEqual(
        IsComplete(proof2, ParseProp("((P -> Q) and (Q -> R)) -> P -> R")), false)
  });

  // Examples from lectures:

  it('ProofFromJson – prop proof 1', function() {
    CheckProof([
        ["P", "given (P)"],
        ["P -> Q", "given (P -> Q)"],
        ["Q -> R", "given (Q -> R)"],
        ["Q", "modus ponens 1 2"],
        ["R", "modus ponens 4 3"]
      ]);
  });

  it('ProofFromJson – prop proof2', function() {
    CheckProof([
      ["P -> Q", "given (P -> Q)"],
      ["not Q", "given (not Q)"],
      ["not Q -> not P", "equivalent 1 (not Q -> not P)"],
      ["not P", "modus ponens 2 3"],
    ]);
  });

  it('ProofFromJson – prop proof3', function() {
    CheckProof([
      ["P", "given (P)"],
      ["P -> Q", "given (P -> Q)"],
      ["Q", "modus ponens 1 2"],
      ["P and Q", "intro and 1 3"],
      ["P and Q -> R", "given (P and Q -> R)"],
      ["R", "modus ponens 4 5"],
    ]);
  });

  it('ProofFromJson – prop proof4', function() {
    CheckProof([
      ["P and S", "given (P and S)"],
      ["Q -> not R", "given (Q -> not R)"],
      ["not S or Q", "given (not S or Q)"],
      ["S", "elim and 1 right"],
      ["not not S", "equivalent 4 (not not S)"],
      ["Q", "elim or 3 5"],
      ["not R", "modus ponens 6 2"],
    ]);
  });

  it('ProofFromJson – prop proof5', function() {
    CheckProof([
      [
        ["P", "assumption"],
        ["P or Q", "intro or 1.1 (Q) right"],
      ],
      ["P -> P or Q", "direct proof (P -> P or Q)"],
    ]);
  });

  it('ProofFromJson – prop proof6', function() {
    CheckProof([
      ["Q", "given (Q)"],
      ["P and Q -> R", "given (P and Q -> R)"],
      [
        ["P", "assumption"],
        ["P and Q", "intro and 3.1 1"],
        ["R", "modus ponens 3.2 2"],
      ],
      ["P -> R", "direct proof (P -> R)"],
    ]);
  });

  it('ProofFromJson – prop proof7', function() {
    CheckProof([
      [
        ["P and Q", "assumption"],
        ["P", "elim and 1.1 left"],
        ["P or Q", "intro or 1.2 (Q) right"],
      ],
      ["P and Q -> P or Q", "direct proof (P and Q -> P or Q)"]
    ]);
  });

  // Examples from section03

  it('ProofFromJson – prop proof8', function() {
    CheckProof([
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
      ["(P -> Q) and (Q -> R) -> P -> R",
       "direct proof ((P -> Q) and (Q -> R) -> P -> R)"]
    ]);
  });

  it('ProofFromJson – prop proof9', function() {
    CheckProof([
      ["T or Q", "given (T or Q)"],
      ["Q -> R", "given (Q -> R)"],
      ["R -> S", "given (R -> S)"],
      [
        ["not T", "assumption"],
        ["Q", "elim or 1 4.1"],
        ["R", "modus ponens 4.2 2"],
        ["S", "modus ponens 4.3 3"],
      ],
      ["not T -> S", "direct proof (not T -> S)"],
    ]);
  });

  it('ProofFromJson – prop simple cases', function() {
    CheckProof([
      ["P -> Q", "given (P -> Q)"],
      ["not P -> Q", "given (not P -> Q)"],
      ["Q", "simple cases 1 2"],
    ]);
    CheckProof([
      ["P -> Q", "given (P -> Q)"],
      ["not P -> Q", "given (not P -> Q)"],
      ["Q", "simple cases 2 1"],
    ]);
  });

  // Examples from section04

  it('ProofFromJson – prop proof10', function() {
    CheckProof([
      ["not (not R or T)", "given (not (not R or T))"],
      ["not Q or not S", "given (not Q or not S)"],
      ["(P -> Q) and (R -> S)", "given ((P -> Q) and (R -> S))"],
      ["not not R and not T", "equivalent 1 (not not R and not T)"],
      ["not not R", "elim and 4 left"],
      ["R", "equivalent 5 (R)"],
      ["R -> S", "elim and 3 right"],
      ["S", "modus ponens 6 7"],
      ["not not S", "equivalent 8 (not not S)"],
      ["not Q", "elim or 2 9"],
      ["P -> Q", "elim and 3 left"],
      ["not Q -> not P", "equivalent 11 (not Q -> not P)"],
      ["not P", "modus ponens 10 12"],
    ]);
  });

  it('ProofFromJson – pred proof1', function() {
    CheckProof([
      ["forall x, T(x) -> M(x)", "given (forall x, T(x) -> M(x))"],
      [
        ["exists x, T(x)", "assumption"],
        ["T(z)", "elim exists 2.1 z"],
        ["T(z) -> M(z)", "elim forall 1 {z}"],
        ["M(z)", "modus ponens 2.2 2.3"],
        ["exists y, M(y)", "intro exists 2.4 {z} y"],
      ],
      ["(exists x, T(x)) -> (exists y, M(y))",
       "direct proof ((exists x, T(x)) -> (exists y, M(y)))"]
    ]);
  });

  it('ProofFromJson – pred proof2', function() {
    CheckProof([
      ["forall x, P(x) or Q(x)", "given (forall x, P(x) or Q(x))"],
      ["forall y, not Q(y) or R(y)", "given (forall y, not Q(y) or R(y))"],
      ["P(a) or Q(a)", "elim forall 1 {a}"],
      ["not Q(a) or R(a)", "elim forall 2 {a}"],
      ["Q(a) -> R(a)", "equivalent 4 (Q(a) -> R(a))"],
      ["not P(a) -> Q(a)", "equivalent 3 (not P(a) -> Q(a))"],
      [
        ["not P(a)", "assumption"],
        ["Q(a)", "modus ponens 7.1 6"],
        ["R(a)", "modus ponens 7.2 5"],
      ],
      ["not P(a) -> R(a)", "direct proof (not P(a) -> R(a))"],
      ["P(a) or R(a)", "equivalent 7 (P(a) or R(a))"],
      ["exists x, P(x) or R(x)", "intro exists 8 {a} x"],
    ]);
  });

  // Examples from HW3

  it('ProofFromJson – 21au HW3 4(a)', function() {
    CheckProof([
      ["R and S",       "given (R and S)"],
      ["R -> T",        "given (R -> T)"],
      ["T -> U and V",  "given (T -> U and V)"],
      ["R",             "elim and 1 left"],
      ["T",             "modus ponens 4 2"],
      ["U and V",       "modus ponens 5 3"],
      ["V",             "elim and 6 right"],
      ["S",             "elim and 1 right"],
      ["S and V",       "intro and 8 7"],
    ]);
  });

  it('ProofFromJson – 21au HW3 4(b)', function() {
    CheckProof([
      ["not R -> S",                  "given (not R -> S)"],
      ["not not R or S",              "equivalent 1 (not not R or S)"],
      ["R or S",                      "equivalent 2 (R or S)"],
      ["S or R",                      "equivalent 3 (S or R)"],
      ["R -> S",                      "given (R -> S)"],
      ["not R or S",                  "equivalent 5 (not R or S)"],
      ["S or not R",                  "equivalent 6 (S or not R)"],
      ["(S or R) and (S or not R)",   "intro and 4 7"],
      ["S or R and not R",            "equivalent 8 (S or R and not R)"],
      ["S or false",                  "equivalent 9 (S or false)"],
      ["S",                           "equivalent 10 (S)"],
      ["S or T",                      "intro or 11 (T) right"],
    ]);
  });

  it('ProofFromJson – 21au HW3 4(c)', function() {
    CheckProof([
      ["P -> R and not S",    "given (P -> R and not S)"],
      ["S or T",              "given (S or T)"],
      ["R and T -> U",        "given (R and T -> U)"],
      ["T or S",              "equivalent 2 (T or S)"],
      [
        ["P",                 "assumption"],
        ["R and not S",       "modus ponens 5.1 1"],
        ["not S",             "elim and 5.2 right"],
        ["T",                 "elim or 2 5.3"],
        ["R",                 "elim and 5.2 left"],
        ["R and T",           "intro and 5.5 5.4"],
        ["U",                 "modus ponens 5.6 3"],
      ],
      ["P -> U",              "direct proof (P -> U)"],
    ]);
  });

  it('ProofFromJson – 21au HW3 4(d)', function() {
    CheckProof([
      ["P -> S <-> T",                "given (P -> S <-> T)"],
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
      ["(P and S -> P and T) and (P and T -> P and S)",
                                      "intro and 2 3"],
      ["P and S <-> P and T",         "equivalent 4 (P and S <-> P and T)"],
    ]);
  });

  it('ProofFromJson – 21au HW3 5(a)', function() {
    CheckProof([
      ["R and (S or T)",    "given (R and (S or T))"],
      ["S -> T and U",      "given (S -> T and U)"],
      ["T -> T and U",      "given (T -> T and U)"],
      ["S or T",            "elim and 1 right"],
      ["T and U",           "cases 4 2 3"],
      ["U",                 "elim and 5 right"],
      ["U or V",            "intro or 6 (V) right"],
      ["R",                 "elim and 1 left"],
      ["R and (U or V)",    "intro and 8 7"],
    ]);
  });

  it('ProofFromJson – 21au HW3 5(b)', function() {
    CheckProof([
      ["P or R",        "given (P or R)"],
      ["not P",         "given (not P)"],
      ["not P or R",    "intro or 2 (R) right"],
      ["P -> R",        "equivalent 3 (P -> R)"],
      ["R or not R",    "tautology (R or not R)"],
      ["not R or R",    "equivalent 5 (not R or R)"],
      ["R -> R",        "equivalent 6 (R -> R)"],
      ["R",             "cases 1 4 7"],
    ]);
  });

  it('ProofFromJson – 21au HW3 6(a)', function() {
    CheckProof([
      ["exists x, forall y, P(x, y)",   "given (exists x, forall y, P(x, y))"],
      ["forall y, P(g, y)",             "elim exists 1 g"],
      [
        ["P(g, y)",                     "elim forall 2 {y}"],
        ["exists x, P(x, y)",           "intro exists 3.1 {g} x"],
      ],
      ["forall y, exists x, P(x, y)",   "intro forall (forall y, exists x, P(x, y))"],
    ]);
  });

  it('ProofFromJson – 21au HW3 6(b)', function() {
    CheckProof([
      ["forall x, Q(x) -> (forall y, P(x, y))",
           "given (forall x, Q(x) -> (forall y, P(x, y)))"],
      ["Q(c) -> (forall y, P(c, y))",
           "elim forall 1 {c}"],
      ["not Q(c) or (forall y, P(c, y))",
           "equivalent 2 (not Q(c) or (forall y, P(c, y)))"],
      ["(forall y, P(c, y)) or not Q(c)",
           "equivalent 3 ((forall y, P(c, y)) or not Q(c))"],
      ["not P(c, c)",
           "given (not P(c, c))"],
      ["exists y, not P(c, y)",
           "intro exists 5 {c} y (exists y, not P(c, y))"],
      ["not (forall y, P(c, y))",
           "equivalent 6 (not (forall y, P(c, y)))"],
      ["not Q(c)",
           "elim or 3 7"],
    ]);
  });

  it('ProofFromJson – 21au HW3 6(c)', function() {
    CheckProof([
      ["forall y, P(c, y)",                   "given (forall y, P(c, y))"],
      ["forall x, Q(x) -> P(x, c)",           "given (forall x, Q(x) -> P(x, c))"],
      [
        [
          ["Q(x)",                            "assumption"],
          ["P(c, x)",                         "elim forall 1 {x}"],
          ["Q(x) -> P(x, c)",                 "elim forall 2 {x}"],
          ["P(x, c)",                         "modus ponens 3.1.1 3.1.3"],
          ["P(x, c) and P(c, x)",             "intro and 3.1.4 3.1.2"],
          ["exists y, P(x, y) and P(y, x)",   "intro exists 3.1.5 {c} y"],
        ],
        ["Q(x) -> (exists y, P(x, y) and P(y, x))",
             "direct proof (Q(x) -> (exists y, P(x, y) and P(y, x)))"]
      ],
      ["forall x, Q(x) -> (exists y, P(x, y) and P(y, x))",
           "intro forall (forall x, Q(x) -> (exists y, P(x, y) and P(y, x)))"],
    ]);
  });

  it('ProofFromJson – Even Steven', function() {
    CheckProof([
      ["Even(a + b)",             "given (Even(a + b))"],
      ["Even(b + c)",             "given (Even(b + c))"],
      ["exists k, a + b = 2*k",   "defof Even 1 (exists k, a + b = 2*k)"],
      ["a + b = 2*s",             "elim exists 3 s"],
      ["exists k, b + c = 2*k",   "defof Even 2 (exists k, b + c = 2*k)"],
      ["b + c = 2*t",             "elim exists 5 t"],
      ["a + c = 2*(s + t - b)",   "algebra (a + c = 2*(s + t - b)) 4 6"],
      ["exists k, a + c = 2*k",   "intro exists 7 {s + t - b} k"],
      ["Even(a + c)",             "undef Even 8"]
    ]);
  });

  it('ProofFromJson – Six and Stones', function() {
    CheckProof([
      [
        [
          ["DivBySix(h)",           "assumption"],
          ["exists k, h = 6*k",     "defof DivBySix 1.1.1 (exists k, h = 6*k)"],
          ["h = 6*j",               "elim exists 1.1.2 j"],
          ["h = 2*(3*j)",           "algebra (h = 2*(3*j)) 1.1.3"],
          ["exists k, h = 2*k",     "intro exists 1.1.4 {3*j} k (exists k, h = 2*k)"],
          ["Even(h)",               "undef Even 1.1.5"]
        ],
        ["DivBySix(h) -> Even(h)",  "direct proof (DivBySix(h) -> Even(h))"],
      ],
      ["forall n, DivBySix(n) -> Even(n)",
          "intro forall (forall n, DivBySix(n) -> Even(n)) h"]
    ], [
      ["DivBySix", ParseProp("forall x, DivBySix(x) <-> (exists y, x = 6*y)")]
    ]);
  });

  it('ProofFromJson – Back to Square One', function() {
    CheckProof([
      ["Square(n)",             "given (Square(n))"],
      ["exists k, n = k*k",     "defof Square 1 (exists k, n = k*k)"],
      ["n = s*s",               "elim exists 2 s"],
      ["Square(m)",             "given (Square(m))"],
      ["exists k, m = k*k",     "defof Square 4 (exists k, m = k*k)"],
      ["m = t*t",               "elim exists 5 t"],
      ["n = s*s and m = t*t",   "intro and 3 6"],
      ["n*m = s*s*(t*t)",         "apply MultEqns 7 {n, s*s, m, t*t}"],
      ["n*m = s*t*(s*t)",       "algebra (n*m = s*t*(s*t)) 8"],
      ["exists k, n*m = k*k",   "intro exists 9 {s*t} k (exists k, n*m = k*k)"],
      ["Square(n*m)",           "undef Square 10"]
    ], [
      ["Square", ParseProp("forall x, Square(x) <-> (exists y, x = y*y)")],
    ]);
  });

  it('ProofFromJson – The Dude Divides', function() {
    CheckProof([
      ["Divides(p, q)",         "given (Divides(p, q))"],
      ["exists k, q = k*p",     "defof Divides 1 (exists k, q = k*p)"],
      ["q = s*p",               "elim exists 2 s"],
      ["Divides(q, r)",         "given (Divides(q, r))"],
      ["exists k, r = k*q",     "defof Divides 4 (exists k, r = k*q)"],
      ["r = t*q",               "elim exists 5 t"],
      ["r = s*t*p",             "substitute 3 right 6 (r = s*t*p)"],
      ["r = t*s*p",             "algebra (r = t*s*p) 7"],
      ["exists k, r = k*p",     "intro exists 8 {t*s} k (exists k, r = k*p)"],
      ["Divides(p, r)",         "undef Divides 9"],
    ]);
  });

  it('ProofFromJson – Weekend at Cape Mod', function() {
    CheckProof([
      ["not (c = 0)",       "given (not (c = 0))"],
      [
        ["Congruent(a, b, n)",            "assumption"],
        ["Divides(n, a - b)",             "defof Congruent 2.1"],
        ["exists k, a - b = k*n",         "defof Divides 2.2"],
        ["a - b = s*n",                   "elim exists 2.3 s"],
        ["c - c = 0",                     "tautology (c - c = 0)"],
        ["c = c",                         "algebra (c = c) 2.5"],
        ["c = c and a - b = s*n",         "intro and 2.6 2.4"],
        ["c*(a - b) = c*(s*n)",           "apply MultEqns 2.7 {c, c, a - b, s*n}"],
        ["c*a - c*b = s*(c*n)",           "algebra (c*a - c*b = s*(c*n)) 2.8"],
        ["exists k, c*a - c*b = k*(c*n)", "intro exists 2.9 {s} k"],
        ["Divides(c*n, c*a - c*b)",       "undef Divides 2.10"],
        ["Congruent(c*a, c*b, c*n)",      "undef Congruent 2.11"],
      ],
      ["Congruent(a, b, n) -> Congruent(c*a, c*b, c*n)",
           "direct proof (Congruent(a, b, n) -> Congruent(c*a, c*b, c*n))"],
      [
        ["Congruent(c*a, c*b, c*n)",            "assumption"],
        ["Divides(c*n, c*a - c*b)",             "defof Congruent 3.1"],
        ["exists k, c*a - c*b = k*(c*n)",       "defof Divides 3.2"],
        ["c*a - c*b = s*(c*n)",                 "elim exists 3.3 s"],
        ["c*(a - b) = c*(s*n)",                 "algebra (c*(a - b) = c*(s*n)) 3.4"],
        ["c*(a - b) = c*(s*n) and not (c = 0)", "intro and 3.5 1"],
        ["a - b = s*n",                         "apply DivideEqn 3.6 {a - b, s*n, c}"],
        ["exists k, a - b = k*n",               "intro exists 3.7 {s} k"],
        ["Divides(n, a - b)",                   "undef Divides 3.8"],
        ["Congruent(a, b, n)",                  "undef Congruent 3.9"],
      ],
      ["Congruent(c*a, c*b, c*n) -> Congruent(a, b, n)",
           "direct proof (Congruent(c*a, c*b, c*n) -> Congruent(a, b, n))"],
      ["(Congruent(a, b, n) -> Congruent(c*a, c*b, c*n)) and (Congruent(c*a, c*b, c*n) -> Congruent(a, b, n))",
           "intro and 2 3"],
      ["Congruent(a, b, n) <-> Congruent(c*a, c*b, c*n)",
           "equivalent 4 (Congruent(a, b, n) <-> Congruent(c*a, c*b, c*n))"]
      ]);
  });

  it('ProofFromJson – A Whale of a Good Prime', function() {
    CheckProof([
      ["Odd(n)",                        "given (Odd(n))"],
      ["exists k, n = 2*k + 1",         "defof Odd 1 (exists k, n = 2*k + 1)"],
      ["n = 2*s + 1",                   "elim exists 2 s"],
      ["n = 2*s + 1 and n = 2*s + 1",   "intro and 3 3"],
      ["n*n = (2*s + 1)*(2*s + 1)",     "apply MultEqns 4 {n, 2*s + 1, n, 2*s + 1}"],
      ["n^2 + 1 - 2 = (s^2 + s)*4",     "algebra (n^2 + 1 - 2 = (s^2 + s)*4) 5"],
      ["exists k, n^2 + 1 - 2 = k*4",   "intro exists 6 {s^2 + s} k"],
      ["Divides(4, n^2 + 1 - 2)",       "undef Divides 7"],
      ["Congruent(n^2 + 1, 2, 4)",      "undef Congruent 8"],
    ]);
  });

  it('ProofFromJson – Reflexivity', function() {
    CheckProof([
      ["a - a = 0*m",           "tautology (a - a = 0*m)"],
      ["exists k, a - a = k*m", "intro exists 1 {0} k"],
      ["Divides(m, a - a)",     "undef Divides 2"],
      ["Congruent(a, a, m)",    "undef Congruent 3"],
    ]);
  });

  it('ProofFromJson – Transitivity', function() {
    CheckProof([
      ["Congruent(a, b, m)",    "given (Congruent(a, b, m))"],
      ["mod(a, m) = mod(b, m)", "apply Lemma_1 1 {a, b, m}"],
      ["Congruent(b, c, m)",    "given (Congruent(b, c, m))"],
      ["mod(b, m) = mod(c, m)", "apply Lemma_1 3 {b, c, m}"],
      ["mod(a, m) = mod(c, m)", "substitute 4 right 2"],
      ["Congruent(a, c, m)",    "apply Lemma_1 5 {a, c, m}"],
    ], [], [
      ["Lemma_1", ParseProp("forall a, forall b, forall m, Congruent(a, b, m) <-> (mod(a, m) = mod(b, m))")],
    ]);
  });

  it('ProofFromJson – Lemma_1', function() {
    CheckProof([
      ["0 < m",   "given (0 < m)"],
      [
        ["mod(a, m) = mod(b, m)",       "assumption"],
        ["a = div(a, m)*m + mod(a, m) and 0 <= mod(a, m) and mod(a, m) < m",
              "apply Division 1 {a, m}"],
        ["a = div(a, m)*m + mod(a, m) and 0 <= mod(a, m)",
              "elim and 2.2 left"],
        ["a = div(a, m)*m + mod(a, m)",   "elim and 2.3 left"],
        ["b = div(b, m)*m + mod(b, m) and 0 <= mod(b, m) and mod(b, m) < m",
              "apply Division 1 {b, m}"],
        ["b = div(b, m)*m + mod(b, m) and 0 <= mod(b, m)",
              "elim and 2.5 left"],
        ["b = div(b, m)*m + mod(b, m)",   "elim and 2.6 left"],
        ["a - b = (div(a, m) - div(b, m))*m",
              "algebra (a - b = (div(a, m) - div(b, m))*m) 2.1 2.4 2.7"],
        ["exists k, a - b = k*m",         "intro exists 2.8 {div(a, m) - div(b, m)} k"],
        ["Divides(m, a - b)",             "undef Divides 2.9"],
        ["Congruent(a, b, m)",            "undef Congruent 2.10"],
      ],
      ["mod(a, m) = mod(b, m) -> Congruent(a, b, m)",
          "direct proof (mod(a, m) = mod(b, m) -> Congruent(a, b, m))"],
      [
        ["Congruent(a, b, m)",          "assumption"],
        ["Divides(m, a - b)",           "defof Congruent 3.1"],
        ["exists k, a - b = k*m",       "defof Divides 3.2"],
        ["a - b = s*m",                 "elim exists 3.3 s"],
        ["a = div(a, m)*m + mod(a, m) and 0 <= mod(a, m) and mod(a, m) < m",
              "apply Division 1 {a, m}"],
        ["a = div(a, m)*m + mod(a, m) and 0 <= mod(a, m)",
              "elim and 3.5 left"],
        ["a = div(a, m)*m + mod(a, m)",   "elim and 3.6 left"],
        ["b = (div(a, m) - s)*m + mod(a, m)",
              "algebra (b = (div(a, m) - s)*m + mod(a, m)) 3.4 3.7"],
        ["mod(a, m) < m",                "elim and 3.5 right"],
        ["0 <= mod(a, m)",               "elim and 3.6 right"],
        ["b = (div(a, m) - s)*m + mod(a, m) and 0 <= mod(a, m)",
              "intro and 3.8 3.10"],
        ["b = (div(a, m) - s)*m + mod(a, m) and 0 <= mod(a, m) and mod(a, m) < m",
              "intro and 3.11 3.9"],
        ["div(a, m) - s = div(b, m) and mod(a, m) = mod(b, m)",
              "apply DivisionUnique 3.12 {b, m, div(a, m) - s, mod(a, m)}"],
        ["mod(a, m) = mod(b, m)",       "elim and 3.13 right"],
      ],
      ["Congruent(a, b, m) -> mod(a, m) = mod(b, m)",
          "direct proof (Congruent(a, b, m) -> mod(a, m) = mod(b, m))"],
      ["(mod(a, m) = mod(b, m) -> Congruent(a, b, m)) and (Congruent(a, b, m) -> mod(a, m) = mod(b, m))",
          "intro and 2 3"],
      ["mod(a, m) = mod(b, m) <-> Congruent(a, b, m)",
          "equivalent 4 (mod(a, m) = mod(b, m) <-> Congruent(a, b, m))"],
    ]);
  });

  it('ProofFromJson – Add Congruences', function() {
    CheckProof([
      ["0 < m",   "given (0 < m)"],
      [
        ["Congruent(a, b, m) and Congruent(c, d, m)", "assumption"],
        ["Congruent(a, b, m)",              "elim and 2.1 left"],
        ["Divides(m, a - b)",               "defof Congruent 2.2"],
        ["exists k, a - b = k*m",           "defof Divides 2.3"],
        ["a - b = s*m",                     "elim exists 2.4 s"],
        ["Congruent(c, d, m)",              "elim and 2.1 right"],
        ["Divides(m, c - d)",               "defof Congruent 2.6"],
        ["exists k, c - d = k*m",           "defof Divides 2.7"],
        ["c - d = t*m",                     "elim exists 2.8 t"],
        ["a + c - (b + d) = (s + t)*m",     "algebra (a + c - (b + d) = (s + t)*m) 2.5 2.9"],
        ["exists k, a + c - (b + d) = k*m", "intro exists 2.10 {s + t} k"],
        ["Divides(m, a + c - (b + d))",     "undef Divides 2.11"],
        ["Congruent(a + c, b + d, m)",      "undef Congruent 2.12"]
      ],
      ["Congruent(a, b, m) and Congruent(c, d, m) -> Congruent(a + c, b + d, m)",
          "direct proof (Congruent(a, b, m) and Congruent(c, d, m) -> Congruent(a + c, b + d, m))"],
    ]);
  });

  it('ProofFromJson – Add Congruences Corollary', function() {
    CheckProof([
      ["0 < m",                 "given (0 < m)"],
      ["Congruent(a, b, m)",    "given (Congruent(a, b, m))"],
      ["c - c = 0*m",           "tautology (c - c = 0*m)"],
      ["exists k, c - c = k*m", "intro exists 3 {0} k"],
      ["Divides(m, c - c)",     "undef Divides 4"],
      ["Congruent(c, c, m)",    "undef Congruent 5"],
      ["Congruent(a, b, m) and Congruent(c, c, m)",
            "intro and 2 6"],
      ["Congruent(a, b, m) and Congruent(c, c, m) -> Congruent(a + c, b + c, m)",
            "apply AddCongruences 1 {a, b, c, c, m}"],
      ["Congruent(a + c, b + c, m)",  "modus ponens 7 8"]
    ], [], [
      ["AddCongruences", ParseProp("forall a, forall b, forall c, forall d, forall m, (0 < m) -> Congruent(a, b, m) and Congruent(c, d, m) -> Congruent(a + c, b + d, m)")],
    ]);
  });

  it('ProofFromJson – Multiply Congruences', function() {
    CheckProof([
      ["0 < m",   "given (0 < m)"],
      [
        ["Congruent(a, b, m) and Congruent(c, d, m)", "assumption"],
        ["Congruent(a, b, m)",            "elim and 2.1 left"],
        ["Divides(m, a - b)",             "defof Congruent 2.2"],
        ["exists k, a - b = k*m",         "defof Divides 2.3"],
        ["a - b = s*m",                   "elim exists 2.4 s"],
        ["Congruent(c, d, m)",            "elim and 2.1 right"],
        ["Divides(m, c - d)",             "defof Congruent 2.6"],
        ["exists k, c - d = k*m",         "defof Divides 2.7"],
        ["c - d = t*m",                   "elim exists 2.8 t"],
        ["c - c = 0",                     "tautology (c - c = 0)"],
        ["c = c",                         "algebra (c = c) 2.10"],
        ["a - b = s*m and c = c",         "intro and 2.5 2.11"],
        ["(a - b)*c = s*m*c",             "apply MultEqns 2.12 {a - b, s*m, c, c}"],
        ["b - b = 0",                     "tautology (b - b = 0)"],
        ["b = b",                         "algebra (b = b) 2.14"],
        ["c - d = t*m and b = b",         "intro and 2.9 2.15"],
        ["(c - d)*b = t*m*b",             "apply MultEqns 2.16 {c - d, t*m, b, b}"],
        ["a*c - b*d = (c*s + b*t)*m",     "algebra (a*c - b*d = (c*s + b*t)*m) 2.13 2.17"],
        ["exists k, a*c - b*d = k*m",     "intro exists 2.18 {c*s + b*t} k"],
        ["Divides(m, a*c - b*d)",         "undef Divides 2.19"],
        ["Congruent(a*c, b*d, m)",        "undef Congruent 2.20"]
      ],
      ["Congruent(a, b, m) and Congruent(c, d, m) -> Congruent(a*c, b*d, m)",
          "direct proof (Congruent(a, b, m) and Congruent(c, d, m) -> Congruent(a*c, b*d, m))"],
    ]);
  });

  it('ProofFromJson – Multiply Congruences Corollary', function() {
    CheckProof([
      ["0 < m",                 "given (0 < m)"],
      ["Congruent(a, b, m)",    "given (Congruent(a, b, m))"],
      ["c - c = 0*m",           "tautology (c - c = 0*m)"],
      ["exists k, c - c = k*m", "intro exists 3 {0} k"],
      ["Divides(m, c - c)",     "undef Divides 4"],
      ["Congruent(c, c, m)",    "undef Congruent 5"],
      ["Congruent(a, b, m) and Congruent(c, c, m)",
            "intro and 2 6"],
      ["Congruent(a, b, m) and Congruent(c, c, m) -> Congruent(a*c, b*c, m)",
            "apply MultCongruences 1 {a, b, c, c, m}"],
      ["Congruent(a*c, b*c, m)",  "modus ponens 7 8"]
    ], [], [
      ["MultCongruences", ParseProp("forall a, forall b, forall c, forall d, forall m, (0 < m) -> (Congruent(a,b,m) and Congruent(c,d,m)) -> Congruent(a*c,b*d,m)")],
    ]);
  });

  it('ProofFromJson – n^2 is congruent to 0 or 1 mod 4', function() {
    CheckProof([
      ["0 < 2",                           "tautology (0 < 2)"],
      ["n = div(n, 2)*2 + mod(n, 2) and 0 <= mod(n, 2) and mod(n, 2) < 2",
          "apply Division 1 {n, 2}"],
      ["n = div(n, 2)*2 + mod(n, 2) and 0 <= mod(n, 2)",
          "elim and 2 left"],
      ["n = div(n, 2)*2 + mod(n, 2)",       "elim and 3 left"],
      ["n = 2*div(n, 2) + mod(n, 2)",       "algebra (n = 2*div(n, 2) + mod(n, 2)) 4"],
      ["n = 2*div(n, 2) + mod(n, 2) and n = 2*div(n, 2) + mod(n, 2)",
          "intro and 5 5"],
      ["n*n = (2*div(n, 2) + mod(n, 2))*(2*div(n, 2) + mod(n, 2))",
          "apply MultEqns 6 {n, 2*div(n, 2) + mod(n, 2), n, 2*div(n, 2) + mod(n, 2)}"],
      ["n^2 = 4*(div(n, 2)^2 + div(n, 2)*mod(n, 2)) + mod(n, 2)^2",
          "algebra (n^2 = 4*(div(n, 2)^2 + div(n, 2)*mod(n, 2)) + mod(n, 2)^2) 7"],
      ["mod(n, 2) < 2",                    "elim and 2 right"],
      ["0 <= mod(n, 2)",                   "elim and 3 right"],
      ["0 <= mod(n, 2) and mod(n, 2) < 2", "intro and 10 9"],
      ["mod(n, 2) = 0 or mod(n, 2) = 1",   "apply ZeroOne 11 {mod(n, 2)}"],
      [
        ["mod(n, 2) = 0",                 "assumption"],
        ["n*n = (2*div(n, 2) + 0)*(2*div(n, 2) + 0)", "substitute 13.1 right 7"],
        ["n^2 - 0 = div(n, 2)^2*4",       "algebra (n^2 - 0 = div(n, 2)^2*4) 13.2"],
        ["exists k, n^2 - 0 = k*4",       "intro exists 13.3 {div(n, 2)^2} k"],
        ["Divides(4, n^2 - 0)",           "undef Divides 13.4"],
        ["Congruent(n^2, 0, 4)",          "undef Congruent 13.5"],
        ["Congruent(n^2, 0, 4) or Congruent(n^2, 1, 4)",
            "intro or 13.6 (Congruent(n^2, 1, 4)) right"],
      ],
      ["mod(n, 2) = 0 -> Congruent(n^2, 0, 4) or Congruent(n^2, 1, 4)",
          "direct proof (mod(n, 2) = 0 -> Congruent(n^2, 0, 4) or Congruent(n^2, 1, 4))"],
      [
        ["mod(n, 2) = 1",                  "assumption"],
        ["n^2 = 4*(div(n, 2)^2 + div(n, 2)*1) + 1^2", "substitute 14.1 right 8"],
        ["n^2 - 1 = (div(n, 2)^2 + div(n, 2))*4",
              "algebra (n^2 - 1 = (div(n, 2)^2 + div(n, 2))*4) 14.2"],
        ["exists k, n^2 - 1 = k*4",      "intro exists 14.3 {div(n, 2)^2 + div(n, 2)} k"],
        ["Divides(4, n^2 - 1)",          "undef Divides 14.4"],
        ["Congruent(n^2, 1, 4)",         "undef Congruent 14.5"],
        ["Congruent(n^2, 0, 4) or Congruent(n^2, 1, 4)",
            "intro or 14.6 (Congruent(n^2, 0, 4)) left"],
      ],
      ["mod(n, 2) = 1 -> Congruent(n^2, 0, 4) or Congruent(n^2, 1, 4)",
          "direct proof (mod(n, 2) = 1 -> Congruent(n^2, 0, 4) or Congruent(n^2, 1, 4))"],
      ["Congruent(n^2, 0, 4) or Congruent(n^2, 1, 4)", "cases 12 13 14"],
    ], [], [
      ["ZeroOne", ParseProp("forall n, 0 <= n and n < 2 -> n = 0 or n = 1")],
    ]);
  });

  it('ProofFromJson – Lemma_2', function() {
    CheckProof([
      ["0 < b",                         "given (0 < b)"],
      ["a = div(a, b)*b + mod(a, b) and 0 <= mod(a, b) and mod(a, b) < b",
            "apply Division 1 {a, b}"],
      ["a = div(a, b)*b + mod(a, b) and 0 <= mod(a, b)",
            "elim and 2 left"],
      ["a = div(a, b)*b + mod(a, b)",     "elim and 3 left"],
      ["a = b*div(a, b) + mod(a, b)",     "algebra (a = b*div(a, b) + mod(a, b)) 4"],
      [
        ["Divides(d, a) and Divides(d, b)",   "assumption"],
        ["Divides(d, a)",                     "elim and 6.1 left"],
        ["exists k, a = k*d",                 "defof Divides 6.2"],
        ["a = s*d",                           "elim exists 6.3 s"],
        ["Divides(d, b)",                     "elim and 6.1 right"],
        ["exists k, b = k*d",                 "defof Divides 6.5"],
        ["b = t*d",                           "elim exists 6.6 t"],
        ["mod(a, b) = a - div(a, b)*b",       "algebra (mod(a, b) = a - div(a, b)*b) 5"],
        ["mod(a, b) = s*d - div(a, b)*b",     "substitute 6.4 right 6.8 (mod(a, b) = s*d - div(a, b)*b)"],
        ["mod(a, b) = s*d - div(a, b)*t*d",   "substitute 6.7 right 6.9 (mod(a, b) = s*d - div(a, b)*t*d)"],
        ["mod(a, b) = (s - div(a, b)*t)*d",   "algebra (mod(a, b) = (s - div(a, b)*t)*d) 6.10"],
        ["exists k, mod(a, b) = k*d",         "intro exists 6.11 {s - div(a, b)*t} k"],
        ["Divides(d, mod(a, b))",             "undef Divides 6.12"],
        ["Divides(d, b) and Divides(d, mod(a, b))", "intro and 6.5 6.13"],
      ],
      ["Divides(d, a) and Divides(d, b) -> Divides(d, b) and Divides(d, mod(a, b))",
            "direct proof (Divides(d, a) and Divides(d, b) -> Divides(d, b) and Divides(d, mod(a, b)))"],
      [
        ["Divides(d, b) and Divides(d, mod(a, b))",  "assumption"],
        ["Divides(d, b)",                    "elim and 7.1 left"],
        ["exists k, b = k*d",                "defof Divides 7.2"],
        ["b = t*d",                          "elim exists 7.3 t"],
        ["Divides(d, mod(a, b))",            "elim and 7.1 right"],
        ["exists k, mod(a, b) = k*d",        "defof Divides 7.5"],
        ["mod(a, b) = s*d",                  "elim exists 7.6 s"],
        ["a = d*div(a, b)*t + mod(a, b)",    "substitute 7.4 right 5 (a = d*div(a, b)*t + mod(a, b))"],
        ["a = d*div(a, b)*t + s*d",          "substitute 7.7 right 7.8 (a = d*div(a, b)*t + s*d)"],
        ["a = (div(a, b)*t + s)*d",          "algebra (a = (div(a, b)*t + s)*d) 7.9"],
        ["exists k, a = k*d",                "intro exists 7.10 {div(a, b)*t + s} k"],
        ["Divides(d, a)",                    "undef Divides 7.11"],
        ["Divides(d, a) and Divides(d, b)",  "intro and 7.12 7.2"],
      ],
      ["Divides(d, b) and Divides(d, mod(a, b)) -> Divides(d, a) and Divides(d, b)",
          "direct proof (Divides(d, b) and Divides(d, mod(a, b)) -> Divides(d, a) and Divides(d, b))"],
      ["(Divides(d, a) and Divides(d, b) -> Divides(d, b) and Divides(d, mod(a, b))) and (Divides(d, b) and Divides(d, mod(a, b)) -> Divides(d, a) and Divides(d, b))",
          "intro and 6 7"],
      ["Divides(d, a) and Divides(d, b) <-> Divides(d, b) and Divides(d, mod(a, b))",
          "equivalent 8 (Divides(d, a) and Divides(d, b) <-> Divides(d, b) and Divides(d, mod(a, b)))"]
    ]);
  });

  it('ProofFromJson – gcd(a,0) = a', function() {
    CheckProof([
      ["0 < a",               "given (0 < a)"],
      ["a - 1*a = 0",         "tautology (a - 1*a = 0)"],
      ["a = 1*a",             "algebra (a = 1*a) 2"],
      ["exists k, a = k*a",   "intro exists 3 {1} k"],
      ["Divides(a, a)",       "undef Divides 4"],
      ["0 = 0*a",             "tautology (0 = 0*a)"],
      ["exists k, 0 = k*a",   "intro exists 6 {0} k (exists k, 0 = k*a)"],
      ["Divides(a, 0)",       "undef Divides 7"],
      [
        [
          ["Divides(x, a) and Divides(x, 0)",   "assumption"],
          ["Divides(x, a)",                     "elim and 9.1.1 left"],
          ["Divides(x, a) and 0 < a",           "intro and 9.1.2 1"],
          ["x <= a",                            "apply DivideOrder 9.1.3 {x, a}"],
        ],
        ["Divides(x, a) and Divides(x, 0) -> x <= a",
              "direct proof (Divides(x, a) and Divides(x, 0) -> x <= a)"],
      ],
      ["forall x, Divides(x, a) and Divides(x, 0) -> x <= a",
          "intro forall (forall x, Divides(x, a) and Divides(x, 0) -> x <= a)"],
      ["Divides(a, a) and Divides(a, 0)",       "intro and 5 8"],
      ["Divides(a, a) and Divides(a, 0) and (forall x, Divides(x, a) and Divides(x, 0) -> x <= a)",
          "intro and 10 9"],
      ["a = gcd(a, 0)",                        "apply GCDUnique 11 {a, 0, a}"],
    ], [], [
      ["DivideOrder", ParseProp("forall d, forall y, Divides(d, y) and (0 < y) -> d <= y")],
    ]);
  });

  it('ProofFromJson – gcd(a, b) = gcd(b, mod(a, b))', function() {
    CheckProof([
      ["0 < a",               "given (0 < a)"],
      ["0 < b",               "given (0 < b)"],
      ["0 <= b",              "apply Positive 2 {b}"],
      ["0 < a and 0 <= b",    "intro and 1 3"],
      ["Divides(gcd(a, b), a) and Divides(gcd(a, b), b) and (forall d, Divides(d, a) and Divides(d, b) -> d <= gcd(a, b))",
          "apply GCD 4 {a, b}"],
      ["Divides(gcd(a, b), a) and Divides(gcd(a, b), b)",
          "elim and 5 left"],
      ["Divides(gcd(a, b), b) and Divides(gcd(a, b), mod(a, b))",
          "apply Lemma_2 6 {a, b, gcd(a, b)}"],
      ["a = div(a, b)*b + mod(a, b) and 0 <= mod(a, b) and mod(a, b) < b",
          "apply Division 2 {a, b}"],
      ["a = div(a, b)*b + mod(a, b) and 0 <= mod(a, b)",
          "elim and 8 left"],
      ["0 <= mod(a, b)",                 "elim and 9 right"],
      ["0 < b and 0 <= mod(a, b)",       "intro and 2 10"],
      ["Divides(gcd(b, mod(a, b)), b) and Divides(gcd(b, mod(a, b)), mod(a, b)) and (forall d, Divides(d, b) and Divides(d, mod(a, b)) -> d <= gcd(b, mod(a, b)))",
          "apply GCD 11 {b, mod(a, b)}"],
      ["forall d, Divides(d, b) and Divides(d, mod(a, b)) -> d <= gcd(b, mod(a, b))",
          "elim and 12 right"],
      ["Divides(gcd(a, b), b) and Divides(gcd(a, b), mod(a, b)) -> gcd(a, b) <= gcd(b, mod(a, b))",
          "elim forall 13 {gcd(a, b)}"],
      ["gcd(a, b) <= gcd(b, mod(a, b))",   "modus ponens 7 14"],
      ["forall d, Divides(d, a) and Divides(d, b) -> d <= gcd(a, b)",
          "elim and 5 right"],
      ["Divides(gcd(b, mod(a, b)), a) and Divides(gcd(b, mod(a, b)), b) -> gcd(b, mod(a, b)) <= gcd(a, b)",
          "elim forall 16 {gcd(b, mod(a, b))}"],
      ["Divides(gcd(b, mod(a, b)), b) and Divides(gcd(b, mod(a, b)), mod(a, b))",
          "elim and 12 left"],
      ["Divides(gcd(b, mod(a, b)), a) and Divides(gcd(b, mod(a, b)), b)",
          "apply Lemma_2 18 {a, b, gcd(b, mod(a, b))}"],
      ["gcd(b, mod(a, b)) <= gcd(a, b)",   "modus ponens 19 17"],
      ["gcd(b, mod(a, b)) <= gcd(a, b) and gcd(a, b) <= gcd(b, mod(a, b))",
          "intro and 20 15"],
      ["gcd(b, mod(a, b)) = gcd(a, b)",
          "apply IneqToEq 21 {gcd(b, mod(a, b)), gcd(a, b)}"],
    ], [], [
      ["Lemma_2", ParseProp("forall a, forall b, forall d, Divides(d,a) and Divides(d,b) <-> Divides(d,b) and Divides(d,mod(a,b))")],
      ["Positive", ParseProp("forall n, 0 < n -> 0 <= n")],
      ["IneqToEq", ParseProp("forall x, forall y, x <= y and y <= x -> x = y")],
    ]);
  });

  it('ProofFromJson – 22au HW5 1(b)', function() {
    CheckProof([
      [
        [
          ["x in A",                    "assumption"],
          ["Divides(6, x)",             "defof A ^1"],
          ["exists k, x = k*6",         "defof Divides ^2"],
          ["x = s*6",                   "elim exists ^3 s"],
          ["x = 3*s*2",                 "algebra (x = 3*s*2) ^4"],
          ["exists y, x = y*2",         "intro exists ^5 {3*s} y"],
          ["Divides(2, x)",             "undef Divides ^6"],
          ["x in B",                    "undef B ^7"],
        ],
        ["x in A -> x in B",            "direct proof (x in A -> x in B)"],
      ],
      ["forall n, n in A -> n in B",    "intro forall (forall n, n in A -> n in B) x"],
      ["A subset B",                    "undef Subset ^1"],
    ], [
      ["A", ParseProp("forall n, n in A <-> Divides(6, n)")],
      ["B", ParseProp("forall n, n in B <-> Divides(2, n)")],
    ])
  });

  it('ProofFromJson – 21au HW4 2(a)', function() {
    CheckProof([
      [
        [
          ["x in A \\ C cap (B \\ C)",      "assumption"],
          ["x in A \\ C and x in B \\ C",   "defof Intersection ^1"],
          ["x in A \\ C",                   "elim and ^2 left"],
          ["x in A and not (x in C)",       "defof SetDifference ^3"],
          ["x in A",                        "elim and ^4 left"],
          ["not (x in C)",                  "elim and ^4 right"],
          ["x in B \\ C",                   "elim and ^2 right"],
          ["x in B and not (x in C)",       "defof SetDifference ^7"],
          ["x in B",                        "elim and ^8 left"],
          ["x in A and x in B",             "intro and ^5 ^9"],
          ["x in A cap B",                  "undef Intersection ^10"],
          ["x in A cap B and not (x in C)", "intro and ^11 ^6"],
          ["x in A cap B \\ C",             "undef SetDifference ^12"],
        ],
        ["x in A \\ C cap (B \\ C) -> x in A cap B \\ C",
         "direct proof (x in A \\ C cap (B \\ C) -> x in A cap B \\ C)"],
      ],
      ["forall x, x in A \\ C cap (B \\ C) -> x in A cap B \\ C",
       "intro forall (forall x, x in A \\ C cap (B \\ C) -> x in A cap B \\ C)"],
      ["A \\ C cap (B \\ C) subset A cap B \\ C", "undef Subset ^1"],
    ]);
  });

  it('power set of subset', function() {
    CheckProof([
      [
        [
          ["y in power(A)", "assumption"],
          ["y subset A", "defof PowerSet ^1"],
          ["forall x, x in y -> x in A", "defof Subset ^2"],
          [
            [
              ["x in y", "assumption"],
              ["x in y -> x in A", "elim forall ^^^3 {x}"],
              ["x in A", "modus ponens ^1 ^2"],
              ["x in A or x in B", "intro or ^3 (x in B) right"],
              ["x in A cup B", "undef Union ^4"],
            ],
            ["x in y -> x in A cup B", "direct proof (x in y -> x in A cup B)"],
          ],
          ["forall x, x in y -> x in A cup B",
           "intro forall (forall x, x in y -> x in A cup B)"],
          ["y subset A cup B", "undef Subset ^4"],
          ["y in power(A cup B)", "undef PowerSet ^5"],
        ],
        ["y in power(A) -> y in power(A cup B)",
         "direct proof (y in power(A) -> y in power(A cup B))"]
      ],
      ["forall y, y in power(A) -> y in power(A cup B)",
       "intro forall (forall y, y in power(A) -> y in power(A cup B))"],
      ["power(A) subset power(A cup B)",
       "undef Subset 1"]
    ], [
      ["PowerSet",
       ParseProp("forall x, forall y, (x in power(y)) <-> (x subset y)")]
    ]);
  });

});
