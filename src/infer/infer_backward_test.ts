import * as assert from 'assert';
import { ParseProp } from '../facts/props_parser';
import { AbsLineRef } from './rules_ast';
import { Environment, TopLevelEnv, SubproofEnv } from './env';
import { ParseBackwardRule, CreateTactic } from './infer_backward';
import * as sets from './sets';


/** Default environment to be used for the proofs below. */
const ENV = new TopLevelEnv(
  sets.DEFINITIONS.concat([
    ["Even", ParseProp("forall x, Even(x) <-> (exists y, x = 2*y)")]
  ]), [
    ["Thm1", ParseProp("P -> Q")]
  ], undefined, ["a", "b", "c", "A", "B", "C"]);


interface Line {
  goal: string,  // proposition to prove
  rule: string,  // rule to apply to generate the goal
  next: Line[]   // expected (unknown) premises and how to prove them
}

/**
 * Checks that a proof, given as rules to apply in reverse, is valid by building
 * a Rule for it. The second argument is a list of known facts that may be used.
 */
function CheckProof(env: Environment, last: Line, known: Map<string, AbsLineRef>): AbsLineRef {
  const goal = ParseProp(last.goal);
  const parsed = ParseBackwardRule(last.rule);
  const tactic = CreateTactic(env, parsed, goal);

  const premLines: AbsLineRef[] = [];
  if (tactic.hasSubproof()) {
    tactic.subproof(env);  // make sure this works
    assert.strictEqual(last.next.length, 0);  // no subproofs in backward reasoning

  } else {
    // Make sure that the unknown premises are the ones in in last.next.
    // For each unknown premise, we recursively check it and make a Rule.
    const premises = tactic.premises();
    let nextIndex = 0;

    for (let i = 0; i < premises.length; i++) {
      let lineNum = known.get(premises[i].to_string_alpha());
      if (lineNum === undefined) {
        if (nextIndex >= last.next.length)
          throw new Error(`missing premise ${premises[i].to_string()} for goal ${last.goal}`);

        const nextProp = ParseProp(last.next[nextIndex].goal);
        if (!premises[i].equals_alpha(nextProp))
          throw new Error(`expected premise ${premises[i].to_string()} but got ${nextProp.to_string()}`);

        lineNum = CheckProof(env, last.next[nextIndex], known);
        known.set(premises[i].to_string_alpha(), lineNum);
        nextIndex += 1;
      }
      premLines.push(lineNum);
    }

    if (nextIndex < last.next.length)
      throw new Error(`unused premise ${last.next[nextIndex].goal} for goal ${last.goal}`);
  }

  tactic.reverse(premLines);  // make sure this doesn't throw an exception
  return [known.size + 1];    // put this as the next line
}


/** Returns a map from normalized propositions to a given. */
function MakeKnowns(propStrs: string[]): Map<string, AbsLineRef> {
  const knowns = new Map<string, AbsLineRef>();
  for (let propStr of propStrs) {
    const prop = ParseProp(propStr);
    knowns.set(prop.to_string_alpha(), [knowns.size + 1]);
  }
  return knowns;
}


