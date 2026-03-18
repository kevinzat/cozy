import { ParseProp } from "../facts/props_parser"; 
import { Proposition } from "../facts/props";


// Contains logical definitions of important integer functions and theorems.

export const DEFN_EVEN: Proposition =
    ParseProp("forall x, Even(x) <-> (exists y, x = 2*y)");

export const DEFN_ODD: Proposition =
    ParseProp("forall x, Odd(x) <-> (exists z, x = 2*z + 1)");

export const DEFN_CONGRUENT: Proposition =
    ParseProp("forall a, forall b, forall m, Congruent(a, b, m) <-> Divides(m, a - b)");

export const DEFN_DIVIDES: Proposition =
    ParseProp("forall a, forall b, Divides(a, b) <-> (exists k, b = k*a)");

export const DEFN_PRIME: Proposition =
    ParseProp("forall p, Prime(p) <-> not (p = 1) and (forall x, Divides(x, p) -> (x = 1) or (x = p))");

export const DEFINITIONS: Array<[string, Proposition]> = [
    ["Even", DEFN_EVEN],
    ["Odd", DEFN_ODD],
    ["Congruent", DEFN_CONGRUENT],
    ["Divides", DEFN_DIVIDES],
    ["Prime", DEFN_PRIME],
  ];


export const THM_MULT_EQNS: Proposition =
    ParseProp("forall a, forall b, forall c, forall d, (a = b and c = d) -> (a*c = b*d)");

export const THM_DIV_EQUATION: Proposition =
    ParseProp("forall a, forall b, forall c, (c*a = c*b and not (c = 0)) -> (a = b)");

export const THM_DIV_POS_EQUATION: Proposition =
    ParseProp("forall a, forall b, forall c, (c*a = c*b) -> (a = b)");

export const THM_DIVISION: Proposition =
    ParseProp("forall a, forall b, (0 < b) -> (a = div(a,b)*b + mod(a,b) and 0 <= mod(a,b) and mod(a,b) < b)");

export const THM_DIVISION_UNIQUE: Proposition =
    ParseProp("forall a, forall b, forall q, forall r, (a = q*b + r and 0 <= r and r < b) -> (q = div(a,b) and r = mod(a,b))");

export const THM_GCD: Proposition =
    ParseProp("forall a, forall b, (0 < a and 0 <= b) -> (Divides(gcd(a,b),a) and Divides(gcd(a,b),b) and (forall d, Divides(d,a) and Divides(d,b) -> (d <= gcd(a,b))))");

export const THM_GCD_POS: Proposition =
    ParseProp("forall a, forall b, true -> Divides(gcd(a,b),a) and Divides(gcd(a,b),b) and (forall d, Divides(d,a) and Divides(d,b) -> (d <= gcd(a,b)))");

export const THM_GCD_UNIQUE: Proposition =
    ParseProp("forall a, forall b, forall x, (Divides(x,a) and Divides(x,b) and (forall d, Divides(d,a) and Divides(d,b) -> (d <= x))) -> x = gcd(a,b)");

export const THM_DIVIDES_ONE: Proposition =
    ParseProp("forall a, Divides(a, 1) -> a = 1 ");

// Another one we used was "Lemma 2":
// forall a, forall b, forall m, (not (a = 1) and (m = a*b)) -> not (b = m)

export const THEOREMS: Array<[string, Proposition]> = [
    ["MultEqns", THM_MULT_EQNS],
    ["DivideEqn", THM_DIV_EQUATION],
    ["DividePosEqn", THM_DIV_POS_EQUATION],
    ["Division", THM_DIVISION],
    ["DivisionUnique", THM_DIVISION_UNIQUE],
    ["GCD", THM_GCD],
    ["GCDPos", THM_GCD_POS],
    ["GCDUnique", THM_GCD_UNIQUE],
    ["DividesOne", THM_DIVIDES_ONE],
  ];
