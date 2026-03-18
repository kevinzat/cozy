import * as rules from '../infer/rules';


/**
 * FWD_PATTERNS and REV_PATTERNS, below, describe the shape of each allowed 
 * rule as a list of elements of the following form.
 */
interface PatternElement {
  /** the tag, such as TYPE_LITERAL or TYPE_VARIABLE */
  type: number,           
  /** applies only to TYPE_LITERAL pattern elements, the text of the literal, otherwise undefined */
  text?: string,          
  /** applies only to TYPE_OPTIONS pattern elements, the options, otherwise undefined */
  options?: string[],
  /** can apply to any element. if true, causes the element to be described in square brackets. */
  optional?: boolean,
}

// Allowed types of pattern elements:
// (exported for testing purposes only)
export const TYPE_LITERAL = 1;
export const TYPE_VARIABLE = 2;
export const TYPE_VARIABLES = 3;
export const TYPE_PREDICATE = 4;  // starts with a capital
export const TYPE_LINE = 5;
export const TYPE_LINES = 6;
export const TYPE_PROP = 7;
export const TYPE_PROPS = 8;
export const TYPE_EXPR = 9;
export const TYPE_SET_EXPR = 10;
export const TYPE_EXPRS = 11;
export const TYPE_OPTIONS = 12;

