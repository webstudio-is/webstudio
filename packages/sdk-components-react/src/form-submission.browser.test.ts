import { expect, test } from "vitest";
import { getFormDataValue } from "./form-submission";
import {
  formBotFieldName,
  managedFormArrayNamesFieldName,
  managedFormIdFieldName,
} from "@webstudio-is/sdk/runtime";

test("preserves repeated controls, unchecked groups, hidden values and files", () => {
  const form = document.createElement("form");
  form.innerHTML = `
    <input type="hidden" name="source" value="campaign" />
    <input type="hidden" name="${formBotFieldName}" value="internal" />
    <input type="hidden" name="${managedFormIdFieldName}" value="forged" />
    <input type="hidden" name="${managedFormArrayNamesFieldName}" value="forged" />
    <input type="checkbox" name="colors" value="red" checked />
    <input type="checkbox" name="colors" value="blue" checked />
    <input type="checkbox" name="colors" value="green" />
    <input type="checkbox" name="extras" value="one" />
    <input type="checkbox" name="extras" value="two" />
    <input type="file" name="attachment" />
    <input type="file" name="photos" multiple />
    <button type="submit" name="intent" value="contact">Send</button>
  `;
  const file = new File(["file bytes"], "report.txt", { type: "text/plain" });
  const fileInput = form.querySelector<HTMLInputElement>("[type=file]");
  const transfer = new DataTransfer();
  transfer.items.add(file);
  if (fileInput) {
    fileInput.files = transfer.files;
  }
  const photos = form.querySelector<HTMLInputElement>("[name=photos]");
  const photoFiles = new DataTransfer();
  const firstPhoto = new File(["one"], "one.png", { type: "image/png" });
  const secondPhoto = new File(["two"], "two.png", { type: "image/png" });
  photoFiles.items.add(firstPhoto);
  photoFiles.items.add(secondPhoto);
  if (photos) {
    photos.files = photoFiles.files;
  }

  expect(
    getFormDataValue(form, form.querySelector("button") ?? undefined)
  ).toEqual({
    source: "campaign",
    colors: ["red", "blue"],
    extras: [],
    attachment: file,
    photos: [firstPhoto, secondPhoto],
    intent: "contact",
  });
});

test("keeps HTML names that overlap with object properties as form values", () => {
  const form = document.createElement("form");
  form.innerHTML = `
    <input name="__proto__" value="submitted" />
    <input name="constructor" value="form value" />
  `;

  const values = getFormDataValue(form);
  expect(Object.getPrototypeOf(values)).toBeNull();
  expect(values["__proto__"]).toBe("submitted");
  expect(values.constructor).toBe("form value");
});

test("preserves a same-name submit button after the field value", () => {
  const form = document.createElement("form");
  form.innerHTML = `
    <input name="intent" value="message" />
    <button type="submit" name="intent" value="send">Send</button>
  `;

  const submitter = form.querySelector("button") ?? undefined;
  expect(getFormDataValue(form, submitter)).toEqual({
    intent: ["message", "send"],
  });
});