describe('infer_backward', function() {

  it('given', function() {
    CheckProof(ENV,
      {goal: "P and Q", rule: "given", next: []},
      MakeKnowns(["P and Q"]));
  });

  it('cite', function() {
    CheckProof(ENV,
      {goal: "P -> Q", rule: "cite Thm1", next: []},
      MakeKnowns([]));
  });

  it('modus ponens', function() {
    CheckProof(ENV,
      {goal: "Q", rule: "modus ponens (P)", next: []},
      MakeKnowns(["P", "P -> Q"]));
  });

  it('direct proof', function() {
    CheckProof(ENV,
      {goal: "P and R -> Q", rule: "direct proof", next: [
//        {goal: "Q", rule: "modus ponens (P)", next: [
//          {goal: "P", rule: "elim and (R) left", next: []},
//        ]},
      ]},
      MakeKnowns(["P -> Q"]));
  });

  it('elim and', function() {
    CheckProof(ENV,
      {goal: "R", rule: "elim and (P) right", next: []},
      MakeKnowns(["P and R"]));
    CheckProof(ENV,
      {goal: "P", rule: "elim and (R) left", next: []},
      MakeKnowns(["P and R"]));
  });

  it('intro and', function() {
    CheckProof(ENV,
      {goal: "P and R", rule: "intro and", next: []},
      MakeKnowns(["P", "R"]));
    CheckProof(ENV,
      {goal: "R and P", rule: "intro and", next: []},
      MakeKnowns(["P", "R"]));
  });

  it('elim or', function() {
    CheckProof(ENV,
      {goal: "P", rule: "elim or (Q) left", next: []},
      MakeKnowns(["P or Q", "not Q"]));
    CheckProof(ENV,
      {goal: "Q", rule: "elim or (P) right", next: []},
      MakeKnowns(["P or Q", "not P"]));
  });

  it('simple cases', function() {
    CheckProof(ENV,
      {goal: "R", rule: "simple cases (P)", next: []},
      MakeKnowns(["P or not P", "P -> R", "not P -> R"]));
  });

  it('cases', function() {
    CheckProof(ENV,
      {goal: "R", rule: "cases (P or Q)", next: []},
      MakeKnowns(["P or Q", "P -> R", "Q -> R"]));
  });

  it('intro or', function() {
    CheckProof(ENV,
      {goal: "P or Q", rule: "intro or (P)", next: []},
      MakeKnowns(["P"]));
    CheckProof(ENV,
      {goal: "Q or P", rule: "intro or (P)", next: []},
      MakeKnowns(["P"]));
  });

  it('contradiction', function() {
    CheckProof(ENV,
      {goal: "false", rule: "contradiction (P)", next: []},
      MakeKnowns(["P", "not P"]));
  });

  it('absurdum', function() {
    CheckProof(ENV,
      {goal: "not P", rule: "absurdum", next: [
//        {goal: "false", rule: "modus ponens (P or Q)", next: [
//          {goal: "P or Q", rule: "intro or (P)", next: []},
//        ]}
      ]},
      MakeKnowns(["P or Q -> false"]));
  });

  it('exfalso', function() {
    CheckProof(ENV,
      {goal: "P or Q -> R", rule: "exfalso", next: []},
      MakeKnowns(["false"]));
  });

  it('verum', function() {
    CheckProof(ENV,
      {goal: "true", rule: "verum", next: []},
      MakeKnowns([]));
  });

  it('tautology', function() {
    CheckProof(ENV,
      {goal: "P or not P", rule: "tautology", next: []},
      MakeKnowns([]));
  });

  it('equivalent', function() {
    CheckProof(ENV,
      {goal: "P -> Q", rule: "equivalent (Q or not P)", next: []},
      MakeKnowns(["Q or not P"]));
  });

  it('elim forall', function() {
    CheckProof(ENV,
      {goal: "P(a) or Q(a)", rule: "elim forall {a} y", next: []},
      MakeKnowns(["forall x, P(x) or Q(x)"]));
  });

  it('intro forall', function() {
    // change the variable name inside the subproof
    CheckProof(ENV,
      {goal: "forall y, exists x, P(x, y)", rule: "intro forall d", next: []},
      MakeKnowns(["exists x, forall y, P(x, y)"]));

    // introduce only one variable when two are available
    CheckProof(ENV,
      {goal: "forall x, forall y, P(x) and P(y)", rule: "intro forall x", next: []},
      MakeKnowns(["forall y, P(y)"]));

    // Now do both in one step
    CheckProof(ENV,
      {goal: "forall x, forall y, P(x) and P(y)", rule: "intro forall d y", next: []},
      MakeKnowns(["forall y, P(y)"]));
  });

  it('elim exists', function () {
    CheckProof(ENV,
      {goal: "P(d) or Q(d)", rule: "elim exists d y", next: []},
      MakeKnowns(["exists x, P(x) or Q(x)"]));
  });

  it('intro exists', function () {
    CheckProof(ENV,
      {goal: "exists x, P(x) or Q(x)", rule: "intro exists {3}", next: []},
      MakeKnowns(["P(3) or Q(3)"]));
  });

  it('induction', function () {
    CheckProof(ENV,
      {goal: "forall n, 0 <= n -> P(n)", rule: "induction", next: []},
      MakeKnowns(["P(0)", "forall n, P(n) -> P(n+1)"]));
    CheckProof(ENV,
      {goal: "forall m, 5 <= m -> Q(m)", rule: "induction", next: []},
      MakeKnowns(["Q(5)", "forall m, Q(m) -> Q(m+1)"]));
    CheckProof(ENV,
      {goal: "forall n, 0 <= n -> Divides(2, 2*n^2 + 2*n)", rule: "induction", next: []},
      MakeKnowns(["Divides(2, 2*0^2 + 2*0)",
          "forall n, Divides(2, 2*n^2 + 2*n) -> Divides(2, 2*(n+1)^2 + 2*(n+1))"]));
  });

  it('substitute + definition', function() {
    CheckProof(ENV,
      {goal: "Even(6)", rule: "undef Even", next: [
          {goal: "exists y, 6 = 2*y", rule: "intro exists {3}", next: [
              {goal: "6 = 2*3", rule: "tautology", next: []}
          ]}
      ]},
      MakeKnowns([]));
  });

// NOTE: Removing this as it can't be done safely backward at present.
// The Intro Exists need to substitute in variables that don't even exist yet!
//
//  it('substitute + definition + algebra', function() {
//    CheckProof(ENV,
//      {goal: "Even(a+b)", rule: "undef Even", next: [
//          {goal: "exists y, a+b = 2*y", rule: "intro exists {r+s}", next: [
//              {goal: "a+b = 2*(r+s)", rule: "algebra (a = 2*r) (b = 2*s)", next: [
//                  {goal: "a = 2*r", rule: "elim exists r y", next: [
//                      {goal: "exists y, a = 2*y", rule: "defof Even", next: []}
//                  ]},
//                  {goal: "b = 2*s", rule: "elim exists s y", next: [
//                      {goal: "exists y, b = 2*y", rule: "defof Even", next: []}
//                  ]}
//              ]}
//          ]}
//      ]},
//      MakeKnowns(["Even(a)", "Even(b)"]));
//  });

  it('set function', function () {
    CheckProof(ENV,
      {goal: "x in ~A", rule: "undef Complement", next: []},
      MakeKnowns(["not x in A"]));
    CheckProof(ENV,
      {goal: "not x in A", rule: "defof Complement", next: []},
      MakeKnowns(["x in ~A"]));

    CheckProof(ENV,
      {goal: "x in A cup B", rule: "undef Union", next: []},
      MakeKnowns(["x in A or x in B"]));
    CheckProof(ENV,
      {goal: "x in A or x in B", rule: "defof Union", next: []},
      MakeKnowns(["x in A cup B"]));

    CheckProof(ENV,
      {goal: "x in A cap B", rule: "undef Intersection", next: []},
      MakeKnowns(["x in A and x in B"]));
    CheckProof(ENV,
      {goal: "x in A and x in B", rule: "defof Intersection", next: []},
      MakeKnowns(["x in A cap B"]));

    CheckProof(ENV,
      {goal: "x in A \\ B", rule: "undef SetDifference", next: []},
      MakeKnowns(["x in A and not x in B"]));
    CheckProof(ENV,
      {goal: "x in A and not x in B", rule: "defof SetDifference", next: []},
      MakeKnowns(["x in A \\ B"]));
  });

  it('set relation', function () {
    CheckProof(ENV,
      {goal: "~A sameset B cup C", rule: "undef SameSet", next: []},
      MakeKnowns(["forall x, x in ~A <-> x in B cup C"]));
    // TODO
  });

  // Example proofs from lectures:

  it('prop proof 1', function() {
    CheckProof(ENV,
      {goal: "R", rule: "modus ponens (Q)", next: [
          {goal: "Q", rule: "modus ponens (P)", next: []}
      ]},
      MakeKnowns(["P", "P -> Q", "Q -> R"]));
  });

  it('prop proof2', function() {
    CheckProof(ENV,
      {goal: "not P", rule: "modus ponens (not Q)", next: [
          {goal: "not Q -> not P", rule: "equivalent (P -> Q)", next: []}
      ]},
      MakeKnowns(["P -> Q", "not Q"]));
  });

  it('prop proof3', function() {
    CheckProof(ENV,
      {goal: "R", rule: "modus ponens (P and Q)", next: [
          {goal: "P and Q", rule: "intro and", next: [
              {goal: "Q", rule: "modus ponens (P)", next: []}
          ]}
      ]},
      MakeKnowns(["P", "P -> Q", "P and Q -> R"]));
  });

  it('prop proof4', function() {
    CheckProof(ENV,
      {goal: "not R", rule: "modus ponens (Q)", next: [
          {goal: "Q", rule: "elim or (not S) right", next: [
              {goal: "not not S", rule: "equivalent (S)", next: [
                  {goal: "S", rule: "elim and (P) right", next: []}
              ]}
          ]}
      ]},
      MakeKnowns(["P and S", "Q -> not R", "not S or Q"]));
  });

  it('prop proof5', function() {
    CheckProof(ENV,
      {goal: "P -> P or Q", rule: "direct proof", next: [
//          {goal: "P or Q", rule: "intro or (P)", next: []}
      ]},
      MakeKnowns([]));
  });

  it('prop proof6', function() {
    CheckProof(ENV,
      {goal: "P -> R", rule: "direct proof", next: [
//          {goal: "R", rule: "modus ponens (P and Q)", next: [
//              {goal: "P and Q", rule: "intro and", next: []}
//          ]}
      ]},
      MakeKnowns(["Q", "P and Q -> R"]));
  });

  it('prop proof7', function() {
    CheckProof(ENV,
      {goal: "P and Q -> P or Q", rule: "direct proof", next: [
//          {goal: "P or Q", rule: "intro or (P)", next: [
//              {goal: "P", rule: "elim and (Q) left", next: []}
//          ]}
      ]},
      MakeKnowns([]));
  });

  // Examples from section03

  it('prop proof8', function() {
    CheckProof(ENV,
      {goal: "((P -> Q) and (Q -> R)) -> P -> R", rule: "direct proof", next: [
//          {goal: "P -> R", rule: "direct proof", next: [
//              {goal: "R", rule: "modus ponens (Q)", next: [
//                  {goal: "Q", rule: "modus ponens (P)", next: [
//                      {goal: "P -> Q", rule: "elim and (Q -> R) left", next: []}
//                  ]},
//                  {goal: "Q -> R", rule: "elim and (P -> Q) right", next: []},
//              ]}
//          ]}
      ]},
      MakeKnowns([]));
  });

  it('prop proof9', function() {
    CheckProof(ENV,
      {goal: "not T -> S", rule: "direct proof", next: [
//          {goal: "S", rule: "modus ponens (R)", next: [
//              {goal: "R", rule: "modus ponens (Q)", next: [
//                  {goal: "Q", rule: "elim or (T) right", next: []}
//              ]}
//          ]}
      ]},
      MakeKnowns(["T or Q", "Q -> R", "R -> S"]));
  });

  it('prop simple cases', function() {
    CheckProof(ENV,
      {goal: "Q", rule: "simple cases (P)", next: []},
      MakeKnowns(["P -> Q", "not P -> Q"]));
  });

  it('prop cases', function() {
    CheckProof(ENV,
      {goal: "Q", rule: "cases (A or B)", next: [
          {goal: "A or B", rule: "equivalent (B or A)", next: []}
      ]},
      MakeKnowns(["A -> Q", "B -> Q", "B or A"]));
  });

  // Examples from section04

  it('prop proof10', function() {
    CheckProof(ENV,
      {goal: "not P", rule: "modus ponens (not Q)", next: [
          {goal: "not Q", rule: "elim or (not S) left", next: [
              {goal: "not not S", rule: "equivalent (S)", next: [
                  {goal: "S", rule: "modus ponens (R)", next: [
                      {goal: "R", rule: "elim and (not T) left", next: [
                          {goal: "R and not T", rule: "equivalent (not (not R or T))", next: []},
                      ]},
                      {goal: "R -> S", rule: "elim and (P -> Q) right", next: []},
                  ]},
              ]},
          ]},
          {goal: "not Q -> not P", rule: "equivalent (P -> Q)", next: [
              {goal: "P -> Q", rule: "elim and (R -> S) left", next: []},
          ]},
      ]},
      MakeKnowns(["not (not R or T)", "not Q or not S", "(P -> Q) and (R -> S)"]));
  });

  it('pred proof1', function() {
    CheckProof(ENV,
      {goal: "(exists x, T(x)) -> (exists y, M(y))", rule: "direct proof", next: [
//          {goal: "exists y, M(y)", rule: "intro exists {c}", next: [
//              {goal: "M(c)", rule: "modus ponens (T(c))", next: [
//                  {goal: "T(c)", rule: "elim exists c x", next: []},
//                  {goal: "T(c) -> M(c)", rule: "elim forall {c} x", next: []},
//              ]},
//          ]},
      ]},
      MakeKnowns(["forall x, T(x) -> M(x)"]));
  });

  it('pred proof2', function() {
    CheckProof(ENV,
      {goal: "exists x, P(x) or R(x)", rule: "intro exists {a}", next: [
          {goal: "P(a) or R(a)", rule: "equivalent (not P(a) -> R(a))", next: [
              {goal: "not P(a) -> R(a)", rule: "direct proof", next: [
//                  {goal: "R(a)", rule: "modus ponens (Q(a))", next: [
//                      {goal: "Q(a)", rule: "modus ponens (not P(a))", next: [
//                          {goal: "not P(a) -> Q(a)", rule: "equivalent (P(a) or Q(a))", next: [
//                              {goal: "P(a) or Q(a)", rule: "elim forall {a} y", next: []},
//                          ]},
//                      ]},
//                      {goal: "Q(a) -> R(a)", rule: "equivalent (not Q(a) or R(a))", next: [
//                          {goal: "not Q(a) or R(a)", rule: "elim forall {a} y", next: []},
//                      ]},
//                  ]},
              ]},
          ]},
      ]},
      MakeKnowns(["forall x, P(x) or Q(x)", "forall y, not Q(y) or R(y)"]));
  });

  // (Selected) examples from HW3

  it('21au HW3 6(a)', function() {
    CheckProof(ENV,
      {goal: "forall y, exists x, P(x, y)", rule: "intro forall", next: [
//          {goal: "exists x, P(x, y)", rule: "intro exists {a}", next: [
//              {goal: "P(a, y)", rule: "elim forall {y} z", next: [
//                  {goal: "forall z, P(a, z)", rule: "elim exists a x", next: []},
//              ]},
 //         ]},
      ]},
      MakeKnowns(["exists x, forall y, P(x, y)"]));
  });

  it('21au HW3 6(c)', function() {
    CheckProof(ENV,
      {goal: "forall z, Q(z) -> (exists y, P(z, y) and P(y, z))",
       rule: "intro forall", next: [
//          {goal: "Q(z) -> (exists y, P(z, y) and P(y, z))",
//           rule: "direct proof", next: [
//              {goal: "exists y, P(z, y) and P(y, z)",
//               rule: "intro exists {c}", next: [
//                  {goal: "P(z, c) and P(c, z)",
//                   rule: "intro and", next: [
//                      {goal: "P(z, c)", rule: "modus ponens (Q(z))", next: [
//                          {goal: "Q(z) -> P(z, c)",
//                           rule: "elim forall {z} x", next: []}
//                      ]},
//                      {goal: "P(c, z)", rule: "elim forall {z} y", next: []},
//                  ]},
//              ]},
//          ]},
      ]},
      MakeKnowns(["forall y, P(c, y)", "forall x, Q(x) -> P(x, c)"]));
  });
});
