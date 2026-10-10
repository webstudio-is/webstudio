import { expect, test } from "vitest";
import {
  getFormDataPreview,
  getBrowserInfoPreview,
} from "./form-context-preview";

test("form context uses mounted browser controls and excludes unchecked controls", () => {
  const form = document.createElement("form");
  form.dataset.wsManagedFormId = "form";
  form.innerHTML = `
    <input name="name" value="Ada">
    <input name="unchecked" type="checkbox" value="yes">
    <input name="choice" type="radio" value="one">
    <input name="choice" type="radio" value="two" checked>
    <select name="city"><option value="lisbon">Lisbon</option></select>
    <input name="disabled" value="hidden" disabled>
  `;
  document.body.appendChild(form);
  try {
    expect(getFormDataPreview("form")).toEqual({
      name: "Ada",
      unchecked: [],
      choice: "two",
      city: "lisbon",
    });
    expect(getFormDataPreview("other-form")).toEqual({});
    form.querySelector<HTMLInputElement>('[name="name"]')!.value = "Grace";
    expect(getFormDataPreview("form").name).toBe("Grace");
  } finally {
    form.remove();
  }
});

test("unmounted forms have no fabricated submission values", () => {
  expect(getFormDataPreview("not-mounted")).toEqual({});
});

test("browser preview provides safe browser context without visitor IP or referrer", () => {
  expect(getBrowserInfoPreview()).toEqual({
    ip: "",
    referrer: "",
    userAgent: navigator.userAgent,
    language: navigator.language,
  });
});
