import { expect, test } from "vitest";
import { meta } from "./native-form.ws";

test("Form exposes managed actions and redirect rather than native form attributes", () => {
  expect(meta.initialProps).toEqual(["submission", "successRedirect"]);
  expect(Object.keys(meta.props ?? {})).toEqual([
    "submission",
    "successRedirect",
  ]);
});
