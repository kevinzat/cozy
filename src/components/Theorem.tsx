import React, { ChangeEvent } from 'react';
import { Proposition, IsTheorem, IsDefinition } from '../facts/props';
import { ParseProp } from '../facts/props_parser';
import { UserError } from '../facts/user_error';
import { RuleVariety } from '../infer/rules';
import { DEFINITIONS } from '../infer/integers';


// Default to the rules of intuitionistic propositional logic.
const DEFAULT_RULES = [
    "modus ponens", "direct proof", "intro and", "elim and", "intro or",
    "elim or", "cases", "simple cases",
    "contradiction", "absurdum", "exfalso", "verum"
  ].join(", ");


// Names of the definitions included by default.
const DEFAULT_DEF_NAMES = DEFINITIONS.map(([n, _p]) => n);

interface TheoremProps {
    givens: string[] | undefined,
    conclusion: string | undefined,
    rules: string | undefined,
    variables: string | undefined,
    definitions: string | undefined,
    theorems: string | undefined,
    onValid: (givens: string[], conclusion: string, rules: string|undefined,
              variables: string|undefined, definitions: string|undefined, 
              theorems: string|undefined) => void,
    onInvalid: () => void,
}

interface TheoremState {
    givenText: string[];
    givenProp: Array<Proposition | undefined>;
    proveText: string;
    proveProp: Proposition | undefined;
    rulesText: string,
    rulesList: number[] | undefined
    varsText: string,
    varsList: string[] | undefined
    defsText: string,
    defsList: [string, Proposition][] | undefined
    thmsText: string,
    thmsList: [string, Proposition][] | undefined
}

