import * as assert from 'assert';
import { SubproofEnv, TopLevelEnv, TrailingEnv } from './env';
import { ParseProp } from '../facts/props_parser';


const top = new TopLevelEnv([], [], []);
const trail1 = new TrailingEnv(top, 'x');

const sub1 = new SubproofEnv(top, ParseProp("X(y)"), undefined, ["y"]);
const trail2 = new TrailingEnv(sub1, 'z');

const sub2 = new SubproofEnv(sub1, ParseProp("Y"), ParseProp("P or Q"));

const sub3 = new SubproofEnv(trail1, ParseProp("Z"), ParseProp("not Q"));
const trail3 = new TrailingEnv(sub3, 'w');
const trail4 = new TrailingEnv(trail3, 'y');


describe('env', function() {

  it('isTopLevel', function() {
    assert.strictEqual(top.isTopLevel(), true);
    assert.strictEqual(trail1.isTopLevel(), false);
    assert.strictEqual(sub1.isTopLevel(), false);
    assert.strictEqual(trail2.isTopLevel(), false);
    assert.strictEqual(sub2.isTopLevel(), false);
    assert.strictEqual(sub3.isTopLevel(), false);
    assert.strictEqual(trail3.isTopLevel(), false);
    assert.strictEqual(trail4.isTopLevel(), false);
  });

  it('getParent', function() {
    assert.throws(() => top.getParent(), Error);
    assert.throws(() => trail1.getParent(), Error);
    assert.strictEqual(sub1.getParent(), top);
    assert.strictEqual(trail2.getParent(), top);
    assert.strictEqual(sub2.getParent(), sub1);
    assert.strictEqual(sub3.getParent(), trail1);
    assert.strictEqual(trail3.getParent(), trail1);
    assert.strictEqual(trail4.getParent(), trail1);
  });

  it('getSubproof', function() {
    assert.throws(() => top.getSubproof(), Error);
    assert.throws(() => trail1.getSubproof(), Error);
    assert.strictEqual(sub1.getSubproof(), sub1);
    assert.strictEqual(trail2.getSubproof(), sub1);
    assert.strictEqual(sub2.getSubproof(), sub2);
    assert.strictEqual(sub3.getSubproof(), sub3);
    assert.strictEqual(trail3.getSubproof(), sub3);
    assert.strictEqual(trail4.getSubproof(), sub3);
  });

  it('isParentOrBefore', function() {
    assert.strictEqual(top.isParentOrBefore(trail1), false);
    assert.strictEqual(trail1.isParentOrBefore(trail1), true);
    assert.strictEqual(sub1.isParentOrBefore(trail1), false);
    assert.strictEqual(trail2.isParentOrBefore(trail1), false);
    assert.strictEqual(sub2.isParentOrBefore(trail1), false);
    assert.strictEqual(sub3.isParentOrBefore(trail1), true);
    assert.strictEqual(trail3.isParentOrBefore(trail1), true);
    assert.strictEqual(trail4.isParentOrBefore(trail1), true);

    assert.strictEqual(top.isParentOrBefore(sub1), false);
    assert.strictEqual(trail1.isParentOrBefore(sub1), false);
    assert.strictEqual(sub1.isParentOrBefore(sub1), true);
    assert.strictEqual(trail2.isParentOrBefore(sub1), true);
    assert.strictEqual(sub2.isParentOrBefore(sub1), true);
    assert.strictEqual(sub3.isParentOrBefore(sub1), false);
    assert.strictEqual(trail3.isParentOrBefore(sub1), false);
    assert.strictEqual(trail4.isParentOrBefore(sub1), false);
  });

  it('isAvailableName', function() {
    assert.strictEqual(top.isAvailableName("x"), true);
    assert.strictEqual(trail1.isAvailableName("x"), false);
    assert.strictEqual(sub1.isAvailableName("x"), true);
    assert.strictEqual(trail2.isAvailableName("x"), true);
    assert.strictEqual(sub2.isAvailableName("x"), true);
    assert.strictEqual(sub3.isAvailableName("x"), false);
    assert.strictEqual(trail3.isAvailableName("x"), false);
    assert.strictEqual(trail4.isAvailableName("x"), false);

    assert.strictEqual(top.isAvailableName("y"), true);
    assert.strictEqual(trail1.isAvailableName("y"), true);
    assert.strictEqual(sub1.isAvailableName("y"), false);
    assert.strictEqual(trail2.isAvailableName("y"), false);
    assert.strictEqual(sub2.isAvailableName("y"), false);
    assert.strictEqual(sub3.isAvailableName("y"), true);
    assert.strictEqual(trail3.isAvailableName("y"), true);
    assert.strictEqual(trail4.isAvailableName("y"), false);
  });

  it('getVariablesInScope', function() {
    assert.deepStrictEqual(top.getVariablesInScope(), []);
    assert.deepStrictEqual(trail1.getVariablesInScope(), ["x"]);
    assert.deepStrictEqual(sub1.getVariablesInScope(), ["y"]);
    assert.deepStrictEqual(trail2.getVariablesInScope(), ["y", "z"]);
    assert.deepStrictEqual(sub2.getVariablesInScope(), ["y"]);
    assert.deepStrictEqual(sub3.getVariablesInScope(), ["x"]);
    assert.deepStrictEqual(trail3.getVariablesInScope(), ["x", "w"]);
    assert.deepStrictEqual(trail4.getVariablesInScope(), ["x", "w", "y"]);
  });

  it('getVariables', function() {
    assert.deepStrictEqual(top.getVariables(), []);
    assert.deepStrictEqual(trail1.getVariables(), ["x"]);
    assert.deepStrictEqual(sub1.getVariables(), ["y"]);
    assert.deepStrictEqual(trail2.getVariables(), ["z"]);
    assert.deepStrictEqual(sub2.getVariables(), []);
    assert.deepStrictEqual(sub3.getVariables(), []);
    assert.deepStrictEqual(trail3.getVariables(), ["w"]);
    assert.deepStrictEqual(trail4.getVariables(), ["y"]);
  });

  it('getPremise', function() {
    assert.strictEqual(top.getPremise(), undefined);
    assert.strictEqual(trail1.getPremise(), undefined);
    assert.strictEqual(sub1.getPremise(), undefined);
    assert.strictEqual(trail2.getPremise(), undefined);
    assert.strictEqual(sub2.getPremise()?.to_string_alpha(), "P or Q");
    assert.strictEqual(sub3.getPremise()?.to_string_alpha(), "not Q");
    assert.strictEqual(trail3.getPremise(), undefined);
    assert.strictEqual(trail4.getPremise(), undefined);
  });

  it('getConclusion', function() {
    assert.strictEqual(top.getConclusion(), undefined);
    assert.strictEqual(trail1.getConclusion(), undefined);
    assert.strictEqual(sub1.getConclusion()?.to_string_alpha(), "X(y)");
    assert.strictEqual(trail2.getConclusion(), undefined);
    assert.strictEqual(sub2.getConclusion()?.to_string_alpha(), "Y");
    assert.strictEqual(sub3.getConclusion()?.to_string_alpha(), "Z");
    assert.strictEqual(trail3.getConclusion(), undefined);
    assert.strictEqual(trail4.getConclusion(), undefined);
  });

});
