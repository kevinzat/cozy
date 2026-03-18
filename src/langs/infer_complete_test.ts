import * as assert from 'assert';
import { USER_RULES } from '../infer/rules';
import { SplitLine, FindForwardMatches, FindBackwardMatches,
         Match, MatchWord, LongestCommonPrefix, 
         FWD_PATTERNS, REV_PATTERNS, TYPE_LITERAL } from './infer_complete';

/**
 * Returns the descriptions from the given matches as an array of strings. In
 * particular, this turns the JSX.Element's into HTML text for easier comparson.
 */
function Flatten(matches: Array<Match>): string[][] {
    const parts: string[][] = [];
    for (let i = 0; i < matches.length; i++) {
        const optionParts: string[] = [];
        FlattenEntry(matches[i].description, optionParts);
        parts.push(optionParts);
    }
    return parts;
}

/** Helper function for above. */
function FlattenEntry(elems: Array<MatchWord>, parts: string[]) {
    for (let i = 0; i < elems.length; i++) {
        if (elems[i].bold) {
            parts.push("<b>");
            parts.push(elems[i].text);
            parts.push("</b>");
        } else {
            parts.push(elems[i].text);
        }
    }
}

/** Ensures that there was one completion and returns it. */
function GetCompletion(matches: Array<Match>): string|undefined {
    assert.ok(matches.length > 0);
    let prefix = LongestCommonPrefix(matches.map(x => x.completion));
    if (prefix.length === 0) 
      return undefined;
    return prefix;
}

