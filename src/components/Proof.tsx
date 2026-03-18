import React from 'react';
import { Proposition } from '../facts/props';
import { UserError } from '../facts/user_error';
import { Environment } from '../infer/env';
import { Given, Rule, RuleName, RULE_ASSUMPTION, USER_RULES } from '../infer/rules';
import { GivenAst, RepeatAst, RuleAst, LineRef, isAbsLineRef } from '../infer/rules_ast';
import { Tactic } from '../infer/tactics';
import { TacticAst } from '../infer/tactics_ast';
import { Line, RelToAbsLineRef } from '../proof/proof';
import {
    OpenGoal, CloseGoal, CopyGoal, VisitGoals, Resolution, IsGoalComplete
  } from '../proof/proof_goal';
import {
    ProofProgress, ProofProgressFromJson, ProofProgressToJson,
    GetCompletedProof, ReplaceSubproof, PropToLine, GetLineFrom,
    ConvertBackwardToForward, CreateSubproof
  } from '../proof/proof_progress';
import { FormalProof } from '../proof/latex/formal';
import { ForwardLine, ForwardWorkingLine } from './ForwardLine';
import { BackwardLine, BackwardWorkingLine } from './BackwardLine';
import { GetLineIndent } from './WorkingLine';
import './Proof.css';


interface ProofProps {
  env: Environment,
  hypotheses: Proposition[],
  conclusion: Proposition,
  allowedRules: number[],
  allowedTheorems: string[],
  progressJson: unknown,
  onChange: (state: any, complete: boolean) => void
}

interface ProofState {
  progress: ProofProgress;
  show_formal: boolean;
  show_html: boolean;
}


export default class Proof extends React.Component<ProofProps, ProofState> {
  constructor(props: ProofProps) {
    super(props);

    let progress: ProofProgress;
    if (props.progressJson) {
      progress = ProofProgressFromJson(this.props.env, this.props.progressJson);

    } else {
      const lines: Line<ProofProgress>[] = [];
      for (const given of props.hypotheses) {
        lines.push({
            parsed: new GivenAst(given),
            rule: new Given(this.props.env, given)
          });
      }
      progress = {
        env: this.props.env,
        lines: lines,
        goal: {prop: props.conclusion}
      };
    }

    this.state = {
        progress: progress,
        show_formal: false, show_html: true
      };
  }

  render() {
    let preamble;
    let summary;
    let translation: any = '';

    // See if the proof is complete.
    const proof = GetCompletedProof(this.state.progress);

    // If the proof is complete, give the user options to show tranlsations of
    // it or to start over. If it is not complete, let them know there that.
    if (proof === undefined) {
      const vars = this.state.progress.env.getVariables();
      let knownVars: string | JSX.Element = '';
      if (vars.length > 0) {
        knownVars = <div className="alert alert-light" style={{paddingTop: 0}}>
            <b>Known Variables:</b> {vars.join(", ")}
          </div>;
      }

      let knownThms: string | JSX.Element = '';
      if (this.props.allowedTheorems.length > 0) {
        knownThms = <div className="alert alert-light" style={{paddingTop: 0}}>
            <b>Known Theorems:</b> {this.props.allowedTheorems.join(", ")}
          </div>;
      }

      preamble = <div className="preamble">
          <div className="alert alert-light"><b>Allowed Rules</b>: {this.renderRuleNames()}</div>
          {knownVars}
          {knownThms}
        </div>;
      summary = <div className="summary">
          <div className="alert alert-dark">Some facts still require proof.</div>
        </div>;

    } else {
      let formal;
      if (this.state.show_formal) {
        translation = <pre><code>{FormalProof(proof)}</code></pre>;
        formal = (<button type="button" className="btn btn-secondary summary"
                  onClick={this.handleHideLatex.bind(this)}>
            Hide LaTeX
          </button>);

      } else {
        formal = (<button type="button" className="btn btn-success summary"
                  onClick={this.handleShowLatex.bind(this)}>
            Show LaTeX
          </button>);
      }

      summary = <div className="summary">
          <div className="alert alert-success">Your proof is complete.</div>
          {formal}
        </div>;
    }

    // Add all of the proof lines (table rows) to a list.
    const lines: any[] = [];
    this.renderProof(this.state.progress, [], new Map(), false, lines);

    return <div>
        {preamble}
        <table cellPadding={2}>{lines}</table>
        <div className="alert alert-light" style={{padding: "24px 2px 0 2px"}}>
          <b>View</b>:&nbsp;
          <input type="radio" value="HTML" style={{width: '30px'}}
              checked={this.state.show_html}
              onChange={e => this.handleShowHtml(e, true)}/>
          <label>HTML</label>&nbsp;
          <input type="radio" value="Text" style={{width: '30px'}}
              checked={!this.state.show_html}
              onChange={e => this.handleShowHtml(e, false)}/>
          <label>Text</label>
        </div>
        {summary}
        <div className="translation">{translation}</div>
      </div>;
  }

