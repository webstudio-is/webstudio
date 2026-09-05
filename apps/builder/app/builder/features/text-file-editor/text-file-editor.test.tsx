// Verifies that MDX completions use the live Content Block template contract,
// including stable JSX names and template-authored properties.
import { afterEach, expect, test } from "vitest";
import {
  blockComponent,
  blockTemplateComponent,
  contentBlockSourceProp,
  coreMetas,
  elementComponent,
  type Instance,
  type Prop,
} from "@webstudio-is/sdk";
import { $instances, $props } from "~/shared/sync/data-stores";
import { __testing__ } from "./text-file-editor";

const { getMdxCompletionComponents } = __testing__;

afterEach(() => {
  $instances.set(new Map());
  $props.set(new Map());
});

test("derives MDX completions from template names instead of labels", () => {
  const instances = new Map<string, Instance>([
    [
      "block",
      {
        type: "instance",
        id: "block",
        component: blockComponent,
        children: [{ type: "id", value: "templates" }],
      },
    ],
    [
      "templates",
      {
        type: "instance",
        id: "templates",
        component: blockTemplateComponent,
        children: [{ type: "id", value: "promotion-card" }],
      },
    ],
    [
      "promotion-card",
      {
        type: "instance",
        id: "promotion-card",
        component: elementComponent,
        tag: "section",
        name: "PromotionCard",
        label: "Heading 1",
        children: [],
      },
    ],
  ]);
  const props = new Map<string, Prop>([
    [
      "source",
      {
        id: "source",
        instanceId: "block",
        name: contentBlockSourceProp,
        type: "asset",
        value: "article",
      },
    ],
    [
      "title",
      {
        id: "title",
        instanceId: "promotion-card",
        name: "title",
        type: "string",
        value: "Launch offer",
      },
    ],
  ]);
  $instances.set(instances);
  $props.set(props);

  const completions = getMdxCompletionComponents({
    assetId: "article",
    metas: new Map(Object.entries(coreMetas)),
  });
  const promotionCard = completions.find(
    ({ name }) => name === "PromotionCard"
  );

  expect(promotionCard?.props).toContainEqual({ name: "title" });
  expect(completions.some(({ name }) => name === "Heading 1")).toBe(false);
});
