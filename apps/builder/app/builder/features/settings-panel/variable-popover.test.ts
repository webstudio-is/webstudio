import { expect, test } from "vitest";
import { __testing__ } from "./variable-popover";

const { getReloadableResourceFormData } = __testing__;

test("blocks resource loads while the visible Assets query is invalid", () => {
  const form = document.createElement("form");
  const queryValidity = document.createElement("input");
  queryValidity.name = "asset-query-valid";
  queryValidity.value = "false";
  form.appendChild(queryValidity);

  expect(getReloadableResourceFormData(form)).toBeUndefined();

  queryValidity.value = "true";
  expect(getReloadableResourceFormData(form)).toBeInstanceOf(FormData);
});