  /**
   * Adds table rows for each line in the given proof and subproofs to the given
   * list. line_num records the line numbers needed to index to this proof, but
   * comes in two versions: "current" assigns everything a number by counting,
   * so they can change, and "display" replaces changeable values by undefined
   * @returns Whether this rendered any working lines.
   */
  renderProof(
      progress: ProofProgress, line_num: number[], outer_known: PropToLine,
      seen_working: boolean, lines: any[]): boolean {

    const vars = progress.env.getVariables();
    if (vars.length > 0 && !progress.env.isTopLevel()) {
      const indent = GetLineIndent(line_num.length);
      const varNames =
          (vars.length === 1) ? vars[0] :
          (vars.length === 2) ? `${vars[0]} and ${vars[1]}` :
          `${vars.slice(0, vars.length-1).join(", ")}, and ${vars[vars.length-1]}`
      lines.push(<tr className="line" key={line_num.join(".")}>
          <td className="line-num"></td>
          <td className="line-prop">{indent}Let {varNames} be arbitrary.</td>
          <td className="line-rule"></td>
        </tr>);
    }

    const known = new Map<string, number[]>();

    const n = progress.lines.length;
    for (let i = 0; i < n - 1; i++) {
      const num = line_num.concat([i+1]);
      const line = progress.lines[i];
      if (line.sub !== undefined) {
        const inner_known = new Map([...outer_known, ...known]);
        if (this.renderProof(line.sub, num, inner_known, seen_working, lines))
          seen_working = true;
      }

      const prop = line.rule.apply();
      lines.push(<ForwardLine num={num} prop={prop} parsed={line.parsed}
          remove={undefined} html={this.state.show_html}/>);

      known.set(prop.to_string_alpha(), num);
    }

    // If the last forward line is not an assertion, then it can be removed.
    if (n > 0) {
      const num = line_num.concat([n]);
      const line = progress.lines[n-1];
      if (line.sub !== undefined) {
        const inner_known = new Map([...outer_known, ...known]);
        if (this.renderProof(line.sub, num, inner_known, seen_working, lines))
          seen_working = true;
      }

      const prop = line.rule.apply();
      if (line.parsed.variety === RULE_ASSUMPTION) {
        lines.push(<ForwardLine num={num} prop={prop} parsed={line.parsed}
                                html={this.state.show_html}/>);
      } else {
        const env = (n > 2) ? progress.lines[n-2].rule.envAfter : progress.env;
        lines.push(<ForwardLine num={num} prop={prop} parsed={line.parsed}
            html={this.state.show_html}
            remove={this.removeLastForwardRule.bind(this, progress, env)}/>);
      }

      known.set(prop.to_string_alpha(), num);
    }

    // Calculate the full set of facts known after the forward rules. Use this
    // to determine if the goal has been proven in the forward rules.
    const fwd_known = new Map([...outer_known, ...known]);
    const goal_line = fwd_known.get(progress.goal.prop.to_string_alpha());

    // If the proof is not complete, add lines with input boxes that allow
    // forward and backward reasoning.
    if (goal_line !== undefined) {
      // If there are no lines, then draw a Repeat here so it's not empty.
      if (progress.lines.length === 0) {
        const num = line_num.concat([1]);
        const prop = progress.goal.prop;
        const parsed = new RepeatAst(goal_line);
        lines.push(<ForwardLine num={num} prop={prop} parsed={parsed}
                                html={this.state.show_html}/>);
      }
    } else {
      const num = line_num.concat([progress.lines.length + 1]);
      const env = (progress.lines.length > 0)
          ? progress.lines[progress.lines.length - 1].rule.envAfter
          : progress.env;
      lines.push(<ForwardWorkingLine env={env} num={num}
          allowedRules={this.props.allowedRules} firstWorking={!seen_working}
          getLine={(ref: LineRef) => GetLineFrom(this.state.progress, num, ref).rule}
          makeAbs={(ref: LineRef) => isAbsLineRef(ref) ? ref : RelToAbsLineRef(num, ref)}
          onCompleteRule={this.addForwardRule.bind(this, progress, env, fwd_known, line_num)}/>);
      seen_working = true;

      // Add all the backward reasoning lines after those. Allow the nodes with
      // all open children to be removed.
      VisitGoals<boolean>(progress.goal,
          (prop: Proposition) => {
            // If this fact not already known, then put in a working line
            // allowing the user to prove this.
            if (!fwd_known.has(prop.to_string_alpha())) {
              lines.push(<BackwardWorkingLine env={env} prop={prop}
                  outerNum={line_num} allowedRules={this.props.allowedRules}
                  firstWorking={!seen_working} html={this.state.show_html}
                  onCompleteRule={this.addBackwardRule.bind(this, progress, env, fwd_known, line_num)}/>);
              seen_working = true;
            }
            return true;  // open child
          },
          (prop: Proposition, resn: Resolution, children: boolean[]) => {
            if (children.indexOf(false) >= 0) {
              lines.push(<BackwardLine outerNum={line_num} prop={prop} parsed={resn.parsed}
                              html={this.state.show_html}/>);
            } else {
              lines.push(<BackwardLine outerNum={line_num} prop={prop} parsed={resn.parsed}
                              html={this.state.show_html}
                              remove={this.removeBackwardRule.bind(this, progress, env, prop)}/>);
            }
            return false;  // closed child
          });
    }

    return seen_working;
  }

