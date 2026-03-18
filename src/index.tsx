import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { IsDefinition, IsTheorem } from './facts/props';
import { ParseProp } from './facts/props_parser';
import { TopLevelEnv } from './infer/env';
import { USER_RULES } from './infer/rules';
import Theorem, { ParseAllowedRules, ParseTheorems, ParseVariableNames } from './components/Theorem';
import Proof from './components/Proof';
import * as integers from './infer/integers';
import * as sets from './infer/sets';


interface ProblemDefn {
  givens: string[];
  conclusion: string;
  rules?: string;
  variables?: string;
  definitions?: string;
  theorems?: string;
}

function App() {
  const [defn, setDefn] = useState<ProblemDefn | undefined>(undefined);
  const [proving, setProving] = useState(false);

  const onValid = useCallback((
      givens: string[], conclusion: string, rules: string | undefined,
      variables: string | undefined, definitions: string | undefined,
      theorems: string | undefined) => {
    setDefn({ givens, conclusion, rules, variables, definitions, theorems });
  }, []);

  const onInvalid = useCallback(() => {
    setDefn(undefined);
  }, []);

  if (!proving || !defn) {
    return (
      <main className="container">
        <Theorem givens={defn?.givens} conclusion={defn?.conclusion}
          rules={defn?.rules} variables={defn?.variables}
          definitions={defn?.definitions} theorems={defn?.theorems}
          onValid={onValid} onInvalid={onInvalid} />
        <button className="btn btn-primary" disabled={!defn}
            onClick={() => setProving(true)}>
          Try It
        </button>
      </main>
    );
  }

  const hyps = defn.givens.map(ParseProp);
  const conc = ParseProp(defn.conclusion);
  const allowedRules = defn.rules ? ParseAllowedRules(defn.rules) : USER_RULES;
  const variables = !defn.variables ? [] : ParseVariableNames(defn.variables);
  const definitions = !defn.definitions ? integers.DEFINITIONS :
      ParseTheorems(defn.definitions, "definition", IsDefinition);
  const theorems = !defn.theorems
      ? integers.THEOREMS.filter(([n, _p]) => !n.match(/Pos([A-Z]|$)/)) :
      ParseTheorems(defn.theorems, "theorem", IsTheorem);
  const env = new TopLevelEnv(
      definitions.concat(sets.DEFINITIONS), theorems, hyps, variables);

  return (
    <main className="container">
      <Proof env={env} hypotheses={hyps} conclusion={conc}
          allowedRules={allowedRules} progressJson={undefined}
          allowedTheorems={theorems.map(([n, _p]) => n)}
          onChange={() => {}} />
      <button className="btn btn-secondary" style={{marginTop: '10px'}}
          onClick={() => setProving(false)}>
        Back
      </button>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
