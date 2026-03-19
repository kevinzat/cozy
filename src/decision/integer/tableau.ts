// Represents an integer matrix with optional extra row and column.
export default class Tableau {
  m: number;  // number of regular rows
  n: number;  // number of regular columns
  col0?: bigint[];  // extra column or missing
  row0?: bigint[];  // extra row or missing
  entries: bigint[][];  // values in each row,column

  // Requires: all entries are integers and all (> 0) rows have the same length.
  constructor(vals: bigint[][], c0?: bigint[], r0?: bigint[]) {
    if (vals.length === 0)
      throw Error("rows are missing");

    for (let i = 1; i < vals.length; i++) {
      if (vals[i].length !== vals[0].length)
        throw Error("not all rows have the same length.")
    }

    if (c0 !== undefined && c0.length !== vals.length)
      throw Error(`extra column has wrong length: ${c0.length} vs ${vals.length}`);
    if (r0 !== undefined && r0.length !== vals[0].length)
      throw Error(`extra column has wrong length: ${r0.length} vs ${vals[0].length}`);

    this.m = vals.length;
    this.n = vals[0].length;
    this.col0 = (c0 !== undefined) ? c0.slice(0) : undefined;
    this.row0 = (r0 !== undefined) ? r0.slice(0) : undefined;
    this.entries = vals.map(r => r.slice(0));  // deep copy
  }

  /** Swap rows i and j. */
  rowSwap(i: number, k: number) {
    let row = this.entries[i];
    this.entries[i] = this.entries[k];
    this.entries[k] = row;

    if (this.col0 !== undefined) {
      let val = this.col0[i];
      this.col0[i] = this.col0[k];
      this.col0[k] = val;
    }
  }

  /** Multiply the entries in row i by c. */
  rowScale(i: number, c: bigint) {
    for (let j = 0; j < this.n; j++) {
      this.entries[i][j] *= c;
    }

    if (this.col0 !== undefined)
      this.col0[i] *= c;
  }

  /** Add row k times c to row i. */
  rowAddMultiple(i: number, k: number, c: bigint) {
    for (let j = 0; j < this.n; j++) {
      this.entries[i][j] += c * this.entries[k][j];
    }

    if (this.col0 !== undefined)
      this.col0[i] += c * this.col0[k];
  }

  /** Swap columns j and l. */
  colSwap(j: number, l: number) {
    for (let i = 0; i < this.m; i++) {
      let val = this.entries[i][j];
      this.entries[i][j] = this.entries[i][l];
      this.entries[i][l] = val;
    }

    if (this.row0 !== undefined) {
      let val = this.row0[j];
      this.row0[j] = this.row0[l];
      this.row0[l] = val;
    }
  }

  /** Multiply the entries in column j by c. */
  colScale(j: number, c: bigint) {
    for (let i = 0; i < this.m; i++) {
      this.entries[i][j] *= c;
    }

    if (this.row0 !== undefined)
      this.row0[j] *= c;
  }

  /** Add column k times c to column i. */
  colAddMultiple(j: number, l: number, c: bigint) {
    for (let i = 0; i < this.m; i++) {
      this.entries[i][j] += c * this.entries[i][l];
    }

    if (this.row0 !== undefined)
      this.row0[j] += c * this.row0[l];
  }

}