/** Patterns for each of the forward rules. */
// (exported for testing purposes only)
// NOTE: The pattern matcher depends on the fact that every pattern starts 
//       with one or more literals and no literal follows a non-literal.
export const FWD_PATTERNS: Array<[number, Array<PatternElement>]> = [
    [rules.RULE_ABSURDUM,
     [{type: TYPE_LITERAL, text: "absurdum"}, {type: TYPE_PROP}]],
    [rules.RULE_ALGEBRA,
     [{type: TYPE_LITERAL, text: "algebra"}, {type: TYPE_PROP},
      {type: TYPE_LINES, optional: true}]],
    [rules.RULE_APPLY,
     [{type: TYPE_LITERAL, text: "apply"}, {type: TYPE_PREDICATE}, {type: TYPE_LINE},
      {type: TYPE_EXPRS, optional: true}]],
    [rules.RULE_CASES,
     [{type: TYPE_LITERAL, text: "cases"},
      {type: TYPE_LINE}, {type: TYPE_LINE}, {type: TYPE_LINE}]],
    [rules.RULE_CITE,
     [{type: TYPE_LITERAL, text: "cite"}, {type: TYPE_PREDICATE}]],
    [rules.RULE_CONTRADICTION,
     [{type: TYPE_LITERAL, text: "contradiction"}, {type: TYPE_LINE}, {type: TYPE_LINE}]],
    [rules.RULE_DEFINITION,
     [{type: TYPE_LITERAL, text: "defof"}, {type: TYPE_PREDICATE}, {type: TYPE_LINE},
      {type: TYPE_PROP, optional: true}]],
    [rules.RULE_DIRECT_PROOF,
     [{type: TYPE_LITERAL, text: "direct"}, {type: TYPE_LITERAL, text: "proof"},
      {type: TYPE_PROP}]],
    [rules.RULE_ELIM_AND,
     [{type: TYPE_LITERAL, text: "elim"}, {type: TYPE_LITERAL, text: "and"},
      {type: TYPE_LINE}, {type: TYPE_OPTIONS, options: ["left", "right"]}]],
    [rules.RULE_ELIM_OR,
     [{type: TYPE_LITERAL, text: "elim"}, {type: TYPE_LITERAL, text: "or"},
      {type: TYPE_LINE}, {type: TYPE_LINE}]],
    [rules.RULE_ELIM_FORALL,
     [{type: TYPE_LITERAL, text: "elim"}, {type: TYPE_LITERAL, text: "forall"},
      {type: TYPE_LINE}, {type: TYPE_EXPRS}]],
    [rules.RULE_ELIM_EXISTS,
     [{type: TYPE_LITERAL, text: "elim"}, {type: TYPE_LITERAL, text: "exists"},
      {type: TYPE_LINE}, {type: TYPE_VARIABLE}]],
    [rules.RULE_EQUIVALENT,
     [{type: TYPE_LITERAL, text: "equivalent"}, {type: TYPE_LINE}, {type: TYPE_PROP}]],
    [rules.RULE_EX_FALSO,
     [{type: TYPE_LITERAL, text: "exfalso"}, {type: TYPE_LINE}, {type: TYPE_PROP}]],
    [rules.RULE_INDUCTION,
     [{type: TYPE_LITERAL, text: "induction"}, {type: TYPE_LINE}, {type: TYPE_LINE}]],
    [rules.RULE_INTRO_AND,
     [{type: TYPE_LITERAL, text: "intro"}, {type: TYPE_LITERAL, text: "and"},
      {type: TYPE_LINE}, {type: TYPE_LINE}]],
    [rules.RULE_INTRO_OR,
     [{type: TYPE_LITERAL, text: "intro"}, {type: TYPE_LITERAL, text: "or"},
      {type: TYPE_LINE}, {type: TYPE_PROP},
      {type: TYPE_OPTIONS, options: ["left", "right"]}]],
    [rules.RULE_INTRO_FORALL,
     [{type: TYPE_LITERAL, text: "intro"}, {type: TYPE_LITERAL, text: "forall"},
      {type: TYPE_PROP}, {type: TYPE_VARIABLES, optional: true}]],
    [rules.RULE_INTRO_EXISTS,
     [{type: TYPE_LITERAL, text: "intro"}, {type: TYPE_LITERAL, text: "exists"},
      {type: TYPE_LINE}, {type: TYPE_EXPR}, {type: TYPE_VARIABLE},
      {type: TYPE_PROP, optional: true}]],
    [rules.RULE_MODUS_PONENS,
     [{type: TYPE_LITERAL, text: "modus"}, {type: TYPE_LITERAL, text: "ponens"},
      {type: TYPE_LINE}, {type: TYPE_LINE}]],
    [rules.RULE_REPEAT,
     [{type: TYPE_LITERAL, text: "repeat"}, {type: TYPE_LINE}]],
    [rules.RULE_SIMPLE_CASES,
     [{type: TYPE_LITERAL, text: "simple"}, {type: TYPE_LITERAL, text: "cases"},
      {type: TYPE_LINE}, {type: TYPE_LINE}]],
    [rules.RULE_SUBSTITUTE,
     [{type: TYPE_LITERAL, text: "substitute"}, {type: TYPE_LINE},
      {type: TYPE_OPTIONS, options: ["left", "right"]}, {type: TYPE_LINE},
      {type: TYPE_PROP, optional: true}]],
    [rules.RULE_TAUTOLOGY,
     [{type: TYPE_LITERAL, text: "tautology"}, {type: TYPE_PROP}]],
    [rules.RULE_DEFINITION,
     [{type: TYPE_LITERAL, text: "undef"}, {type: TYPE_PREDICATE}, {type: TYPE_LINE},
      {type: TYPE_PROP, optional: true}]],
    [rules.RULE_VERUM,
     [{type: TYPE_LITERAL, text: "verum"}]],
  ];

