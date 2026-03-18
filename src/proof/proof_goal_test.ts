import * as assert from 'assert';
import { ParseProp } from '../facts/props_parser';
import { TopLevelEnv, TrailingEnv } from '../infer/env';
import {
    IsGoalComplete, OpenGoal, CloseGoal, CopyGoal, ProofGoalFromJson,
    ProofGoalToJson, InvalidBackwardStep
  } from './proof_goal';
import * as ast from '../infer/tactics_ast';
import { IntroAnd, ModusPonens } from '../infer/tactics';


const ENV = new TopLevelEnv([], []);


describe('proof_goal', function() {

  it('IsGoalComplete', function() {
    const goal = ProofGoalFromJson(ENV,
      {prop: "Q", resn: { tactic: "modus ponens (P)", subgoals: [
          {prop: "P"},
          {prop: "P -> Q"}]
        }});
    assert.strictEqual(IsGoalComplete(goal,
        new Map([["P", [1]]])), false);
    assert.strictEqual(IsGoalComplete(goal,
        new Map([["P -> Q", [2]]])), false);
    assert.strictEqual(IsGoalComplete(goal,
        new Map([["P", [1]], ["P -> Q", [2]]])), true);

    const goal2 = ProofGoalFromJson(ENV,
      {prop: "R", resn: {tactic: "modus ponens (P and Q)", subgoals: [
          {prop: "P and Q -> R"},
          {prop: "P and Q", resn: {tactic: "intro and", subgoals: [
              {prop: "P"},
              {prop: "Q"}
            ]}}
        ]}});
    assert.strictEqual(IsGoalComplete(goal2,
        new Map([["Q", [2]], ["P and Q -> R", [3]]])), false);
    assert.strictEqual(IsGoalComplete(goal2,
        new Map([["P", [1]], ["Q", [2]]])), false);
    assert.strictEqual(IsGoalComplete(goal2,
        new Map([["P", [1]], ["Q", [2]], ["P and Q -> R", [3]]])), true);
  });

  it('OpenGoal', function() {
    const goal3 = ProofGoalFromJson(ENV,
      {prop: "R", resn: {tactic: "modus ponens (P and Q)", subgoals: [
          {prop: "P and Q -> R"},
          {prop: "P and Q", resn: {tactic: "intro and", subgoals: [
              {prop: "P"},
              {prop: "Q"}
            ]}}
        ]}});

    const goal2 = OpenGoal(goal3, ParseProp("P and Q"), ENV);
    assert.deepStrictEqual(ProofGoalToJson(goal2),
      {prop: "R", resn: {tactic: "modus ponens (P and Q)", subgoals: [
          {prop: "P and Q"},
          {prop: "P and Q -> R"}
        ]}});

    const goal1 = OpenGoal(goal2, ParseProp("R"), ENV);
    assert.deepStrictEqual(ProofGoalToJson(goal1), {prop: "R"});
  });

  it('CloseGoal', function() {
    const goal1 = {prop: ParseProp("R")};
    const parsed1 = new ast.ModusPonensAst(ParseProp("P and Q"));
    const tactic1 = new ModusPonens(ENV, ParseProp("R"), ParseProp("P and Q"));

    const goal2 = CloseGoal(goal1, tactic1, ENV, parsed1);
    assert.deepStrictEqual(ProofGoalToJson(goal2), 
      {prop: "R", resn: {tactic: "modus ponens (P and Q)", subgoals: [
          {prop: "P and Q"},
          {prop: "P and Q -> R"}
        ]}});

    const parsed2 = new ast.IntroAndAst();
    const tactic2 = new IntroAnd(ENV, ParseProp("P and Q"));

    const goal3 = CloseGoal(goal2, tactic2, ENV, parsed2);
    assert.deepStrictEqual(ProofGoalToJson(goal3),
      {prop: "R", resn: {tactic: "modus ponens (P and Q)", subgoals: [
          {prop: "P and Q", resn: {tactic: "intro and", subgoals: [
              {prop: "P"},
              {prop: "Q"}
            ]}},
          {prop: "P and Q -> R"}
        ]}});
  });

  it('CopyGoal', function() {
    const goal1 = {prop: ParseProp("R")};
    const parsed1 = new ast.ModusPonensAst(ParseProp("P and Q"));
    const tactic1 = new ModusPonens(ENV, ParseProp("R"), ParseProp("P and Q"));

    const goal2 = CloseGoal(goal1, tactic1, ENV, parsed1);
    const parsed2 = new ast.IntroAndAst();
    const tactic2 = new IntroAnd(ENV, ParseProp("P and Q"));

    const goal3 = CloseGoal(goal2, tactic2, ENV, parsed2);

    const newEnv = new TrailingEnv(ENV, "c");
    const goal4 = CopyGoal(goal3, newEnv);
    assert.deepStrictEqual(ProofGoalToJson(goal4),
      {prop: "R", resn: {tactic: "modus ponens (P and Q)", subgoals: [
          {prop: "P and Q", resn: {tactic: "intro and", subgoals: [
              {prop: "P"},
              {prop: "Q"}
            ]}},
          {prop: "P and Q -> R"}
        ]}});
    assert.strictEqual(goal4.resn?.env, newEnv);
    assert.strictEqual(goal4.resn?.subgoals[0].resn?.env, newEnv);
  });

  it ('ProofGoalToJson', function() {
    // forget a premise
    assert.throws(() => {
      ProofGoalFromJson(ENV,
        {prop: "R", resn: {tactic: "modus ponens (P and Q)", subgoals: [
          {prop: "P and Q", resn: {tactic: "intro and", subgoals: [
              {prop: "P"},
              {prop: "Q"}
            ]}}
        ]}});
      }, InvalidBackwardStep);

    // add an extra a premise
    assert.throws(() => {
      ProofGoalFromJson(ENV,
        {prop: "R", resn: {tactic: "modus ponens (P and Q)", subgoals: [
          {prop: "P and Q", resn: {tactic: "intro and", subgoals: [
              {prop: "P"},
              {prop: "Q"},
              {prop: "R"}
            ]}},
          {prop: "P and Q -> R"}
        ]}});
      }, InvalidBackwardStep);
  });
});