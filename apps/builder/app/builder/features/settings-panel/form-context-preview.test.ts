import { expect, test } from "vitest";
import type { DataSource, Instances } from "@webstudio-is/sdk";
import { encodeDataVariableId } from "@webstudio-is/sdk";
import { getResourceScopeForInstance } from "./resource-scope";
import {
  getFormDataPreview,
  getBrowserInfoPreview,
  getFormParameterName,
  resolveFormParameterPreview,
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

test("Form parameter resolver gives the Resource scope the same public occurrence value", () => {
  const formData: DataSource = {
    id: "form-data",
    type: "parameter",
    name: "formData",
    scopeInstanceId: "form",
  };
  const browserInfo: DataSource = {
    id: "browser-info",
    type: "parameter",
    name: "browserInfo",
    scopeInstanceId: "form",
  };
  const unrelated: DataSource = {
    id: "unrelated",
    type: "parameter",
    name: "formData",
    scopeInstanceId: "other",
  };
  const instances: Instances = new Map([
    [
      "form",
      { id: "form", type: "instance", component: "NativeForm", children: [] },
    ],
    [
      "other",
      { id: "other", type: "instance", component: "Box", children: [] },
    ],
  ]);
  const selector = ["form", "collection[one]", "root"];
  const liveFormValues = new Map([
    [
      selector.join(","),
      {
        attachment: {
          __webstudioPreviewFile: true,
          name: "sample.txt",
          type: "text/plain",
          size: 3,
        },
      },
    ],
    ["form,collection[two],root", { message: "other occurrence" }],
  ]);
  const liveBrowserInfo = new Map([
    [
      "form",
      {
        ip: "203.0.113.10",
        userAgent: "Preview",
        language: "en-GB",
        referrer: "",
      },
    ],
  ]);
  const scope = getResourceScopeForInstance({
    page: undefined,
    instanceKey: selector.join(","),
    dataSources: new Map([
      [formData.id, formData],
      [browserInfo.id, browserInfo],
      [unrelated.id, unrelated],
    ]),
    variableValuesByInstanceSelector: new Map(),
    formScopeInstanceId: "form",
    formScopeSelector: selector,
    liveFormValues,
    liveBrowserInfo,
  });

  for (const source of [formData, browserInfo]) {
    const preview = resolveFormParameterPreview(source, {
      instances,
      selector,
      liveFormValues,
      liveBrowserInfo,
    });
    expect(preview?.value).toEqual(scope.variableValues.get(source.id));
    expect(scope.scope[encodeDataVariableId(source.id)]).toEqual(
      preview?.value
    );
  }
  expect(scope.variableValues.get(formData.id)).toEqual({
    attachment: { name: "sample.txt", type: "text/plain", size: 3 },
  });
  expect(scope.variableValues.has(unrelated.id)).toBe(false);
  expect(getFormParameterName(unrelated, { instances })).toBeUndefined();
});
