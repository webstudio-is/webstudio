import { expect, test } from "vitest";
import { getReloadableAssetsResourceFormData } from "./variable-editors/assets-resource-editor";

test("blocks resource loads while the visible Assets query is invalid", () => {
  const form = document.createElement("form");
  const queryValidity = document.createElement("input");
  queryValidity.name = "asset-query-valid";
  queryValidity.value = "false";
  form.appendChild(queryValidity);

  expect(getReloadableAssetsResourceFormData(form)).toBeUndefined();

  queryValidity.value = "true";
  expect(getReloadableAssetsResourceFormData(form)).toBeInstanceOf(FormData);
});
