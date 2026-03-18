import React, { ChangeEvent } from 'react';
import { UserError } from '../facts/user_error';
import { Match, LongestCommonPrefix } from '../langs/infer_complete';
import { RuleSuggest } from './RuleSuggest';
import { RuleName } from '../infer/rules';
import { AbsLineRef } from '../infer/rules_ast';


export interface WorkingLineProps {
  firstWorking: boolean,
  allowedRules: number[]
}

// The state always stores the current text and completion information. We delay
// doing a full check of the text (it annoys the user to complain too quickly).
export interface WorkingLineState<Ast> {
  text: string,            // text in the input box
  matches: Array<Match>,   // completion info

  delayTimer: any,         // timer waiting for a full parse (if any)

  parsed: Ast|undefined,  // results of the last full parse
  error: string|undefined,

  focus: boolean           // whether the input box has focus
}


/** Function to parse text into an AST. */
export type Parser<Ast> = (text: string) => Ast;

/** Function to generate suggestions for typed text. */
export type MatchFinder = (text:string, allowedRules: number[]) => Array<Match>;


/**
 * Displays an in-progress line of reasoning in the proof. Note that this
 * renders only the line-rule column. The subclass needs to fill in the rest.
 */
export abstract class WorkingLine<Ast, P extends WorkingLineProps>
    extends React.Component<P, WorkingLineState<Ast>> {

  findMatches: MatchFinder;  // function to get suggestions for the text
                             // (not a method as it should not need state)
  placeholder: string;  // what is shown in an empty textbox

  constructor(props: P, findMatches: MatchFinder, placeholder: string) {
    super(props);

    this.findMatches = findMatches;
    this.placeholder = placeholder;

    this.state = {
        text: '', matches: findMatches('', this.props.allowedRules),
        delayTimer: undefined, parsed: undefined, error: undefined, focus: false
      };
  }

  /** Called to parse text into an appropriate AST (or throw a UserError). */
  abstract parse(text: string): Ast;

  /**
   * Called when the user presses Enter with text that parses correctly. This
   * can throw UserError if another error is discovered.
   */
  abstract complete(parsed: Ast): void;

  render() {
    const err = this.state.error !== undefined;
    let errMsg: any = '';
    if (err) {
      errMsg = <span className="line-error">{this.state.error}</span>
    }

    let suggest = undefined;
    if (this.state.focus && this.state.matches.length > 0 &&
        this.state.text.trim().length) {  // do not show until they start typing
      suggest = <RuleSuggest suggestions={this.state.matches}/>;
    }

    return <td className="line-rule">
        <div style={{backgroundColor: err ? '#FF7373' : 'white'}}>
          <input type="text"
              value={this.state.text} placeholder={this.placeholder}
              autoFocus={this.props.firstWorking}
              onChange={this.handleTextChange.bind(this)}
              onKeyDown={this.handleKeyDown.bind(this)}
              onFocus={this.handleFocus.bind(this)}
              onBlur={this.handleBlur.bind(this)}>
          </input>
          {errMsg}
        </div>
        {suggest}
      </td>;
  }

  handleFocus(_: ChangeEvent<HTMLInputElement>) {
    this.setState({focus: true});
  }

  handleBlur(_: ChangeEvent<HTMLInputElement>) {
    this.setState({focus: false});
  }

  handleKeyDown(evt: React.KeyboardEvent<HTMLInputElement>) {
    if (evt.key === 'Enter') {      // on enter, apply the rule
      this.handleApplyRule();

    } else if (evt.key === 'Tab' && !evt.getModifierState("Shift")) {  // on tab, apply the completion
      const comp = this.getCompletion();
      if (comp !== undefined) {
        this.setText(comp);
      }
      if (this.state.focus && this.state.text.length > 0) {
        // whether or not completion succeeded, prevent tab navigation if box is nonempty
        evt.stopPropagation();
        evt.preventDefault();
      }
    }
  }
  
  /**
   * Returns the completion of this text (filling in all words that are uniquely determined)
   * or undefined if there is no such completion.
   */
  getCompletion(): string|undefined {
    if (this.state.matches.length == 0)
      return undefined;  // no matches

    let completions = this.state.matches.map(x => x.completion);
    let prefix = LongestCommonPrefix(completions)

    if (prefix.length === 0) 
      return undefined;  // disagreement

    return prefix;
  }

  handleTextChange(evt: ChangeEvent<HTMLInputElement>) {
    this.setText(evt.target.value);
  }

  /** Removes the text in the input box. (Only used by subclasses.) */
  clearText() {
    if (this.state.delayTimer !== undefined) {
      clearTimeout(this.state.delayTimer);  // old timer no longer needed
    }

    this.setState({
        text: '', matches: this.findMatches('', this.props.allowedRules),
        delayTimer: undefined, parsed: undefined, error: undefined
      });
  }

  /** Updates the text and suggestions. Schedules a timer for parsing. */
  setText(text: string) {
    if (this.state.delayTimer !== undefined) {
      clearTimeout(this.state.delayTimer);  // old timer no longer needed
    }

    const matches = this.findMatches(text, this.props.allowedRules);
    const timer = setTimeout(() => this.handleParse(), 300);
    this.setState({text: text, matches: matches, delayTimer: timer});
  }

  /** Parses the text in the input box, updating the parsed stated. */
  handleParse(): Ast | undefined {
    if (this.state.text.length === 0) {
      this.setParseValid(undefined);
      return undefined;
    }

    let parsed = undefined;
    try {
      parsed = this.parse(this.state.text);
      this.setParseValid(parsed);
    } catch (e) {
      if (e instanceof DisallowedRule) {
        this.setParseError(e.message);
      } else if (e instanceof UserError) {
        this.setParseError(e.message);
      } else {
        throw e;
      }
    }
    return parsed;
  }

  setParseValid(parsed: Ast|undefined) {
    this.setState({parsed, error: undefined, delayTimer: undefined});
  }

  setParseError(error: string) {
    this.setState({parsed: undefined, error: error, delayTimer: undefined});
  }

  /** Add the proposition produced by this rule (if present) to the proof. */
  handleApplyRule() {
    // Get the parse of the most recent text. If a timer is present, then we
    // will need to calculate it right now.
    let parsed;
    if (this.state.delayTimer === undefined) {
      parsed = this.state.parsed;
    } else {
      clearTimeout(this.state.delayTimer);
      parsed = this.handleParse();
    }

    // If we could not parse it, then we cannot apply the rule.
    if (parsed === undefined)
      return;

    try {
      this.complete(parsed);
    } catch (e) {
      if (e instanceof UserError) {
        this.setRuleError(e.message);
      } else {
        throw e;
      }
    }
  }

  /** Records an error found in the rule application. */
  setRuleError(error: string) {
    this.setState({error: error});
  }
}


/** Thrown when the caller attempts to use a rule that is not allowd. */
export class DisallowedRule extends Error {
  variety: number;  // type of rule that was applied incorrectly

  constructor(variety: number) {
    super(`${RuleName(variety)} not allowed`);

    // hack workaround of TS transpiling bug (so gross)
    Object.setPrototypeOf(this, DisallowedRule.prototype);

    this.variety = variety;
  }
}


/** Returns a string of non-breaking spaces to properly indent the given line. */
export function GetLineIndent(num: number): string|JSX.Element {
  if (num == 1) {
    return '';
  } else {
    const indents = [];
    for (let i = 0; i < num - 1; i++)
      indents.push(<span>&nbsp;&nbsp;</span>);
    return <span>{indents}</span>;
  }
}

/** Returns a string to use to show the given line number. */
export function GetLineNumber(num: AbsLineRef): string {
  return num.join(".");
}
