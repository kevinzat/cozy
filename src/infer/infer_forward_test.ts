import { Proposition, SplitQuantifiers, FALSE } from '../facts/props';
import { ParseProp } from '../facts/props_parser';
import { Environment, SubproofEnv, TopLevelEnv } from './env';
import { Assumption, Rule } from './rules';
import { ParseForwardRule, CreateSubproofEnv, CreateRule } from './infer_forward';
import { LineRef, AssumptionAst } from './rules_ast';
import * as assert from 'assert';
import * as sets from './sets';
import * as ints from './integers';


/** Default environment to be used for the proofs below. */
const ENV = new TopLevelEnv(
    ints.DEFINITIONS.concat(sets.DEFINITIONS), ints.THEOREMS);

/**
 * Checks that a proof is valid. The proof is given as a list of pairs, with a
 * proposition and a rule that generates that proposition. The list can also
 * contain lists, which are subproofs, used by some rules.
 */
function CheckProof(line_descs: any[],
    defs?: [string, Proposition][], thms?: [string, Proposition][],
    varNames?: string[]): Rule[] {

  const lines: Rule[][] = [[]];

  const env = !defs && !thms && !varNames ? ENV : new TopLevelEnv(
      Array.from(ENV.definitions).concat(defs || []),
      Array.from(ENV.theorems).concat(thms || []),
      undefined, varNames);
  CheckLines(line_descs, lines, env);

  return lines[0];
}

/**
 * Adds the propositions and rules in the given list of lines to the top lists
 * of props and rules on the passed-in stacks. Returns the environment at the
 * end of the list of lines.
 */
function CheckLines(
    line_descs: any[], lines: Rule[][], env: Environment): Environment {

  // subproof environment from the prior line if a subproof
  let sub: Environment | undefined = undefined;

  for (let i = 0; i < line_descs.length; i++) {
    assert.ok(line_descs[i] instanceof Array && line_descs[i].length > 0);

    // If this line is a [string, string, string], then it describes a prop and
    // rule. (The third argument allows extra transformations, like
    // simplification, that may be necessary in some cases when the output
    // cannot be produced directly by the parser.) Otherwise, it a nested array
    // of line_descs (a subproof), handled recursively.
    if (typeof(line_descs[i][0]) === "string") {
      assert.ok(2 <= line_descs[i].length && line_descs[i].length <= 3);
      let prop = ParseProp(line_descs[i][0]);
      if (line_descs[i][2]) {
        switch (line_descs[i][2]) {
          case 'simplify':  prop = prop.simplify_expressions(); break;
          case 'dump':      console.log(prop); break;
          default: throw Error(`unknown transformation ${line_descs[i][2]}`);
        }
      }

      let rule: Rule;
      let parsed: any;
      if (line_descs[i][1].trim() === "assumption") {
        parsed = new AssumptionAst(prop);
        rule = new Assumption(env, prop);
      } else {
        parsed = ParseForwardRule(line_descs[i][1]);
        assert.ok(parsed !== undefined);
        assert.strictEqual(parsed.to_string(), line_descs[i][1])

        let result = CreateRule(env, parsed,
            (p: LineRef) => GetPropByLine(p, lines), sub);
        if (typeof(result) === "string") {
          assert.strictEqual(result, "");  // fail with nice error message
          throw new Error("impossible");
        } else {
          rule = result as Rule;
        }
      }

      // If the rule generates the claimed proposition, add it to the proof.
      const result = rule.apply();
      if (!result.equals_alpha(prop)) {
        console.log("Proposition:", prop.to_string());
        console.log("  but");
        console.log("Rule gives:", result.to_string());
        console.log("  where rule is", line_descs[i][1])
      }
      assert.ok(result.equals_alpha(prop));

      // Update to be after this line.
      env = rule.envAfter;
      lines[lines.length-1].push(rule);
      sub = undefined;

    } else {
      if (line_descs.length <= i+1)
        throw new Error('no rule after subproof');

      const parsed = ParseForwardRule(line_descs[i+1][1]);
      assert.ok(parsed !== undefined);
      assert.strictEqual(parsed.to_string(), line_descs[i+1][1])

      sub = CreateSubproofEnv(env, parsed);

      lines.push([]);
      CheckLines(line_descs[i], lines, sub);
      lines.pop();
    }
  }

  return env;
}

