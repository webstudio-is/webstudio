import { afterEach, expect, test, vi } from "vitest";
import {
  createManagedSubmissionFormData,
  getFormDataValue,
} from "./form-submission";
import {
  formBotFieldName,
  getManagedFormValues,
  managedFormArrayNamesFieldName,
  managedFormIdFieldName,
  validateManagedFormBot,
} from "@webstudio-is/sdk/runtime";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const submit = () =>
  createManagedSubmissionFormData({
    values: { name: "Visitor" },
    managedFormId: "form",
  });

test("generates one fresh bot field for each managed submission", () => {
  const { width, height } = screen;
  const divisor = (a: number, b: number): number =>
    b === 0 ? a : divisor(b, a % b);
  const commonDivisor = divisor(width, height);
  const ratio = `${width / commonDivisor}/${height / commonDivisor}`;
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches:
      query === `(device-aspect-ratio: ${ratio})` ||
      query === `(device-width: ${width}px) and (device-height: ${height}px)` ||
      query === "(prefers-color-scheme: light)",
  }));
  const now = vi.spyOn(Date, "now").mockReturnValue(1_000_000);

  const first = submit();
  now.mockReturnValue(1_300_001);
  const second = submit();
  expect(first.getAll(formBotFieldName)).toEqual(["f4240"]);
  expect(second.getAll(formBotFieldName)).toEqual(["13d621"]);
  expect(() => validateManagedFormBot(first)).toThrow("Form bot value invalid");
  expect(() => validateManagedFormBot(second)).not.toThrow();
  expect(getManagedFormValues(second)).toEqual({ name: "Visitor" });
});

test("rejects a broken matchMedia browser like the legacy Webhook Form", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  const formData = submit();
  expect(formData.getAll(formBotFieldName)).toEqual(["jsdom"]);
  expect(() => validateManagedFormBot(formData)).toThrow(
    "Form bot value invalid"
  );
});

test("keeps the Brave bypass when matchMedia is blocked", () => {
  vi.stubGlobal("navigator", { brave: { isBrave: () => true } });
  vi.stubGlobal("matchMedia", () => {
    throw new Error("Brave Shields blocked matchMedia");
  });
  const formData = submit();
  expect(formData.getAll(formBotFieldName)).toEqual(["brave"]);
  expect(() => validateManagedFormBot(formData)).not.toThrow();
});

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