/** Patterns for each of the backward rules. */
// (exported for testing purposes only)
// NOTE: The pattern matcher depends on the fact that every pattern starts 
//       with one or more literals and no literal follows a non-literal.
export const REV_PATTERNS: Array<[number, Array<PatternElement>]> = [
    [rules.RULE_ABSURDUM,
     [{type: TYPE_LITERAL, text: "absurdum"}]],
    [rules.RULE_ALGEBRA,
     [{type: TYPE_LITERAL, text: "algebra"}, {type: TYPE_PROPS}]],
    [rules.RULE_APPLY,
     [{type: TYPE_LITERAL, text: "apply"}, {type: TYPE_PREDICATE}]],
    [rules.RULE_CASES,
     [{type: TYPE_LITERAL, text: "cases"}, {type: TYPE_PROP}]],
    [rules.RULE_CITE,
     [{type: TYPE_LITERAL, text: "cite"}, {type: TYPE_PREDICATE}]],
    [rules.RULE_CONTRADICTION,
     [{type: TYPE_LITERAL, text: "contradiction"}, {type: TYPE_PROP}]],
    [rules.RULE_DEFINITION,
     [{type: TYPE_LITERAL, text: "defof"}, {type: TYPE_PREDICATE}]],
    [rules.RULE_DIRECT_PROOF,
     [{type: TYPE_LITERAL, text: "direct"}, {type: TYPE_LITERAL, text: "proof"}]],
    [rules.RULE_ELIM_AND,
     [{type: TYPE_LITERAL, text: "elim"}, {type: TYPE_LITERAL, text: "and"},
      {type: TYPE_PROP}, {type: TYPE_OPTIONS, options: ["left", "right"]}]],
    [rules.RULE_ELIM_OR,
     [{type: TYPE_LITERAL, text: "elim"}, {type: TYPE_LITERAL, text: "or"},
      {type: TYPE_PROP}, {type: TYPE_OPTIONS, options: ["left", "right"]}]],
    [rules.RULE_ELIM_FORALL,
     [{type: TYPE_LITERAL, text: "elim"}, {type: TYPE_LITERAL, text: "forall"},
      {type: TYPE_EXPR}, {type: TYPE_VARIABLE}]],
    [rules.RULE_ELIM_EXISTS,
     [{type: TYPE_LITERAL, text: "elim"}, {type: TYPE_LITERAL, text: "exists"},
      {type: TYPE_VARIABLE}, {type: TYPE_VARIABLE}]],
    [rules.RULE_EQUIVALENT,
     [{type: TYPE_LITERAL, text: "equivalent"}, {type: TYPE_PROP}]],
    [rules.RULE_EX_FALSO,
     [{type: TYPE_LITERAL, text: "exfalso"}]],
    [rules.RULE_INDUCTION, [{type: TYPE_LITERAL, text: "induction"}]],
    [rules.RULE_INTRO_AND,
     [{type: TYPE_LITERAL, text: "intro"}, {type: TYPE_LITERAL, text: "and"}]],
    [rules.RULE_INTRO_OR,
     [{type: TYPE_LITERAL, text: "intro"}, {type: TYPE_LITERAL, text: "or"},
      {type: TYPE_PROP}]],
    [rules.RULE_INTRO_FORALL,
     [{type: TYPE_LITERAL, text: "intro"}, {type: TYPE_LITERAL, text: "forall"},
      {type: TYPE_VARIABLES, optional: true}]],
    [rules.RULE_INTRO_EXISTS,
     [{type: TYPE_LITERAL, text: "intro"}, {type: TYPE_LITERAL, text: "exists"},
      {type: TYPE_EXPR}]],
    [rules.RULE_MODUS_PONENS,
     [{type: TYPE_LITERAL, text: "modus"}, {type: TYPE_LITERAL, text: "ponens"},
      {type: TYPE_PROP}]],
    [rules.RULE_SIMPLE_CASES,
     [{type: TYPE_LITERAL, text: "simple"}, {type: TYPE_LITERAL, text: "cases"},
      {type: TYPE_PROP}]],
    [rules.RULE_SUBSTITUTE,
     [{type: TYPE_LITERAL, text: "substitute"}, {type: TYPE_PROP},
      {type: TYPE_OPTIONS, options: ["left", "right"]}]],
    [rules.RULE_TAUTOLOGY,
     [{type: TYPE_LITERAL, text: "tautology"}]],
    [rules.RULE_DEFINITION,
     [{type: TYPE_LITERAL, text: "undef"}, {type: TYPE_PREDICATE}]],
    [rules.RULE_VERUM,
     [{type: TYPE_LITERAL, text: "verum"}]],
  ];


/** Regular expression for a line reference */
const RE_LINE = /[0-9]+(?:\.[0-9]+)*/;

/** Regular expression for a variable */
const RE_VARIABLE = /[a-z][_a-zA-Z0-9]*/;

/** Regular expression for a predicate */
const RE_PREDICATE = /[A-Z][_a-zA-Z0-9]*/;