/**
 * Retrieves the proposition by its line number. The second argument is a stack
 * of proofs that we are in the middle of building. The line numbers in each
 * subsequent array are preceded by "N+1.", where N is the length of the prior
 * array in the list (because this subproof end up as line N+1 in that proof).
 * Hence, a list with K indexes will index into the K-th array in that stack.
 */
function GetPropByLine(line_ref: LineRef, lines: Rule[][]): Rule {
  if (line_ref instanceof Array) {  // absolute
    const indexes = line_ref as number[];
    assert.ok(indexes.length <= lines.length);

    // Ensure that all line numbers save the last are one past the end.
    for (let i = 0; i < indexes.length - 1; i++) {
      assert.strictEqual(indexes[i], lines[i].length + 1);
    }

    // The very last line number must (1-)index into a valid index.
    if (indexes[indexes.length-1]-1 >= lines[indexes.length-1].length) {
      console.log(`last index is past the end: ${indexes.join(".")}`);
    }
    assert.ok(indexes[indexes.length-1]-1 < lines[indexes.length-1].length);
    return lines[indexes.length-1][indexes[indexes.length-1]-1];

  } else {  // relative
    const outer_index = lines.length - line_ref.up;
    assert.ok(0 <= outer_index && outer_index < lines.length);

    const inner_lines = lines[outer_index];
    assert.ok(1 <= line_ref.lineNum && line_ref.lineNum <= inner_lines.length);
    return inner_lines[line_ref.lineNum-1];
  }
}