/** UI to allow the user to specify the theorem they want to prove. */
export default class Theorem
    extends React.Component<TheoremProps, TheoremState> {

  constructor(props: TheoremProps) {
    super(props);

    let givenText: string[] = [];
    let givenProp: (Proposition|undefined)[] = [];
    if (props.givens) {
      givenText = props.givens;
      givenProp = props.givens.map((x) => (x) ? ParseProp(x) : undefined);
    }

    let proveText: string = "";
    let proveProp: Proposition | undefined = undefined;
    if (props.conclusion) {
      proveText = props.conclusion;
      proveProp = ParseProp(props.conclusion);
    }

    let rulesText = (props.rules === undefined) ? DEFAULT_RULES : props.rules;
    let rulesList = ParseAllowedRules(rulesText);

    let varsText = props.variables || '';
    let varsList = ParseVariableNames(varsText);

    let defsText = props.definitions || '';
    let defsList = ParseTheoremsOrUndefined(defsText, "definition", IsDefinition);

    let thmsText = props.theorems || '';
    let thmsList = ParseTheoremsOrUndefined(thmsText, "theorem", IsTheorem);

    this.state = {
        givenText: givenText, givenProp: givenProp,
        proveText: proveText, proveProp: proveProp,
        rulesText: rulesText, rulesList: rulesList,
        varsText: varsText, varsList: varsList,
        defsText: defsText, defsList: defsList,
        thmsText: thmsText, thmsList: thmsList,
      };
  }

  render() {
    const rows: any[] = [];

    for (let i = 0; i < this.state.givenText.length; i++) {
      const err = (this.state.givenText[i].length > 0) &&
                  (this.state.givenProp[i] === undefined);
      rows.push(
        <tr>
          <td>{i === 0 ? 'Given' : ''}</td>
          <td style={{backgroundColor: err ? '#FF7373' : 'white'}}>
            <input type="text" style={{padding: '5px', width: '320px'}}
                value={this.state.givenText[i]} placeholder="e.g., (P and Q) -> not S"
                onChange={this.handleGivenChange.bind(this, i)}>
            </input>
            <button type="button" className="btn btn-link"
                style={{padding: '6px', color: 'gray', border: 'none', fontSize: '10pt', marginLeft: '10px'}}
                onClick={this.handleGivenRemove.bind(this, i)}>
              <i className="fa fa-remove"></i>
            </button>
          </td>
          <td></td>
        </tr>);
    }

    rows.push(
      <tr>
        <td>{this.state.givenText.length === 0 ? 'Given' : ''}</td>
        <td>
          <button type="button" className="btn btn-link"
              style={{padding: '6px', color: 'gray', border: 'none', fontSize: '10pt'}}
              onClick={this.handleGivenAddNew.bind(this)}>
            <i className="fa fa-plus"></i>
          </button>
        </td>
        <td></td>
      </tr>);

    const err = (this.state.proveText.length > 0) &&
                (this.state.proveProp === undefined);
    rows.push(
      <tr>
        <td>Prove</td>
        <td style={{backgroundColor: err ? '#FF7373' : 'white'}}>
          <input type="text" style={{padding: '5px', width: '320px'}}
              value={this.state.proveText} placeholder="e.g., (P or Q) -> not S"
              onChange={this.handleStmtChange.bind(this)}>
          </input>
        </td> 
        <td></td>
      </tr>);

    const ruleError = (this.state.rulesText.trim().length > 0) &&
        (this.state.rulesList === undefined);
    rows.push(
      <tr>
        <td>Rules</td>
        <td style={{backgroundColor: ruleError ? '#FF7373' : 'white'}}>
          <input type="text" style={{padding: '5px', width: '640px'}}
              value={this.state.rulesText} placeholder="e.g., modus ponens, intro and, elim or"
              onChange={this.handleRulesChange.bind(this)}>
          </input>
        </td>
        <td style={{color: 'gray', fontSize: '10pt', marginLeft: '10px'}}>
          (empty = all known rules)
        </td>
      </tr>);

    const varsError = (this.state.varsText.trim().length > 0) &&
        (this.state.varsList === undefined);
    rows.push(
      <tr>
        <td>Variables</td>
        <td style={{backgroundColor: varsError ? '#FF7373' : 'white'}}>
          <input type="text" style={{padding: '5px', width: '320px'}}
              value={this.state.varsText} placeholder="a, b, c"
              onChange={this.handleVariablesChange.bind(this)}>
          </input>
        </td>
        <td style={{color: 'gray', fontSize: '10pt', marginLeft: '10px'}}>
          (empty = none)
        </td>
      </tr>);

    const defsError = (this.state.defsText.trim().length > 0) &&
        (this.state.defsList === undefined);
    rows.push(
      <tr>
        <td>Definitions</td>
        <td style={{backgroundColor: defsError ? '#FF7373' : 'white'}}>
          <textarea rows={5} style={{padding: '5px', width: '640px'}}
              value={this.state.defsText}
              placeholder="Even: forall n, Even(n) <-> (exists k, n = 2*k)&#10;Odd: forall n, Odd(n) <-> (exists k, n = 2*k+1)"
              onChange={this.handleDefinitionsChange.bind(this)}>
          </textarea>
        </td>
        <td style={{color: 'gray', fontSize: '10pt', marginLeft: '10px'}}>
          (empty = {DEFAULT_DEF_NAMES.join(", ")})
        </td>
      </tr>);

    const thmsError = (this.state.thmsText.trim().length > 0) &&
        (this.state.thmsList === undefined);
    rows.push(
      <tr>
        <td>Theorems</td>
        <td style={{backgroundColor: thmsError ? '#FF7373' : 'white'}}>
          <textarea rows={5} style={{padding: '5px', width: '640px'}}
              value={this.state.thmsText} placeholder="Thm1: forall x, Prime(x) -> (x = 2) or Odd(x)"
              onChange={this.handleTheoremsChange.bind(this)}>
          </textarea>
        </td>
        <td style={{color: 'gray', fontSize: '10pt', marginLeft: '10px'}}>
          (empty = all known integer theorems)
        </td>
      </tr>);

    return (
        <div>
          <table cellPadding={5}>
            {rows}
          </table>
        </div>);
  }

  handleGivenAddNew(evt: React.MouseEvent<HTMLButtonElement>) {
    evt.preventDefault();
    evt.stopPropagation();

    const texts = this.state.givenText.concat([""]);
    const props = this.state.givenProp.concat([undefined]);
    this.setState({givenText: texts, givenProp: props});
    this.sendUpdate(texts, props, this.state.proveText, this.state.proveProp,
        this.state.rulesText, this.state.rulesList,
        this.state.varsText, this.state.varsList,
        this.state.defsText, this.state.defsList,
        this.state.thmsText, this.state.thmsList);
  }

  handleGivenChange(index: number, evt: ChangeEvent<HTMLInputElement>) {
    const texts = this.state.givenText.slice(0);
    const props = this.state.givenProp.slice(0);

    let prop = undefined;
    try { prop = ParseProp(evt.target.value); }
    catch (e) { /* error */ }

    texts[index] = evt.target.value;
    props[index] = prop;
    this.setState({givenText: texts, givenProp: props});
    this.sendUpdate(texts, props, this.state.proveText, this.state.proveProp,
        this.state.rulesText, this.state.rulesList,
        this.state.varsText, this.state.varsList,
        this.state.defsText, this.state.defsList,
        this.state.thmsText, this.state.thmsList);
  }

  handleGivenRemove(index: number, evt: React.MouseEvent<HTMLButtonElement>) {
    evt.preventDefault();
    evt.stopPropagation();

    const texts = this.state.givenText.slice(0);
    const props = this.state.givenProp.slice(0);
    texts.splice(index, 1);
    props.splice(index, 1);

    this.setState({givenText: texts, givenProp: props});
    this.sendUpdate(texts, props, this.state.proveText, this.state.proveProp,
        this.state.rulesText, this.state.rulesList,
        this.state.varsText, this.state.varsList,
        this.state.defsText, this.state.defsList,
        this.state.thmsText, this.state.thmsList);
  }

  handleStmtChange(evt: ChangeEvent<HTMLInputElement>) {
    let prop = undefined
    try { prop = ParseProp(evt.target.value); }
    catch (e) { /* error */ }

    this.setState({proveText: evt.target.value, proveProp: prop});
    this.sendUpdate(
        this.state.givenText, this.state.givenProp, evt.target.value, prop,
        this.state.rulesText, this.state.rulesList,
        this.state.varsText, this.state.varsList,
        this.state.defsText, this.state.defsList,
        this.state.thmsText, this.state.thmsList);
  }

  handleRulesChange(evt: ChangeEvent<HTMLInputElement>) {
    let list: (number|undefined)[] = evt.target.value.split(',').map(RuleVariety);
    const rules = list.includes(undefined) ? undefined : list as number[];

    this.setState({rulesText: evt.target.value, rulesList: rules});
    this.sendUpdate(
        this.state.givenText, this.state.givenProp,
        this.state.proveText, this.state.proveProp,
        evt.target.value, rules,
        this.state.varsText, this.state.varsList,
        this.state.defsText, this.state.defsList,
        this.state.thmsText, this.state.thmsList);
  }

  handleVariablesChange(evt: ChangeEvent<HTMLInputElement>) {
    const varsText = evt.target.value;
    const varsList = ParseVariableNames(varsText);

    this.setState({varsText, varsList});
    this.sendUpdate(
        this.state.givenText, this.state.givenProp,
        this.state.proveText, this.state.proveProp,
        this.state.rulesText, this.state.rulesList,
        varsText, varsList,
        this.state.defsText, this.state.defsList,
        this.state.thmsText, this.state.thmsList);
  }

  handleDefinitionsChange(evt: ChangeEvent<HTMLTextAreaElement>) {
    const defsText = evt.target.value;
    const defsList = ParseTheoremsOrUndefined(defsText, "definition", IsDefinition);

    this.setState({defsText, defsList});
    this.sendUpdate(
        this.state.givenText, this.state.givenProp,
        this.state.proveText, this.state.proveProp,
        this.state.rulesText, this.state.rulesList,
        this.state.varsText, this.state.varsList,
        defsText, defsList,
        this.state.thmsText, this.state.thmsList);
  }

  handleTheoremsChange(evt: ChangeEvent<HTMLTextAreaElement>) {
    const thmsText = evt.target.value;
    const thmsList = ParseTheoremsOrUndefined(thmsText, "theorem", IsTheorem);

    this.setState({thmsText, thmsList});
    this.sendUpdate(
        this.state.givenText, this.state.givenProp,
        this.state.proveText, this.state.proveProp,
        this.state.rulesText, this.state.rulesList,
        this.state.varsText, this.state.varsList,
        this.state.defsText, this.state.defsList,
        thmsText, thmsList);
  }

  sendUpdate(
      givenText: string[], givenProp: Array<Proposition | undefined>,
      proveText: string, proveProp: Proposition | undefined,
      rulesText: string, rulesList: number[] | undefined,
      varsText: string, varsList: string[] | undefined,
      defsText: string, defsList: [string, Proposition][] | undefined,
      thmsText: string, thmsList: [string, Proposition][] | undefined) {
    if (this.isComplete(givenProp, proveProp) &&
        (rulesList !== undefined || rulesText.trim().length === 0) &&
        (varsList !== undefined || varsText.trim().length === 0) &&
        (defsList !== undefined || defsText.trim().length === 0) &&
        (thmsList !== undefined || thmsText.trim().length === 0)) {
      this.props.onValid(givenText, proveText,
          rulesText.trim().length > 0 ? rulesText : undefined,
          varsText.trim().length > 0 ? varsText : undefined,
          defsText.length > 0 ? defsText : undefined,   // whitespace = []
          thmsText.length > 0 ? thmsText : undefined);  // whitespace = []
    } else {
      this.props.onInvalid();
    }
  }

  isComplete(
      givenProp: Array<Proposition | undefined>,
      proveProp: Proposition | undefined): boolean {
    for (let i = 0; i < givenProp.length; i++) {
      if (givenProp[i] === undefined)
        return false;
    }
    return proveProp !== undefined;
  }
}


