import * as assert from 'assert';
import { Constant, Variable, Call } from './exprs';
import { Predicate, Conjunction, Biconditional, Exists } from './props';
import { UnifyProps, UnifyExprs } from './unify';


describe('unify', function() {

  it('props', function() {
    const prop1 = Conjunction.of(
        Predicate.of("P", Constant.of(0n), Constant.of(1n)),
        Predicate.of("Q", Variable.of("x")));
    const prop2 = Conjunction.of(
        Predicate.of("P", Constant.of(0n), Variable.of("v")),
        Predicate.of("Q", Call.of("bar", Constant.of(2n))));
    const subst = UnifyProps(prop1, prop2);
    assert.ok(subst !== undefined);
    assert.strictEqual(subst!.size, 2);
    assert.ok(subst.has("v"));
    assert.strictEqual(subst.get("v")!.to_string(), "1");
    assert.ok(subst.has("x"));
    assert.strictEqual(subst.get("x")!.to_string(), "bar(2)");
  });

  it('props allowed_vars', function() {
    const prop1 = Conjunction.of(
        Predicate.of("P", Constant.of(0n), Constant.of(1n)),
        Predicate.of("Q", Variable.of("x")));
    const prop2 = Conjunction.of(
        Predicate.of("P", Constant.of(0n), Variable.of("v")),
        Predicate.of("Q", Call.of("bar", Constant.of(2n))));
    const subst = UnifyProps(prop1, prop2, new Set(["v", "x"]));
    assert.ok(subst !== undefined);
    assert.strictEqual(subst!.size, 2);
    assert.ok(subst.has("v"));
    assert.strictEqual(subst.get("v")!.to_string(), "1");
    assert.ok(subst.has("x"));
    assert.strictEqual(subst.get("x")!.to_string(), "bar(2)");

    assert.strictEqual(UnifyProps(prop1, prop2, new Set(["x"])), undefined);
  });

  it('props for def', function() {
    const def = Biconditional.of(
        Predicate.of("Even", Variable.of("x")),
        Exists.of("y",
            Predicate.equal(
                Variable.of("x"),
                Call.multiply(Constant.of(2n), Variable.of("y")))));
    const use = Predicate.of("Even", Variable.of("a"));
    const subst = UnifyProps(def.left, use, new Set(["x"]));
    assert.ok(subst !== undefined);
    assert.strictEqual(subst.size, 1);
    assert.ok(subst.has("x"));
    assert.ok(subst.get("x")!.equals(Variable.of("a")));

    const result = def.right.subst("x", subst.get("x")!);
    assert.ok(result.equals_alpha(
        Exists.of("y",
            Predicate.equal(
                Variable.of("a"),
                Call.multiply(Constant.of(2n), Variable.of("y"))))));
  });

  it('props for def repeated arg', function() {
    const def = Biconditional.of(
        Predicate.of("Foo",
            Variable.of("x"), Variable.of("y"), Variable.of("x")),
        Predicate.of("Bar",
            Call.add(Variable.of("y"),
                Call.multiply(Constant.of(5n), Variable.of("x")))));
    const use = Predicate.of("Foo",
        Variable.of("a"), Variable.of("a"), Variable.of("a"));
    const subst = UnifyProps(def.left, use, new Set(["x", "y"]));
    assert.ok(subst !== undefined);
    assert.strictEqual(subst.size, 2);
    assert.ok(subst.has("x"));
    assert.ok(subst.get("x")!.equals(Variable.of("a")));
    assert.ok(subst.has("y"));
    assert.ok(subst.get("y")!.equals(Variable.of("a")));

    const result = def.right.subst("x", subst.get("x")!).subst("y", subst.get("y")!);
    assert.ok(result.equals_alpha(
        Predicate.of("Bar",
            Call.add(Variable.of("a"),
                Call.multiply(Constant.of(5n), Variable.of("a"))))));
  });

  it('exprs', function() {
    const expr1 = Call.of("f",
        Constant.of(0n), Constant.of(1n), Variable.of("x"));
    const expr2 = Call.of("f",
        Constant.of(0n), Variable.of("v"), Call.of("bar", Constant.of(2n)));
    const subst = UnifyExprs(expr1, expr2);
    assert.ok(subst !== undefined);
    assert.strictEqual(subst!.size, 2);
    assert.ok(subst.has("v"));
    assert.strictEqual(subst.get("v")!.to_string(), "1");
    assert.ok(subst.has("x"));
    assert.strictEqual(subst.get("x")!.to_string(), "bar(2)");

    const expr3 = Call.of("f",
        Constant.of(1n), Variable.of("v"), Call.of("bar", Constant.of(2n)));
    assert.strictEqual(UnifyExprs(expr1, expr3), undefined);
  });

  it('exprs allowed_vars', function() {
    const expr1 = Call.of("f",
        Constant.of(0n), Constant.of(1n), Variable.of("x"));
    const expr2 = Call.of("f",
        Constant.of(0n), Variable.of("v"), Call.of("bar", Constant.of(2n)));
    const subst = UnifyExprs(expr1, expr2, new Set(["v", "x"]));
    assert.ok(subst !== undefined);
    assert.strictEqual(subst!.size, 2);
    assert.ok(subst.has("v"));
    assert.strictEqual(subst.get("v")!.to_string(), "1");
    assert.ok(subst.has("x"));
    assert.strictEqual(subst.get("x")!.to_string(), "bar(2)");

    assert.strictEqual(UnifyExprs(expr1, expr2, new Set(["v"])), undefined);
  });

});