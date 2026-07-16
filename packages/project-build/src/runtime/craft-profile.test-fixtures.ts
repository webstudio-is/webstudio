import type { StyleDecl, Styles } from "@webstudio-is/sdk";
import { ROOT_INSTANCE_ID } from "@webstudio-is/sdk";
import type { BuilderState } from "../state/builder-state";
import { craftProfile } from "./craft-profile";

const keyword = (value: string) => ({ type: "keyword" as const, value });

export const createCraftFixture = (
  variant: "compatible" | "partial" | "modified" | "non-craft"
): BuilderState => {
  if (variant === "non-craft") {
    return {
      styles: new Map(),
      styleSources: new Map(),
      styleSourceSelections: new Map(),
    };
  }
  const variableNames =
    variant === "partial"
      ? craftProfile.checks.required.semanticVariables.slice(0, 3)
      : craftProfile.checks.required.semanticVariables;
  const styles: Styles = new Map(
    variableNames.map((property) => [
      `global:base:${property}`,
      {
        styleSourceId: "global",
        breakpointId: "base",
        property,
        value: keyword("initial"),
      },
    ])
  );
  if (variant !== "partial") {
    styles.set("container:base:display", {
      styleSourceId: "container",
      breakpointId: "base",
      property: "display",
      value: keyword("flex"),
    });
    styles.set("container:base:flexDirection", {
      styleSourceId: "container",
      breakpointId: "base",
      property: "flexDirection",
      value: keyword(variant === "compatible" ? "column" : "row"),
    });
    styles.set("container:base:columnGap", {
      styleSourceId: "container",
      breakpointId: "base",
      property: "columnGap" as StyleDecl["property"],
      value: { type: "var", value: "gap-m" },
    });
    styles.set("container:base:rowGap", {
      styleSourceId: "container",
      breakpointId: "base",
      property: "rowGap" as StyleDecl["property"],
      value: { type: "var", value: "gap-m" },
    });
  }
  return {
    pages: {
      homePageId: "style-guide",
      rootFolderId: "root",
      redirects: [],
      pages: new Map([
        [
          "style-guide",
          {
            id: "style-guide",
            name: "Style Guide",
            title: "Style Guide",
            path: "",
            rootInstanceId: "body",
            meta: {},
          },
        ],
      ]),
      folders: new Map([
        [
          "root",
          { id: "root", name: "Root", slug: "", children: ["style-guide"] },
        ],
      ]),
    },
    styleSources: new Map([
      ["global", { id: "global", type: "local" }],
      ...(variant === "partial"
        ? []
        : [
            [
              "container",
              { id: "container", type: "token" as const, name: "container" },
            ] as const,
          ]),
    ]),
    styleSourceSelections: new Map([
      [ROOT_INSTANCE_ID, { instanceId: ROOT_INSTANCE_ID, values: ["global"] }],
    ]),
    styles,
  };
};
