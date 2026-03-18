import { Variable, Call } from "../facts/exprs"; 
import { Biconditional, Conjunction, Disjunction, ForAll, Implication, Negation,
         Predicate, Proposition } from "../facts/props";
import * as exprs from "../facts/exprs";
import * as props from "../facts/props";


// Contains logical definitions of the set functions and relations.
//
// These cannot be parsed because they use sets as variables (second order).
// They are only usable via the derived rule SetFunction.

export const DEFN_SET_COMPLEMENT: Proposition =
    ForAll.of("a", ForAll.of("x",
        Biconditional.of(
            Predicate.elementOf(Variable.of("x"),
                Call.setComplement(Variable.of("a"))),
            Negation.of(
                Predicate.elementOf(Variable.of("x"), Variable.of("a"))))));

export const DEFN_SET_UNION: Proposition =
    ForAll.of("a", ForAll.of("b", ForAll.of("x",
        Biconditional.of(
            Predicate.elementOf(Variable.of("x"),
                Call.setUnion(Variable.of("a"), Variable.of("b"))),
            Disjunction.of(
                Predicate.elementOf(Variable.of("x"), Variable.of("a")),
                Predicate.elementOf(Variable.of("x"), Variable.of("b")))))));

export const DEFN_SET_INTERSECTION: Proposition =
    ForAll.of("a", ForAll.of("b", ForAll.of("x",
        Biconditional.of(
            Predicate.elementOf(Variable.of("x"),
                Call.setIntersection(Variable.of("a"), Variable.of("b"))),
            Conjunction.of(
                Predicate.elementOf(Variable.of("x"), Variable.of("a")),
                Predicate.elementOf(Variable.of("x"), Variable.of("b")))))));

export const DEFN_SET_DIFFERENCE: Proposition =
    ForAll.of("a", ForAll.of("b", ForAll.of("x",
        Biconditional.of(
            Predicate.elementOf(Variable.of("x"),
                Call.setDifference(Variable.of("a"), Variable.of("b"))),
            Conjunction.of(
                Predicate.elementOf(Variable.of("x"), Variable.of("a")),
                Negation.of(
                    Predicate.elementOf(Variable.of("x"), Variable.of("b"))))))));

export const DEFN_SUBSET: Proposition =
    ForAll.of("a", ForAll.of("b",
        Biconditional.of(
            Predicate.subset(Variable.of("a"), Variable.of("b")),
            ForAll.of("x",
                Implication.of(
                    Predicate.elementOf(Variable.of("x"), Variable.of("a")),
                    Predicate.elementOf(Variable.of("x"), Variable.of("b")))))));

export const DEFN_SAME_SET: Proposition =
    ForAll.of("a", ForAll.of("b",
        Biconditional.of(
            Predicate.sameSet(Variable.of("a"), Variable.of("b")),
            ForAll.of("x",
                Biconditional.of(
                    Predicate.elementOf(Variable.of("x"), Variable.of("a")),
                    Predicate.elementOf(Variable.of("x"), Variable.of("b")))))));

export const DEFN_POWER_SET: Proposition =
    ForAll.of("x", ForAll.of("y",
        Biconditional.of(
            Predicate.elementOf(Variable.of("x"),
                Call.of("power", Variable.of("y"))),
            Predicate.subset(Variable.of("x"), Variable.of("y")))));

export const DEFINITIONS: Array<[string, Proposition]> = [
    ["Complement", DEFN_SET_COMPLEMENT],
    ["Union", DEFN_SET_UNION],
    ["Intersection", DEFN_SET_INTERSECTION],
    ["SetDifference", DEFN_SET_DIFFERENCE],
    ["SameSet", DEFN_SAME_SET],
    ["Subset", DEFN_SUBSET],
    ["PowerSet", DEFN_POWER_SET],
  ];