describe('infer_forward', function() {

  it('contradiction', function() {
    CheckProof([
        ["P or Q", "given (P or Q)"],
        ["not (P or Q)", "given (not (P or Q))"],
        ["false", "contradiction 1 2"],
        ["false", "contradiction 2 1"],
      ]);
  });

  it('absurdum', function() {
    CheckProof([
      ["Q", "given (Q)"],
      ["P -> not Q", "given (P -> not Q)"],
      [
        ["P", "assumption"],
        ["not Q", "modus ponens ^1 ^^2"],
        ["false", "contradiction ^2 ^^1"],
      ],
      ["not P", "absurdum (not P)"],
    ]);
  });

  it('exfalso', function() {
    CheckProof([
        ["false", "given (false)"],
        ["P and not P", "exfalso 1 (P and not P)"],
      ]);
  });

  it('verum', function() {
    CheckProof([
        ["true", "verum"],
      ]);
  });

  it('tautology', function() {
    // Expressions that normalize to equal can be produced by tautology.
    // (The algebra rule could only generate a row of the form [0 ... 0 | 0],
    // which means it should normalize to 0 on the left.)
    CheckProof([
        ["x - x = 0", "tautology (x - x = 0)"],
      ], undefined, undefined, ["x"]);

    CheckProof([
        ["P or not P", "tautology (P or not P)"],
      ]);
  });

  it('intro forall', function() {
    CheckProof([
      ["forall n, P(n)", "given (forall n, P(n))"],
      [
        ["P(x)",          "elim forall 1 {x}"],
        ["P(y)",          "elim forall 1 {y}"],
        ["P(x) and P(y)", "intro and ^1 ^2"],
      ],
      ["forall x, forall y, P(x) and P(y)",
       "intro forall (forall x, forall y, P(x) and P(y))"],
    ]);

    CheckProof([
      ["forall n, P(n)", "given (forall n, P(n))"],
      [
        ["P(x)",          "elim forall 1 {x}"],
        ["P(y)",          "elim forall 1 {y}"],
        ["P(x) and P(y)", "intro and ^1 ^2"],
      ],
      ["forall a, forall b, P(a) and P(b)",
       "intro forall (forall a, forall b, P(a) and P(b)) x y"],
    ]);

    CheckProof([
      [
        [
          ["true", "verum"]
        ],
        ["forall b, true", "intro forall (forall b, true) b"]
      ],
      ["forall a, forall b, true", "intro forall (forall a, forall b, true) a"],
    ]);
    assert.throws(() => {
      CheckProof([
        [
          [
            ["true", "verum"]
          ],
          ["forall b, true", "intro forall (forall b, true) a"]  // attempt to re-use name
        ],
        ["forall a, forall b, true", "intro forall (forall a, forall b, true) a"],
      ]);
    });
  });

  it('substitute', function() {
    CheckProof([
        ["x = y + 3", "given (x = y + 3)"],
        ["2*x = 7 and 7 - x < 5", "given (2*x = 7 and 7 - x < 5)"],
        ["2*(y + 3) = 7 and 7 - (y + 3) < 5", "substitute 1 right 2"],
        ["2 * x = 7 and 7 - x < 5", "substitute 1 left 3"]
      ], undefined, undefined, ["x", "y"]);

    CheckProof([
        ["x = y + 3", "given (x = y + 3)"],
        ["2*x = 7 and 7 - x < 5", "given (2*x = 7 and 7 - x < 5)"],
        ["2*x = 7 and 7 - (y + 3) < 5", "substitute 1 right 2 (2*x = 7 and 7 - (y + 3) < 5)"],
        ["2*x = 7 and 7 - x < 5", "substitute 1 left 3"]
      ], undefined, undefined, ["x", "y"]);

    CheckProof([
        ["x = y + 3", "given (x = y + 3)"],
        ["y = 8", "given (y = 8)"],
        ["x = 8 + 3", "substitute 2 right 1"],
        ["x = 11", "algebra (x = 11) ^3"]
      ], undefined, undefined, ["x", "y"]);

    CheckProof([
        ["x = y + 3", "given (x = y + 3)"],
        ["y = 8", "given (y = 8)"],
        ["x = 8 + 3", "substitute 2 right 1 (x = 8 + 3)"]
      ], undefined, undefined, ["x", "y"]);
  });

  it('definition', function() {
    CheckProof([
        ["Even(a)", "given (Even(a))"],
        ["exists y, a = 2*y", "defof Even 1"],
        ["a = 2*r", "elim exists 2 r"],
        ["Even(b)", "given (Even(b))"],
        ["exists y, b = 2*y", "defof Even 4"],
        ["b = 2*s", "elim exists 5 s"],
      ], undefined, undefined, ["a", "b"]);

    CheckProof([
        ["y in power(a)", "given (y in power(a))"],
        ["a subset b", "given (a subset b)"],
        ["y subset a", "defof PowerSet 1"],
        ["forall x, x in a -> x in b", "defof Subset 2"],
        ["forall x, x in y -> x in a", "defof Subset 3"],
        [
          [
            ["x in y", "assumption"],
            ["x in y -> x in a", "elim forall 5 {x}"],
            ["x in a", "modus ponens ^1 ^2"],
            ["x in a -> x in b", "elim forall 4 {x}"],
            ["x in b", "modus ponens ^3 ^4"],
          ],
          ["x in y -> x in b", "direct proof (x in y -> x in b)"],
        ],
        ["forall x, x in y -> x in b",
         "intro forall (forall x, x in y -> x in b)"],
        ["y subset b", "undef Subset 6"],
        ["y in power(b)", "undef PowerSet 7"],
      ], [
        ["PowerSet",
         ParseProp("forall x, forall y, (x in power(y)) <-> (x subset y)")]
      ], undefined, ["a", "b", "y"]);
  });

  it('apply', function() {
    CheckProof([
        ["P", "given (P)"],
        ["Q", "apply Thm1 1"],
      ], [], [
        ["Thm1", ParseProp("P -> Q")],
      ]);

    CheckProof([
        ["P(2, 3)", "given (P(2, 3))"],
        ["Q(2 + 3)", "apply Thm2 1 {2, 3}"],
        ["Q(5)", "equivalent 2 (Q(5))"],
      ], [], [
        ["Thm2", ParseProp("forall x, forall y, P(x, y) -> Q(x + y)")],
      ]);
  });

  it('algebra', function() {
    CheckProof([
        ["x + y^2 = 3", "given (x + y^2 = 3)"],
        ["y^2 + z + 5 = 0", "given (y^2 + z + 5 = 0)"],
        ["x - z = 8", "algebra (x - z = 8) 1 2"]
      ], undefined, undefined, ["x", "y", "z"]);

    CheckProof([
        ["(1+y)*x + y*(y - x) = 3", "given ((1 + y)*x + y*(y - x) = 3)"],
        ["y^2 + z + 5 = 0", "given (y^2 + z + 5 = 0)"],
        ["x - z = 8", "algebra (x - z = 8) 1 2"]
      ], undefined, undefined, ["x", "y", "z"]);
  });

  it('induction', function() {
    CheckProof([
        ["P(0)", "given (P(0))"],
        ["forall n, P(n) -> P(n + 1)", "given (forall n, P(n) -> P(n + 1))"],
        ["forall n, 0 <= n -> P(n)", "induction 1 2"]
      ], undefined, undefined, []);
    CheckProof([
        ["Q(5)", "given (Q(5))"],
        ["forall m, Q(m) -> Q(m + 1)", "given (forall m, Q(m) -> Q(m + 1))"],
        ["forall m, 5 <= m -> Q(m)", "induction 1 2"]
      ], undefined, undefined, []);
    CheckProof([
        ["Divides(2, 2*0^2 + 2*0)", "given (Divides(2, 2*0^2 + 2*0))"],
        ["forall n, Divides(2, 2*n^2 + 2*n) -> Divides(2, 2*(n + 1)^2 + 2*(n + 1))",
         "given (forall n, Divides(2, 2*n^2 + 2*n) -> Divides(2, 2*(n + 1)^2 + 2*(n + 1)))"],
        ["forall n, 0 <= n -> Divides(2, 2*n^2 + 2*n)", "induction 1 2"]
      ], undefined, undefined, []);

    CheckProof([
        ["2*0^2 + 2*0 = 0*2", "algebra (2*0^2 + 2*0 = 0*2)"],
        ["exists k, 2*0^2 + 2*0 = k*2", "intro exists 1 {0} k (exists k, 2*0^2 + 2*0 = k*2)"],
        ["Divides(2, 2*0^2 + 2*0)", "undef Divides 2"],
        [
          [
            ["Divides(2, 2*n^2 + 2*n)", "assumption"],
            ["exists k, 2*n^2 + 2*n = k*2", "defof Divides ^1"],
            ["2*n^2 + 2*n = k*2", "elim exists ^2 k"],
            ["2*(n + 1)^2 + 2*(n + 1) = (k + 2*n + 2)*2",
             "algebra (2*(n + 1)^2 + 2*(n + 1) = (k + 2*n + 2)*2) ^3"],
            ["exists k, 2*(n + 1)^2 + 2*(n + 1) = k*2", "intro exists ^4 {k + 2*n + 2} k"],
            ["Divides(2, 2*(n + 1)^2 + 2*(n + 1))", "undef Divides ^5"],
          ],
          ["Divides(2, 2*n^2 + 2*n) -> Divides(2, 2*(n + 1)^2 + 2*(n + 1))",
           "direct proof (Divides(2, 2*n^2 + 2*n) -> Divides(2, 2*(n + 1)^2 + 2*(n + 1)))"],
        ],
        ["forall n, Divides(2, 2*n^2 + 2*n) -> Divides(2, 2*(n + 1)^2 + 2*(n + 1))",
         "intro forall (forall n, Divides(2, 2*n^2 + 2*n) -> Divides(2, 2*(n + 1)^2 + 2*(n + 1)))"],
        ["forall n, 0 <= n -> Divides(2, 2*n^2 + 2*n)", "induction ^3 ^4"],
      ], undefined, undefined, []);
  });

  it('definition + algebra', function() {
    CheckProof([
        ["Even(a)", "given (Even(a))"],
        ["exists y, a = 2*y", "defof Even 1"],
        ["a = 2*r", "elim exists 2 r"],
        ["Even(b)", "given (Even(b))"],
        ["exists y, b = 2*y", "defof Even 4"],
        ["b = 2*s", "elim exists 5 s"],
        ["a+b = 2*(r+s)", "algebra (a + b = 2*(r + s)) 3 6"],
        ["exists y, a+b = 2*y", "intro exists 7 {r + s} y"],
        ["Even(a+b)", "undef Even 8"]
      ], undefined, undefined, ["a", "b"]);
  });

  it('relative line numbers', function() {
    CheckProof([
      ["Q", "given (Q)"],
      ["P and Q -> R", "given (P and Q -> R)"],
      [
        ["P", "assumption"],
        ["P and Q", "intro and ^1 ^^1"],
        ["R", "modus ponens ^2 ^^2"],
      ],
      ["P -> R", "direct proof (P -> R)"],
    ]);
  });

  it('subset', function() {
    CheckProof([
      [
        [
          ["x in A cap ~B",           "assumption"],
          ["x in A and x in ~B",      "defof Intersection ^1"],
          ["x in A",                  "elim and ^2 left"],
          ["x in ~B",                 "elim and ^2 right"],
          ["not x in B",              "defof Complement ^4"],
          ["x in A and not x in B",   "intro and ^3 ^5"],
          ["x in A \\ B",             "undef SetDifference ^6"],
          ["x in A \\ B or x in C",   "intro or ^7 (x in C) right"],
          ["x in A \\ B cup C",       "undef Union ^8"],
        ],
        ["x in A cap ~B -> x in A \\ B cup C",
         "direct proof (x in A cap ~B -> x in A \\ B cup C)"],
      ],
      ["forall x, x in A cap ~B -> x in A \\ B cup C",
       "intro forall (forall x, x in A cap ~B -> x in A \\ B cup C)"],
      ["A cap ~B subset A \\ B cup C" , "undef Subset ^1"],
    ], undefined, undefined, ["A", "B", "C"]);
  });

  it('set equality', function() {
    CheckProof([
      ["forall n, P(n) -> Q(n)", "given (forall n, P(n) -> Q(n))"],
      ["forall n, Q(n) -> P(n)", "given (forall n, Q(n) -> P(n))"],
      [
        [
          ["x in C",        "assumption"],
          ["P(x)",          "defof C ^1"],
          ["P(x) -> Q(x)",  "elim forall 1 {x}"],
          ["Q(x)",          "modus ponens ^2 ^3"],
          ["x in D",        "undef D ^4"],
        ],
        ["x in C -> x in D", "direct proof (x in C -> x in D)"],
        [
          ["x in D",        "assumption"],
          ["Q(x)",          "defof D ^1"],
          ["Q(x) -> P(x)",  "elim forall 2 {x}"],
          ["P(x)",          "modus ponens ^2 ^3"],
          ["x in C",        "undef C ^4"],
        ],
        ["x in D -> x in C", "direct proof (x in D -> x in C)"],
        ["(x in C -> x in D) and (x in D -> x in C)", "intro and ^1 ^2"],
        ["(x in C) <-> (x in D)", "equivalent ^3 (x in C <-> x in D)"],
      ],
      ["forall x, x in C <-> x in D", "intro forall (forall x, x in C <-> x in D)"],
      ["C sameset D", "undef SameSet ^3"],
    ], [
      ["C", ParseProp("forall n, (n in C) <-> P(n)")],
      ["D", ParseProp("forall n, (n in D) <-> Q(n)")],
    ], undefined, ["C", "D"]);
  });

});
