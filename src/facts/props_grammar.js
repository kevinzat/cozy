// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
// Converted to ESM

import * as props from './props.ts';
import * as exprs from './exprs.ts';
import moo from 'moo';

function id(x) { return x[0]; }

const lexer = moo.compile({
  WS: /[ \t\r]+/,
  NL: { match: /\n/, lineBreaks: true },
  true: /true/, false: /false/,
  lparen: /\(/, rparen: /\)/,
  not: /not/, and: /and/, or: /or/,
  implies: /->/, iff: /<->/,
  exists: /exists/, forall: /forall/,
  comma: /,/,
  elemof: /in/, subset: /subset/, sameset: /sameset/,
  cap: /cap/, cup: /cup/, comp: /~/, diff: /\\/,
  predicate: /[A-Z][_a-zA-Z0-9]*/,
  variable: /[a-z][_a-zA-Z0-9]*/,
  constant: /[0-9]+/,
  exp: /\^/, times: /\*/, plus: /\+/, minus: /\-/,
  equal: /=/, lessorequal: /<=/, lessthan: /</    /* NOTE: <= before < */
});
const lexer2 = {
  save: () => lexer.save(),
  reset: (chunk, info) => lexer.reset(chunk, info),
  formatError: (tok) => lexer.formatError(tok),
  has: (name) => lexer.has(name),
  next: () => {
    let tok;
    do {
      tok = lexer.next();
    } while (tok !== undefined && (tok.type === 'WS' || tok.type === 'NL'));
    return tok;
  }
};
/** Turns a linked list into an (optionally reversed) array. */
function list_to_array(a, rev) {
  const res = [];
  while (a instanceof Array && a.length == 2) {
    res.push(a[0]);
    a = a[1];
  }
  res.push(a);
  if (rev)
    res.reverse();
  return res;
}
var grammar = {
    Lexer: lexer2,
    ParserRules: [
    {"name": "Prop", "symbols": [(lexer2.has("exists") ? {type: "exists"} : exists), (lexer2.has("variable") ? {type: "variable"} : variable), (lexer2.has("comma") ? {type: "comma"} : comma), "Prop"], "postprocess": ([a, b, c, d]) => props.Exists.of(b.text, d)},
    {"name": "Prop", "symbols": [(lexer2.has("forall") ? {type: "forall"} : forall), (lexer2.has("variable") ? {type: "variable"} : variable), (lexer2.has("comma") ? {type: "comma"} : comma), "Prop"], "postprocess": ([a, b, c, d]) => props.ForAll.of(b.text, d)},
    {"name": "Prop", "symbols": ["Arrow"], "postprocess": ([a]) => a},
    {"name": "Arrow", "symbols": ["Disj", (lexer2.has("implies") ? {type: "implies"} : implies), "Arrow"], "postprocess": ([a, b, c]) => props.Implication.of(a, c)},
    {"name": "Arrow", "symbols": ["Disj", (lexer2.has("iff") ? {type: "iff"} : iff), "Arrow"], "postprocess": ([a, b, c]) => props.Biconditional.of(a, c)},
    {"name": "Arrow", "symbols": ["Disj"], "postprocess": ([a]) => a},
    {"name": "Disj", "symbols": ["Disj", (lexer2.has("or") ? {type: "or"} : or), "Conj"], "postprocess": ([a, b, c]) => props.Disjunction.of(a, c)},
    {"name": "Disj", "symbols": ["Conj"], "postprocess": ([a]) => a},
    {"name": "Conj", "symbols": ["Conj", (lexer2.has("and") ? {type: "and"} : and), "Atom"], "postprocess": ([a, b, c]) => props.Conjunction.of(a, c)},
    {"name": "Conj", "symbols": ["Atom"], "postprocess": ([a]) => a},
    {"name": "Atom", "symbols": [(lexer2.has("not") ? {type: "not"} : not), "Atom"], "postprocess": ([a, b]) => props.Negation.of(b)},
    {"name": "Atom", "symbols": ["Prim"], "postprocess": ([a]) => a},
    {"name": "Prim", "symbols": [(lexer2.has("lparen") ? {type: "lparen"} : lparen), "Prop", (lexer2.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": ([a, b, c]) => b},
    {"name": "Prim", "symbols": [(lexer2.has("true") ? {type: "true"} : true)], "postprocess": ([a]) => props.TRUE},
    {"name": "Prim", "symbols": [(lexer2.has("false") ? {type: "false"} : false)], "postprocess": ([a]) => props.FALSE},
    {"name": "Prim", "symbols": [(lexer2.has("predicate") ? {type: "predicate"} : predicate)], "postprocess": ([a]) => props.Predicate.of(a.text)},
    {"name": "Prim", "symbols": [(lexer2.has("predicate") ? {type: "predicate"} : predicate), (lexer2.has("lparen") ? {type: "lparen"} : lparen), "Params", (lexer2.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": ([a, b, c, d]) => new props.Predicate(a.text, list_to_array(c, true))},
    {"name": "Prim", "symbols": ["Expr", (lexer2.has("equal") ? {type: "equal"} : equal), "Expr"], "postprocess": ([a, b, c]) => props.Predicate.equal(a, c)},
    {"name": "Prim", "symbols": ["Expr", (lexer2.has("lessthan") ? {type: "lessthan"} : lessthan), "Expr"], "postprocess": ([a, b, c]) => props.Predicate.lessThan(a, c)},
    {"name": "Prim", "symbols": ["Expr", (lexer2.has("lessorequal") ? {type: "lessorequal"} : lessorequal), "Expr"], "postprocess": ([a, b, c]) => props.Predicate.lessOrEqual(a, c)},
    {"name": "Prim", "symbols": ["Expr", (lexer2.has("elemof") ? {type: "elemof"} : elemof), "SetTerm"], "postprocess": ([a, b, c]) => props.Predicate.elementOf(a, c)},
    {"name": "Prim", "symbols": ["SetTerm", (lexer2.has("subset") ? {type: "subset"} : subset), "SetTerm"], "postprocess": ([a, b, c]) => props.Predicate.subset(a, c)},
    {"name": "Prim", "symbols": ["SetTerm", (lexer2.has("sameset") ? {type: "sameset"} : sameset), "SetTerm"], "postprocess": ([a, b, c]) => props.Predicate.sameSet(a, c)},
    {"name": "Params", "symbols": ["Expr"], "postprocess": ([a]) => a},
    {"name": "Params", "symbols": ["SetTermNoLowerCase"], "postprocess": ([a]) => a},
    {"name": "Params", "symbols": ["Params", (lexer2.has("comma") ? {type: "comma"} : comma), "Expr"], "postprocess": ([a, b, c]) => [c, a]},
    {"name": "Params", "symbols": ["Params", (lexer2.has("comma") ? {type: "comma"} : comma), "SetTermNoLowerCase"], "postprocess": ([a, b, c]) => [c, a]},
    {"name": "SetTerm", "symbols": ["SetTerm", (lexer2.has("cup") ? {type: "cup"} : cup), "SetFactor"], "postprocess": ([a, b, c]) => exprs.Call.setUnion(a, c)},
    {"name": "SetTerm", "symbols": ["SetFactor"], "postprocess": ([a]) => a},
    {"name": "SetFactor", "symbols": ["SetFactor", (lexer2.has("cap") ? {type: "cap"} : cap), "NegSetFactor"], "postprocess": ([a, b, c]) => exprs.Call.setIntersection(a, c)},
    {"name": "SetFactor", "symbols": ["SetFactor", (lexer2.has("diff") ? {type: "diff"} : diff), "NegSetFactor"], "postprocess": ([a, b, c]) => exprs.Call.setDifference(a, c)},
    {"name": "SetFactor", "symbols": ["NegSetFactor"], "postprocess": ([a]) => a},
    {"name": "NegSetFactor", "symbols": [(lexer2.has("comp") ? {type: "comp"} : comp), "NegSetFactor"], "postprocess": ([a, b]) => exprs.Call.setComplement(b)},
    {"name": "NegSetFactor", "symbols": ["SetPrimary"], "postprocess": ([a]) => a},
    {"name": "SetPrimary", "symbols": [(lexer2.has("predicate") ? {type: "predicate"} : predicate)], "postprocess": ([a]) => new exprs.Variable(a.text)},
    {"name": "SetPrimary", "symbols": [(lexer2.has("variable") ? {type: "variable"} : variable)], "postprocess": ([a]) => new exprs.Variable(a.text)},
    {"name": "SetPrimary", "symbols": [(lexer2.has("variable") ? {type: "variable"} : variable), (lexer2.has("lparen") ? {type: "lparen"} : lparen), "SetTerms", (lexer2.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": ([a, b, c, d]) => new exprs.Call(a.text, list_to_array(c, true))},
    {"name": "SetPrimary", "symbols": [(lexer2.has("lparen") ? {type: "lparen"} : lparen), "SetTerm", (lexer2.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": ([a, b, c]) => b},
    {"name": "SetTerms", "symbols": ["SetTerm"], "postprocess": ([a]) => a},
    {"name": "SetTerms", "symbols": ["SetTerms", (lexer2.has("comma") ? {type: "comma"} : comma), "SetTerm"], "postprocess": ([a, b, c]) => [c, a]},
    {"name": "SetTermNoLowerCase", "symbols": ["SetTerm", (lexer2.has("cup") ? {type: "cup"} : cup), "SetFactor"], "postprocess": ([a, b, c]) => exprs.Call.setUnion(a, c)},
    {"name": "SetTermNoLowerCase", "symbols": ["SetFactorNoLowerCase"], "postprocess": ([a]) => a},
    {"name": "SetFactorNoLowerCase", "symbols": ["SetFactor", (lexer2.has("cap") ? {type: "cap"} : cap), "NegSetFactor"], "postprocess": ([a, b, c]) => exprs.Call.setIntersection(a, c)},
    {"name": "SetFactorNoLowerCase", "symbols": ["SetFactor", (lexer2.has("diff") ? {type: "diff"} : diff), "NegSetFactor"], "postprocess": ([a, b, c]) => exprs.Call.setDifference(a, c)},
    {"name": "SetFactorNoLowerCase", "symbols": ["NegSetFactorNoLowerCase"], "postprocess": ([a]) => a},
    {"name": "NegSetFactorNoLowerCase", "symbols": [(lexer2.has("comp") ? {type: "comp"} : comp), "NegSetFactor"], "postprocess": ([a, b]) => exprs.Call.setComplement(b)},
    {"name": "NegSetFactorNoLowerCase", "symbols": ["SetPrimaryNoLowerCase"], "postprocess": ([a]) => a},
    {"name": "SetPrimaryNoLowerCase", "symbols": [(lexer2.has("predicate") ? {type: "predicate"} : predicate)], "postprocess": ([a]) => new exprs.Variable(a.text)},
    {"name": "SetPrimaryNoLowerCase", "symbols": [(lexer2.has("variable") ? {type: "variable"} : variable), (lexer2.has("lparen") ? {type: "lparen"} : lparen), "SetTermsNoLowerCase", (lexer2.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": ([a, b, c, d]) => new exprs.Call(a.text, list_to_array(c, true))},
    {"name": "SetPrimaryNoLowerCase", "symbols": [(lexer2.has("lparen") ? {type: "lparen"} : lparen), "SetTermNoLowerCase", (lexer2.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": ([a, b, c]) => b},
    {"name": "SetTermsNoLowerCase", "symbols": ["SetTermNoLowerCase"], "postprocess": ([a]) => a},
    {"name": "SetTermsNoLowerCase", "symbols": ["SetTermsNoLowerCase", (lexer2.has("comma") ? {type: "comma"} : comma), "SetTermNoLowerCase"], "postprocess": ([a, b, c]) => [c, a]},
    {"name": "Expr", "symbols": ["Expr", (lexer2.has("plus") ? {type: "plus"} : plus), "NegTerm"], "postprocess": ([a, b, c]) => new exprs.Call(exprs.FUNC_ADD, [a, c])},
    {"name": "Expr", "symbols": ["Expr", (lexer2.has("minus") ? {type: "minus"} : minus), "NegTerm"], "postprocess": ([a, b, c]) => new exprs.Call(exprs.FUNC_SUBTRACT, [a, c])},
    {"name": "Expr", "symbols": ["NegTerm"], "postprocess": ([a]) => a},
    {"name": "NegTerm", "symbols": [(lexer2.has("minus") ? {type: "minus"} : minus), "NegTerm"], "postprocess": ([a, b]) => new exprs.Call(exprs.FUNC_NEGATE, [b])},
    {"name": "NegTerm", "symbols": ["Term"], "postprocess": ([a]) => a},
    {"name": "Term", "symbols": ["Term", (lexer2.has("times") ? {type: "times"} : times), "Factor"], "postprocess": ([a, b, c]) => new exprs.Call(exprs.FUNC_MULTIPLY, [a, c])},
    {"name": "Term", "symbols": ["Factor"], "postprocess": ([a]) => a},
    {"name": "Factor", "symbols": ["Primary", (lexer2.has("exp") ? {type: "exp"} : exp), (lexer2.has("constant") ? {type: "constant"} : constant)], "postprocess": ([a, b, c]) => new exprs.Call(exprs.FUNC_EXPONENTIATE, [a, new exprs.Constant(BigInt(c.text))])},
    {"name": "Factor", "symbols": ["Primary"], "postprocess": ([a]) => a},
    {"name": "Primary", "symbols": [(lexer2.has("constant") ? {type: "constant"} : constant)], "postprocess": ([a]) => new exprs.Constant(BigInt(a.text))},
    {"name": "Primary", "symbols": [(lexer2.has("variable") ? {type: "variable"} : variable)], "postprocess": ([a]) => new exprs.Variable(a.text)},
    {"name": "Primary", "symbols": [(lexer2.has("variable") ? {type: "variable"} : variable), (lexer2.has("lparen") ? {type: "lparen"} : lparen), "Exprs", (lexer2.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": ([a, b, c, d]) => new exprs.Call(a.text, list_to_array(c, true))},
    {"name": "Primary", "symbols": [(lexer2.has("lparen") ? {type: "lparen"} : lparen), "Expr", (lexer2.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": ([a, b, c]) => b},
    {"name": "Exprs", "symbols": ["Expr"], "postprocess": ([a]) => a},
    {"name": "Exprs", "symbols": ["Exprs", (lexer2.has("comma") ? {type: "comma"} : comma), "Expr"], "postprocess": ([a, b, c]) => [c, a]}
]
  , ParserStart: "Prop"
};

export default grammar;
