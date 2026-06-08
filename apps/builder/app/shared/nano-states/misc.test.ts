import { afterEach, describe, expect, test } from "vitest";
import {
  $authPermit,
  $builderMode,
  $canOpenPageTemplates,
  type BuilderMode,
} from "./misc";

afterEach(() => {
  $builderMode.set("design");
  $authPermit.set("view");
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
