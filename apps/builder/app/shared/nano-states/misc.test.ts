import { afterEach, describe, expect, test } from "vitest";
import {
  $authPermit,
  $builderMode,
  $canOpenPageTemplates,
  $propsIndex,
  type BuilderMode,
} from "./misc";
import { $props } from "../sync/data-stores";

afterEach(() => {
  $builderMode.set("design");
  $authPermit.set("view");
  $props.set(new Map());
});

test("keeps the public tag index limited to static string values", () => {
  $props.set(
    new Map([
      [
        "dynamic-tag",
        {
          id: "dynamic-tag",
          instanceId: "box",
          name: "tag",
          type: "expression" as const,
          value: '"article"',
          mode: "read" as const,
        },
      ],
      [
        "first-static-tag",
        {
          id: "first-static-tag",
          instanceId: "duplicate-box",
          name: "tag",
          type: "string" as const,
          value: "article",
        },
      ],
      [
        "second-static-tag",
        {
          id: "second-static-tag",
          instanceId: "duplicate-box",
          name: "tag",
          type: "string" as const,
          value: "aside",
        },
      ],
    ])
  );

  expect($propsIndex.get().htmlTagsByInstanceId).toEqual(
    new Map([["duplicate-box", "aside"]])
  );
});

describe("$canOpenPageTemplates", () => {
  test.each(["build", "admin", "own"] as const)(
    "allows %s permit in design mode",
    (authPermit) => {
      $builderMode.set("design");
      $authPermit.set(authPermit);

      expect($canOpenPageTemplates.get()).toBe(true);
    }
  );

  test.each(["view", "edit"] as const)(
    "denies %s permit in design mode",
    (authPermit) => {
      $builderMode.set("design");
      $authPermit.set(authPermit);

      expect($canOpenPageTemplates.get()).toBe(false);
    }
  );

  test.each(["content", "preview"] as BuilderMode[])(
    "denies build permit in %s mode",
    (builderMode) => {
      $builderMode.set(builderMode);
      $authPermit.set("build");

      expect($canOpenPageTemplates.get()).toBe(false);
    }
  );
});
