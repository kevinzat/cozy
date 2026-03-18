// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
// Converted to ESM

// Grammar for describing rules when doing backward reasoning. In this case, we
// have access to the proposition we want to prove, so we can describe the rules
// more economically, inferring many rule arguments from the proposition.

import * as props from '../facts/props.ts';
import * as exprs from '../facts/exprs.ts';
import * as tactics from './tactics.ts';
import * as ast from './tactics_ast.ts';
import moo from 'moo';

function id(x) { return x[0]; }

const lexer = moo.compile({
  WS: /[ \t\r]+/,
  NL: { match: /\n/, lineBreaks: true },
  true: /true/, false: /false/,
  lparen: /\(/, rparen: /\)/,
  lbrace: /\{/, rbrace: /\}/,
  comma: /,/, dot: /\./,
  not: /not/, and: /and/, or: /or/, implies: /->/, iff: /<->/,
  given: /given/, cite: /cite/,
  direct: /direct/, proof: /proof/,
  modus: /modus/, ponens: /ponens/,
  intro: /intro/, elim: /elim/,
  left: /left/, right: /right/,
  cases: /cases/, simple: /simple/,
  contradiction: /contradiction/, absurdum: /absurdum/,
  exfalso: /exfalso/, verum: /verum/,
  tautology: /tautology/, equivalent: /equivalent/,
  exists: /exists/, forall: /forall/,
  algebra: /algebra/,
  apply: /apply/,
  induction: /induction/,
  substitute: /substitute/,
  defof: /defof/, undef: /undef/,
  elemof: /in/, subset: /subset/, sameset: /sameset/,
  cap: /cap/, cup: /cup/, comp: /~/, diff: /\\/,
  variable: /[a-z][_a-zA-Z0-9]*/,
  predicate: /[A-Z][_a-zA-Z0-9]*/,
  constant: /[0-9]+/,
  exp: /\^/, times: /\*/, plus: /\+/, minus: /\-/,
  equal: /=/, lessorequal: /<=/, lessthan: /</       /* NOTE: <= before < */
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
    {"name": "Rule", "symbols": [(lexer2.has("given") ? {type: "given"} : given), ], "postprocess": ([a]) => new ast.GivenAst()},
    {"name": "Rule", "symbols": [(lexer2.has("cite") ? {type: "cite"} : cite), (lexer2.has("predicate") ? {type: "predicate"} : predicate)], "postprocess": ([a, b]) => new ast.CiteAst(b.text)},
    {"name": "Rule", "symbols": [(lexer2.has("modus") ? {type: "modus"} : modus), (lexer2.has("ponens") ? {type: "ponens"} : ponens), (lexer2.has("lparen") ? {type: "lparen"} : lparen), "Prop", (lexer2.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": ([a, b, c, d]) => new ast.ModusPonensAst(d)},
    {"name": "Rule", "symbols": [(lexer2.has("direct") ? {type: "direct"} : direct), (lexer2.has("proof") ? {type: "proof"} : proof)], "postprocess": ([a, b]) => new ast.DirectProofAst()},
    {"name": "Rule", "symbols": [(lexer2.has("elim") ? {type: "elim"} : elim), (lexer2.has("and") ? {type: "and"} : and), (lexer2.has("lparen") ? {type: "lparen"} : lparen), "Prop", (lexer2.has("rparen") ? {type: "rparen"} : rparen), (lexer2.has("left") ? {type: "left"} : left)], "postprocess": ([a, b, c, d, e, f]) => new ast.ElimAndAst(d, true)},
    {"name": "Rule", "symbols": [(lexer2.has("elim") ? {type: "elim"} : elim), (lexer2.has("and") ? {type: "and"} : and), (lexer2.has("lparen") ? {type: "lparen"} : lparen), "Prop", (lexer2.has("rparen") ? {type: "rparen"} : rparen), (lexer2.has("right") ? {type: "right"} : right)], "postprocess": ([a, b, c, d, e, f]) => new ast.ElimAndAst(d, false)},
    {"name": "Rule", "symbols": [(lexer2.has("intro") ? {type: "intro"} : intro), (lexer2.has("and") ? {type: "and"} : and)], "postprocess": ([a, b, c, d]) => new ast.IntroAndAst()},
    {"name": "Rule", "symbols": [(lexer2.has("elim") ? {type: "elim"} : elim), (lexer2.has("or") ? {type: "or"} : or), (lexer2.has("lparen") ? {type: "lparen"} : lparen), "Prop", (lexer2.has("rparen") ? {type: "rparen"} : rparen), (lexer2.has("left") ? {type: "left"} : left)], "postprocess": ([a, b, c, d, e, f]) => new ast.ElimOrAst(d, true)},
    {"name": "Rule", "symbols": [(lexer2.has("elim") ? {type: "elim"} : elim), (lexer2.has("or") ? {type: "or"} : or), (lexer2.has("lparen") ? {type: "lparen"} : lparen), "Prop", (lexer2.has("rparen") ? {type: "rparen"} : rparen), (lexer2.has("right") ? {type: "right"} : right)], "postprocess": ([a, b, c, d, e, f]) => new ast.ElimOrAst(d, false)},
    {"name": "Rule", "symbols": [(lexer2.has("simple") ? {type: "simple"} : simple), (lexer2.has("cases") ? {type: "cases"} : cases), (lexer2.has("lparen") ? {type: "lparen"} : lparen), "Prop", (lexer2.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": ([a, b, c, d, e]) => new ast.SimpleCasesAst(d)},
    {"name": "Rule", "symbols": [(lexer2.has("cases") ? {type: "cases"} : cases), (lexer2.has("lparen") ? {type: "lparen"} : lparen), "Prop", (lexer2.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": ([a, b, c, d]) => new ast.CasesAst(c)},
    {"name": "Rule", "symbols": [(lexer2.has("intro") ? {type: "intro"} : intro), (lexer2.has("or") ? {type: "or"} : or), (lexer2.has("lparen") ? {type: "lparen"} : lparen), "Prop", (lexer2.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": ([a, b, c, d, e]) => new ast.IntroOrAst(d)},
    {"name": "Rule", "symbols": [(lexer2.has("contradiction") ? {type: "contradiction"} : contradiction), (lexer2.has("lparen") ? {type: "lparen"} : lparen), "Prop", (lexer2.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": ([a, b, c, d]) => new ast.PrincipiumContradictionisAst(c)},
    {"name": "Rule", "symbols": [(lexer2.has("absurdum") ? {type: "absurdum"} : absurdum)], "postprocess": ([a]) => new ast.ReductioAdAbsurdumAst()},
    {"name": "Rule", "symbols": [(lexer2.has("exfalso") ? {type: "exfalso"} : exfalso)], "postprocess": ([a]) => new ast.ExFalsoQuodlibetAst()},
    {"name": "Rule", "symbols": [(lexer2.has("verum") ? {type: "verum"} : verum)], "postprocess": ([a]) => new ast.AdLitteramVerumAst()},
    {"name": "Rule", "symbols": [(lexer2.has("tautology") ? {type: "tautology"} : tautology)], "postprocess": ([a]) => new ast.TautologyAst()},
    {"name": "Rule", "symbols": [(lexer2.has("equivalent") ? {type: "equivalent"} : equivalent), (lexer2.has("lparen") ? {type: "lparen"} : lparen), "Prop", (lexer2.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": ([a, b, c, d]) => new ast.EquivalentAst(c)},
    {"name": "Rule", "symbols": [(lexer2.has("elim") ? {type: "elim"} : elim), (lexer2.has("forall") ? {type: "forall"} : forall), (lexer2.has("lbrace") ? {type: "lbrace"} : lbrace), "Expr", (lexer2.has("rbrace") ? {type: "rbrace"} : rbrace), (lexer2.has("variable") ? {type: "variable"} : variable)], "postprocess": ([a, b, c, d, e, f]) => new ast.ElimForAllAst(d, f.text)},
    {"name": "Rule", "symbols": [(lexer2.has("intro") ? {type: "intro"} : intro), (lexer2.has("forall") ? {type: "forall"} : forall)], "postprocess": ([a, b, c]) => new ast.IntroForAllAst()},
    {"name": "Rule", "symbols": [(lexer2.has("intro") ? {type: "intro"} : intro), (lexer2.has("forall") ? {type: "forall"} : forall), "Variables"], "postprocess": ([a, b, c]) => new ast.IntroForAllAst(list_to_array(c, true))},
    {"name": "Rule", "symbols": [(lexer2.has("elim") ? {type: "elim"} : elim), (lexer2.has("exists") ? {type: "exists"} : exists), (lexer2.has("variable") ? {type: "variable"} : variable), (lexer2.has("variable") ? {type: "variable"} : variable)], "postprocess": ([a, b, c, d]) => new ast.ElimExistsAst(c.text, d.text)},
    {"name": "Rule", "symbols": [(lexer2.has("intro") ? {type: "intro"} : intro), (lexer2.has("exists") ? {type: "exists"} : exists), (lexer2.has("lbrace") ? {type: "lbrace"} : lbrace), "Expr", (lexer2.has("rbrace") ? {type: "rbrace"} : rbrace)], "postprocess": ([a, b, c, d, e]) => new ast.IntroExistsAst(d)},
    {"name": "Rule", "symbols": [(lexer2.has("induction") ? {type: "induction"} : induction)], "postprocess": ([a]) => new ast.InductionAst()},
    {"name": "Rule", "symbols": [(lexer2.has("substitute") ? {type: "substitute"} : substitute), (lexer2.has("lparen") ? {type: "lparen"} : lparen), "Prop", (lexer2.has("rparen") ? {type: "rparen"} : rparen), (lexer2.has("left") ? {type: "left"} : left)], "postprocess": ([a, b, c, d]) => new ast.SubstituteAst(c, false)},
    {"name": "Rule", "symbols": [(lexer2.has("substitute") ? {type: "substitute"} : substitute), (lexer2.has("lparen") ? {type: "lparen"} : lparen), "Prop", (lexer2.has("rparen") ? {type: "rparen"} : rparen), (lexer2.has("right") ? {type: "right"} : right)], "postprocess": ([a, b, c, d]) => new ast.SubstituteAst(c, true)},
    {"name": "Rule", "symbols": [(lexer2.has("defof") ? {type: "defof"} : defof), (lexer2.has("predicate") ? {type: "predicate"} : predicate)], "postprocess": ([a, b]) => new ast.DefinitionAst(b.text, true)},
    {"name": "Rule", "symbols": [(lexer2.has("undef") ? {type: "undef"} : undef), (lexer2.has("predicate") ? {type: "predicate"} : predicate)], "postprocess": ([a, b]) => new ast.DefinitionAst(b.text, false)},
    {"name": "Rule", "symbols": [(lexer2.has("apply") ? {type: "apply"} : apply), (lexer2.has("predicate") ? {type: "predicate"} : predicate)], "postprocess": ([a, b]) => new ast.ApplyAst(b.text)},
    {"name": "Rule", "symbols": [(lexer2.has("algebra") ? {type: "algebra"} : algebra), "Props"], "postprocess": ([a, b]) => new ast.AlgebraAst(list_to_array(b, true))},
    {"name": "Variables", "symbols": [(lexer2.has("variable") ? {type: "variable"} : variable)], "postprocess": ([a]) => a.text},
    {"name": "Variables", "symbols": ["Variables", (lexer2.has("variable") ? {type: "variable"} : variable)], "postprocess": ([a, b]) => [b.text, a]},
    {"name": "Props", "symbols": [(lexer2.has("lparen") ? {type: "lparen"} : lparen), "Prop", (lexer2.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": ([a, b, c]) => b},
    {"name": "Props", "symbols": ["Props", (lexer2.has("lparen") ? {type: "lparen"} : lparen), "Prop", (lexer2.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": ([a, b, c, d]) => [c, a]},
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
    {"name": "Factor", "symbols": ["Primary", (lexer2.has("exp") ? {type: "exp"} : exp), (lexer2.has("constant") ? {type: "constant"} : constant)], "postprocess": ([a, b, c]) => new exprs.Call(exprs.FUNC_EXPONENTIATE, [a, new exprs.Constant(parseInt(c.text))])},
    {"name": "Factor", "symbols": ["Primary"], "postprocess": ([a]) => a},
    {"name": "Primary", "symbols": [(lexer2.has("constant") ? {type: "constant"} : constant)], "postprocess": ([a]) => new exprs.Constant(parseInt(a.text))},
    {"name": "Primary", "symbols": [(lexer2.has("variable") ? {type: "variable"} : variable)], "postprocess": ([a]) => new exprs.Variable(a.text)},
    {"name": "Primary", "symbols": [(lexer2.has("variable") ? {type: "variable"} : variable), (lexer2.has("lparen") ? {type: "lparen"} : lparen), "Exprs", (lexer2.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": ([a, b, c, d]) => new exprs.Call(a.text, list_to_array(c, true))},
    {"name": "Primary", "symbols": [(lexer2.has("lparen") ? {type: "lparen"} : lparen), "Expr", (lexer2.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": ([a, b, c]) => b},
    {"name": "Exprs", "symbols": ["Expr"], "postprocess": ([a]) => a},
    {"name": "Exprs", "symbols": ["Exprs", (lexer2.has("comma") ? {type: "comma"} : comma), "Expr"], "postprocess": ([a, b, c]) => [c, a]}
]
  , ParserStart: "Rule"
};

export default grammar;
