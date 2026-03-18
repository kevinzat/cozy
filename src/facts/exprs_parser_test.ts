import * as nearley from 'nearley';
import grammar from './exprs_grammar.js';
import * as assert from 'assert';
import { Expression, Constant, Variable, Call } from './exprs';
import { ParseExpr } from './exprs_parser';


/** Ensures that the given string parses into the given expression. */
function AssertParseEqual(text: string, exp_expr: Expression): void {
  const act_expr = ParseExpr(text);
  if (!(act_expr instanceof Expression)) {
    console.log("Result is not an expression:", act_expr);
  }
  if (!act_expr.equals(exp_expr)) {
    console.log(act_expr.to_string());
    console.log("    vs");
    console.log(exp_expr.to_string());
  }
  assert.ok(act_expr instanceof Expression && act_expr.equals(exp_expr));
}


describe('exprs_parser', function() {

  it('parse primaries', function() {
    AssertParseEqual("0", Constant.of(0));
    AssertParseEqual("1", Constant.of(1));
    AssertParseEqual("2", Constant.of(2));
    AssertParseEqual("-1", Call.negate(Constant.of(1)));

    AssertParseEqual("x", Variable.of("x"));
    AssertParseEqual("x_1", Variable.of("x_1"));

    AssertParseEqual("f(x)", Call.of("f", new Variable("x")));
    AssertParseEqual("gcd(a, b)", Call.of("gcd",
        new Variable("a"), new Variable("b")));
    AssertParseEqual("add(x, y)", Call.of("add",
        new Variable("x"), new Variable("y")));
  });

  it('parse operators', function() {
    AssertParseEqual("x^10",
        Call.exponentiate(Variable.of("x"), Constant.of(10)));
    AssertParseEqual("2*x*y",
        Call.multiply(
            Call.multiply(Constant.of(2), Variable.of("x")),
            Variable.of("y")));
    AssertParseEqual("2*x+3*y",
        Call.add(
            Call.multiply(Constant.of(2), Variable.of("x")),
            Call.multiply(Constant.of(3), Variable.of("y"))));
    AssertParseEqual("-x+y-x*y",
        Call.subtract(
            Call.add(Call.negate(Variable.of("x")), Variable.of("y")),
            Call.multiply(Variable.of("x"), Variable.of("y"))));
  });

  it('parse nested', function() {
    AssertParseEqual("(x+y)^3",
        Call.exponentiate(
            Call.add(Variable.of("x"), Variable.of("y")),
            Constant.of(3)));
    AssertParseEqual("(x-y)*z",
        Call.multiply(
            Call.subtract(Variable.of("x"), Variable.of("y")),
            Variable.of("z")));
  });

});