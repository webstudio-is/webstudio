import { current, isDraft } from "immer";

export const unwrap = <Value>(value: Value) =>
  isDraft(value) ? current(value) : value;
