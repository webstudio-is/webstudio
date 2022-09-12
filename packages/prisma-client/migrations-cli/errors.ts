// Throw this error to indicate to CLI that this a error caused by user actions
// as opposed to a bug, so it won't print the stacktrace
export class UserError extends Error {}
