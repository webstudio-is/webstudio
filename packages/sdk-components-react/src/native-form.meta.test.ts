import { expect, test } from "vitest";
import { meta } from "./native-form.ws";

test("Form exposes managed actions and redirect rather than native form attributes", () => {
  expect(meta.initialProps).toEqual(["action", "successRedirect"]);
  expect(meta.htmlAttributes).toBe("hide");
  expect(Object.keys(meta.props ?? {})).toEqual(["action", "successRedirect"]);
  expect(meta.props?.action?.label).toBe("Action");
  expect(meta.props?.successRedirect?.label).toBe("Success redirect");
});
