import React from 'react';
import { Proposition } from '../facts/props';
import { UserError } from '../facts/user_error';
import { Environment } from '../infer/env';
import { AbsLineRef, AbsolutizeRef, RuleAst } from '../infer/rules_ast';
import { Rule } from '../infer/rules';
import { ParseForwardRule, CreateRule, CreateSubproofEnv, LookupByRef } from '../infer/infer_forward';
import { PropToHtml, RuleToHtml, PropToText, RuleToText } from './ProofElements';
import { FindForwardMatches } from '../langs/infer_complete';
import {
    WorkingLineProps, WorkingLine, DisallowedRule, GetLineIndent, GetLineNumber
  } from './WorkingLine';


interface ForwardLineProps {
  num: AbsLineRef;
  prop: Proposition,
  parsed: RuleAst,
  html: boolean,
  remove?: () => void
}


/** Displays a completed line of forward reasoning in the proof. */
export class ForwardLine extends React.Component<ForwardLineProps, {}> {
  constructor(props: ForwardLineProps) {
    super(props);

    this.state = {}
  }

  render() {
    const indent = GetLineIndent(this.props.num.length);

    let remove: any = '';
    if (this.props.remove !== undefined) {
      remove = <button type="button" className="btn btn-link line-remove" tabIndex={-1}
                       onClick={this.handleRemove.bind(this)}>
                 <i className="fa fa-remove"></i>
                </button>;
    }

    return <tr className="line">
        <td className="line-num">{indent}{GetLineNumber(this.props.num)}.</td>
        <td className="line-prop">
          <div className="line-prop">{indent}
            {this.props.html ? PropToHtml(this.props.prop) : PropToText(this.props.prop)}
          </div>
        </td>
        <td className="line-rule">
          <div className="line-rule">{indent}
            {this.props.html ? RuleToHtml(this.props.parsed) : RuleToText(this.props.parsed)}
          </div>
          {remove}
        </td>
      </tr>;
  }

  handleRemove(evt: React.MouseEvent<HTMLButtonElement>) {
    evt.preventDefault();
    evt.stopPropagation();

    if (this.props.remove !== undefined)
      this.props.remove();
  }
}


interface ForwardWorkingLineProps extends WorkingLineProps {
  env: Environment,
  num: AbsLineRef,
  getLine: LookupByRef,
  makeAbs: AbsolutizeRef,
  onCompleteRule: (parsed: RuleAst, rule: Rule, subEnv?: Environment) => void
}

/** Displays an in-progress line of forward reasoning in the proof. */
export class ForwardWorkingLine extends WorkingLine<RuleAst, ForwardWorkingLineProps> {

  constructor(props: ForwardWorkingLineProps) {
    super(props, FindForwardMatches, "e.g., intro and 1 2");
  }

  render() {
    const indent = GetLineIndent(this.props.num.length);
    const lineRule = super.render();

    return <tr className="line" key={GetLineNumber(this.props.num)}>
        <td className="line-num">{indent}{GetLineNumber(this.props.num)}.</td>
        <td className="line-prop">
          <div className="line-prop">&nbsp;&nbsp;&nbsp;?</div>
        </td>
        {lineRule}
      </tr>;
  }

  parse(text: string): RuleAst {
    const parsed = ParseForwardRule(text);
    if (!this.props.allowedRules.includes(parsed.variety))
      throw new DisallowedRule(parsed.variety);
    return parsed;
  }

  /**
   * Check that the rule is valid. If so, pass it along to the parent. If not,
   * update the state to show the appropriate error message.
   */
  complete(parsed: RuleAst): void {
    parsed.absolutize(this.props.makeAbs);  // force this to be absolute

    try {
      let rule: Rule;
      if (parsed.requiresSubproof()) {
        const subEnv = CreateSubproofEnv(this.props.env, parsed);
        rule = CreateRule(this.props.env, parsed, this.props.getLine, subEnv);
        this.props.onCompleteRule(parsed, rule, subEnv);
      } else {
        rule = CreateRule(this.props.env, parsed, this.props.getLine);
        this.props.onCompleteRule(parsed, rule);
      }
      this.clearText();
    } catch (e) {
      if (e instanceof UserError) {
        this.setRuleError(e.message);
      } else {
        throw e;  // a bug of some kind, so crash
      }
    }
  }
}
