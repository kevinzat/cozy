import * as nearley from 'nearley';
import { Proposition } from './props';
import { UserError } from './user_error';
import grammar from './props_grammar';


/** Parses a proposition, throwing 'syntax error' if not possible. */
export function ParseProp(text: string): Proposition {
  const parser =
      new nearley.Parser(nearley.Grammar.fromCompiled(grammar as any));
  try { parser.feed(text); }
  catch (e) { throw new ParseError(text, 0); }
  if (parser.results.length == 1) {
    return parser.results[0] as Proposition;
  } else {
    throw new ParseError(text, parser.results.length);
  }
}


/** Thrown when the proposition could not be parsed. */
export class ParseError extends UserError {
  text: string;     // text that could not be parsed
  parses: number;   // number of parses found

  constructor(text: string, parses: number) {
    super((parses === 0) ? `syntax error in "${text}"`
                         : `ambiguous grammar for "${text}"`);

    // hack workaround of TS transpiling bug (so gross)
    Object.setPrototypeOf(this, ParseError.prototype);

    this.text = text;
    this.parses = parses;
  }
}