  /** Returns a description of the allowed rules. */
  renderRuleNames(): string {
    const allowed = new Set(this.props.allowedRules);
    const names = [];
    for (const variety of USER_RULES) {
      if (allowed.has(variety))
        names.push(RuleName(variety));
    }

    if (names.length === 0) {
      return "None (hard mode!)";
    } else if (names.length === 1) {
      return names[0];
    } else if (names.length === 2) {
      return `${names[0]} and ${names[1]}`;
    } else {
      const rest = names.slice(0, names.length - 1).join(", ");
      return `${rest}, and ${names[names.length - 1]}`;
    }
  }

  /** Adds a new forward rule at the end of the list. */
  addForwardRule(
      progress: ProofProgress, envBefore: Environment, known: PropToLine,
      outerNum: number[], parsed: RuleAst, rule: Rule, subEnv?: Environment) {

    const line: Line<ProofProgress> = {parsed: parsed, rule: rule};
    if (parsed.requiresSubproof())
      line.sub = CreateSubproof(envBefore, parsed, subEnv);

    const new_lines = progress.lines.concat([line]);
    const new_goal = CopyGoal(progress.goal, rule.envAfter);
    const new_progress =
        { env: progress.env, lines: new_lines, goal: new_goal };
    const new_root =
        ReplaceSubproof(this.state.progress, progress, new_progress);

    // If this tree is now complete, then convert to forward reasoning.
    known.set(rule.apply().to_string_alpha(), outerNum.concat(new_lines.length));
    const complete = IsGoalComplete(new_goal, known);
    if (complete)
      this.reverseReasoning(new_progress, new_root, known, outerNum);

    this.updateProof(new_root);
  }