/** Regular expression for a proposition. (Not regular, so little checking.) */
const RE_PROP = /\(.*/;

/** Regular expression for an expression. (Not regular, so little checking.) */
const RE_EXPR = /\{.*/;

/** Regular expression for a set expression. (Not regular, so little checking.) */
const RE_SET_EXPR = /\{.*/;

/** Regular expression for an expression list. (Not regular, so little checking.) */
const RE_EXPRS = /\{.*/;

/** Text used to describe a line reference (first 1.2, then 3.4, etc.) */
const LINE_DESCRIPTION = [ "1.2", "3.4", "5.6" ];


/** A piece of text that is optionally bold. */
export interface MatchWord {
  bold: boolean,
  text: string
}

/** Describes a potential match and how to complete it. */
export interface Match {
  description: Array<MatchWord>,
  completion: string
}

/**
 * Returns descriptions of each forward pattern that matches the text provided.
 * To match, there must be a way to extend it to a complete match.
 */
export function FindForwardMatches(
    text: string, allowedRules: number[]): Array<Match> {
  return FindMatches(text, allowedRules, FWD_PATTERNS);
}

/**
 * Returns descriptions of each backward pattern that matches the text provided.
 * To match, there must be a way to extend it to a complete match.
 */
export function FindBackwardMatches(
    text: string, allowedRules: number[]): Array<Match> {
  return FindMatches(text, allowedRules, REV_PATTERNS);
}

function FindMatches(text: string, allowedRules: number[],
    patterns: Array<[number, Array<PatternElement>]>): Array<Match> {
  const parts = SplitLine(text);
  const allowed = new Set(allowedRules);

  const matches: Array<Match> = [];
  for (const [variety, pattern] of patterns) {
    if (allowed.has(variety)) {
      const match = PatternMatch(parts, pattern);
      if (match !== undefined)
        matches.push(match);
    }
  }
  return matches;
}


/**
 * Determines whether the given text, split into parts, matches the given pattern.
 * If so, this returns a description and completion of the match; otherwise, undefined.
 * 
 * `parts` should have been split by {@link SplitLine}.
 *
 * `pattern` must start with a literal ({@link TYPE_LITERAL}) and no literal may appear
 * after any non-literal.
 * 
 * Returns a {@link Match} object, or undefined, indicating that the pattern did not match. 
 * 
 * @remarks
 *
 * Note that a `parts` array may only partially match the pattern, for example because it 
 * is missing some elements specified by the pattern, or because some literals are only 
 * partially present. These partial matches are considered a "success", and return a `Match`
 * object.
 * 
 * A `Match` consists of a description and a completion. A description is a sequence of 
 * possibly-bolded strings that describes the entire pattern as partially matched, with 
 * the bold parts indicating what the user has typed so far, and the non-bold parts indicating 
 * what is still missing to completely match the pattern.
 *
 * A completion is a string that is a super-sequence of the (joined) input parts strings, 
 * which includes all the complete literals which are required by the pattern. 
 *
 * For example, suppose the `pattern` is `[LITERAL(intro), LITERAL(forall), PROP, VARIABLE]`,
 * where we are abbreviating `PatternElement` objects in a hopefully clear way. And suppose 
 * that `parts` is `["i", "f", "(tru"]`. Then the pattern will match successfully. The 
 * description will be
 * ```
 * ["<b>", "i", "</b>", "ntro", " ", "<b>", "f", "</b>", "orall", " ",  
 *  "<b>", "(Prop)", "</b>", " ", "x|y|z"]
 * ```
 * and the completion will be `"intro forall (tru "`. Notice that the completion completed
 * multiple literals and left the unfinished proposition untouched.
 * 
 */
export function PatternMatch(parts: string[], pattern: Array<PatternElement>): Match|undefined {
  const n = pattern.length;
  if (parts.length > n && pattern[n-1].type !== TYPE_EXPRS &&
      pattern[n-1].type !== TYPE_LINES && pattern[n-1].type !== TYPE_PROPS &&
      pattern[n-1].type !== TYPE_VARIABLES)
    return undefined;

  const desc: Array<MatchWord> = [];  // tooltip to show to the user describing the syntax
  const comp: Array<string> = [];     // what to replace the user's text with

  // Find the parts that match.
  //
  // Invariant: Every part < i is described by some elements of desc, and completed by 
  //            an element of comp.
  for (let i = 0; i < parts.length; i++) {
    if (desc.length > 0) {
      desc.push({bold: false, text: " "});
      comp.push(" ");
    }

    switch (pattern[i].type) {
      case TYPE_LITERAL:
        if (pattern[i].text === parts[i]) {
          desc.push({bold: true, text: parts[i]});
          comp.push(parts[i]);
        } else if (pattern[i].text!.startsWith(parts[i])) {
          comp.push(pattern[i].text!);
          desc.push({bold: true, text: parts[i]});
          desc.push({bold: false, text: pattern[i].text!.substring(parts[i].length)});
        } else {
          return undefined;
        }
        break;

      case TYPE_OPTIONS:
        const desc_opt: Array<MatchWord> = [];
        const comp_opt: Array<string> = [];

        let opt_matches = 0;
        for (let j = 0; j < pattern[i].options!.length; j++) {
          if (pattern[i].options![j] === parts[i]) {
            if (desc_opt.length > 0)
              desc_opt.push({bold: false, text: "|"});
            desc_opt.push({bold: true, text: parts[i]});
            comp_opt.push(parts[i]);
            opt_matches += 1;
          } else if (pattern[i].options![j].startsWith(parts[i])) {
            if (desc_opt.length > 0)
              desc_opt.push({bold: false, text: "|"});
            comp_opt.push(pattern[i].options![j]);
            desc_opt.push({bold: true, text: parts[i]});
            desc_opt.push({bold: false, text: pattern[i].options![j].substring(parts[i].length)});
            opt_matches += 1;
          } else {
            // this option is not a match
          }
        }
        if (desc_opt.length === 0)
          return undefined;  // not a match
        if (opt_matches > 1)
          comp.push(parts[i]);  // not a unique completion, keep original
        else
          comp.push(...comp_opt);
          
        desc.push(...desc_opt);
        break;

      case TYPE_VARIABLE:
        if (RE_VARIABLE.test(parts[i])) {
          desc.push({bold: true, text: parts[i]});
          comp.push(parts[i]);
        } else {
          return undefined;
        }
        break;

      case TYPE_VARIABLES:
        while (true) {
          if (!RE_VARIABLE.test(parts[i]))
            return undefined;

          desc.push({bold: true, text: parts[i]});
          comp.push(parts[i]);

          if (i+1 < parts.length) {
            desc.push({bold: false, text: " "});
            comp.push(" ")
            i += 1;
          } else {
            desc.push({bold: false, text: " "});
            desc.push({bold: false, text: "[y z ...]"});
            comp.push(" ")
            break;
          }
        }
        break;

      case TYPE_PREDICATE:
        if (RE_PREDICATE.test(parts[i])) {
          desc.push({bold: true, text: parts[i]});
          comp.push(parts[i]);
        } else {
          return undefined;
        }
        break;

      case TYPE_LINE:
        if (RE_LINE.test(parts[i])) {
          desc.push({bold: true, text: parts[i]});
          if (parts[i].endsWith(".")) {
            desc.push({bold: false, text: "1-99"});
          }
          comp.push(parts[i]);
        } else {
          return undefined;
        }
        break;

      case TYPE_LINES:  // match at least one line
        while (true) {
          if (!RE_LINE.test(parts[i]))
            return undefined;

          desc.push({bold: true, text: parts[i]});
          if (parts[i].endsWith(".")) {
            desc.push({bold: false, text: "1-99"});
          }
          comp.push(parts[i]);

          if (i+1 < parts.length) {
            desc.push({bold: false, text: " "});
            comp.push(" ")
            i += 1;
          } else {
            desc.push({bold: false, text: " "});
            desc.push({bold: false, text: "[3.4 ...]"});
            comp.push(" ")
            break;
          }
        }
        break;

      case TYPE_PROP:
        // TODO(future): bold last parentheses only if it fully parses
        if (RE_PROP.test(parts[i])) {
          desc.push({bold: true, text: "(Prop)"});
          comp.push(parts[i]);
        } else {
          return undefined;
        }
        break;

      case TYPE_PROPS:  // match at least one proposition
        while (true) {
          if (!RE_PROP.test(parts[i]))
            return undefined;

          desc.push({bold: true, text: parts[i]});
          // TODO(future): bold last paren only if it fully parses

          comp.push(parts[i]);

          if (i+1 < parts.length) {
            desc.push({bold: false, text: " "});
            comp.push(" ");
            i += 1;
          } else {
            desc.push({bold: false, text: " "});
            desc.push({bold: false, text: "[(Prop) ...]"});
            comp.push(" ");
            break;
          }
        }
        break;

      case TYPE_EXPR:
        if (!RE_EXPR.test(parts[i]))
          return undefined;

        desc.push({bold: true, text: parts[i]});
        comp.push(parts[i]);
        if (!parts[i].trimEnd().endsWith("}")) {
          desc.push({bold: false, text: "}"});
        }
        break;

      case TYPE_SET_EXPR:
        if (!RE_SET_EXPR.test(parts[i]))
          return undefined;

        desc.push({bold: true, text: parts[i]});
        comp.push(parts[i]);
        if (!parts[i].trimEnd().endsWith("}"))
          desc.push({bold: false, text: "}"});
        break;

      case TYPE_EXPRS:
        if (!RE_EXPRS.test(parts[i]))
          return undefined;

        desc.push({bold: true, text: parts[i]});
        comp.push(parts[i]);
        if (!parts[i].trimEnd().endsWith("}")) {
          if (parts[i].trimEnd().endsWith(",")) {
            desc.push({bold: false, text: " "});
          } else {
            desc.push({bold: false, text: ", "});
          }
          desc.push({bold: false, text: "[Expr ...]}"});
        }
        break;

      default:
        throw new Error(`unknown type ${pattern[i].type}`);
    }
  }

  // Describe the parts not matched yet.
  let lineCount = 0;
  // Invariant: Every pattern < i is described by some elements of desc, 
  //            and every pattern < min(i, index of rightmost literal in pattern) 
  //            is completed by an element of comp.
  for (let i = parts.length; i < pattern.length; i++) {
    if (desc.length > 0)
      desc.push({bold: false, text: " "});
    if (comp.length > 0 && comp[comp.length-1] !== " ") 
      comp.push(" ");

    switch (pattern[i].type) {
      case TYPE_LITERAL:
        desc.push({bold: false, text: pattern[i].text!});
        // If we get to this case, we are guaranteed by the function precondition 
        // that all patterns <= i are literals, so it is safe to add to the completion.
        comp.push(pattern[i].text!);
        // In all other cases below, we are guaranteed that we will never see a literal again, 
        // so there is nothing to do to the completion.
        break;
      case TYPE_OPTIONS:
        desc.push({bold: false, text: pattern[i].options!.join('|')});
        break;
      case TYPE_VARIABLE:
        desc.push({bold: false, text: "x|y|z"});
        break;
      case TYPE_VARIABLES:
        desc.push({bold: false, text: "x y ..."});
        break;
      case TYPE_PREDICATE:
        desc.push({bold: false, text: "A|B|C"});
        break;
      case TYPE_LINE:
        desc.push({bold: false, text: LINE_DESCRIPTION[lineCount++]});
        break;
      case TYPE_LINES:
        desc.push({bold: false, text: "1.2 [3.4 ...]"});
        break;
      case TYPE_PROP:
        desc.push({bold: false, text: "(Prop)"});
        break;
      case TYPE_PROPS:
        desc.push({bold: false, text: "(Prop) [(Prop) ...]"});
        break;
      case TYPE_EXPR:
        desc.push({bold: false, text: "{Expr}"});
        break;
      case TYPE_SET_EXPR:
        desc.push({bold: false, text: "{Set}"});
        break;
      case TYPE_EXPRS:
        desc.push({bold: false, text: "{Expr, Expr, ...}"});
        break;
      default:
        throw new Error(`unknown type ${pattern[i].type}`);
    }
    if (pattern[i].optional) {
      desc[desc.length-1] = {
          bold: desc[desc.length-1].bold,
          text: "[" + desc[desc.length-1].text + "]"
        };
    }
  }

  return {description: desc, completion: comp.join("")};
}

export function LongestCommonPrefix(strings: string[]): string {
    let prefix = strings[0];
    for (let i = 1; i < strings.length; i++) {
      let j = 0;
      while (j < prefix.length && j < strings[i].length) {
        if (prefix[j] != strings[i][j]) {
          break;
        }
        j++;
      }
      if (j < prefix.length)
        prefix = prefix.substring(0, j);
    }
    return prefix;
}

/**
 * Splits an inference string into its basic pieces (literals, variables, lines,
 * and propositions).
 * 
 * * Expressions are recognized by surrounding them with curly braces, 
 *   which may *not* nest.
 * * Propositions are recognized by surrounding them with balanced parentheses, 
 *   which may nest, but only in a balanced way.
 * * A line reference consists of a sequence of digits and dots. The dots may 
 *   optionally be surrounded by whitespace.
 * * Everything else is split into literals, which are sequences of non-space 
 *   characters. Other whitespace not appearing inside an expression, proposition,
 *   or line reference is removed.
 */
export function SplitLine(text:string): string[] {
  const parts: string[] = [];
  text = text.trim();

  let i = 0;
  while (i < text.length) {
    if (text[i] === ' ')  {
      i += 1; // skip past this
      continue;
    }
        
    let j: number;
    let s: string;
    if ('0' <= text[i] && text[i] <= '9') {
      [j, s] = ParseLineRef(text, i);
    } else if (text[i] == '(') {
      [j, s] = ParseProp(text, i);
    } else if (text[i] == '{') {
      [j, s] = ParseExpr(text, i);
    } else {
      [j, s] = ParseLiteral(text, i);
    }
    parts.push(s);
    i = j;
  }
  return parts;
}


/** Returns the index at which the literal starting at start ends. */
function ParseLiteral(text: string, start: number): [number, string] {
  let i = start;
  while (i < text.length && text[i] != ' ') {
    i += 1;
  }
  return [i, text.substring(start, i)];
}

/** Returns the index at which the proposition starting at start ends. */
function ParseProp(text: string, start: number): [number, string] {
  let depth = 1;
  let i = start + 1;
  while (i < text.length && depth > 0) {
    if (text[i] == '(') {
      depth += 1;
    } else if (text[i] == ')') {
      depth -= 1;
    }
    i += 1;
  }
  return [i, text.substring(start, i)];
}

/** Returns the index at which the expression starting at start ends. */
function ParseExpr(text: string, start: number): [number, string] {
  let i = start + 1;
  while (i < text.length) {
    if (text[i] == '}')
      return [i+1, text.substring(start, i+1)];
    i += 1;
  }
  return [i, text.substring(start, i)];
}

/** Returns the index at which the line reference starting at start ends. */
function ParseLineRef(text: string, start:number): [number, string] {
  let parts: string[] = []
  let i = start;

  while (true) {
    // Skip past the current number.
    let j = i;
    while (j < text.length && '0' <= text[j] && text[j] <= '9') {
      j += 1;
    }

    parts.push(text.substring(i, j))
    i = j;

    // Find the next character (after any spaces). Stop if not a period.
    while (j < text.length && text[j] == ' ')
      j += 1;
    if (j == text.length || text[j] != '.')
      return [i, parts.join("")];

    parts.push(".");  // include the period in the line reference
    j += 1;
    i = j;

    // Find the next character (after any spaces). Stop if not a digit.
    while (j < text.length && text[j] == ' ')
      j += 1;
    if (j == text.length || !('0' <= text[j] && text[j] <= '9'))
      return [i, parts.join("")];

    i = j;  // Continue (in the next iteration) adding these digits.
  }
}