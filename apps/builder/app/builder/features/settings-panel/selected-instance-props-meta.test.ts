import { afterEach, expect, test } from "vitest";
import { coreMetas, type WsComponentMeta } from "@webstudio-is/sdk";
import { Input as inputMeta } from "@webstudio-is/sdk-components-react/metas";
import { attributesByTag } from "@webstudio-is/html-data";
import { showAttribute } from "@webstudio-is/react-sdk";
import { $selectedInstancePropsMetas } from "./shared";
import {
  $registeredComponentMetas,
  selectInstance,
} from "~/shared/nano-states";
import { $instances, $props } from "~/shared/sync/data-stores";

afterEach(() => {
  selectInstance(undefined);
  $instances.set(new Map());
  $props.set(new Map());
  $registeredComponentMetas.set(new Map());
});

test("does not expose rendered form attributes for the managed Form", () => {
  const form = {
    type: "instance" as const,
    id: "form",
    component: "Form",
    tag: "form",
    children: [],
  };
  $instances.set(new Map([[form.id, form]]));
  $props.set(new Map());
  const nativeFormMeta: WsComponentMeta = {
    label: "Form",
    htmlAttributes: "hide",
    props: {
      action: {
        type: "json",
        control: "form-action",
        required: false,
      },
      successRedirect: { type: "string", control: "url", required: false },
    },
  };
  $registeredComponentMetas.set(
    new Map([...Object.entries(coreMetas), ["Form", nativeFormMeta]])
  );
  selectInstance([form.id]);

  const propsMetas = $selectedInstancePropsMetas.get();

  expect(propsMetas.has("method")).toBe(false);
  expect(propsMetas.has("enctype")).toBe(false);
  expect(propsMetas.has("target")).toBe(false);
  expect(propsMetas.has("id")).toBe(false);
  expect(propsMetas.has("aria-label")).toBe(false);
  expect(propsMetas.has("action")).toBe(true);
  expect(propsMetas.has("successRedirect")).toBe(true);
  expect(propsMetas.has(showAttribute)).toBe(true);
});

test("keeps rendered form attributes for components without the opt-out", () => {
  const form = {
    type: "instance" as const,
    id: "form",
    component: "Form",
    tag: "form",
    children: [],
  };
  $instances.set(new Map([[form.id, form]]));
  $props.set(new Map());
  $registeredComponentMetas.set(
    new Map([
      ...Object.entries(coreMetas),
      [
        "Form",
        {
          label: "Form",
          props: {
            custom: { type: "string", control: "text", required: false },
            className: { type: "string", control: "text", required: false },
          },
        } satisfies WsComponentMeta,
      ],
    ])
  );
  selectInstance([form.id]);

  const propsMetas = $selectedInstancePropsMetas.get();

  expect(propsMetas.has("method")).toBe(true);
  expect(propsMetas.has("enctype")).toBe(true);
  expect(propsMetas.has("id")).toBe(true);
  expect(propsMetas.has("aria-label")).toBe(true);
  expect(propsMetas.has("class")).toBe(false);
  const propNames = [...propsMetas.keys()];
  expect(propNames[0]).toBe(showAttribute);
  expect(propNames.indexOf("custom")).toBeLessThan(propNames.indexOf("method"));
  expect(propNames.indexOf("method")).toBeLessThan(propNames.indexOf("id"));
  expect(propNames.indexOf("id")).toBeLessThan(propNames.indexOf("aria-label"));
});

test.each(["ws:element", "Input"])(
  "inherits the unset %s input type from HTML metadata",
  (component) => {
    const input = {
      type: "instance" as const,
      id: "input",
      component,
      tag: "input",
      children: [],
    };
    $instances.set(new Map([[input.id, input]]));
    $props.set(new Map());
    $registeredComponentMetas.set(
      new Map([...Object.entries(coreMetas), ["Input", inputMeta]])
    );
    selectInstance([input.id]);

    const typeMeta = $selectedInstancePropsMetas.get().get("type");

    expect(typeMeta).toMatchObject({
      control: "select",
      defaultValue: "text",
      options: expect.arrayContaining(["text", "email"]),
    });
    expect($props.get().size).toBe(0);
  }
);

test("keeps the implicit type default on the input attribute only", () => {
  expect(
    attributesByTag.input?.find(({ name }) => name === "type")
  ).toMatchObject({
    defaultValue: "text",
  });
  expect(
    attributesByTag.button?.find(({ name }) => name === "type")
  ).not.toHaveProperty("defaultValue");
});