describe('infer_complete', function() {
  it('SplitLine', function() {
    assert.deepEqual(SplitLine("a"), ["a"]);
    assert.deepEqual(SplitLine("ab"), ["ab"]);
    assert.deepEqual(SplitLine("a bc"), ["a", "bc"]);
    assert.deepEqual(SplitLine("ab cd"), ["ab", "cd"]);

    assert.deepEqual(SplitLine("1"), ["1"]);
    assert.deepEqual(SplitLine("1.2"), ["1.2"]);
    assert.deepEqual(SplitLine("1.2.3"), ["1.2.3"]);
    assert.deepEqual(SplitLine("1 . 2 . 3"), ["1.2.3"]);
    assert.deepEqual(SplitLine("1 .2 . 3."), ["1.2.3."]);

    assert.deepEqual(SplitLine("(foo bar)"), ["(foo bar)"]);
    assert.deepEqual(SplitLine("(foo (bar))"), ["(foo (bar))"]);
    assert.deepEqual(SplitLine("(foo (bar)"), ["(foo (bar)"]);
    assert.deepEqual(SplitLine("ab (foo bar) 1.2"),
        ["ab", "(foo bar)", "1.2"]);
    assert.deepEqual(SplitLine("ab (foo (bar) 1.2"),
        ["ab", "(foo (bar) 1.2"]);
  });

  it('FWD_PATTERNS well formed', function () {
    // Check that all patterns start with a literal and no literal comes after a non-literal
    for (let [_v, p] of FWD_PATTERNS) {
      assert.ok(p.length > 0);
      assert.ok(p[0].type === TYPE_LITERAL);
      let encountered_non_literal = false;
      for (let elt of p.slice(1)) {
        if (elt.type === TYPE_LITERAL) {
          assert.ok(!encountered_non_literal);
        } else {
          encountered_non_literal = true;
        }
      }
    }
  });

  it('REV_PATTERNS well formed', function () {
    // Check that all patterns start with a literal and no literal comes after a non-literal
    for (let [_v, p] of REV_PATTERNS) {
      assert.ok(p.length > 0);
      assert.ok(p[0].type === TYPE_LITERAL);
      let encountered_non_literal = false;
      for (let elt of p.slice(1)) {
        if (elt.type === TYPE_LITERAL) {
          assert.ok(!encountered_non_literal);
        } else {
          encountered_non_literal = true;
        }
      }
    }
  });

  it('PatternMatch cite', function() {
    assert.deepEqual(Flatten(FindForwardMatches("ci", USER_RULES)), [
        ["<b>", "ci", "</b>", "te", " ", "A|B|C"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("cite Thm1", USER_RULES)), [
        ["<b>", "cite", "</b>", " ", "<b>", "Thm1", "</b>"]
    ]);
  });

  it('PatternMatch repeat', function() {
    assert.deepEqual(Flatten(FindForwardMatches("rep", USER_RULES)), [
        ["<b>", "rep", "</b>", "eat", " ", "1.2"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("repeat", USER_RULES)), [
        ["<b>", "repeat", "</b>", " ", "1.2"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("repeat 1", USER_RULES)), [
        ["<b>", "repeat", "</b>", " ", "<b>", "1", "</b>"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("repeat 1.2", USER_RULES)), [
        ["<b>", "repeat", "</b>", " ", "<b>", "1.2", "</b>"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("repeat 1.", USER_RULES)), [
        ["<b>", "repeat", "</b>", " ", "<b>", "1.", "</b>", "1-99"]
    ]);
  });

  it('PatternMatch tautology', function() {
    assert.deepEqual(Flatten(FindForwardMatches("ta", USER_RULES)), [
        ["<b>", "ta", "</b>", "utology", " ", "(Prop)"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("tautology (", USER_RULES)), [
        ["<b>", "tautology", "</b>", " ", "<b>", "(Prop)", "</b>"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("tautology (a or b", USER_RULES)), [
        ["<b>", "tautology", "</b>", " ", "<b>", "(Prop)", "</b>"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("tautology (a or b)", USER_RULES)), [
        ["<b>", "tautology", "</b>", " ", "<b>", "(Prop)", "</b>"]
    ]);
  });

  it('PatternMatch intro and', function() {
    assert.deepEqual(Flatten(FindForwardMatches("int", USER_RULES)), [
        ["<b>", "int", "</b>", "ro", " ", "and", " ", "1.2", " ", "3.4"],
        ["<b>", "int", "</b>", "ro", " ", "or", " ", "1.2", " ", "(Prop)", " ", "left|right"],
        ["<b>", "int", "</b>", "ro", " ", "forall", " ", "(Prop)", " ", "[x y ...]"],
        ["<b>", "int", "</b>", "ro", " ", "exists", " ", "1.2", " " , "{Expr}", " ", "x|y|z", " ", "[(Prop)]"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("intro a", USER_RULES)), [
        ["<b>", "intro", "</b>", " ", "<b>", "a", "</b>", "nd", " ",
         "1.2", " ", "3.4"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("intro and 1", USER_RULES)), [
        ["<b>", "intro", "</b>", " ", "<b>", "and", "</b>", " ",
         "<b>", "1", "</b>", " ", "1.2"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("intro and 1 2", USER_RULES)), [
        ["<b>", "intro", "</b>", " ", "<b>", "and", "</b>", " ",
         "<b>", "1", "</b>", " ", "<b>", "2", "</b>"],
    ]);
  });

  it('PatternMatch intro or', function() {
    assert.deepEqual(Flatten(FindForwardMatches("intro or", USER_RULES)), [
        ["<b>", "intro", "</b>", " ", "<b>", "or", "</b>", " ",
         "1.2", " ", "(Prop)", " ", "left|right"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("intro or 1", USER_RULES)), [
        ["<b>", "intro", "</b>", " ", "<b>", "or", "</b>", " ",
         "<b>", "1", "</b>", " ", "(Prop)", " ", "left|right"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("intro or 1 (T", USER_RULES)), [
        ["<b>", "intro", "</b>", " ", "<b>", "or", "</b>", " ",
           "<b>", "1", "</b>", " ", "<b>", "(Prop)", "</b>", " ", "left|right"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("intro or 1 (T) left", USER_RULES)), [
        ["<b>", "intro", "</b>", " ", "<b>", "or", "</b>", " ",
         "<b>", "1", "</b>", " ", "<b>", "(Prop)", "</b>", " ", "<b>", "left", "</b>"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("intro or 1 (T) rig", USER_RULES)), [
        ["<b>", "intro", "</b>", " ", "<b>", "or", "</b>", " ",
         "<b>", "1", "</b>", " ", "<b>", "(Prop)", "</b>", " ", "<b>", "rig", "</b>", "ht"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("intro or 1 (T) right", USER_RULES)), [
        ["<b>", "intro", "</b>", " ", "<b>", "or", "</b>", " ",
         "<b>", "1", "</b>", " ", "<b>", "(Prop)", "</b>", " ", "<b>", "right", "</b>"],
    ]);
  });

  it('PatternMatch intro forall', function() {
    assert.deepEqual(Flatten(FindForwardMatches("intro for", USER_RULES)), [
        ["<b>", "intro", "</b>", " ", "<b>", "for", "</b>", "all", " ",
         "(Prop)", " ", "[x y ...]"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("intro forall", USER_RULES)), [
        ["<b>", "intro", "</b>", " ", "<b>", "forall", "</b>", " ",
         "(Prop)", " ", "[x y ...]"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("intro forall (A", USER_RULES)), [
        ["<b>", "intro", "</b>", " ", "<b>", "forall", "</b>", " ",
         "<b>", "(Prop)", "</b>", " ", "[x y ...]"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("intro forall (A) x_2", USER_RULES)), [
        ["<b>", "intro", "</b>", " ", "<b>", "forall", "</b>", " ",
         "<b>", "(Prop)", "</b>", " ", "<b>", "x_2", "</b>", " ", "[y z ...]"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("intro forall (A) x", USER_RULES)), [
        ["<b>", "intro", "</b>", " ", "<b>", "forall", "</b>", " ",
         "<b>", "(Prop)", "</b>", " ", "<b>", "x", "</b>", " ", "[y z ...]"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("intro forall (A) x w", USER_RULES)), [
        ["<b>", "intro", "</b>", " ", "<b>", "forall", "</b>", " ",
         "<b>", "(Prop)", "</b>", " ", "<b>", "x", "</b>", " ",
         "<b>", "w", "</b>", " ", "[y z ...]"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("i f (tru", USER_RULES)), [
        ["<b>", "i", "</b>", "ntro", " ", "<b>", "f", "</b>", "orall", " ",
         "<b>", "(Prop)", "</b>", " ", "[x y ...]"],
    ]);
  });

  it('PatternMatch intro exists', function() {
    assert.deepEqual(Flatten(FindForwardMatches("intro ex", USER_RULES)), [
        ["<b>", "intro", "</b>", " ", "<b>", "ex", "</b>", "ists", " ",
         "1.2", " ", "{Expr}", " ", "x|y|z", " ", "[(Prop)]"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("intro exists", USER_RULES)), [
        ["<b>", "intro", "</b>", " ", "<b>", "exists", "</b>", " ",
         "1.2", " ", "{Expr}", " ", "x|y|z", " ", "[(Prop)]"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("intro exists 3", USER_RULES)), [
        ["<b>", "intro", "</b>", " ", "<b>", "exists", "</b>", " ",
         "<b>", "3", "</b>", " ", "{Expr}", " ", "x|y|z", " ", "[(Prop)]"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("intro exists 3 {x", USER_RULES)), [
        ["<b>", "intro", "</b>", " ", "<b>", "exists", "</b>", " ",
         "<b>", "3", "</b>", " ", "<b>", "{x", "</b>", "}", " ", "x|y|z", " ", "[(Prop)]"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("intro exists 3 {x} y_1", USER_RULES)), [
        ["<b>", "intro", "</b>", " ", "<b>", "exists", "</b>", " ",
         "<b>", "3", "</b>", " ", "<b>", "{x}", "</b>", " ", "<b>", "y_1", "</b>", " ", "[(Prop)]"],
    ]);
  });

  it('PatternMatch elim and', function() {
    assert.deepEqual(Flatten(FindForwardMatches("el", USER_RULES)), [
        ["<b>", "el", "</b>", "im", " ", "and", " ", "1.2", " ", "left|right"],
        ["<b>", "el", "</b>", "im", " ", "or", " ", "1.2", " ", "3.4"],
        ["<b>", "el", "</b>", "im", " ", "forall", " ", "1.2", " " , "{Expr, Expr, ...}"],
        ["<b>", "el", "</b>", "im", " ", "exists", " ", "1.2", " " , "x|y|z"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("elim a", USER_RULES)), [
        ["<b>", "elim", "</b>", " ", "<b>", "a", "</b>", "nd", " ",
         "1.2", " ", "left|right"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("elim and 4", USER_RULES)), [
        ["<b>", "elim", "</b>", " ", "<b>", "and", "</b>", " ",
         "<b>", "4", "</b>", " ", "left|right"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("elim and 4 le", USER_RULES)), [
        ["<b>", "elim", "</b>", " ", "<b>", "and", "</b>", " ",
         "<b>", "4", "</b>", " ", "<b>", "le", "</b>", "ft"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("elim and 4 right", USER_RULES)), [
        ["<b>", "elim", "</b>", " ", "<b>", "and", "</b>", " ",
         "<b>", "4", "</b>", " ", "<b>", "right", "</b>"],
    ]);
  });

  it('PatternMatch elim or', function() {
    assert.deepEqual(Flatten(FindForwardMatches("elim o", USER_RULES)), [
        ["<b>", "elim", "</b>", " ", "<b>", "o", "</b>", "r", " ",
         "1.2", " ", "3.4"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("elim or 4", USER_RULES)), [
        ["<b>", "elim", "</b>", " ", "<b>", "or", "</b>", " ",
         "<b>", "4", "</b>", " ", "1.2"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("elim or 4 5.", USER_RULES)), [
        ["<b>", "elim", "</b>", " ", "<b>", "or", "</b>", " ",
         "<b>", "4", "</b>", " ", "<b>", "5.", "</b>", "1-99"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("elim or 4 5.6", USER_RULES)), [
        ["<b>", "elim", "</b>", " ", "<b>", "or", "</b>", " ",
         "<b>", "4", "</b>", " ", "<b>", "5.6", "</b>"],
    ]);
  });

  it('PatternMatch elim forall', function() {
    assert.deepEqual(Flatten(FindForwardMatches("elim fo", USER_RULES)), [
        ["<b>", "elim", "</b>", " ", "<b>", "fo", "</b>", "rall", " ",
         "1.2", " ", "{Expr, Expr, ...}"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("elim forall 5", USER_RULES)), [
        ["<b>", "elim", "</b>", " ", "<b>", "forall", "</b>", " ",
         "<b>", "5", "</b>", " ", "{Expr, Expr, ...}"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("elim forall 5 {z_2", USER_RULES)), [
        ["<b>", "elim", "</b>", " ", "<b>", "forall", "</b>", " ",
         "<b>", "5", "</b>", " ", "<b>", "{z_2", "</b>", ", ", "[Expr ...]}"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("elim forall 5 {z_2}", USER_RULES)), [
        ["<b>", "elim", "</b>", " ", "<b>", "forall", "</b>", " ",
         "<b>", "5", "</b>", " ", "<b>", "{z_2}", "</b>"],
    ]);
  });

  it('PatternMatch elim exists', function() {
    assert.deepEqual(Flatten(FindForwardMatches("elim exi", USER_RULES)), [
        ["<b>", "elim", "</b>", " ", "<b>", "exi", "</b>", "sts", " ",
         "1.2", " ", "x|y|z"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("elim exists 99", USER_RULES)), [
        ["<b>", "elim", "</b>", " ", "<b>", "exists", "</b>", " ",
         "<b>", "99", "</b>", " ", "x|y|z"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("elim exists 99 z_2", USER_RULES)), [
        ["<b>", "elim", "</b>", " ", "<b>", "exists", "</b>", " ",
         "<b>", "99", "</b>", " ", "<b>", "z_2", "</b>"],
    ]);
  });

  it('PatternMatch cases', function() {
    assert.deepEqual(Flatten(FindForwardMatches("cas", USER_RULES)), [
        ["<b>", "cas", "</b>", "es", " ",
          "1.2", " ", "3.4", " ", "5.6"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("cases 2", USER_RULES)), [
        ["<b>", "cases", "</b>", " ",
          "<b>", "2", "</b>", " ", "1.2", " ", "3.4"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("cases 2 3", USER_RULES)), [
        ["<b>", "cases", "</b>", " ",
          "<b>", "2", "</b>", " ", "<b>", "3", "</b>", " ", "1.2"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("cases 2 3 4", USER_RULES)), [
        ["<b>", "cases", "</b>", " ",
          "<b>", "2", "</b>", " ", "<b>", "3", "</b>", " ", "<b>", "4", "</b>"]
    ]);
  });

  it('PatternMatch simple cases', function() {
    assert.deepEqual(Flatten(FindForwardMatches("si", USER_RULES)), [
        ["<b>", "si", "</b>", "mple", " ", "cases", " ", "1.2", " ", "3.4"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("simple c", USER_RULES)), [
        ["<b>", "simple", "</b>", " ", "<b>", "c", "</b>", "ases",
         " ", "1.2", " ", "3.4"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("simple cases 2", USER_RULES)), [
        ["<b>", "simple", "</b>", " ", "<b>", "cases", "</b>", " ",
         "<b>", "2", "</b>", " ", "1.2"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("simple cases 2 3", USER_RULES)), [
        ["<b>", "simple", "</b>", " ", "<b>", "cases", "</b>", " ",
         "<b>", "2", "</b>", " ", "<b>", "3", "</b>"]
    ]);
  });

  it('PatternMatch direct proof', function() {
    assert.deepEqual(Flatten(FindForwardMatches("di", USER_RULES)), [
        ["<b>", "di", "</b>", "rect", " ", "proof", " ", "(Prop)"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("direct p", USER_RULES)), [
        ["<b>", "direct", "</b>", " ", "<b>", "p", "</b>", "roof", " ", "(Prop)"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("direct proof (P -> Q)", USER_RULES)), [
        ["<b>", "direct", "</b>", " ", "<b>", "proof", "</b>", " ",
         "<b>", "(Prop)", "</b>"]
    ]);
  });

  it('PatternMatch modus ponens', function() {
    assert.deepEqual(Flatten(FindForwardMatches("m", USER_RULES)), [
        ["<b>", "m", "</b>", "odus", " ", "ponens", " ", "1.2", " ", "3.4"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("modus p", USER_RULES)), [
        ["<b>", "modus", "</b>", " ", "<b>", "p", "</b>", "onens", " ",
         "1.2", " ", "3.4"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("modus ponens 7", USER_RULES)), [
        ["<b>", "modus", "</b>", " ", "<b>", "ponens", "</b>", " ",
         "<b>", "7", "</b>", " ", "1.2"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("modus ponens 7 8", USER_RULES)), [
        ["<b>", "modus", "</b>", " ", "<b>", "ponens", "</b>", " ",
         "<b>", "7", "</b>", " ", "<b>", "8", "</b>"]
    ]);
  });

  it('PatternMatch equivalent', function() {
    assert.deepEqual(Flatten(FindForwardMatches("equiv ", USER_RULES)), [
        ["<b>", "equiv", "</b>", "alent", " ", "1.2", " ", "(Prop)"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("equivalent 8", USER_RULES)), [
        ["<b>", "equivalent", "</b>", " ", "<b>", "8", "</b>", " ", "(Prop)"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("equivalent 8 (", USER_RULES)), [
        ["<b>", "equivalent", "</b>", " ", "<b>", "8", "</b>", " ",
         "<b>", "(Prop)", "</b>"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("equivalent 8 (P -> (Q <-> R))", USER_RULES)), [
        ["<b>", "equivalent", "</b>", " ", "<b>", "8", "</b>",
         " ", "<b>", "(Prop)", "</b>"]
    ]);
  });

  it('PatternMatch substitute', function() {
    assert.deepEqual(Flatten(FindForwardMatches("su", USER_RULES)), [
        ["<b>", "su", "</b>", "bstitute", " ", "1.2", " ", "left|right", " ", "3.4", " ", "[(Prop)]"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("substitute 9", USER_RULES)), [
        ["<b>", "substitute", "</b>", " ", "<b>", "9", "</b>", " ", "left|right", " ", "1.2", " ", "[(Prop)]"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("substitute 9 le", USER_RULES)), [
        ["<b>", "substitute", "</b>", " ", "<b>", "9", "</b>", " ",
         "<b>", "le", "</b>", "ft", " ", "1.2", " ", "[(Prop)]"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("substitute 9 left 10", USER_RULES)), [
        ["<b>", "substitute", "</b>", " ", "<b>", "9", "</b>", " ",
         "<b>", "left", "</b>", " ", "<b>", "10", "</b>", " ", "[(Prop)]"]
    ]);
  });

  it('PatternMatch apply', function() {
    assert.deepEqual(Flatten(FindForwardMatches("ap", USER_RULES)), [
        ["<b>", "ap", "</b>", "ply", " ", "A|B|C", " ", "1.2", " ", "[{Expr, Expr, ...}]"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("apply Thm1", USER_RULES)), [
        ["<b>", "apply", "</b>", " ", "<b>", "Thm1", "</b>", " ", "1.2", " ", "[{Expr, Expr, ...}]"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("apply Thm1 4", USER_RULES)), [
        ["<b>", "apply", "</b>", " ", "<b>", "Thm1", "</b>", " ", "<b>", "4", "</b>", " ", "[{Expr, Expr, ...}]"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("apply Thm1 4 {x", USER_RULES)), [
        ["<b>", "apply", "</b>", " ", "<b>", "Thm1", "</b>", " ", "<b>", "4", "</b>", " ", "<b>", "{x", "</b>", ", ", "[Expr ...]}"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("apply Thm1 4 {x}", USER_RULES)), [
        ["<b>", "apply", "</b>", " ", "<b>", "Thm1", "</b>", " ", "<b>", "4", "</b>", " ", "<b>", "{x}", "</b>"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("apply Thm1 4 {x, 1 + 2", USER_RULES)), [
        ["<b>", "apply", "</b>", " ", "<b>", "Thm1", "</b>", " ", "<b>", "4", "</b>", " ", "<b>", "{x, 1 + 2", "</b>", ", ", "[Expr ...]}"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("apply Thm1 4 {x, 1 + 2,", USER_RULES)), [
        ["<b>", "apply", "</b>", " ", "<b>", "Thm1", "</b>", " ", "<b>", "4", "</b>", " ", "<b>", "{x, 1 + 2,", "</b>", " ", "[Expr ...]}"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("apply Thm1 4 {x, 1 + 2}", USER_RULES)), [
        ["<b>", "apply", "</b>", " ", "<b>", "Thm1", "</b>", " ", "<b>", "4", "</b>", " ", "<b>", "{x, 1 + 2}", "</b>"]
    ]);
  });

  it('PatternMatch algebra', function() {
    assert.deepEqual(Flatten(FindForwardMatches("al", USER_RULES)), [
        ["<b>", "al", "</b>", "gebra", " ", "(Prop)", " ", "[1.2 [3.4 ...]]"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("algebra (a =", USER_RULES)), [
        ["<b>", "algebra", "</b>", " ", "<b>", "(Prop)", "</b>", " ", "[1.2 [3.4 ...]]"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("algebra (a = b)", USER_RULES)), [
        ["<b>", "algebra", "</b>", " ", "<b>", "(Prop)", "</b>", " ", "[1.2 [3.4 ...]]"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("algebra (a = b) 1", USER_RULES)), [
        ["<b>", "algebra", "</b>", " ", "<b>", "(Prop)", "</b>", " ", "<b>", "1", "</b>", " ", "[3.4 ...]"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("algebra (a = b) 1.", USER_RULES)), [
        ["<b>", "algebra", "</b>", " ", "<b>", "(Prop)", "</b>", " ", "<b>", "1.", "</b>", "1-99", " ", "[3.4 ...]"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("algebra (a = b) 1.5", USER_RULES)), [
        ["<b>", "algebra", "</b>", " ", "<b>", "(Prop)", "</b>", " ", "<b>", "1.5", "</b>", " ", "[3.4 ...]"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("algebra (a = b) 1.5 2", USER_RULES)), [
        ["<b>", "algebra", "</b>", " ", "<b>", "(Prop)", "</b>", " ", "<b>", "1.5", "</b>", " ", "<b>", "2", "</b>", " ", "[3.4 ...]"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("algebra (a = b) 1.5 2.", USER_RULES)), [
        ["<b>", "algebra", "</b>", " ", "<b>", "(Prop)", "</b>", " ", "<b>", "1.5", "</b>", " ", "<b>", "2.", "</b>", "1-99", " ", "[3.4 ...]"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("algebra (a = b) 1.5 2.3", USER_RULES)), [
        ["<b>", "algebra", "</b>", " ", "<b>", "(Prop)", "</b>", " ", "<b>", "1.5", "</b>", " ", "<b>", "2.3", "</b>", " ", "[3.4 ...]"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("algebra (a = b) 1.5 2.3 7", USER_RULES)), [
        ["<b>", "algebra", "</b>", " ", "<b>", "(Prop)", "</b>", " ", "<b>", "1.5", "</b>", " ", "<b>", "2.3", "</b>", " ", "<b>", "7", "</b>", " ", "[3.4 ...]"]
    ]);

    assert.deepEqual(Flatten(FindBackwardMatches("al", USER_RULES)), [
        ["<b>", "al", "</b>", "gebra", " ", "(Prop) [(Prop) ...]"]
    ]);
    assert.deepEqual(Flatten(FindBackwardMatches("algebra (a =", USER_RULES)), [
        ["<b>", "algebra", "</b>", " ", "<b>", "(a =", "</b>", " ", "[(Prop) ...]"]
    ]);
    assert.deepEqual(Flatten(FindBackwardMatches("algebra (a = b)", USER_RULES)), [
        ["<b>", "algebra", "</b>", " ", "<b>", "(a = b)", "</b>", " ", "[(Prop) ...]"]
    ]);
    assert.deepEqual(Flatten(FindBackwardMatches("algebra (a = b) (c+2 =", USER_RULES)), [
        ["<b>", "algebra", "</b>", " ", "<b>", "(a = b)", "</b>", " ", "<b>", "(c+2 =", "</b>", " ", "[(Prop) ...]"]
    ]);
    assert.deepEqual(Flatten(FindBackwardMatches("algebra (a = b) (c+2 = d)", USER_RULES)), [
        ["<b>", "algebra", "</b>", " ", "<b>", "(a = b)", "</b>", " ", "<b>", "(c+2 = d)", "</b>", " ", "[(Prop) ...]"]
    ]);
  });

  it('PatternMatch contradiction', function() {
    assert.deepEqual(Flatten(FindForwardMatches("con", USER_RULES)), [
        ["<b>", "con", "</b>", "tradiction", " ", "1.2", " ", "3.4"]]);
    assert.deepEqual(Flatten(FindForwardMatches("contradiction", USER_RULES)), [
        ["<b>", "contradiction", "</b>", " ", "1.2", " ", "3.4"]]);
    assert.deepEqual(Flatten(FindForwardMatches("contradiction 1 ", USER_RULES)), [
        ["<b>", "contradiction", "</b>", " ", "<b>", "1", "</b>", " ", "1.2"]]);
    assert.deepEqual(Flatten(FindForwardMatches("contradiction 1 2.", USER_RULES)), [
        ["<b>", "contradiction", "</b>", " ", "<b>", "1", "</b>", " ",
         "<b>", "2.", "</b>", "1-99"]]);    

    assert.deepEqual(Flatten(FindBackwardMatches("co", USER_RULES)), [
        ["<b>", "co", "</b>", "ntradiction", " ", "(Prop)"]]);
    assert.deepEqual(Flatten(FindBackwardMatches("contradiction", USER_RULES)), [
        ["<b>", "contradiction", "</b>", " ", "(Prop)"]]);
    assert.deepEqual(Flatten(FindBackwardMatches("contradiction (P and", USER_RULES)), [
        ["<b>", "contradiction", "</b>", " ", "<b>", "(Prop)", "</b>"]]);
  });

  it('PatternMatch absurdum', function() {
    assert.deepEqual(Flatten(FindForwardMatches("ab", USER_RULES)), [
        ["<b>", "ab", "</b>", "surdum", " ", "(Prop)"]]);
    assert.deepEqual(Flatten(FindForwardMatches("absurdum", USER_RULES)), [
        ["<b>", "absurdum", "</b>", " ", "(Prop)"]]);
    assert.deepEqual(Flatten(FindForwardMatches("absurdum (P and", USER_RULES)), [
        ["<b>", "absurdum", "</b>", " ", "<b>", "(Prop)", "</b>"]]);

    assert.deepEqual(Flatten(FindBackwardMatches("abs", USER_RULES)), [
        ["<b>", "abs", "</b>", "urdum"]]);
    assert.deepEqual(Flatten(FindBackwardMatches("absurdum", USER_RULES)), [
        ["<b>", "absurdum", "</b>"]]);
  });

  it('PatternMatch exfalso', function() {
    assert.deepEqual(Flatten(FindForwardMatches("ex", USER_RULES)), [
        ["<b>", "ex", "</b>", "falso", " ", "1.2", " ", "(Prop)"]]);
    assert.deepEqual(Flatten(FindForwardMatches("exfalso", USER_RULES)), [
        ["<b>", "exfalso", "</b>", " ", "1.2", " ", "(Prop)"]]);
    assert.deepEqual(Flatten(FindForwardMatches("exfalso 1.", USER_RULES)), [
        ["<b>", "exfalso", "</b>", " ", "<b>", "1.", "</b>", "1-99", " ", "(Prop)"]]);
    assert.deepEqual(Flatten(FindForwardMatches("exfalso 1.9 (P and", USER_RULES)), [
        ["<b>", "exfalso", "</b>", " ", "<b>", "1.9", "</b>", " ",
         "<b>", "(Prop)", "</b>"]]);

    assert.deepEqual(Flatten(FindBackwardMatches("exf", USER_RULES)), [
        ["<b>", "exf", "</b>", "also"]]);
    assert.deepEqual(Flatten(FindBackwardMatches("exfalso", USER_RULES)), [
        ["<b>", "exfalso", "</b>"]]);
  });

  it('PatternMatch verum', function() {
    assert.deepEqual(Flatten(FindForwardMatches("ver", USER_RULES)), [
        ["<b>", "ver", "</b>", "um"]]);
    assert.deepEqual(Flatten(FindForwardMatches("verum", USER_RULES)), [
        ["<b>", "verum", "</b>"]]);

    assert.deepEqual(Flatten(FindBackwardMatches("ver", USER_RULES)), [
        ["<b>", "ver", "</b>", "um"]]);
    assert.deepEqual(Flatten(FindBackwardMatches("verum", USER_RULES)), [
        ["<b>", "verum", "</b>"]]);
  });

  it('PatternMatch intro forall', function() {
    assert.deepEqual(Flatten(FindForwardMatches("intro f", USER_RULES)), [
        ["<b>", "intro", "</b>", " ", "<b>", "f", "</b>", "orall", " ",
         "(Prop)", " ", "[x y ...]"]]);
    assert.deepEqual(Flatten(FindForwardMatches("intro forall (A)", USER_RULES)), [
        ["<b>", "intro", "</b>", " ", "<b>", "forall", "</b>", " ",
         "<b>", "(Prop)", "</b>", " ", "[x y ...]"]]);
    assert.deepEqual(Flatten(FindForwardMatches("intro forall (A) w", USER_RULES)), [
        ["<b>", "intro", "</b>", " ", "<b>", "forall", "</b>", " ",
         "<b>", "(Prop)", "</b>", " ", "<b>", "w", "</b>", " ", "[y z ...]"]]);
    assert.deepEqual(Flatten(FindForwardMatches("intro forall (A) w v", USER_RULES)), [
        ["<b>", "intro", "</b>", " ", "<b>", "forall", "</b>", " ",
         "<b>", "(Prop)", "</b>", " ", "<b>", "w", "</b>", " ",
         "<b>", "v", "</b>", " ", "[y z ...]"]]);
  });

  it('PatternMatch defof', function() {
    assert.deepEqual(Flatten(FindForwardMatches("de", USER_RULES)), [
        ["<b>", "de", "</b>", "fof", " ", "A|B|C", " ", "1.2", " ", "[(Prop)]"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("defof Thm1", USER_RULES)), [
        ["<b>", "defof", "</b>", " ", "<b>", "Thm1", "</b>", " ", "1.2", " ", "[(Prop)]"]]);
    assert.deepEqual(Flatten(FindForwardMatches("defof Thm1 3", USER_RULES)), [
        ["<b>", "defof", "</b>", " ", "<b>", "Thm1", "</b>", " ", "<b>", "3", "</b>", " ", "[(Prop)]"]]);

    assert.deepEqual(Flatten(FindBackwardMatches("de", USER_RULES)), [
        ["<b>", "de", "</b>", "fof", " ", "A|B|C"],
    ]);
    assert.deepEqual(Flatten(FindBackwardMatches("defof Thm1", USER_RULES)), [
        ["<b>", "defof", "</b>", " ", "<b>", "Thm1", "</b>"]]);
  });

  it('PatternMatch undef', function() {
    assert.deepEqual(Flatten(FindForwardMatches("u", USER_RULES)), [
        ["<b>", "u", "</b>", "ndef", " ", "A|B|C", " ", "1.2", " ", "[(Prop)]"],
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("undef Thm1", USER_RULES)), [
        ["<b>", "undef", "</b>", " ", "<b>", "Thm1", "</b>", " ", "1.2", " ", "[(Prop)]"]]);
    assert.deepEqual(Flatten(FindForwardMatches("undef Thm1 3", USER_RULES)), [
        ["<b>", "undef", "</b>", " ", "<b>", "Thm1", "</b>", " ", "<b>", "3", "</b>", " ", "[(Prop)]"]]);

    assert.deepEqual(Flatten(FindBackwardMatches("un", USER_RULES)), [
        ["<b>", "un", "</b>", "def", " ", "A|B|C"],
    ]);
    assert.deepEqual(Flatten(FindBackwardMatches("undef Thm1", USER_RULES)), [
        ["<b>", "undef", "</b>", " ", "<b>", "Thm1", "</b>"]]);
  });

  it('PatternMatch induction', function() {
    assert.deepEqual(Flatten(FindForwardMatches("ind", USER_RULES)), [
        ["<b>", "ind", "</b>", "uction", " ", "1.2", " ", "3.4"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("induction 7", USER_RULES)), [
        ["<b>", "induction", "</b>", " ",
         "<b>", "7", "</b>", " ", "1.2"]
    ]);
    assert.deepEqual(Flatten(FindForwardMatches("induction 7 8", USER_RULES)), [
        ["<b>", "induction", "</b>", " ",
         "<b>", "7", "</b>", " ", "<b>", "8", "</b>"]
    ]);
  });

  it('PatternMatch completions forward', function() {
    assert.strictEqual(GetCompletion(FindForwardMatches("ci", USER_RULES)), "cite ");
    assert.strictEqual(GetCompletion(FindForwardMatches("al", USER_RULES)), "algebra ");
    assert.strictEqual(GetCompletion(FindForwardMatches("ap", USER_RULES)), "apply ");
    assert.strictEqual(GetCompletion(FindForwardMatches("re", USER_RULES)), "repeat ");
    assert.strictEqual(GetCompletion(FindForwardMatches("el", USER_RULES)), "elim ");
    assert.strictEqual(GetCompletion(FindForwardMatches("elim a", USER_RULES)), "elim and ");
    assert.strictEqual(GetCompletion(FindForwardMatches("elim o", USER_RULES)), "elim or ");
    assert.strictEqual(GetCompletion(FindForwardMatches("elim f", USER_RULES)), "elim forall ");
    assert.strictEqual(GetCompletion(FindForwardMatches("elim ex", USER_RULES)), "elim exists ");
    assert.strictEqual(GetCompletion(FindForwardMatches("ind", USER_RULES)), "induction ");
    assert.strictEqual(GetCompletion(FindForwardMatches("int", USER_RULES)), "intro ");
    assert.strictEqual(GetCompletion(FindForwardMatches("intro an", USER_RULES)), "intro and ");
    assert.strictEqual(GetCompletion(FindForwardMatches("intro o", USER_RULES)), "intro or ");
    assert.strictEqual(GetCompletion(FindForwardMatches("intro for", USER_RULES)), "intro forall ");
    assert.strictEqual(GetCompletion(FindForwardMatches("intro e", USER_RULES)), "intro exists ");
    assert.strictEqual(GetCompletion(FindForwardMatches("ca", USER_RULES)), "cases ");
    assert.strictEqual(GetCompletion(FindForwardMatches("de", USER_RULES)), "defof ");
    assert.strictEqual(GetCompletion(FindForwardMatches("di", USER_RULES)), "direct proof ");
    assert.strictEqual(GetCompletion(FindForwardMatches("dir", USER_RULES)), "direct proof ");
    assert.strictEqual(GetCompletion(FindForwardMatches("direct p", USER_RULES)), "direct proof ");
    assert.strictEqual(GetCompletion(FindForwardMatches("m", USER_RULES)), "modus ponens ");
    assert.strictEqual(GetCompletion(FindForwardMatches("mo", USER_RULES)), "modus ponens ");
    assert.strictEqual(GetCompletion(FindForwardMatches("modus p", USER_RULES)), "modus ponens ");
    assert.strictEqual(GetCompletion(FindForwardMatches("eq", USER_RULES)), "equivalent ");
    assert.strictEqual(GetCompletion(FindForwardMatches("equiv", USER_RULES)), "equivalent ");
    assert.strictEqual(GetCompletion(FindForwardMatches("ex", USER_RULES)), "exfalso ");
    assert.strictEqual(GetCompletion(FindForwardMatches("elim and 1 l", USER_RULES)), "elim and 1 left");
    assert.strictEqual(GetCompletion(FindForwardMatches("elim and 1 r", USER_RULES)), "elim and 1 right");
    assert.strictEqual(GetCompletion(FindForwardMatches("intro or 1 (T) l", USER_RULES)), "intro or 1 (T) left");
    assert.strictEqual(GetCompletion(FindForwardMatches("intro or 1 (T) r", USER_RULES)), "intro or 1 (T) right");
    assert.strictEqual(GetCompletion(FindForwardMatches("rep", USER_RULES)), "repeat ");
    assert.strictEqual(GetCompletion(FindForwardMatches("r", USER_RULES)), "repeat ");
    assert.strictEqual(GetCompletion(FindForwardMatches("si", USER_RULES)), "simple cases ");
    assert.strictEqual(GetCompletion(FindForwardMatches("su", USER_RULES)), "substitute ");
    assert.strictEqual(GetCompletion(FindForwardMatches("sub", USER_RULES)), "substitute ");
    assert.strictEqual(GetCompletion(FindForwardMatches("substitute 1 l", USER_RULES)), "substitute 1 left ");
    assert.strictEqual(GetCompletion(FindForwardMatches("substitute 1 r", USER_RULES)), "substitute 1 right ");
    assert.strictEqual(GetCompletion(FindForwardMatches("tau", USER_RULES)), "tautology ");
    assert.strictEqual(GetCompletion(FindForwardMatches("t", USER_RULES)), "tautology ");
    assert.strictEqual(GetCompletion(FindForwardMatches("u", USER_RULES)), "undef ");
    assert.strictEqual(GetCompletion(FindForwardMatches("al () 1 2", USER_RULES)), "algebra () 1 2 ");
    assert.strictEqual(GetCompletion(FindForwardMatches("a () 1 2", USER_RULES)), "algebra () 1 2 ");
    assert.strictEqual(GetCompletion(FindForwardMatches("ap F 1", USER_RULES)), "apply F 1 ");
    assert.strictEqual(GetCompletion(FindForwardMatches("a F 1", USER_RULES)), "apply F 1 ");
    assert.strictEqual(GetCompletion(FindForwardMatches("ca 1 2", USER_RULES)), "cases 1 2 ");
    assert.strictEqual(GetCompletion(FindForwardMatches("co 1 2", USER_RULES)), "contradiction 1 2");
    assert.strictEqual(GetCompletion(FindForwardMatches("ci F", USER_RULES)), "cite F");
    assert.strictEqual(GetCompletion(FindForwardMatches("c F", USER_RULES)), "cite F");
    assert.strictEqual(GetCompletion(FindForwardMatches("de F", USER_RULES)), "defof F ");
    assert.strictEqual(GetCompletion(FindForwardMatches("de F 1", USER_RULES)), "defof F 1 ");
    assert.strictEqual(GetCompletion(FindForwardMatches("d F 1", USER_RULES)), "defof F 1 ");
    assert.strictEqual(GetCompletion(FindForwardMatches("d F", USER_RULES)), "defof F ");
    assert.strictEqual(GetCompletion(FindForwardMatches("d p", USER_RULES)), "direct proof ");
    assert.strictEqual(GetCompletion(FindForwardMatches("d p ()", USER_RULES)), "direct proof ()");
    assert.strictEqual(GetCompletion(FindForwardMatches("eq 1", USER_RULES)), "equivalent 1 ");
    assert.strictEqual(GetCompletion(FindForwardMatches("eq 1 ()", USER_RULES)), "equivalent 1 ()");
    assert.strictEqual(GetCompletion(FindForwardMatches("m p", USER_RULES)), "modus ponens ");
    assert.strictEqual(GetCompletion(FindForwardMatches("m p 3 4", USER_RULES)), "modus ponens 3 4");
    assert.strictEqual(GetCompletion(FindForwardMatches("i a", USER_RULES)), "intro and ");
    assert.strictEqual(GetCompletion(FindForwardMatches("i o", USER_RULES)), "intro or ");
    assert.strictEqual(GetCompletion(FindForwardMatches("i f", USER_RULES)), "intro forall ");
    assert.strictEqual(GetCompletion(FindForwardMatches("i f (tru", USER_RULES)), "intro forall (tru ");
    assert.strictEqual(GetCompletion(FindForwardMatches("i e", USER_RULES)), "intro exists ");
    assert.strictEqual(GetCompletion(FindForwardMatches("i a 1 2", USER_RULES)), "intro and 1 2");
    assert.strictEqual(GetCompletion(FindForwardMatches("i o 3 () l", USER_RULES)), "intro or 3 () left");
    assert.strictEqual(GetCompletion(FindForwardMatches("i f () x", USER_RULES)), "intro forall () x ");
    assert.strictEqual(GetCompletion(FindForwardMatches("i e 1 {} a", USER_RULES)), "intro exists 1 {} a ");
    assert.strictEqual(GetCompletion(FindForwardMatches("r 1", USER_RULES)), "repeat 1");
    assert.strictEqual(GetCompletion(FindForwardMatches("s 1 l", USER_RULES)), "substitute 1 left ");
    assert.strictEqual(GetCompletion(FindForwardMatches("s 1 l 2", USER_RULES)), "substitute 1 left 2 ");
    assert.strictEqual(GetCompletion(FindForwardMatches("s 1 r", USER_RULES)), "substitute 1 right ");
    assert.strictEqual(GetCompletion(FindForwardMatches("s 1 r 2", USER_RULES)), "substitute 1 right 2 ");
    assert.strictEqual(GetCompletion(FindForwardMatches("t ()", USER_RULES)), "tautology ()");
    assert.strictEqual(GetCompletion(FindForwardMatches("u F", USER_RULES)), "undef F ");
    assert.strictEqual(GetCompletion(FindForwardMatches("u F 1", USER_RULES)), "undef F 1 ");
  });

  it('PatternMatch completions backward', function() {
    assert.strictEqual(GetCompletion(FindBackwardMatches("al", USER_RULES)), "algebra ");
    assert.strictEqual(GetCompletion(FindBackwardMatches("ap", USER_RULES)), "apply ");
    assert.strictEqual(GetCompletion(FindBackwardMatches("ca", USER_RULES)), "cases ");
    assert.strictEqual(GetCompletion(FindBackwardMatches("ci", USER_RULES)), "cite ");
    assert.strictEqual(GetCompletion(FindBackwardMatches("de", USER_RULES)), "defof ");
    assert.strictEqual(GetCompletion(FindBackwardMatches("di", USER_RULES)), "direct proof");
    assert.strictEqual(GetCompletion(FindBackwardMatches("el", USER_RULES)), "elim ");
    assert.strictEqual(GetCompletion(FindBackwardMatches("elim a", USER_RULES)), "elim and ");
    assert.strictEqual(GetCompletion(FindBackwardMatches("e a", USER_RULES)), "elim and ");
    assert.strictEqual(GetCompletion(FindBackwardMatches("elim o", USER_RULES)), "elim or ");
    assert.strictEqual(GetCompletion(FindBackwardMatches("e o", USER_RULES)), "elim or ");
    assert.strictEqual(GetCompletion(FindBackwardMatches("elim f", USER_RULES)), "elim forall ");
    assert.strictEqual(GetCompletion(FindBackwardMatches("e f", USER_RULES)), "elim forall ");
    assert.strictEqual(GetCompletion(FindBackwardMatches("elim e", USER_RULES)), "elim exists ")
    assert.strictEqual(GetCompletion(FindBackwardMatches("e e", USER_RULES)), "elim exists ");
    assert.strictEqual(GetCompletion(FindBackwardMatches("eq", USER_RULES)), "equivalent ");
    assert.strictEqual(GetCompletion(FindBackwardMatches("ind", USER_RULES)), "induction");
    assert.strictEqual(GetCompletion(FindBackwardMatches("intro a", USER_RULES)), "intro and");
    assert.strictEqual(GetCompletion(FindBackwardMatches("i a", USER_RULES)), "intro and");
    assert.strictEqual(GetCompletion(FindBackwardMatches("intro o", USER_RULES)), "intro or ");
    assert.strictEqual(GetCompletion(FindBackwardMatches("i o", USER_RULES)), "intro or ");
    assert.strictEqual(GetCompletion(FindBackwardMatches("intro f", USER_RULES)), "intro forall ");
    assert.strictEqual(GetCompletion(FindBackwardMatches("i f", USER_RULES)), "intro forall ");
    assert.strictEqual(GetCompletion(FindBackwardMatches("intro e", USER_RULES)), "intro exists ");
    assert.strictEqual(GetCompletion(FindBackwardMatches("i e", USER_RULES)), "intro exists ");
    assert.strictEqual(GetCompletion(FindBackwardMatches("m", USER_RULES)), "modus ponens ");
    assert.strictEqual(GetCompletion(FindBackwardMatches("m p", USER_RULES)), "modus ponens ");
    assert.strictEqual(GetCompletion(FindBackwardMatches("si", USER_RULES)), "simple cases ");
    assert.strictEqual(GetCompletion(FindBackwardMatches("s c", USER_RULES)), "simple cases ");
    assert.strictEqual(GetCompletion(FindBackwardMatches("su", USER_RULES)), "substitute ");
    assert.strictEqual(GetCompletion(FindBackwardMatches("t", USER_RULES)), "tautology");
    assert.strictEqual(GetCompletion(FindBackwardMatches("u", USER_RULES)), "undef ");
    assert.strictEqual(GetCompletion(FindBackwardMatches("d p", USER_RULES)), "direct proof");
    assert.strictEqual(GetCompletion(FindBackwardMatches("e a () l", USER_RULES)), "elim and () left");
    assert.strictEqual(GetCompletion(FindBackwardMatches("e a () r", USER_RULES)), "elim and () right");
    assert.strictEqual(GetCompletion(FindBackwardMatches("e o () l", USER_RULES)), "elim or () left");
    assert.strictEqual(GetCompletion(FindBackwardMatches("e o () r", USER_RULES)), "elim or () right");
    assert.strictEqual(GetCompletion(FindBackwardMatches("e f {} x", USER_RULES)), "elim forall {} x");
    assert.strictEqual(GetCompletion(FindBackwardMatches("e e x y", USER_RULES)), "elim exists x y");
    assert.strictEqual(GetCompletion(FindBackwardMatches("i o ()", USER_RULES)), "intro or ()");
    assert.strictEqual(GetCompletion(FindBackwardMatches("i f x", USER_RULES)), "intro forall x ");
    assert.strictEqual(GetCompletion(FindBackwardMatches("i e {}", USER_RULES)), "intro exists {}");
    assert.strictEqual(GetCompletion(FindBackwardMatches("s c ()", USER_RULES)), "simple cases ()");
    assert.strictEqual(GetCompletion(FindBackwardMatches("su () l", USER_RULES)), "substitute () left");
    assert.strictEqual(GetCompletion(FindBackwardMatches("su () r", USER_RULES)), "substitute () right");
    assert.strictEqual(GetCompletion(FindBackwardMatches("s () l", USER_RULES)), "substitute () left");
    assert.strictEqual(GetCompletion(FindBackwardMatches("s () r", USER_RULES)), "substitute () right");
    assert.strictEqual(GetCompletion(FindBackwardMatches("u F", USER_RULES)), "undef F");
  });

});