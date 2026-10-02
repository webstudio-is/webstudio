import { expect, test } from "vitest";
import {
  formBotFieldName,
  formIdFieldName,
  managedFormArrayNamesFieldName,
  managedFormIdFieldName,
} from "./form-fields";
import {
  getManagedFormBrowserInfo,
  getManagedFormValues,
  readFormDataWithLimit,
  validateManagedFormBot,
} from "./managed-form-submission";

test("parses bounded request bodies and rejects oversized streamed bodies", async () => {
  const formData = new FormData();
  formData.set("field", "value");
  const request = new Request("https://example.com/submit", {
    method: "POST",
    body: formData,
  });
  expect((await readFormDataWithLimit(request, 1024)).get("field")).toBe(
    "value"
  );

  const oversized = new Request("https://example.com/submit", {
    method: "POST",
    body: new Uint8Array([1, 2, 3, 4]),
  });
  await expect(readFormDataWithLimit(oversized, 3)).rejects.toThrow(
    "Form submission is too large"
  );
});

test("validates the managed Form bot field and keeps the Brave exception", () => {
  const formData = new FormData();
  expect(() => validateManagedFormBot(formData)).toThrow(
    "Form bot field not found"
  );
  formData.set(formBotFieldName, "brave");
  expect(() => validateManagedFormBot(formData)).not.toThrow();
  formData.set(formBotFieldName, "stale");
  expect(() => validateManagedFormBot(formData)).toThrow(
    "Form bot value invalid stale"
  );
});

test("reconstructs repeated and empty field groups without internal values", () => {
  const formData = new FormData();
  formData.append("choice", "first");
  formData.append("choice", "second");
  formData.set("scalar", "value");
  formData.set(
    managedFormArrayNamesFieldName,
    JSON.stringify(["choice", "empty"])
  );
  formData.set(managedFormIdFieldName, "form");
  formData.set(formIdFieldName, "legacy");
  formData.set(formBotFieldName, "brave");

  const values = getManagedFormValues(formData);
  expect(Object.getPrototypeOf(values)).toBe(null);
  expect(values).toEqual({
    choice: ["first", "second"],
    empty: [],
    scalar: "value",
  });
  expect(() => {
    formData.set(
      managedFormArrayNamesFieldName,
      JSON.stringify(["choice", "choice"])
    );
    getManagedFormValues(formData);
  }).toThrow("Invalid Form field groups");
});

test("preserves file values and only includes explicitly trusted IP", () => {
  const file = new File(["contents"], "upload.txt", { type: "text/plain" });
  const formData = new FormData();
  formData.set("upload", file);
  formData.set(managedFormArrayNamesFieldName, "[]");
  expect(getManagedFormValues(formData).upload).toBe(file);

  const request = new Request("https://example.com/submit", {
    headers: {
      "user-agent": "browser",
      "accept-language": "en",
      referer: "https://example.com/page",
      "cf-connecting-ip": "203.0.113.1",
    },
  });
  const info = getManagedFormBrowserInfo(request);
  expect(info).toEqual({
    userAgent: "browser",
    language: "en",
    referrer: "https://example.com/page",
  });
  expect(getManagedFormBrowserInfo(request, "203.0.113.1").ip).toBe(
    "203.0.113.1"
  );
});
