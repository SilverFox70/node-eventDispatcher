/** Stable machine-readable refusals; messages never include packet contents. */
export class FlowError extends Error {
  constructor(readonly code: string, message: string = code) {
    super(message);
    this.name = 'FlowError';
  }
}
