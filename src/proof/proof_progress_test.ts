import * as assert from 'assert';
import { TopLevelEnv } from '../infer/env';
import { ProofToJson, InvalidForwardStep, InvalidLineRef } from './proof';
import { InvalidBackwardStep } from './proof_goal';
import {
    IsComplete, GetCompletedProof, ReplaceSubproof, ProofProgressFromJson,
    ProofProgressToJson, GetLineFrom
  } from './proof_progress';


const ENV = new TopLevelEnv([], [], undefined, ["a", "b", "c"]);


describe('proof_progress', function() {

  it('IsComplete', function() {
    const progress1 = {lines: [
          ["P", "given (P)"],
          ["P -> Q", "given (P -> Q)"],
          ["Q", "modus ponens 1 2"]
        ], goal: {prop: "Q"}};
    assert.strictEqual(IsComplete(ProofProgressFromJson(ENV, progress1)), true);

    const progress2 = {lines: [
        ["P", "given (P)"],
        ["P -> Q", "given (P -> Q)"]
      ], goal: {prop: "Q"}};
    assert.strictEqual(IsComplete(ProofProgressFromJson(ENV, progress2)), false);

    const progress3 = {lines: [
        ["P", "given (P)"],
        ["P -> Q", "given (P -> Q)"]
      ], goal: {prop: "Q", resn: {tactic: "modus ponens (P)", subgoals: [
          {prop: "P"},
          {prop: "P -> Q"}
        ]}}
      };
    assert.strictEqual(IsComplete(ProofProgressFromJson(ENV, progress3)), true);

    const progress4 = {lines: [
        ["P", "given (P)"],
        ["P -> R", "given (P -> R)"]
      ], goal: {prop: "Q", resn: {tactic: "modus ponens (P)", subgoals: [
          {prop: "P"},
          {prop: "P -> Q"}
        ]}}
      };
    assert.strictEqual(IsComplete(ProofProgressFromJson(ENV, progress4)), false);

    const progress5 = {lines: [
        ["P -> Q", "given (P -> Q)"],
        ["P -> R", "given (P -> R)"],
        {lines: [
            ["P", "assumption"],
            ["Q", "modus ponens 3.1 ^^1"],
            ["R", "modus ponens ^1 2"],
            ["Q and R", "intro and ^2 3.3"]
          ], goal: {prop: "Q and R"}},
        ["P -> Q and R", "direct proof (P -> Q and R)"]
      ], goal: {prop: "P -> Q and R"}};
    assert.strictEqual(IsComplete(ProofProgressFromJson(ENV, progress5)), true);

    const progress6 = {lines: [
        ["P -> Q", "given (P -> Q)"],
        ["P -> R", "given (P -> R)"],
        {lines: [
            ["P", "assumption"],
            ["Q", "modus ponens 3.1 ^^1"],
            ["R", "modus ponens ^1 2"],
            ["R and Q", "intro and 3.3 ^2"]
          ], goal: {prop: "Q and R"}},
        ["P -> Q and R", "direct proof (P -> Q and R)"]
      ], goal: {prop: "P -> Q and R"}};
    assert.strictEqual(IsComplete(ProofProgressFromJson(ENV, progress6)), false);

    const progress7 = {lines: [
        ["P -> Q", "given (P -> Q)"],
        ["P -> R", "given (P -> R)"],
        {lines: [
            ["P", "assumption"],
            ["Q", "modus ponens ^1 ^^1"],
            ["R", "modus ponens ^1 2"],   // NOTE: absolute within a subproof!
            ["Q and R", "intro and ^2 ^3"]
          ], goal: {prop: "Q and R"}},
       ["P -> Q and R", "direct proof (P -> Q and R)"]
      ], goal: {prop: "P -> Q and R"}};
    assert.strictEqual(IsComplete(ProofProgressFromJson(ENV, progress7)), true);

    const progress8 = {lines: [
        ["P -> Q", "given (P -> Q)"],
        ["P -> R", "given (P -> R)"],
        {lines: [
            ["P", "assumption"],
            ["Q", "modus ponens ^1 1"],  // absolute within a subproof
            ["R", "modus ponens ^1 ^^2"],
            ["R and Q", "intro and ^3 ^2"]
          ], goal: {prop: "Q and R"}},
        ["P -> Q and R", "direct proof (P -> Q and R)"]
      ], goal: {prop: "P -> Q and R"}};
    assert.strictEqual(IsComplete(ProofProgressFromJson(ENV, progress8)), false);

    const progress9 = {lines: [
        ["P",         "given (P)"],
        ["true -> Q", "given (true -> Q)"],
        ["true",      "verum"],
        ["Q",         "modus ponens ^3 ^2"]
      ], goal: {prop: "Q", resn: {tactic: "modus ponens (P)", subgoals: [
          {prop: "P"},
          {prop: "P -> Q"}
        ]}}
      };
    assert.strictEqual(IsComplete(ProofProgressFromJson(ENV, progress9)), true);
  });

  it('ReplaceSubproof', function() {
    // First, test replacing the entire proof.
    const progress1 = ProofProgressFromJson(ENV, {lines: [
        ["P", "given (P)"],
        ["P -> Q", "given (P -> Q)"],
        ["Q", "modus ponens 1 2"]
      ], goal: {prop: "Q"}});
    const new_progress = ProofProgressFromJson(ENV, {lines: [
        ["P", "given (P)"],
        ["P -> Q", "given (P -> Q)"],
      ], goal: {prop: "Q"}});
    let result = ReplaceSubproof(progress1, progress1, new_progress);
    assert.deepStrictEqual(ProofProgressToJson(result), ProofProgressToJson(new_progress));

    // Now, test replacing subproofs in various places.

    const progress5 = ProofProgressFromJson(ENV, {lines: [
        ["P -> Q", "given (P -> Q)"],
        ["P -> R", "given (P -> R)"],
        {lines: [
            ["P", "assumption"],
            ["Q", "modus ponens 3.1 ^^1"],
            ["R", "modus ponens ^1 2"],
            ["Q and R", "intro and ^2 3.3"]
          ], goal: {prop: "Q and R"}},
        ["P -> Q and R", "direct proof (P -> Q and R)"]
      ], goal: {prop: "P -> Q and R"}});
    let old_subproof = progress5.lines[2].sub!;
    const wrapped_subproof =  ProofProgressFromJson(ENV, {lines: [
        {lines: [
            ["P", "assumption"]
          ], goal: {prop: "Q and R"}},
        ["P -> Q and R", "direct proof (P -> Q and R)"]
      ], goal: {prop: "true"}});
    const new_subproof = wrapped_subproof.lines[0].sub!;
    result = ReplaceSubproof(progress5, old_subproof, new_subproof);
    assert.deepStrictEqual(ProofProgressToJson(result), {lines: [
        ["P -> Q", "given (P -> Q)"],
        ["P -> R", "given (P -> R)"],
        {lines: [
            ["P", "assumption"]
          ], goal: {prop: "Q and R"}},
        ["P -> Q and R", "direct proof (P -> Q and R)"]
      ], goal: {prop: "P -> Q and R"}});
  });

  it('GetCompletedProof', function() {
    const progress1 = ProofProgressFromJson(ENV, {lines: [
          ["P", "given (P)"],
          ["P -> Q", "given (P -> Q)"],
          ["Q", "modus ponens 1 2"]
        ], goal: {prop: "Q"}});
    const proof1 = GetCompletedProof(progress1);
    assert.ok(proof1 !== undefined);
    assert.deepStrictEqual(ProofToJson(proof1), [
        ["P", "given (P)"],
        ["P -> Q", "given (P -> Q)"],
        ["Q", "modus ponens 1 2"]
      ]);

    const progress3 = ProofProgressFromJson(ENV, {lines: [
        ["P", "given (P)"],
        ["P -> Q", "given (P -> Q)"]
      ], goal: {prop: "Q", resn: {tactic: "modus ponens (P)", subgoals: [
          {prop: "P"},
          {prop: "P -> Q"}
        ]}}});
    const proof3 = GetCompletedProof(progress3);
    assert.ok(proof3 !== undefined);
    assert.deepStrictEqual(ProofToJson(proof3), [
        ["P", "given (P)"],
        ["P -> Q", "given (P -> Q)"],
        ["Q", "modus ponens 1 2"]
      ]);

    const progress5 = ProofProgressFromJson(ENV, {lines: [
        ["P -> Q", "given (P -> Q)"],
        ["P -> R", "given (P -> R)"],
        {lines: [
            ["P", "assumption"],
            ["Q", "modus ponens 3.1 ^^1"],
            ["R", "modus ponens ^1 2"],
            ["Q and R", "intro and ^2 3.3"]],
         goal: ["Q and R"]},
        ["P -> Q and R", "direct proof (P -> Q and R)"]
      ], goal: {prop: "P -> Q and R"}});
    const proof5 = GetCompletedProof(progress5);
    assert.ok(proof5 !== undefined);
    assert.deepStrictEqual(ProofToJson(proof5), [
        ["P -> Q", "given (P -> Q)"],
        ["P -> R", "given (P -> R)"],
        [
          ["P", "assumption"],
          ["Q", "modus ponens 3.1 ^^1"],
          ["R", "modus ponens ^1 2"],
          ["Q and R", "intro and ^2 3.3"],
        ],
        ["P -> Q and R", "direct proof (P -> Q and R)"]
      ]);

    const progress9 = ProofProgressFromJson(ENV, {lines: [
        ["P",         "given (P)"],
        ["true -> Q", "given (true -> Q)"],
        ["true",      "verum"],
        ["Q",         "modus ponens ^3 ^2"]
      ], goal: {prop: "Q", resn: {tactic: "modus ponens (P)", subgoals: [
          {prop: "P"},
          {prop: "P -> Q"}
        ]}}
      });
    const proof9 = GetCompletedProof(progress9);
    assert.ok(proof9 !== undefined);
    assert.deepStrictEqual(ProofToJson(proof9), [
        ["P",         "given (P)"],
        ["true -> Q", "given (true -> Q)"],
        ["true",      "verum"],
        ["Q",         "modus ponens ^3 ^2"]
      ]);
  });

  it('GetCompletedProof 21a8 HW3 4a', function() {
    const progress = ProofProgressFromJson(ENV, {lines: [
        ["R and S", "given (R and S)"],
        ["R -> T", "given (R -> T)"],
        ["T -> U and V", "given (T -> U and V)"],
      ], goal: {prop: "S and V", resn: {tactic: "intro and", subgoals: [
          {prop: "S", resn: {tactic: "elim and (R) right", subgoals: [
              {prop: "R and S"},
            ]}},
          {prop: "V", resn: {tactic: "elim and (U) right", subgoals: [
              {prop: "U and V", resn: {tactic: "modus ponens (T)", subgoals: [
                  {prop: "T", resn: {tactic: "modus ponens (R)", subgoals: [
                      {prop: "R", resn: {tactic: "elim and (S) left", subgoals: [
                          {prop: "R and S"}
                        ]}},
                      {prop: "R -> T"}
                    ]}},
                  {prop: "T -> U and V"}
                ]}}
            ]}}
        ]}}});
    const proof = GetCompletedProof(progress);
    assert.ok(proof !== undefined);
    assert.deepStrictEqual(ProofToJson(proof), [
        ["R and S", "given (R and S)"],
        ["R -> T", "given (R -> T)"],
        ["T -> U and V", "given (T -> U and V)"],
        ["S", "elim and 1 right"],
        ["R", "elim and 1 left"],
        ["T", "modus ponens 5 2"],
        ["U and V", "modus ponens 6 3"],
        ["V", "elim and 7 right"],
        ["S and V", "intro and 4 8"]
      ]);

    const progress2 = ProofProgressFromJson(ENV, {lines: [
        ["R and S", "given (R and S)"],
        ["R -> T", "given (R -> T)"],
        ["T -> U and V", "given (T -> U and V)"],
        ["R", "elim and 1 left"],
        ["T", "modus ponens 4 2"],
        ["U and V", "modus ponens 5 3"],
      ], goal: {prop: "S and V", resn: {tactic: "intro and", subgoals: [
          {prop: "S", resn: {tactic: "elim and (R) right", subgoals: [
              {prop: "R and S"},
            ]}},
          {prop: "V", resn: {tactic: "elim and (U) right", subgoals: [
              {prop: "U and V"}
            ]}},
        ]}}});
    const proof2 = GetCompletedProof(progress2);
    assert.ok(proof2 !== undefined);
    assert.deepStrictEqual(ProofToJson(proof2), [
        ["R and S", "given (R and S)"],
        ["R -> T", "given (R -> T)"],
        ["T -> U and V", "given (T -> U and V)"],
        ["R", "elim and 1 left"],
        ["T", "modus ponens 4 2"],
        ["U and V", "modus ponens 5 3"],
        ["S", "elim and 1 right"],
        ["V", "elim and 6 right"],
        ["S and V", "intro and 7 8"]
      ]);
  });

  it('ProofProgressFromJson', function() {
    // invalid tactic
    assert.throws(() => {
      ProofProgressFromJson(ENV, {lines: [
          ["P", "given (P)"],
          ["P -> Q", "given (P -> Q)"],
          ["R", "modus ponens 1 2"],
        ], goal: {prop: "R"}});
      }, InvalidForwardStep);

    // forget a premise
    assert.throws(() => {
      ProofProgressFromJson(ENV, {lines: [
          ["P", "given (P)"],
          ["P and Q -> R", "given (P and Q -> R)"],
        ], goal: {prop: "R", resn: {tactic: "modus ponens (P and Q)", subgoals: [
          {prop: "P and Q", resn: {tactic: "intro and", subgoals: [
              {prop: "P"},
            ]}},
          {prop: "P and Q -> R"}
        ]}}});
      }, InvalidBackwardStep);
  });

  it('GetLineFrom', function() {
    const progress = ProofProgressFromJson(ENV, {lines: [
        ["forall x, P(x) -> Q(x)", "given (forall x, P(x) -> Q(x))"],
        {lines: [
            ["P(a)", "assumption"],
            ["true", "verum"]
          ], goal: {prop: "P(a) -> true"}},
        ["P(a) -> true", "direct proof (P(a) -> true)"],
        {lines: [
            {lines: [
                ["P(x)", "assumption"],
                ["P(x) -> Q(x)", "elim forall ^^^1 {x}"],
                ["Q(x)", "modus ponens ^1 ^2"],
                ["P(x) and Q(x)", "intro and ^1 ^3"]
              ], goal: {prop: "P(x) and Q(x)"}},
            ["P(x) -> P(x) and Q(x)", "direct proof (P(x) -> P(x) and Q(x))"]
          ], goal: {prop: "P(x) -> P(x) and Q(x)"}},
        ["forall x, P(x) -> P(x) and Q(x)",
         "intro forall (forall x, P(x) -> P(x) and Q(x))"]
      ], goal: {prop: "forall x, P(x) -> P(x) and Q(x)"}});

    assert.strictEqual(
        GetLineFrom(progress, [3, 1, 3], [1]).rule.apply().to_string(),
        "forall x, P(x) -> Q(x)")
    assert.strictEqual(
        GetLineFrom(progress, [3, 1, 3], [2]).rule.apply().to_string(),
        "P(a) -> true")
    assert.strictEqual(
        GetLineFrom(progress, [3, 1, 3], [3, 1, 1]).rule.apply().to_string(),
        "P(x)")
    assert.strictEqual(
        GetLineFrom(progress, [3, 1, 3], [3, 1, 2]).rule.apply().to_string(),
        "P(x) -> Q(x)")

    assert.strictEqual(
        GetLineFrom(progress, [3, 1, 3], {up: 3, lineNum: 1}).rule.apply().to_string(),
        "forall x, P(x) -> Q(x)")
    assert.strictEqual(
        GetLineFrom(progress, [3, 1, 3], {up: 1, lineNum: 2}).rule.apply().to_string(),
        "P(x) -> Q(x)")

    assert.throws(() => GetLineFrom(progress, [3, 1, 3], [3]), InvalidLineRef);
    assert.throws(() => GetLineFrom(progress, [3, 1, 3], [4]), InvalidLineRef);
    assert.throws(() => GetLineFrom(progress, [3, 1, 3], [3, 1]), InvalidLineRef);
    assert.throws(() => GetLineFrom(progress, [3, 1, 3], [3, 2]), InvalidLineRef);
    assert.throws(() => GetLineFrom(progress, [3, 1, 3], [3, 1, 0]), InvalidLineRef);
    assert.throws(() => GetLineFrom(progress, [3, 1, 3], [3, 1, 2, 1]), InvalidLineRef);
    assert.throws(() => GetLineFrom(progress, [3, 1, 3], [3, 1, 3]), InvalidLineRef);
    assert.throws(() => GetLineFrom(progress, [3, 1, 3], [3, 1, 4]), InvalidLineRef);
  });

});