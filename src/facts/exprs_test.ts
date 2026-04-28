import * as assert from 'assert';
import * as exprs from './exprs';
import { Expression, Constant, Variable, Call } from './exprs';
import { ParseExpr } from './exprs_parser';


const zero = Constant.of(0n);
const one = Constant.of(1n);
const neg_one = Constant.of(-1n);

const x = Variable.of("x");
const y = Variable.of("y");

const fx = Call.of("f", x);
const gxy = Call.of("g", x, y);


/** Checks that the two lists of strings contain the same elements. */
function AssertEqualSets(act_vals: string[], exp_vals: string[]) {
  const act_set = new Set<string>(act_vals);
  const exp_set = new Set<string>(exp_vals);
  assert.strictEqual(act_set.size, exp_set.size);

  for (const val of act_vals) {
    assert.ok(exp_set.has(val));
  }
}


describe('exprs', function() {

  it('equals', function() {
    const vals: Expression[] = [zero, one, neg_one, x, y, fx, gxy];
    for (let i = 0; i < vals.length; i++) {
      for (let j = 0; j < vals.length; j++) {
        assert.strictEqual(vals[i].equals(vals[j]), i === j);
      }
    }
  });

  it('to_string', function() {
    assert.strictEqual(
        Call.exponentiate(Variable.of("x"), Constant.of(10n)).to_string(),
        "x^10");
    assert.strictEqual(
        Call.multiply(
            Call.multiply(Constant.of(2n), Variable.of("x")),
            Variable.of("y")).to_string(),
        "2*x*y");
    assert.strictEqual(
        Call.add(
            Call.multiply(Constant.of(2n), Variable.of("x")),
            Call.multiply(Constant.of(3n), Variable.of("y"))).to_string(),
        "2*x + 3*y");
    assert.strictEqual(
        Call.add(
            Call.subtract(Variable.of("x"), Variable.of("y")),
            Call.negate(Call.multiply(Variable.of("x"), Variable.of("y")))).to_string(),
        "x - y + -x*y");
    assert.strictEqual(
        Call.exponentiate(
            Call.add(Variable.of("x"), Variable.of("y")),
            Constant.of(3n)).to_string(),
        "(x + y)^3");
    assert.strictEqual(
        Call.multiply(
            Variable.of("z"),
            Call.subtract(Variable.of("x"), Variable.of("y"))).to_string(),
        "z*(x - y)");
    assert.strictEqual(
        Call.subtract(
            Constant.of(7n),
            Call.add(Variable.of("y"), Constant.of(3n))).to_string(),
        "7 - (y + 3)");


    const a = exprs.Variable.of("a");
    const b = exprs.Variable.of("b");
    const c = exprs.Variable.of("c");
    const abc1 = exprs.Call.multiply(exprs.Call.multiply(a, b), c);
    const abc2 = exprs.Call.multiply(a, exprs.Call.multiply(b, c));

    const abc3 = exprs.Call.add(exprs.Call.add(a, b), c);
    const abc4 = exprs.Call.add(a, exprs.Call.add(b, c));
    assert.strictEqual(abc1.to_string(), "a*b*c");
    assert.strictEqual(abc2.to_string(), "a*(b*c)");
    assert.strictEqual(abc3.to_string(), "a + b + c");
    assert.strictEqual(abc4.to_string(), "a + (b + c)");

    const A = exprs.Variable.of("A");
    const B = exprs.Variable.of("B");
    const C = exprs.Variable.of("C");
    const ex1 = exprs.Call.setUnion(
        exprs.Call.setComplement(A), exprs.Call.setComplement(B));
    assert.strictEqual(ex1.to_string(), "~A cup ~B");
    const ex2 = exprs.Call.setIntersection(
        exprs.Call.setComplement(A), exprs.Call.setComplement(B));
    assert.strictEqual(ex2.to_string(), "~A cap ~B");
    const ex3 = exprs.Call.setComplement(exprs.Call.setUnion(A, B));
    assert.strictEqual(ex3.to_string(), "~(A cup B)");
    const ex4 = exprs.Call.setUnion(
        exprs.Call.setIntersection(A, B), exprs.Call.setIntersection(A, C));
    assert.strictEqual(ex4.to_string(), "A cap B cup A cap C");
    const ex5 = exprs.Call.setIntersection(
        exprs.Call.setUnion(A, B), exprs.Call.setUnion(A, C));
    assert.strictEqual(ex5.to_string(), "(A cup B) cap (A cup C)");
    const ex6 = exprs.Call.setDifference(
        exprs.Call.setIntersection(
            exprs.Call.setDifference(A, C), B), C);
    assert.strictEqual(ex6.to_string(), "A \\ C cap B \\ C");
    const ex7 = exprs.Call.setIntersection(
        exprs.Call.setDifference(A, C), exprs.Call.setDifference(B, C));
    assert.strictEqual(ex7.to_string(), "A \\ C cap (B \\ C)");
  });

  it('var_revs', function() {
    let expr = Call.exponentiate(Variable.of("x"), Constant.of(10n));
    AssertEqualSets(expr.var_refs(), ["x"]);

    expr = Call.multiply(
        Call.multiply(Constant.of(2n), Variable.of("x")), Variable.of("y"));
    AssertEqualSets(expr.var_refs(), ["x", "y"]);

    expr = Call.add(
        Call.multiply(Constant.of(2n), Variable.of("y")),
        Call.multiply(Constant.of(3n), Variable.of("x")));
    AssertEqualSets(expr.var_refs(), ["x", "y"]);

    expr = Call.add(
        Call.subtract(Variable.of("x"), Variable.of("y")),
        Call.negate(Call.multiply(Variable.of("z"), Variable.of("y"))));
    AssertEqualSets(expr.var_refs(), ["x", "y", "z"]);

    expr = Call.exponentiate(
        Call.add(Variable.of("x"), Variable.of("z")), Constant.of(3n));
    AssertEqualSets(expr.var_refs(), ["x", "z"]);

    expr = Call.multiply(
        Variable.of("z"), Call.subtract(Variable.of("x"), Variable.of("y")));
    AssertEqualSets(expr.var_refs(), ["x", "y", "z"]);
  });

  it('subst', function() {
    const expr = Call.add(
        Call.subtract(Variable.of("x"),
            Call.exponentiate(Variable.of("y"), Constant.of(3n))),
        Call.negate(Call.multiply(Variable.of("z"), Variable.of("y"))));

    assert.strictEqual(expr.to_string(), "x - y^3 + -z*y");
    assert.strictEqual(
        expr.subst(Variable.of("a"), Variable.of("x")).to_string(),
        "x - y^3 + -z*y");

    assert.strictEqual(
        expr.subst(Variable.of("x"), Variable.of("z")).to_string(),
        "z - y^3 + -z*y");
    assert.strictEqual(
        expr.subst(Variable.of("y"), Variable.of("x")).to_string(),
        "x - x^3 + -z*x");
    assert.strictEqual(
        expr.subst(Variable.of("y"), Variable.of("z")).to_string(),
        "x - z^3 + -z*z");

    assert.strictEqual(
        expr.subst(Variable.of("x"), Constant.of(1n)).to_string(),
        "1 - y^3 + -z*y");
    assert.strictEqual(
        expr.subst(Variable.of("y"), Constant.of(2n)).to_string(),
        "x - 2^3 + -z*2");
    assert.strictEqual(
        expr.subst(Variable.of("y"), Constant.of(-3n)).to_string(),
        "x - (-3)^3 + -z*(-3)");

    const from = Call.negate(
        Call.multiply(Variable.of("z"), Variable.of("y")));
    const to = Call.exponentiate(Variable.of("y"), Constant.of(2n));
    assert.strictEqual(expr.subst(from, to).to_string(), "x - y^3 + y^2");
  });

  it('eval_constants', function() {
    const expr = Call.add(
        Call.subtract(Constant.of(16n),
            Call.exponentiate(Constant.of(2n), Constant.of(3n))),
        Call.negate(Call.multiply(Constant.of(2n), Constant.of(3n))));
    assert.strictEqual(expr.eval_constants().to_string(), "2");
  });

  it('subst + simplify', function() {
    let expr: Expression = Call.add(
        Call.subtract(Variable.of("x"),
            Call.exponentiate(Variable.of("y"), Constant.of(3n))),
        Call.negate(Call.multiply(Variable.of("z"), Variable.of("y"))));
    expr = expr.subst(Variable.of("x"), Constant.of(16n));
    expr = expr.subst(Variable.of("y"), Constant.of(2n));
    expr = expr.subst(Variable.of("z"), Constant.of(3n));

    assert.ok(expr.simplify().equals(Constant.of(2n)));
  });

  it('associate', function() {
    let expr: Expression = Constant.of(3n);
    assert.ok(expr.associate().equals(expr));

    expr = Variable.of("x");
    assert.ok(expr.associate().equals(expr));

    expr = Call.add(
        Call.add(Variable.of("x"), Variable.of("y")),
        Call.add(Constant.of(2n), Variable.of("z")));
    assert.ok(expr.associate().equals(
        Call.of(exprs.FUNC_ADD,
            Variable.of("x"), Variable.of("y"), Constant.of(2n),
            Variable.of("z"))));

    expr = Call.multiply(
        Call.multiply(Variable.of("x"), Variable.of("y")),
        Call.multiply(Constant.of(2n), Variable.of("z")));
    assert.ok(expr.associate().equals(
        Call.of(exprs.FUNC_MULTIPLY,
            Variable.of("x"), Variable.of("y"), Constant.of(2n),
            Variable.of("z"))));
  });

  it('remove negation', function() {
    let expr1: Expression = Call.add(
        Call.subtract(Variable.of("x"),
            Call.exponentiate(Variable.of("y"), Constant.of(3n))),
        Call.negate(Call.multiply(Variable.of("z"), Variable.of("y"))));
    let expr2 = expr1.remove_negation();
    assert.strictEqual(expr2.to_string(), "x + (-1)*y^3 + (-1)*(z*y)");
  });

  it('remove negation + associate + eval + identities', function() {
    let expr3: Expression = Call.subtract(
        Variable.of("x"), Call.negate(Variable.of("y")));
    let expr4 = expr3.remove_negation();
    expr4 = expr4.associate();
    expr4 = expr4.eval_constants();
    expr4 = expr4.apply_identities();
    assert.strictEqual(expr4.to_string(), "x + y");
  });

  it('add negation', function() {
    let expr1: Expression = new Call(exprs.FUNC_ADD, [ 
        Variable.of("x"),
        Call.multiply(Constant.MINUS_ONE, Variable.of("y")),
        Call.multiply(Constant.MINUS_ONE, Variable.of("z"))]);
    let expr2 = expr1.add_negation();
    assert.strictEqual(expr2.to_string(), "x - y - z");
  });

  it('combine_factors', function() {
    let args = [
        Variable.of("x"), Variable.of("y"), Variable.of("z"), Variable.of("x"),
        Call.exponentiate(Variable.of("y"), Constant.of(2n))
      ];
    let [newArgs, value] = Call.combine_factors(args);
    assert.strictEqual(value, 1n);
    assert.strictEqual(newArgs.length, 3);
    assert.strictEqual(newArgs[0].to_string(), "x^2");
    assert.strictEqual(newArgs[1].to_string(), "y^3");
    assert.strictEqual(newArgs[2].to_string(), "z");

    args = [
        Call.add(Variable.of("x"), Variable.of("y")),
        Call.subtract(Variable.of("x"), Variable.of("y")),
        Call.add(Variable.of("x"), Variable.of("y")),
        Call.subtract(Variable.of("x"), Variable.of("y")),
        Variable.of("x")
      ];
    [newArgs, value] = Call.combine_factors(args);
    assert.strictEqual(value, 1n);
    assert.strictEqual(newArgs.length, 3);
    assert.strictEqual(newArgs[0].to_string(), "x");
    assert.strictEqual(newArgs[1].to_string(), "(x + y)^2");
    assert.strictEqual(newArgs[2].to_string(), "(x - y)^2");
  });

  it('combine_terms', function() {
    let args = [
        Variable.of("x"), Variable.of("y"), Variable.of("z"), Variable.of("x"),
        Call.multiply(Constant.of(2n), Variable.of("y"))
      ];
    let newArgs = Call.combine_terms(args);
    assert.strictEqual(newArgs.length, 3);
    assert.strictEqual(newArgs[0].to_string(), "2*x");
    assert.strictEqual(newArgs[1].to_string(), "3*y");
    assert.strictEqual(newArgs[2].to_string(), "1*z");
  });

  it('combine_arguments + identities', function() {
    let expr: Expression = Call.add(
        Call.multiply(Variable.of("x"),
            Call.multiply(Variable.of("y"), Variable.of("x"))),
        Call.multiply(Variable.of("y"),
            Call.exponentiate(Variable.of("x"), Constant.of(2n))));
    expr = expr.associate();
    assert.strictEqual(expr.to_string(), "x*y*x + y*x^2");

    let expr2 = expr.combine_arguments();
    assert.strictEqual(expr2.to_string(), "2*x^2*y");

    let expr3 = expr2.apply_identities();
    assert.strictEqual(expr3.to_string(), "2*x^2*y");
  });

  it('simplify', function() {
    let expr: Expression = Call.add(
        Call.multiply(Variable.of("x"),
            Call.multiply(Variable.of("y"), Variable.of("x"))),
        Call.multiply(Variable.of("y"),
            Call.multiply(
                Call.exponentiate(Variable.of("x"), Constant.of(2n)),
                Constant.of(3n))));
    assert.strictEqual(expr.to_string(), "x*(y*x) + y*(x^2*3)");

    let expr2 = expr.simplify();
    assert.strictEqual(expr2.to_string(), "4*x^2*y");
  });

  it('remove_exponents', function() {
    let expr: Expression = Call.add(
        Call.multiply(Variable.of("x"), Call.exponentiate(
            Call.add(Variable.of("y"), Variable.of("z")),
            Constant.of(3n))),
        Call.multiply(Call.exponentiate(
            Call.add(Variable.of("x"), Variable.of("y")), Constant.of(2n)),
            Variable.of("z")));
    assert.strictEqual(expr.to_string(), "x*(y + z)^3 + (x + y)^2*z");

    let expr2 = expr.remove_exponents();
    assert.strictEqual(expr2.to_string(),
        "x*((y + z)*(y + z)*(y + z)) + (x + y)*(x + y)*z");

    let expr3: Expression = Call.exponentiate(
        Call.exponentiate(Variable.of("x"), Constant.of(2n)), Constant.of(3n));
    assert.strictEqual(expr3.to_string(), "(x^2)^3");

    let expr4 = expr3.remove_exponents();
    assert.strictEqual(expr4.to_string(), "x^6");
  });

  it('remove_exponents', function() {
    let expr: Expression = Call.multiply(
        Call.of("gcd", Variable.of("a"), Constant.of(3n)),
        Call.multiply(
            Call.add(Variable.of("x"), Variable.of("y")),
            Call.multiply(
                Variable.of("x"),
                Call.multiply(
                    Call.add(Variable.of("x"), Variable.of("y")),
                    Constant.of(4n)))));
    assert.strictEqual(expr.to_string(), "gcd(a, 3)*((x + y)*(x*((x + y)*4)))");

    let expr2 = expr.distribute();
    assert.strictEqual(expr2.to_string(),
        "gcd(a, 3)*(x*(x*(x*4))) + gcd(a, 3)*(x*(x*(y*4))) + gcd(a, 3)*(y*(x*(x*4))) + gcd(a, 3)*(y*(x*(y*4)))");

    let expr3: Expression = Call.exponentiate(
        Call.add(Variable.of("x"), Variable.of("y")), Constant.of(3n));
    assert.strictEqual(expr3.to_string(), "(x + y)^3");

    let expr4: Expression = expr3.remove_exponents().distribute();
    assert.strictEqual(expr4.to_string(),
        "x*x*x + x*x*y + x*y*x + x*y*y + y*x*x + y*x*y + y*y*x + y*y*y");
  });

  it('distribute', function() {
    let expr1: Expression = 
        Call.add(
            Call.multiply(Variable.of("x"), Variable.of("x")),
            Call.multiply(Variable.of("y"),
                Call.add(Variable.of("y"),
                    Call.multiply(Constant.MINUS_ONE, Variable.of("x")))));
    assert.strictEqual(expr1.to_string(), "x*x + y*(y + (-1)*x)");

    let expr2: Expression = expr1.distribute();
    assert.strictEqual(expr2.to_string(), "x*x + (y*y + y*((-1)*x))");
  });

  it('normalize', function() {
    let expr: Expression = Call.exponentiate(
        Call.add(Variable.of("x"), Variable.of("y")), Constant.of(3n));
    assert.strictEqual(expr.to_string(), "(x + y)^3");

    let expr2: Expression = expr.normalize();
    assert.strictEqual(expr2.to_string(),
        "3*x*y^2 + 3*x^2*y + x^3 + y^3");

    let expr3: Expression = Call.exponentiate(
        Call.add(Variable.of("x"), Variable.of("y")), Constant.of(5n));
    assert.strictEqual(expr3.to_string(), "(x + y)^5");

    let expr4: Expression = expr3.normalize();
    assert.strictEqual(expr4.to_string(),
        "5*x*y^4 + 10*x^2*y^3 + 10*x^3*y^2 + 5*x^4*y + x^5 + y^5");

    let expr5: Expression = Call.multiply(
        Call.add(Variable.of("x"),
            Call.add(Variable.of("y"),
                Call.multiply(Constant.ZERO, Variable.of("z")))),
        Call.subtract(Variable.of("x"), Variable.of("y")));
    assert.strictEqual(expr5.to_string(), "(x + (y + 0*z))*(x - y)");

    let expr6: Expression = expr5.normalize();
    assert.strictEqual(expr6.to_string(), "x^2 + (-1)*y^2");

    let expr7: Expression = 
        Call.add(
            Call.multiply(
                Call.add(Constant.ONE, Variable.of("y")),
                Variable.of("x")),
            Call.multiply(Variable.of("y"),
                Call.add(Variable.of("y"),
                    Call.multiply(Constant.MINUS_ONE, Variable.of("x")))));
    assert.strictEqual(expr7.to_string(), "(1 + y)*x + y*(y + (-1)*x)");

    let expr8: Expression = expr7.normalize();
    assert.strictEqual(expr8.to_string(), "x + y^2");

    let expr9: Expression = Call.subtract(Variable.of("x"), Variable.of("x"));
    assert.strictEqual(expr9.to_string(), "x - x");

    let expr10: Expression = expr9.normalize();
    assert.strictEqual(expr10.to_string(), "0");

    let expr11: Expression = Call.multiply(
        Constant.of(2n),
        Call.subtract(
            Call.add(Variable.of("a"), Variable.of("b")),
            Variable.of("y")));
    assert.strictEqual(expr11.to_string(), "2*(a + b - y)");

    let expr12: Expression = expr11.normalize();
    assert.strictEqual(expr12.to_string(), "2*a + 2*b + (-2)*y");

    let expr13: Expression = ParseExpr("(n+1)*(n*(n+1)+1*(n+1)+2)");
    let expr14: Expression = expr13.normalize();
    assert.strictEqual(expr14.to_string(), "3 + 5*n + 3*n^2 + n^3");

    let expr15: Expression = ParseExpr("(n+1)*(n^2+n+n+1+2)");
    assert.ok(expr14.equals(expr15.normalize()));
  });

});
