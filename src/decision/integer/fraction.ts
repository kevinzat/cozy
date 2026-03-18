import { gcd } from './gcd';

// Represents an immutable fraction numer/denom with denom != 0. These will
// always maintain the invariants that denom > 0 and gcd(numer, denom) = 1.
export default class Fraction {

  static ZERO = new Fraction(0);
  static ONE = new Fraction(1);

  numer: number;
  denom: number;

  /**
   * Creates the fraction numer/denom.
   * @param numer Numerator of the fraction
   * @param denom Denominator of the fraction. Assumed 1 if not provided.
   */
  constructor(numer: number, denom?: number) {
    if (denom === undefined) {
      denom = 1;
    } else if (denom === 0) {
      throw new Error("division by zero");
    } else if (denom < 0) {
      numer *= -1;
      denom *= -1;
    }

    if (numer === 0) {
      this.numer = 0;
      this.denom = 1;
    } else {
      const d = gcd(Math.abs(numer), denom);
      this.numer = numer / d;
      this.denom = denom / d;
    }
  }

  equals(other: Fraction) {
    return this.numer === other.numer && this.denom === other.denom;
  }

  is_less(other: Fraction): boolean {
    // Since b, d > 0, we have a/b < c/d iff da < bc.
    return other.denom * this.numer < this.denom * other.numer;
  }

  is_less_eq(other: Fraction): boolean {
    // Since b, d > 0, we have a/b <= c/d iff da <= bc.
    return other.denom * this.numer <= this.denom * other.numer;
  }

  is_integer(): boolean {
    return this.denom === 1;
  }

  to_string(): string {
    if (this.denom === 1) {
       return `${this.numer}`;
    } else {
       return `${this.numer}/${this.denom}`;
    }
  }

  to_integer(): number {
    if (this.denom !== 1)
      throw new Error(`not an integer: ${this.numer}/${this.denom}`);
    return this.numer;
  }

  inverse(): Fraction {
    return new Fraction(this.denom, this.numer);
  }

  add(other: Fraction): Fraction {
    return new Fraction(
        other.denom * this.numer + this.denom * other.numer,
        this.denom * other.denom);
  }

  subtract(other: Fraction): Fraction {
    return new Fraction(
        other.denom * this.numer - this.denom * other.numer,
        this.denom * other.denom);
  }

  multiply(other: Fraction): Fraction {
    return new Fraction(this.numer * other.numer, this.denom * other.denom);
  }

  divide(other: Fraction): Fraction {
    return new Fraction(this.numer * other.denom, this.denom * other.numer);
  }
  
  static compare(f: Fraction, g: Fraction): number {
    if (f.equals(g)) {
      return 0;
    } else if (f.is_less(g)) {
      return -1;
    } else {
      return +1;
    }
  }
}