/**
 * Parses a string of rule names into an array of their varieties. This silently
 * ignores anything that is invalid.
 */
export function ParseAllowedRules(rules: string): number[] {
  return rules.split(',')
      .map(RuleVariety)
      .filter((x) => x !== undefined) as number[];  // forgive me, Lord
}


/** Parses a string of variable names into an array. */
export function ParseVariableNames(text: string): string[] {
  return text.split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
}


/**
 * Parses a textual description of a list of theorems / definitions. Individual
 * items are separated by newlines. Each line must be like "name: (Prop)".
 */
export function ParseTheorems(
    text: string, type: "theorem" | "definition",
    valid: (p: Proposition) => boolean): [string, Proposition][] {

  if (text.trim().length === 0)
    return [];

  const thms: [string, Proposition][] = [];
  for (const line of text.split(/\s*\n\s*/)) {
    const index = line.indexOf(':');
    if (index < 0)
      throw new UserError(`missing ":" between ${type} name and definition`);

    const name = line.substring(0, index).trim();
    const prop = ParseProp(line.substring(index + 1));
    if (!valid(prop))
      throw new UserError(`not a valid ${type}: ${line.substring(index+1).trim()}`);

    thms.push([name, prop]);
  }
  return thms;
}

// As above but returns undefined if the text is invalid.
function ParseTheoremsOrUndefined(
    text: string, type: "theorem" | "definition",
    valid: (p: Proposition) => boolean): [string, Proposition][] | undefined {
  try {
    return ParseTheorems(text, type, valid);
  } catch (e) {
    if (e instanceof UserError)
      return undefined;
    throw e;
  }
}
