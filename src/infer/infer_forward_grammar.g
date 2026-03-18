@{%

// Grammar for describing rules when doing forward reasoning. In this case, we
// do not yet know the proposition that is will be proved by the rule, so the
// grammar requires all information needed to create the rule to be provided.
// Premises of the rule are referenced by line numbers, which are parsed here
// but not looked up.

const props = require('../facts/props');
const exprs = require('../facts/exprs');
const infer = require('./rules');
const ast = require('./rules_ast');
const moo = require('moo');
const lexer = moo.compile({
  WS: /[ \t\r]+/,
  NL: { match: /\n/, lineBreaks: true },
  true: /true/, false: /false/,
  lparen: /\(/, rparen: /\)/,
  lbrace: /\{/, rbrace: /\}/,
  comma: /,/, dot: /\./,
  not: /not/, and: /and/, or: /or/, implies: /->/, iff: /<->/,
  given: /given/, cite: /cite/, repeat: /repeat/,
  direct: /direct/, proof: /proof/,
  modus: /modus/, ponens: /ponens/,
  intro: /intro/, elim: /elim/,
  left: /left/, right: /right/,
  cases: /cases/, simple: /simple/,
  contradiction: /contradiction/, absurdum: /absurdum/,
  exfalso: /exfalso/, verum: /verum/,
  tautology: /tautology/, equivalent: /equivalent/,
  exists: /exists/, forall: /forall/,
  apply: /apply/, algebra: /algebra/,
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
%}

@lexer lexer2

Rule -> %given %lparen Prop %rparen
      {% ([a, b, c, d]) => new ast.GivenAst(c) %}
    | %cite %predicate
      {% ([a, b]) => new ast.CiteAst(b.text) %}
    | %repeat LineRef
      {% ([a, b]) => new ast.Repeat(b) %}
    | %modus %ponens LineRef LineRef
      {% ([a, b, c, d]) => new ast.ModusPonensAst(c, d) %}
    | %direct %proof %lparen Prop %rparen
      {% ([a, b, c, d, e]) => new ast.DirectProofAst(d) %}
    | %elim %and LineRef %left
      {% ([a, b, c, d]) => new ast.ElimAndAst(c, true) %}
    | %elim %and LineRef %right
      {% ([a, b, c, d]) => new ast.ElimAndAst(c, false) %}
    | %intro %and LineRef LineRef
      {% ([a, b, c, d]) => new ast.IntroAndAst(c, d) %}
    | %elim %or LineRef LineRef
      {% ([a, b, c, d]) => new ast.ElimOrAst(c, d) %}
    | %simple %cases LineRef LineRef
      {% ([a, b, c, d]) => new ast.SimpleCasesAst(c, d) %}
    | %cases LineRef LineRef LineRef
      {% ([a, b, c, d]) => new ast.CasesAst(b, c, d) %}
    | %intro %or LineRef %lparen Prop %rparen %right
      {% ([a, b, c, d, e, f]) => new ast.IntroOrAst(c, e, true) %}
    | %intro %or LineRef %lparen Prop %rparen %left
      {% ([a, b, c, d, e, f]) => new ast.IntroOrAst(c, e, false) %}
    | %contradiction LineRef LineRef
      {% ([a, b, c]) => new ast.PrincipiumContradictionisAst(b, c) %}
    | %absurdum %lparen Prop %rparen
      {% ([a, b, c, d]) => new ast.ReductioAdAbsurdumAst(c) %}
    | %exfalso LineRef %lparen Prop %rparen
      {% ([a, b, c, d, e]) => new ast.ExFalsoQuodlibetAst(b, d) %}
    | %verum
      {% ([a]) => new ast.AdLitteramVerumAst() %}
    | %tautology %lparen Prop %rparen
      {% ([a, b, c, d]) => new ast.TautologyAst(c) %}
    | %equivalent LineRef %lparen Prop %rparen
      {% ([a, b, c, d, e]) => new ast.EquivalentAst(b, d) %}
    | %elim %forall LineRef %lbrace Exprs %rbrace
      {% ([a, b, c, d, e, f]) => new ast.ElimForAllAst(c, list_to_array(e, true)) %}
    | %intro %forall %lparen Prop %rparen
      {% ([a, b, c, d, e]) => new ast.IntroForAllAst(d) %}
    | %intro %forall %lparen Prop %rparen Variables
      {% ([a, b, c, d, e, f]) => new ast.IntroForAllAst(d, list_to_array(f, true)) %}
    | %elim %exists LineRef %variable
      {% ([a, b, c, d]) => new ast.ElimExistsAst(c, d.text) %}
    | %intro %exists LineRef %lbrace Expr %rbrace %variable
      {% ([a, b, c, d, e, f, g]) => new ast.IntroExistsAst(c, e, g.text) %}
    | %intro %exists LineRef %lbrace Expr %rbrace %variable %lparen Prop %rparen
      {% ([a, b, c, d, e, f, g, h, i, j]) => new ast.IntroExistsAst(c, e, g.text, i) %}
    | %induction LineRef LineRef
      {% ([a, b, c]) => new ast.InductionAst(b, c) %}
    | %substitute LineRef %right LineRef
      {% ([a, b, c, d]) => new ast.SubstituteAst(b, true, d, undefined) %}
    | %substitute LineRef %left LineRef
      {% ([a, b, c, d]) => new ast.SubstituteAst(b, false, d, undefined) %}
    | %substitute LineRef %right LineRef %lparen Prop %rparen
      {% ([a, b, c, d, e, f, g]) => new ast.SubstituteAst(b, true, d, f) %}
    | %substitute LineRef %left LineRef %lparen Prop %rparen
      {% ([a, b, c, d, e, f, g]) => new ast.SubstituteAst(b, false, d, f) %}
    | %defof %predicate LineRef
      {% ([a, b, c]) => new ast.DefinitionAst(b.text, true, c, undefined) %}
    | %defof %predicate LineRef %lparen Prop %rparen
      {% ([a, b, c, d, e, f]) => new ast.DefinitionAst(b.text, true, c, e) %}
    | %undef %predicate LineRef
      {% ([a, b, c]) => new ast.DefinitionAst(b.text, false, c, undefined) %}
    | %undef %predicate LineRef %lparen Prop %rparen
      {% ([a, b, c, d, e, f]) => new ast.DefinitionAst(b.text, false, c, e) %}
    | %apply %predicate LineRef
      {% ([a, b, c]) => new ast.ApplyAst(b.text, c, []) %}
    | %apply %predicate LineRef %lbrace Exprs %rbrace
      {% ([a, b, c, d, e, f]) => new ast.ApplyAst(b.text, c, list_to_array(e, true)) %}
    | %algebra %lparen Prop %rparen
      {% ([a, b, c, d]) => new ast.AlgebraAst(c, []) %}
    | %algebra %lparen Prop %rparen LineRefs
      {% ([a, b, c, d, e]) => new ast.AlgebraAst(c, list_to_array(e, true).map(([t]) => t)) /* unwrap */ %}

LineRefs -> LineRef
      {% ([b]) => [b] /* wrap to avoid confusion with the list itself */ %}
    | LineRefs LineRef
      {% ([a, b]) => [[b], a] %}

LineRef -> AbsoluteLineRef
      {% ([a]) => list_to_array(a, true) %}
    | Ups %constant
      {% ([a, b]) => ({up: a, lineNum: parseInt(b)}) %}

AbsoluteLineRef -> %constant
      {% ([a]) => parseInt(a) %}
    | AbsoluteLineRef %dot %constant
      {% ([a, b, c]) => [parseInt(c), a] %}

Ups -> %exp
      {% ([a]) => 1 %}
    | Ups %exp
      {% ([a, b]) => a+1 %}

Variables -> %variable
      {% ([a]) => a.text %}
    | Variables %variable
      {% ([a, b]) => [b.text, a] %}

Prop -> %exists %variable %comma Prop
      {% ([a, b, c, d]) => props.Exists.of(b.text, d) %}
    | %forall %variable %comma Prop
      {% ([a, b, c, d]) => props.ForAll.of(b.text, d) %}
    | Arrow
      {% ([a]) => a %}

Arrow ->
      Disj %implies Arrow
      {% ([a, b, c]) => props.Implication.of(a, c) %}
    | Disj %iff Arrow
      {% ([a, b, c]) => props.Biconditional.of(a, c) %}
    | Disj
      {% ([a]) => a %}

Disj ->
      Disj %or Conj
      {% ([a, b, c]) => props.Disjunction.of(a, c) %}
    | Conj
      {% ([a]) => a %}

Conj ->
      Conj %and Atom
      {% ([a, b, c]) => props.Conjunction.of(a, c) %}
    | Atom
      {% ([a]) => a %}

Atom -> %not Atom               
      {% ([a, b]) => props.Negation.of(b) %}
    | Prim
      {% ([a]) => a %}

Prim -> %lparen Prop %rparen
        {% ([a, b, c]) => b %}
    | %true
        {% ([a]) => props.TRUE %}
    | %false
        {% ([a]) => props.FALSE %}
    | %predicate
        {% ([a]) => props.Predicate.of(a.text) %}
    | %predicate %lparen Params %rparen 
        {% ([a, b, c, d]) => new props.Predicate(a.text, list_to_array(c, true)) %}
    | Expr %equal Expr
        {% ([a, b, c]) => new props.Predicate.equal(a, c) %}
    | Expr %lessthan Expr
        {% ([a, b, c]) => new props.Predicate.lessThan(a, c) %}
    | Expr %lessorequal Expr
        {% ([a, b, c]) => new props.Predicate.lessOrEqual(a, c) %}
    | Expr %elemof SetTerm
      {% ([a, b, c]) => new props.Predicate.elementOf(a, c) %}
    | SetTerm %subset SetTerm
      {% ([a, b, c]) => new props.Predicate.subset(a, c) %}
    | SetTerm %sameset SetTerm
      {% ([a, b, c]) => new props.Predicate.sameSet(a, c) %}

Params -> Expr
        {% ([a]) => a %}
    | SetTermNoLowerCase
        {% ([a]) => a %}
    | Params %comma Expr
        {% ([a, b, c]) => [c, a] %}
    | Params %comma SetTermNoLowerCase
        {% ([a, b, c]) => [c, a] %}

SetTerm -> SetTerm %cup SetFactor
      {% ([a, b, c]) => new exprs.Call.setUnion(a, c) %}
    | SetFactor
      {% ([a]) => a %}

SetFactor -> SetFactor %cap NegSetFactor
      {% ([a, b, c]) => new exprs.Call.setIntersection(a, c) %}
    | SetFactor %diff NegSetFactor
      {% ([a, b, c]) => new exprs.Call.setDifference(a, c) %}
    | NegSetFactor
      {% ([a]) => a %}

NegSetFactor -> %comp NegSetFactor
      {% ([a, b]) => new exprs.Call.setComplement(b) %}
    | SetPrimary
      {% ([a]) => a %}

SetPrimary -> %predicate
      {% ([a]) => new exprs.Variable(a.text) %}
    | %variable
      {% ([a]) => new exprs.Variable(a.text) %}
    | %variable %lparen SetTerms %rparen
      {% ([a, b, c, d]) => new exprs.Call(a.text, list_to_array(c, true)) %}
    | %lparen SetTerm %rparen
      {% ([a, b, c]) => b %}

SetTerms -> SetTerm
      {% ([a]) => a %}
    | SetTerms %comma SetTerm
      {% ([a, b, c]) => [c, a] %}

SetTermNoLowerCase -> SetTerm %cup SetFactor
      {% ([a, b, c]) => new exprs.Call.setUnion(a, c) %}
    | SetFactorNoLowerCase
      {% ([a]) => a %}

SetFactorNoLowerCase -> SetFactor %cap NegSetFactor
      {% ([a, b, c]) => new exprs.Call.setIntersection(a, c) %}
    | SetFactor %diff NegSetFactor
      {% ([a, b, c]) => new exprs.Call.setDifference(a, c) %}
    | NegSetFactorNoLowerCase
      {% ([a]) => a %}

NegSetFactorNoLowerCase -> %comp NegSetFactor
      {% ([a, b]) => new exprs.Call.setComplement(b) %}
    | SetPrimaryNoLowerCase
      {% ([a]) => a %}

SetPrimaryNoLowerCase -> %predicate
      {% ([a]) => new exprs.Variable(a.text) %}
    | %variable %lparen SetTermsNoLowerCase %rparen
      {% ([a, b, c, d]) => new exprs.Call(a.text, list_to_array(c, true)) %}
    | %lparen SetTermNoLowerCase %rparen
      {% ([a, b, c]) => b %}

SetTermsNoLowerCase -> SetTermNoLowerCase
      {% ([a]) => a %}
    | SetTermsNoLowerCase %comma SetTermNoLowerCase
      {% ([a, b, c]) => [c, a] %}

Expr -> Expr %plus NegTerm
      {% ([a, b, c]) => new exprs.Call(exprs.FUNC_ADD, [a, c]) %}
    | Expr %minus NegTerm
      {% ([a, b, c]) => new exprs.Call(exprs.FUNC_SUBTRACT, [a, c]) %}
    | NegTerm
      {% ([a]) => a %}

NegTerm -> %minus NegTerm
      {% ([a, b]) => new exprs.Call(exprs.FUNC_NEGATE, [b]) %}
    | Term
      {% ([a]) => a %}

Term -> Term %times Factor
      {% ([a, b, c]) => new exprs.Call(exprs.FUNC_MULTIPLY, [a, c]) %}
    | Factor
      {% ([a]) => a %}

Factor -> Primary %exp %constant
      {% ([a, b, c]) => new exprs.Call(exprs.FUNC_EXPONENTIATE, [a, new exprs.Constant(parseInt(c.text))]) %}
    | Primary
      {% ([a]) => a %}

Primary -> %constant
      {% ([a]) => new exprs.Constant(parseInt(a.text)) %}
    | %variable
      {% ([a]) => new exprs.Variable(a.text) %}
    | %variable %lparen Exprs %rparen
      {% ([a, b, c, d]) => new exprs.Call(a.text, list_to_array(c, true)) %}
    | %lparen Expr %rparen
      {% ([a, b, c]) => b %}

Exprs -> Expr
      {% ([a]) => a %}
    | Exprs %comma Expr
      {% ([a, b, c]) => [c, a] %}
