import { beforeEach, describe, expect, test } from "vitest";
import type {
  Instance,
  Prop,
  StyleDecl,
  StyleSourceSelection,
} from "@webstudio-is/sdk";
import { getStyleDeclKey } from "@webstudio-is/sdk";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { StyleProperty } from "@webstudio-is/css-engine";
import { parseCssValue } from "@webstudio-is/css-data";
import {
  $assets,
  $breakpoints,
  $dataSources,
  $instances,
  $pages,
  $props,
  $resources,
  $styleSources,
  $styles,
  $styleSourceSelections,
  resetDataStores,
} from "~/shared/sync/data-stores";
import { registerContainers } from "~/shared/sync/sync-stores";
import {
  $unusedCssVariables,
  deleteCssVariable,
  validateCssVariableName,
} from "./css-variable-utils";

registerContainers();

const createInstance = (
  id: Instance["id"],
  component: string,
  children: Instance["children"] = []
): Instance => ({ type: "instance", id, component, children });

const createStyleDecl = (
  styleSourceId: string,
  breakpointId: string,
  property: string,
  value: string
): StyleDecl => ({
  styleSourceId,
  breakpointId,
  property: property as StyleProperty,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: parseCssValue(property as any, value),
});

const createStyleDeclEntry = (
  styleSourceId: string,
  breakpointId: string,
  property: string,
  value: string
) => {
  const styleDecl = createStyleDecl(
    styleSourceId,
    breakpointId,
    property,
    value
  );
  return [getStyleDeclKey(styleDecl), styleDecl] as const;
};

beforeEach(() => {
  resetDataStores();
});

const setRuntimeBridgeStores = () => {
  $pages.set(createDefaultPages({ rootInstanceId: "body" }));
  $instances.set(new Map([["body", createInstance("body", "Body")]]));
  $props.set(new Map());
  $dataSources.set(new Map());
  $resources.set(new Map());
  $breakpoints.set(new Map());
  $styleSourceSelections.set(new Map());
  $styleSources.set(new Map());
  $styles.set(new Map());
  $assets.set(new Map());
};

describe("validateCssVariableName", () => {
  test("validates against styles from the Builder store", () => {
    $styles.set(
      new Map([createStyleDeclEntry("local1", "base", "--existing", "red")])
    );

    expect(validateCssVariableName("--existing")).toEqual({
      type: "duplicate",
      message: 'CSS variable "--existing" already exists',
    });
    expect(validateCssVariableName("--existing", "--existing")).toBeUndefined();
  });
});

describe("$unusedCssVariables", () => {
  test("derives unused variables from Builder style and prop stores", () => {
    $styleSourceSelections.set(
      new Map<string, StyleSourceSelection>([
        ["root", { instanceId: "root", values: ["local1"] }],
        ["embed", { instanceId: "embed", values: ["local2"] }],
      ])
    );
    $styles.set(
      new Map([
        createStyleDeclEntry("local1", "base", "--used", "red"),
        createStyleDeclEntry("local1", "base", "--used-in-embed", "blue"),
        createStyleDeclEntry("local1", "base", "--unused", "green"),
        createStyleDeclEntry("local1", "base", "color", "var(--used)"),
      ])
    );
    $props.set(
      new Map<string, Prop>([
        [
          "embed-code",
          {
            id: "embed-code",
            instanceId: "embed",
            type: "string",
            name: "code",
            value: "<style>.test { color: var(--used-in-embed); }</style>",
          },
        ],
      ])
    );

    expect($unusedCssVariables.get()).toEqual(new Set(["--unused"]));
  });
});

describe("deleteCssVariable", () => {
  test("deletes a single variable through the runtime mutation bridge", () => {
    setRuntimeBridgeStores();
    $styles.set(
      new Map([createStyleDeclEntry("local1", "base", "--unused", "red")])
    );

    deleteCssVariable("--unused");

    expect(
      Array.from($styles.get().values()).some(
        (style) => style.property === "--unused"
      )
    ).toBe(false);
  });
});
