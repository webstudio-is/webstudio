// A special error that when thrown signals
// to the CLI that it doesn't need to print the stacktrace.
//
// This should be used for the errors caused by user's input or actions
// as opposed to errors caused by bugs in the code.
export class CliError extends Error {}
