/**
 * Thrown in response to some type of user error. Bugs should be indicated using
 * the normal Error class.
 */
export class UserError extends Error {
  constructor(msg: string) {
    super(msg);

    // hack workaround of TS transpiling bug (so gross)
    Object.setPrototypeOf(this, UserError.prototype);
  }
}