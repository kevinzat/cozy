import React from 'react';
import { Proposition } from '../facts/props';
import { UserError } from '../facts/user_error';
import { Environment } from '../infer/env';
import { AbsLineRef } from '../infer/rules_ast';
import { TacticAst } from '../infer/tactics_ast';
import { Tactic } from '../infer/tactics';
import { ParseBackwardRule, CreateTactic } from '../infer/infer_backward';
import { PropToHtml, TacticToHtml, PropToText, TacticToText } from './ProofElements';
import { FindBackwardMatches } from '../langs/infer_complete';
import { WorkingLineProps, WorkingLine, DisallowedRule, GetLineIndent } from './WorkingLine';


interface BackwardLineProps {
  outerNum: AbsLineRef;
  prop: Proposition,
  parsed: TacticAst,
  html: boolean,
  remove?: () => void
}


/** Displays a completed line of backward reasoning in the proof. */
export class BackwardLine extends React.Component<BackwardLineProps, {}> {
  constructor(props: BackwardLineProps) {
    super(props);

    this.state = {}
  }

  render() {
    const indent = GetLineIndent(this.props.outerNum.length + 1);

    let remove: any = '';
    if (this.props.remove !== undefined) {
      remove = <button type="button" className="btn btn-link line-remove" tabIndex={-1}
                       onClick={this.handleRemove.bind(this)}>
                 <i className="fa fa-remove"></i>
                </button>;
    }

    return <tr className="line">
        <td className="line-num">{indent}{GetBackwardLineNumber(this.props.outerNum)}</td>
        <td className="line-prop">
          <div className="line-prop">{indent}
            {this.props.html ? PropToHtml(this.props.prop) : PropToText(this.props.prop)}
          </div>
        </td>
        <td className="line-rule">
          <div className="line-rule">{indent}
            {this.props.html ? TacticToHtml(this.props.parsed) : TacticToText(this.props.parsed)}
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

function GetBackwardLineNumber(num: AbsLineRef): string {
  if (num.length === 0) {
    return "?.";
  } else {
    return num.join(".") + ".?.";
  }
}


interface BackwardWorkingLineProps extends WorkingLineProps {
  env: Environment,
  outerNum: AbsLineRef,  // does not include this line (which doesn't exist yet)
  prop: Proposition,
  html: boolean,
  onCompleteRule: (parse: TacticAst, tactic: Tactic) => void
}

/** Represents the work-in-progress line for backward reasoning.  */
export class BackwardWorkingLine extends WorkingLine<TacticAst, BackwardWorkingLineProps> {
  constructor(props: BackwardWorkingLineProps) {
    super(props, FindBackwardMatches, "e.g., intro and");
  }

  render() {
    const indent = GetLineIndent(this.props.outerNum.length + 1);
    const lineRule = super.render();

    return <tr className="line">
        <td className="line-num">{indent}{GetBackwardLineNumber(this.props.outerNum)}</td>
        <td className="line-prop">
          <div className="line-prop">{indent}
            {this.props.html ? PropToHtml(this.props.prop) : PropToText(this.props.prop)}
          </div>
        </td>
        {lineRule}
      </tr>;
  }

  parse(text: string): TacticAst {
    const parsed = ParseBackwardRule(text);
    if (!this.props.allowedRules.includes(parsed.variety))
      throw new DisallowedRule(parsed.variety);
    return parsed;
  }

  complete(parsed: TacticAst): void {
    try {
      const tactic = CreateTactic(this.props.env, parsed, this.props.prop);
      this.props.onCompleteRule(parsed, tactic);
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