  /** Removes the last forward rule from the end of the list. */
  removeLastForwardRule(progress: ProofProgress, envBefore: Environment) {
    const new_lines = progress.lines.slice(0, progress.lines.length - 1);
    const new_goal = CopyGoal(progress.goal, envBefore);
    const new_root = ReplaceSubproof(this.state.progress, progress,
        { env: progress.env, lines: new_lines, goal: new_goal });

    this.updateProof(new_root);
  }

  /** Adds a new backward rule at this node in the tree. */
  addBackwardRule(
      progress: ProofProgress, envBefore: Environment, known: PropToLine,
      outerNum: number[], parsed: TacticAst, tactic: Tactic) {

    const new_goal = CloseGoal(progress.goal, tactic, envBefore, parsed);
    const new_progress =
        { env: progress.env, lines: progress.lines, goal: new_goal };
    const new_root =
        ReplaceSubproof(this.state.progress, progress, new_progress);

    // If this tree is now complete, then convert to forward reasoning.
    const complete = IsGoalComplete(new_goal, known);
    if (complete)
      this.reverseReasoning(new_progress, new_root, known, outerNum);

    this.updateProof(new_root);
  }

  /** Removes the backward rule that produced the given proposition. */
  removeBackwardRule(
      progress: ProofProgress, _envBefore: Environment, prop: Proposition) {
    const new_goal = OpenGoal(progress.goal, prop, progress.env);
    const new_root = ReplaceSubproof(this.state.progress, progress,
        { env: progress.env, lines: progress.lines, goal: new_goal });

    this.updateProof(new_root);
  }

  handleShowLatex() {
    this.setState({show_formal: true});
  }

  handleHideLatex() {
    this.setState({show_formal: false});
  }

  handleShowHtml(evt: React.ChangeEvent<HTMLInputElement>, checkedVal: boolean) {
    if (evt.target.checked) {
      this.setState({show_html: checkedVal});
    } else {
      this.setState({show_html: !checkedVal});
    }
  }

  updateProof(newRoot: ProofProgress) {
    try {
      const progressJson = ProofProgressToJson(newRoot);

      // Make sure we would be able to load this JSON back into into an object.
      // (This will throw an exception if something can't be loaded.)
      ProofProgressFromJson(newRoot.env, progressJson);

      // We conservatively look for every subproof's goal to be have proven by the
      // forward rules. This will work because we convert backward reasoning to
      // forward once the subproof goal is proven.
      //const complete = VisitKnown<boolean>(newRoot,
      //    (progress: ProofProgress, fwd_known: PropToLine,
      //        _all_known: PropToLine, children: boolean[]) => {
      //      return !children.includes(false) &&
      //         fwd_known.has(progress.goal.prop.to_string_alpha());
      //    });

      this.setState({progress: newRoot});
      this.props.onChange(progressJson,
          GetCompletedProof(newRoot) !== undefined);  // match what we do in render

    } catch (e) {
      console.error(newRoot);
      if (e instanceof UserError) {
        throw new UserError(
           `Action would create an invalid state: ${e.message}\n` +
          'This may be a bug. Please contact the instructors, ' +
          'providing a screenshot, the action that caused this, and ' +
          'the last entry in the Developer Console of the browser.');
      }
    }
  }

  /** Called to convert backward to forward reasoning in the given subproof. */
  reverseReasoning(progress: ProofProgress,
      root: ProofProgress, known: PropToLine, outerNum: number[]) {

    // Add all the backward reasoning as forward raesoning.
    ConvertBackwardToForward(
        progress.goal, known, progress.env, outerNum,
        (l: LineRef) => {
          const from = outerNum.concat(progress.lines.length + 1);
          const line = GetLineFrom(root, from, l);
          return line.rule;
        },
        CreateSubproof, progress.lines);

    // Eliminate the backward reasoning.
    progress.goal = {prop: progress.goal.prop};
  }
}
