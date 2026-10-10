import { afterEach, expect, test } from "vitest";
import { coreMetas, type WsComponentMeta } from "@webstudio-is/sdk";
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
    component: "NativeForm",
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
    new Map([...Object.entries(coreMetas), ["NativeForm", nativeFormMeta]])
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
    component: "NativeForm",
    tag: "form",
    children: [],
  };
  $instances.set(new Map([[form.id, form]]));
  $props.set(new Map());
  $registeredComponentMetas.set(
    new Map([
      ...Object.entries(coreMetas),
      [
        "NativeForm",
        {
          label: "Form",
          props: {},
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
});
