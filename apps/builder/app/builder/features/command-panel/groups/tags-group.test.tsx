import { beforeEach, describe, expect, test } from "vitest";
import {
  blockComponent,
  blockTemplateComponent,
  coreMetas,
  elementComponent,
} from "@webstudio-is/sdk";
import type { Instances, Props } from "@webstudio-is/sdk";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  $registeredComponentMetas,
  $selectedPageId,
  selectInstance,
} from "~/shared/nano-states";
import { $instances, $pages, $props } from "~/shared/sync/data-stores";
import {
  $commandSearch,
  closeCommandPanel,
  openCommandPanel,
} from "../command-state";
import { $tagOptions } from "./tags-group";
import {
  publishMaterializedContentRoot,
  resetMaterializedContent,
} from "~/shared/content-block-content";

beforeEach(() => {
  closeCommandPanel();
  $commandSearch.set("");
  $instances.set(new Map());
  $props.set(new Map());
  $pages.set(undefined);
  $selectedPageId.set(undefined);
  $registeredComponentMetas.set(new Map(Object.entries(coreMetas)));
  resetMaterializedContent();
});

describe("$tagOptions", () => {
  test("uses indexed html tags from props when validating content model", () => {
    const instances: Instances = new Map([
      [
        "list",
        {
          type: "instance",
          id: "list",
          component: elementComponent,
          children: [],
        },
      ],
    ]);
    const props: Props = new Map([
      [
        "list-tag",
        {
          id: "list-tag",
          instanceId: "list",
          name: "tag",
          type: "string",
          value: "ul",
        },
      ],
    ]);

    $instances.set(instances);
    $props.set(props);
    $pages.set(
      createDefaultPages({ rootInstanceId: "list", homePageId: "home" })
    );
    $selectedPageId.set("home");
    selectInstance(["list"]);
    openCommandPanel();

    const tags = $tagOptions.get().map((option) => option.tag);

    expect(tags).toContain("li");
    expect(tags).not.toContain("div");
  });

  test("validates tags for a materialized MDX instance", () => {
    $instances.set(
      new Map([
        [
          "body",
          {
            type: "instance",
            id: "body",
            component: "Body",
            children: [{ type: "id", value: "block" }],
          },
        ],
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
            children: [],
          },
        ],
      ])
    );
    $props.set(
      new Map([
        [
          "source",
          {
            id: "source",
            instanceId: "block",
            name: "src",
            type: "asset",
            value: "article",
          },
        ],
      ])
    );
    $pages.set(
      createDefaultPages({ rootInstanceId: "body", homePageId: "home" })
    );
    $selectedPageId.set("home");
    publishMaterializedContentRoot({
      identity: {
        blockInstanceId: "block",
        assetId: "article",
        contentRef: "article.mdx",
        revision: "sha256:one",
        renderScope: JSON.stringify(["block", "body"]),
        format: "mdx",
      },
      fragment: {
        children: [{ type: "id", value: "list" }],
        instances: [
          {
            type: "instance",
            id: "list",
            component: elementComponent,
            tag: "ul",
            children: [],
          },
        ],
        props: [],
        dataSources: [],
        resources: [],
        styleSourceSelections: [],
        styleSources: [],
        styles: [],
        breakpoints: [],
        assets: [],
      },
    });
    selectInstance(["list", "block", "body"]);
    openCommandPanel();

    const tags = $tagOptions.get().map((option) => option.tag);

    expect(tags).toContain("li");
    expect(tags).not.toContain("div");
  });
});
