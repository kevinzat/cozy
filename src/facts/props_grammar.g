@{%
const props = require('./props');
const exprs = require('./exprs');
const moo = require('moo');
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
%}

@lexer lexer2

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
