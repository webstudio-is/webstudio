import { current, isDraft } from "immer";

/**
 * structuredClone can be invoked on draft and throw error
 * extract current snapshot before cloning
 */
export const unwrap = <Value>(value: Value) =>
  isDraft(value) ? current(value) : value;
