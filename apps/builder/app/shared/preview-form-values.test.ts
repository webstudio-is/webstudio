import { expect, test } from "vitest";
import {
  readPreviewFormValues,
  toPublicPreviewValue,
} from "./preview-form-values";

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

test("file values carry explicit preview metadata without upload bytes", () => {
  const form = document.createElement("form");
  const input = document.createElement("input");
  input.type = "file";
  input.name = "attachment";
  const transfer = new DataTransfer();
  transfer.items.add(new File(["abc"], "sample.txt", { type: "text/plain" }));
  input.files = transfer.files;
  form.appendChild(input);
  expect(readPreviewFormValues(form)).toEqual({
    attachment: {
      __webstudioPreviewFile: true,
      name: "sample.txt",
      type: "text/plain",
      size: 3,
    },
  });
  expect(toPublicPreviewValue(readPreviewFormValues(form))).toEqual({
    attachment: { name: "sample.txt", type: "text/plain", size: 3 },
  });
});
