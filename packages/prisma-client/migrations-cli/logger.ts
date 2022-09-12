/* eslint-disable no-console */

// When you're adding a log for debugging use console.log as normal.
// Use logger only for CLI output.

export const info = (message: unknown) => {
  console.info(message);
};

export const error = (message: unknown) => {
  console.error(message);
};

export const warn = (message: unknown) => {
  console.warn(message);
};

export const debug = (message: unknown) => {
  console.log(message);
};
