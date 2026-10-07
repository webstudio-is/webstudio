import { expect, test } from "vitest";
import { readPreviewFormValues } from "./preview-form-values";

test("live unsent values include empty inputs, select changes, and checkbox arrays", () => {
  const form = document.createElement("form");
  form.innerHTML =
    '<input name="empty"><input name="text" value="initial"><select name="choice"><option value="first">First</option><option value="second">Second</option></select><input name="flag" type="checkbox" value="yes">';
  document.body.appendChild(form);
  expect(readPreviewFormValues(form)).toEqual({
    empty: "",
    text: "initial",
    choice: "first",
    flag: [],
  });
  form.querySelector<HTMLInputElement>('[name="text"]')!.value = "edited";
  const select = form.querySelector(
    '[name="choice"]'
  ) as unknown as HTMLSelectElement;
  select.value = "second";
  form.querySelector<HTMLInputElement>('[name="flag"]')!.checked = true;
  expect(readPreviewFormValues(form)).toEqual({
    empty: "",
    text: "edited",
    choice: "second",
    flag: ["yes"],
  });
  form.remove();
});
