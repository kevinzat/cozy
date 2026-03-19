@{%

// Grammar for describing rules when doing backward reasoning. In this case, we
// have access to the proposition we want to prove, so we can describe the rules
// more economically, inferring many rule arguments from the proposition.

const props = require('../facts/props');
const exprs = require('../facts/exprs');
const tactics = require('./tactics');
const ast = require('./tactics_ast');
const moo = require('moo');
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
%}

@lexer lexer2

Rule -> %given
      {% ([a]) => new ast.GivenAst() %}
    | %cite %predicate
      {% ([a, b]) => new ast.CiteAst(b.text) %}
    | %modus %ponens %lparen Prop %rparen
      {% ([a, b, c, d]) => new ast.ModusPonensAst(d) %}
    | %direct %proof
      {% ([a, b]) => new ast.DirectProofAst() %}
    | %elim %and %lparen Prop %rparen %left
      {% ([a, b, c, d, e, f]) => new ast.ElimAndAst(d, true) %}
    | %elim %and %lparen Prop %rparen %right
      {% ([a, b, c, d, e, f]) => new ast.ElimAndAst(d, false) %}
    | %intro %and
      {% ([a, b, c, d]) => new ast.IntroAndAst() %}
    | %elim %or %lparen Prop %rparen %left
      {% ([a, b, c, d, e, f]) => new ast.ElimOrAst(d, true) %}
    | %elim %or %lparen Prop %rparen %right
      {% ([a, b, c, d, e, f]) => new ast.ElimOrAst(d, false) %}
    | %simple %cases %lparen Prop %rparen
      {% ([a, b, c, d, e]) => new ast.SimpleCasesAst(d) %}
    | %cases %lparen Prop %rparen
      {% ([a, b, c, d]) => new ast.CasesAst(c) %}
    | %intro %or %lparen Prop %rparen
      {% ([a, b, c, d, e]) => new ast.IntroOrAst(d) %}
    | %contradiction %lparen Prop %rparen
      {% ([a, b, c, d]) => new ast.PrincipiumContradictionisAst(c) %}
    | %absurdum
      {% ([a]) => new ast.ReductioAdAbsurdumAst() %}
    | %exfalso
      {% ([a]) => new ast.ExFalsoQuodlibetAst() %}
    | %verum
      {% ([a]) => new ast.AdLitteramVerumAst() %}
    | %tautology
      {% ([a]) => new ast.TautologyAst() %}
    | %equivalent %lparen Prop %rparen
      {% ([a, b, c, d]) => new ast.EquivalentAst(c) %}
    | %elim %forall %lbrace Expr %rbrace %variable
      {% ([a, b, c, d, e, f]) => new ast.ElimForAllAst(d, f.text) %}
    | %intro %forall
      {% ([a, b, c]) => new ast.IntroForAllAst() %}
    | %intro %forall Variables
      {% ([a, b, c]) => new ast.IntroForAllAst(list_to_array(c, true)) %}
    | %elim %exists %variable %variable
      {% ([a, b, c, d]) => new ast.ElimExistsAst(c.text, d.text) %}
    | %intro %exists %lbrace Expr %rbrace
      {% ([a, b, c, d, e]) => new ast.IntroExistsAst(d) %}
    | %induction
      {% ([a]) => new ast.InductionAst() %}
    | %substitute %lparen Prop %rparen %left
      {% ([a, b, c, d]) => new ast.SubstituteAst(c, false) %}
    | %substitute %lparen Prop %rparen %right
      {% ([a, b, c, d]) => new ast.SubstituteAst(c, true) %}
    | %defof %predicate
      {% ([a, b]) => new ast.DefinitionAst(b.text, true) %}
    | %undef %predicate
      {% ([a, b]) => new ast.DefinitionAst(b.text, false) %}
    | %apply %predicate
      {% ([a, b]) => new ast.ApplyAst(b.text) %}
    | %algebra Props
      {% ([a, b]) => new ast.AlgebraAst(list_to_array(b, true)) %}

Variables -> %variable
      {% ([a]) => a.text %}
    | Variables %variable
      {% ([a, b]) => [b.text, a] %}

Props -> %lparen Prop %rparen
      {% ([a, b, c]) => b %}
    | Props %lparen Prop %rparen
      {% ([a, b, c, d]) => [c, a] %}

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
      {% ([a, b, c]) => new exprs.Call(exprs.FUNC_EXPONENTIATE, [a, new exprs.Constant(BigInt(c.text))]) %}
    | Primary
      {% ([a]) => a %}

Primary -> %constant
      {% ([a]) => new exprs.Constant(BigInt(a.text)) %}
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
