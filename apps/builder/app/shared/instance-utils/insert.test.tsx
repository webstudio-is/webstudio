import {
  findClosestInsertable,
  getComponentTemplateData,
  getImageAssetFragment,
  insertWebstudioComponentAt,
  insertWebstudioFragmentAt,
} from "./insert";
import { insertWebstudioElementAt } from "./insert";
import { enableMapSet } from "immer";
import { describe, test, expect, beforeEach, vi } from "vitest";
import { toast } from "@webstudio-is/design-system";
import { lintExpression } from "@webstudio-is/expression";
import type { Project } from "@webstudio-is/project";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  createTemplateComponentFixture,
  ws,
  css,
  expression,
  renderTemplate,
  renderData,
  token,
  type TemplateMeta,
} from "@webstudio-is/template";
import * as defaultMetas from "@webstudio-is/sdk-components-react/metas";
import { coreTemplates } from "@webstudio-is/sdk-components-registry/core-templates";
import { componentIds } from "@webstudio-is/sdk-components-registry/components";
import type { Prop, WebstudioData, WebstudioFragment } from "@webstudio-is/sdk";
import {
  blockBodyComponent,
  blockComponent,
  coreMetas,
  elementComponent,
  encodeDataSourceVariable,
  isFormSubmission,
} from "@webstudio-is/sdk";
import {
  $registeredComponentMetas,
  $registeredTemplates,
} from "../nano-states";
import { $assets } from "~/shared/sync/data-stores";
import {
  $breakpoints,
  $dataSources,
  $instances,
  $pages,
  $project,
  $props,
  $styleSourceSelections,
  $styleSources,
  $styles,
  $resources,
} from "~/shared/sync/data-stores";
import { registerContainers } from "../sync/sync-stores";
import {
  findAvailableVariables,
  getInstancePath,
} from "@webstudio-is/project-build/runtime";
import { getInstanceKey, selectPage } from "../nano-states";
import { selectInstance } from "../nano-states";
import { $propValuesByInstanceSelector } from "../nano-states/props";
import { $dataSourceVariables } from "../nano-states/variables";
import { $selectedPageId } from "../nano-states/pages";
import { expectSlotsShareFragment } from "../slot-test-utils";
import { $selectedInstanceInitialPropNames } from "~/builder/features/settings-panel/shared";

const Body = createTemplateComponentFixture("Body");
const Bold = createTemplateComponentFixture("Bold");
const Box = createTemplateComponentFixture("Box");
const Fragment = createTemplateComponentFixture("Fragment");
const Image = createTemplateComponentFixture("Image");
const ListItem = createTemplateComponentFixture("ListItem");
const Paragraph = createTemplateComponentFixture("Paragraph");
const Slot = createTemplateComponentFixture("Slot");

enableMapSet();
registerContainers();

$pages.set(createDefaultPages({ rootInstanceId: "" }));

const defaultMetasMap = new Map(
  Object.entries({ ...defaultMetas, ...coreMetas })
);
$registeredComponentMetas.set(defaultMetasMap);

const createFragment = (
  fragment: Partial<WebstudioFragment>
): WebstudioFragment => ({
  children: [],
  instances: [],
  styleSourceSelections: [],
  styleSources: [],
  breakpoints: [],
  styles: [],
  dataSources: [],
  resources: [],
  props: [],
  assets: [],
  ...fragment,
});

const setDataStores = (data: Omit<WebstudioData, "pages">) => {
  $instances.set(data.instances);
  $breakpoints.set(data.breakpoints);
  $styleSources.set(data.styleSources);
  $styles.set(data.styles);
  $styleSourceSelections.set(data.styleSourceSelections);
  $dataSources.set(data.dataSources);
  $props.set(data.props);
  $assets.set(data.assets);
  $resources.set(data.resources);
};

describe("insert webstudio element at", () => {
  beforeEach(() => {
    $pages.set(
      createDefaultPages({ homePageId: "homePageId", rootInstanceId: "bodyId" })
    );
    selectPage("homePageId");
    $styleSourceSelections.set(new Map());
    $styleSources.set(new Map());
    $breakpoints.set(new Map());
    $styles.set(new Map());
    $dataSources.set(new Map());
    $resources.set(new Map());
    $props.set(new Map());
    $assets.set(new Map());
  });

  test("insert element with div tag into body", async () => {
    $instances.set(renderData(<Body ws:id="bodyId"></Body>).instances);
    await insertWebstudioElementAt({
      parentSelector: ["bodyId"],
      position: "end",
    });
    const [_bodyId, newInstanceId] = $instances.get().keys();
    expect($instances.get()).toEqual(
      renderData(
        <Body ws:id="bodyId">
          <ws.element ws:id={newInstanceId} ws:tag="div" />
        </Body>
      ).instances
    );
  });

  test("insert element with li tag into ul", async () => {
    $instances.set(
      renderData(
        <Body ws:id="bodyId">
          <ws.element ws:id="listId" ws:tag="ul"></ws.element>
        </Body>
      ).instances
    );
    await insertWebstudioElementAt({
      parentSelector: ["listId", "bodyId"],
      position: "end",
    });
    const [_bodyId, _listId, newInstanceId] = $instances.get().keys();
    expect($instances.get()).toEqual(
      renderData(
        <Body ws:id="bodyId">
          <ws.element ws:id="listId" ws:tag="ul">
            <ws.element ws:id={newInstanceId} ws:tag="li" />
          </ws.element>
        </Body>
      ).instances
    );
  });

  test("insert element into selected instance", async () => {
    $pages.set(
      createDefaultPages({ homePageId: "homePageId", rootInstanceId: "bodyId" })
    );
    $instances.set(
      renderData(
        <Body ws:id="bodyId">
          <ws.element ws:id="divId" ws:tag="div"></ws.element>
        </Body>
      ).instances
    );
    selectPage("homePageId");
    selectInstance(["divId", "bodyId"]);
    await insertWebstudioElementAt();
    const [_bodyId, _divId, newInstanceId] = $instances.get().keys();
    expect($instances.get()).toEqual(
      renderData(
        <Body ws:id="bodyId">
          <ws.element ws:id="divId" ws:tag="div">
            <ws.element ws:id={newInstanceId} ws:tag="div" />
          </ws.element>
        </Body>
      ).instances
    );
  });

  test("insert element into selected legacy slot with direct children", async () => {
    $pages.set(
      createDefaultPages({ homePageId: "homePageId", rootInstanceId: "bodyId" })
    );
    $instances.set(
      renderData(
        <Body ws:id="bodyId">
          <Slot ws:id="slotId">
            <Box ws:id="boxId"></Box>
          </Slot>
        </Body>
      ).instances
    );
    selectPage("homePageId");
    selectInstance(["slotId", "bodyId"]);

    await insertWebstudioElementAt();

    const instances = $instances.get();
    const fragmentId = instances.get("slotId")?.children[0]?.value;
    const newInstanceId = Array.from(instances.keys()).find(
      (id) =>
        id !== "bodyId" &&
        id !== "slotId" &&
        id !== "boxId" &&
        id !== fragmentId
    );
    expect(instances).toEqual(
      renderData(
        <Body ws:id="bodyId">
          <Slot ws:id="slotId">
            <Fragment ws:id={fragmentId}>
              <Box ws:id="boxId"></Box>
              <ws.element ws:id={newInstanceId} ws:tag="div" />
            </Fragment>
          </Slot>
        </Body>
      ).instances
    );
  });

  test("insert element into shared slot content", async () => {
    $pages.set(
      createDefaultPages({ homePageId: "homePageId", rootInstanceId: "bodyId" })
    );
    $instances.set(
      renderData(
        <Body ws:id="bodyId">
          <Slot ws:id="slot1">
            <Fragment ws:id="fragment">
              <Box ws:id="box"></Box>
            </Fragment>
          </Slot>
          <Slot ws:id="slot2">
            {/* same ids */}
            <Fragment ws:id="fragment">
              <Box ws:id="box"></Box>
            </Fragment>
          </Slot>
        </Body>
      ).instances
    );
    selectPage("homePageId");
    selectInstance(["slot1", "bodyId"]);

    await insertWebstudioElementAt();

    const newInstanceId = $instances.get().get("fragment")?.children[1]?.value;
    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: newInstanceId },
    ]);
    expect($instances.get().get(newInstanceId ?? "")?.component).toBe(
      elementComponent
    );
  });

  test("insert element at start of shared slot content", async () => {
    $instances.set(
      renderData(
        <Body ws:id="bodyId">
          <Slot ws:id="slot1">
            <Fragment ws:id="fragment">
              <Box ws:id="box"></Box>
            </Fragment>
          </Slot>
          <Slot ws:id="slot2">
            {/* same ids */}
            <Fragment ws:id="fragment">
              <Box ws:id="box"></Box>
            </Fragment>
          </Slot>
        </Body>
      ).instances
    );

    await insertWebstudioElementAt({
      parentSelector: ["slot1", "bodyId"],
      position: 0,
    });

    const newInstanceId = $instances.get().get("fragment")?.children[0]?.value;
    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: newInstanceId },
      { type: "id", value: "box" },
    ]);
    expect($instances.get().get(newInstanceId ?? "")?.component).toBe(
      elementComponent
    );
  });

  test("insert element into nested shared slot content", async () => {
    $pages.set(
      createDefaultPages({ homePageId: "homePageId", rootInstanceId: "bodyId" })
    );
    $instances.set(
      renderData(
        <Body ws:id="bodyId">
          <Slot ws:id="slot1">
            <Fragment ws:id="fragment">
              <ws.element ws:id="div" ws:tag="div"></ws.element>
            </Fragment>
          </Slot>
          <Slot ws:id="slot2">
            {/* same ids */}
            <Fragment ws:id="fragment">
              <ws.element ws:id="div" ws:tag="div"></ws.element>
            </Fragment>
          </Slot>
        </Body>
      ).instances
    );
    selectPage("homePageId");
    selectInstance(["div", "fragment", "slot1", "bodyId"]);

    await insertWebstudioElementAt();

    const newInstanceId = $instances.get().get("div")?.children[0]?.value;
    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "div" },
    ]);
    expect($instances.get().get("div")?.children).toEqual([
      { type: "id", value: newInstanceId },
    ]);
    expect($instances.get().get(newInstanceId ?? "")?.component).toBe(
      elementComponent
    );
  });

  test("insert element into closest non-textual container", async () => {
    $pages.set(
      createDefaultPages({ homePageId: "homePageId", rootInstanceId: "bodyId" })
    );
    $instances.set(
      renderData(
        <Body ws:id="bodyId">
          <ws.element ws:id="divId" ws:tag="div">
            text
          </ws.element>
          <ws.element ws:id="spanId" ws:tag="span"></ws.element>
        </Body>
      ).instances
    );
    selectPage("homePageId");
    selectInstance(["divId", "bodyId"]);
    await insertWebstudioElementAt();
    const [_bodyId, _divId, _spanId, newInstanceId] = $instances.get().keys();
    expect($instances.get()).toEqual(
      renderData(
        <Body ws:id="bodyId">
          <ws.element ws:id="divId" ws:tag="div">
            text
          </ws.element>
          <ws.element ws:id={newInstanceId} ws:tag="div" />
          <ws.element ws:id="spanId" ws:tag="span"></ws.element>
        </Body>
      ).instances
    );
  });

  test("insert element into closest non-empty container", async () => {
    $pages.set(
      createDefaultPages({ homePageId: "homePageId", rootInstanceId: "bodyId" })
    );
    $instances.set(
      renderData(
        <Body ws:id="bodyId">
          <ws.element ws:id="imgId" ws:tag="img"></ws.element>
          <ws.element ws:id="spanId" ws:tag="span"></ws.element>
        </Body>
      ).instances
    );
    selectPage("homePageId");
    selectInstance(["imgId", "bodyId"]);
    await insertWebstudioElementAt();
    const [_bodyId, _imgId, _spanId, newInstanceId] = $instances.get().keys();
    expect($instances.get()).toEqual(
      renderData(
        <Body ws:id="bodyId">
          <ws.element ws:id="imgId" ws:tag="img"></ws.element>
          <ws.element ws:id={newInstanceId} ws:tag="div" />
          <ws.element ws:id="spanId" ws:tag="span"></ws.element>
        </Body>
      ).instances
    );
  });

  test("reports unresolved explicit element insert target", async () => {
    const toastError = vi.spyOn(toast, "error").mockImplementation(() => "");
    $instances.set(renderData(<Body ws:id="bodyId"></Body>).instances);

    expect(
      await insertWebstudioElementAt({
        parentSelector: ["missingId"],
        position: "end",
      })
    ).toBe(false);

    expect(toastError).toHaveBeenCalledWith(
      "Cannot insert: the target no longer exists."
    );
    expect($instances.get()).toEqual(
      renderData(<Body ws:id="bodyId"></Body>).instances
    );
    toastError.mockRestore();
  });
});

describe("insert webstudio fragment at", () => {
  beforeEach(() => {
    $project.set({ id: "current_project" } as Project);
    $styleSourceSelections.set(new Map());
    $styleSources.set(new Map());
    $breakpoints.set(new Map());
    $styles.set(new Map());
    $dataSources.set(new Map());
    $resources.set(new Map());
    $props.set(new Map());
    $assets.set(new Map());
  });

  test("insert multiple instances", async () => {
    $instances.set(renderData(<Body ws:id="bodyId"></Body>).instances);
    await insertWebstudioFragmentAt(
      renderTemplate(
        <>
          <ws.element ws:id="headingId" ws:tag="h1"></ws.element>
          <ws.element ws:id="paragraphId" ws:tag="p"></ws.element>
        </>
      ),
      {
        parentSelector: ["bodyId"],
        position: "end",
      }
    );
    expect($instances.get()).toEqual(
      renderData(
        <Body ws:id="bodyId">
          <ws.element ws:id={expect.any(String)} ws:tag="h1"></ws.element>
          <ws.element ws:id={expect.any(String)} ws:tag="p"></ws.element>
        </Body>
      ).instances
    );
  });

  test("allows legacy fragment warnings through the internal paste context", async () => {
    $pages.set(
      createDefaultPages({ homePageId: "homePageId", rootInstanceId: "bodyId" })
    );
    selectPage("homePageId");
    $instances.set(renderData(<Body ws:id="bodyId"></Body>).instances);
    const onContentModelWarnings = vi.fn();

    const inserted = insertWebstudioFragmentAt(
      renderTemplate(
        <ws.element ws:id="button" ws:tag="button">
          <ws.element ws:id="heading" ws:tag="h3" />
        </ws.element>
      ),
      { parentSelector: ["bodyId"], position: "end" },
      undefined,
      { allowContentModelWarnings: true, onContentModelWarnings }
    );

    expect(inserted).toBe(true);
    expect($instances.get().get("bodyId")?.children).toHaveLength(1);
    expect(onContentModelWarnings).toHaveBeenCalledWith([
      expect.objectContaining({
        message: "Placing <h3> element inside a <button> violates HTML spec.",
      }),
    ]);
  });

  test("returns false for empty fragments", async () => {
    expect(await insertWebstudioFragmentAt(createFragment({}))).toBe(false);
  });

  test("returns false for tokens-only fragments without a project", async () => {
    $project.set(undefined);

    expect(
      await insertWebstudioFragmentAt(
        createFragment({
          styleSources: [{ type: "token", id: "token", name: "Token" }],
        })
      )
    ).toBe(false);
  });

  test("inserts tokens-only fragments without an insert target", async () => {
    expect(
      await insertWebstudioFragmentAt(
        createFragment({
          styleSources: [{ type: "token", id: "token", name: "Token" }],
          styles: [
            {
              styleSourceId: "token",
              breakpointId: "base",
              property: "color",
              value: { type: "keyword", value: "red" },
            },
          ],
          breakpoints: [{ id: "base", label: "" }],
        })
      )
    ).toBe(true);

    expect(Array.from($styleSources.get().values())).toEqual([
      { type: "token", id: expect.any(String), name: "Token" },
    ]);
    expect(Array.from($styles.get().values())).toEqual([
      expect.objectContaining({
        property: "color",
        value: { type: "keyword", value: "red" },
      }),
    ]);
  });

  test("insert fragment after insertable", async () => {
    $instances.set(
      renderData(
        <Body ws:id="bodyId">
          <Box ws:id="boxId"></Box>
        </Body>
      ).instances
    );
    await insertWebstudioFragmentAt(
      renderTemplate(<ws.element ws:id="headingId" ws:tag="h1"></ws.element>),
      {
        parentSelector: ["boxId", "bodyId"],
        position: "after",
      }
    );
    expect($instances.get()).toEqual(
      renderData(
        <Body ws:id="bodyId">
          <Box ws:id="boxId"></Box>
          <ws.element ws:id={expect.any(String)} ws:tag="h1"></ws.element>
        </Body>
      ).instances
    );
  });

  test("insert fragment inside of body when configured to place after insertable", async () => {
    $instances.set(renderData(<Body ws:id="bodyId"></Body>).instances);
    await insertWebstudioFragmentAt(
      renderTemplate(<ws.element ws:id="headingId" ws:tag="h1"></ws.element>),
      {
        parentSelector: ["bodyId"],
        position: "after",
      }
    );
    expect($instances.get()).toEqual(
      renderData(
        <Body ws:id="bodyId">
          <ws.element ws:id={expect.any(String)} ws:tag="h1"></ws.element>
        </Body>
      ).instances
    );
  });

  test("reports unresolved explicit insert target", async () => {
    const toastError = vi.spyOn(toast, "error").mockImplementation(() => "");
    $instances.set(renderData(<Body ws:id="bodyId"></Body>).instances);

    expect(
      await insertWebstudioFragmentAt(
        renderTemplate(<ws.element ws:id="headingId" ws:tag="h1"></ws.element>),
        {
          parentSelector: ["missingId"],
          position: "end",
        }
      )
    ).toBe(false);

    expect(toastError).toHaveBeenCalledWith(
      "Cannot insert: the target no longer exists."
    );
    expect($instances.get()).toEqual(
      renderData(<Body ws:id="bodyId"></Body>).instances
    );
    toastError.mockRestore();
  });

  test("insert fragment into shared slot content", async () => {
    $project.set({ id: "current_project" } as Project);
    $instances.set(
      renderData(
        <Body ws:id="bodyId">
          <Slot ws:id="slot1">
            <Fragment ws:id="fragment">
              <Box ws:id="box"></Box>
            </Fragment>
          </Slot>
          <Slot ws:id="slot2">
            {/* same ids */}
            <Fragment ws:id="fragment">
              <Box ws:id="box"></Box>
            </Fragment>
          </Slot>
        </Body>
      ).instances
    );

    await insertWebstudioFragmentAt(
      renderTemplate(<ws.element ws:id="heading" ws:tag="h1"></ws.element>),
      {
        parentSelector: ["slot1", "bodyId"],
        position: "end",
      }
    );

    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: expect.any(String) },
    ]);
  });

  test("insert fragment into legacy shared slot content normalizes all occurrences", async () => {
    $project.set({ id: "current_project" } as Project);
    $instances.set(
      renderData(
        <Body ws:id="bodyId">
          <Slot ws:id="slot1">
            <Box ws:id="box"></Box>
          </Slot>
          <Slot ws:id="slot2">
            {/* same ids */}
            <Box ws:id="box"></Box>
          </Slot>
        </Body>
      ).instances
    );

    await insertWebstudioFragmentAt(
      renderTemplate(<ws.element ws:id="heading" ws:tag="h1"></ws.element>),
      {
        parentSelector: ["slot1", "bodyId"],
        position: "end",
      }
    );

    const fragmentId = expectSlotsShareFragment($instances.get(), [
      "slot1",
      "slot2",
    ]);
    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: fragmentId },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: fragmentId },
    ]);
    expect($instances.get().get(fragmentId ?? "")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: expect.any(String) },
    ]);
  });

  test("insert fragment after shared slot child", async () => {
    $project.set({ id: "current_project" } as Project);
    $instances.set(
      renderData(
        <Body ws:id="bodyId">
          <Slot ws:id="slot1">
            <Fragment ws:id="fragment">
              <Box ws:id="box"></Box>
            </Fragment>
          </Slot>
          <Slot ws:id="slot2">
            {/* same ids */}
            <Fragment ws:id="fragment">
              <Box ws:id="box"></Box>
            </Fragment>
          </Slot>
        </Body>
      ).instances
    );

    await insertWebstudioFragmentAt(
      renderTemplate(<ws.element ws:id="heading" ws:tag="h1"></ws.element>),
      {
        parentSelector: ["box", "fragment", "slot1", "bodyId"],
        position: "after",
      }
    );

    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: expect.any(String) },
    ]);
  });

  test("insert fragment after nested shared slot child", async () => {
    $project.set({ id: "current_project" } as Project);
    $instances.set(
      renderData(
        <Body ws:id="bodyId">
          <Slot ws:id="slot1">
            <Fragment ws:id="fragment">
              <ws.element ws:id="div" ws:tag="div">
                <Box ws:id="box"></Box>
              </ws.element>
            </Fragment>
          </Slot>
          <Slot ws:id="slot2">
            {/* same ids */}
            <Fragment ws:id="fragment">
              <ws.element ws:id="div" ws:tag="div">
                <Box ws:id="box"></Box>
              </ws.element>
            </Fragment>
          </Slot>
        </Body>
      ).instances
    );

    await insertWebstudioFragmentAt(
      renderTemplate(<ws.element ws:id="heading" ws:tag="h1"></ws.element>),
      {
        parentSelector: ["box", "div", "fragment", "slot1", "bodyId"],
        position: "after",
      }
    );

    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "div" },
    ]);
    expect($instances.get().get("div")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: expect.any(String) },
    ]);
  });
});

describe("insert webstudio component at", () => {
  beforeEach(() => {
    $project.set({ id: "current_project" } as Project);
    $pages.set(
      createDefaultPages({ homePageId: "homePageId", rootInstanceId: "bodyId" })
    );
    selectPage("homePageId");
    $instances.set(renderData(<Body ws:id="bodyId"></Body>).instances);
    $styleSourceSelections.set(new Map());
    $styleSources.set(new Map());
    $breakpoints.set(new Map());
    $styles.set(new Map());
    $dataSources.set(new Map());
    $resources.set(new Map());
    $props.set(new Map());
    $assets.set(new Map());
  });

  test("inserts a File Input and keeps its upload controls after reopening saved props", async () => {
    const previousTemplates = $registeredTemplates.get();
    $registeredTemplates.set(
      new Map([
        [
          "file_input",
          {
            category: "forms",
            template: renderTemplate(
              (coreTemplates as Record<string, TemplateMeta>).file_input
                .template,
              undefined,
              [],
              {
                componentIds,
                componentMetas: defaultMetasMap,
              }
            ),
          },
        ],
      ])
    );
    try {
      expect(
        await insertWebstudioComponentAt("file_input", {
          parentSelector: ["bodyId"],
          position: "end",
        })
      ).toBe(true);
      const child = $instances.get().get("bodyId")?.children[0];
      const inputId = child?.type === "id" ? child.value : "";
      expect($instances.get().get(inputId)).toMatchObject({
        component: elementComponent,
        tag: "input",
        label: "File Input",
      });
      const configuredProps = new Map($props.get());
      const nameProp = Array.from(configuredProps.values()).find(
        ({ instanceId, name }) => instanceId === inputId && name === "name"
      );
      if (nameProp?.type !== "string") {
        throw new Error("Expected a named file input");
      }
      configuredProps.set(nameProp.id, { ...nameProp, value: "attachments" });
      for (const prop of [
        {
          id: "upload-accept",
          instanceId: inputId,
          name: "accept",
          type: "string" as const,
          value: "image/*,.pdf",
        },
        ...(["required", "multiple"] as const).map((name) => ({
          id: `upload-${name}`,
          instanceId: inputId,
          name,
          type: "boolean" as const,
          value: true,
        })),
      ]) {
        configuredProps.set(prop.id, prop);
      }
      $props.set(configuredProps);
      const savedProps = new Map(
        JSON.parse(JSON.stringify(Array.from($props.get()))) as Array<
          [string, Prop]
        >
      );
      $props.set(savedProps);
      expect(
        Array.from(savedProps.values())
          .filter(({ instanceId }) => instanceId === inputId)
          .map(({ name, value }) => [name, value])
      ).toEqual(
        expect.arrayContaining([
          ["type", "file"],
          ["name", "attachments"],
          ["accept", "image/*,.pdf"],
          ["required", true],
          ["multiple", true],
        ])
      );
      selectInstance([inputId, "bodyId"]);
      expect(Array.from($selectedInstanceInitialPropNames.get())).toEqual(
        expect.arrayContaining([
          "type",
          "name",
          "required",
          "accept",
          "multiple",
        ])
      );
    } finally {
      $registeredTemplates.set(previousTemplates);
    }
  });

  test("inserts the Forms tile as a contact form with two Email actions", async () => {
    const previousTemplates = $registeredTemplates.get();
    $registeredTemplates.set(
      new Map([
        [
          "form",
          {
            category: "forms",
            template: renderTemplate(
              coreTemplates.form.template,
              undefined,
              [],
              {
                componentIds,
                componentMetas: defaultMetasMap,
              }
            ),
          },
        ],
      ])
    );

    try {
      expect(
        await insertWebstudioComponentAt("form", {
          parentSelector: ["bodyId"],
          position: "end",
        })
      ).toBe(true);

      const body = $instances.get().get("bodyId");
      const formId =
        body?.children[0]?.type === "id" ? body.children[0].value : "";
      expect($instances.get().get(formId)?.component).toBe("NativeForm");
      const formProps = Array.from($props.get().values()).filter(
        ({ instanceId }) => instanceId === formId
      );
      const action = formProps.find(({ name }) => name === "action");
      expect(action?.type).toBe("json");
      if (action?.type !== "json") {
        throw new Error("Expected configured Form actions");
      }
      if (!isFormSubmission(action.value)) {
        throw new Error("Expected valid Form actions");
      }
      expect(action.value).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ enabled: true }),
          expect.objectContaining({ enabled: true }),
        ])
      );
      expect(action.value).toHaveLength(2);
      expect(
        action.value.map(
          ({ dataSourceId }: { dataSourceId: string }) =>
            $dataSources.get().get(dataSourceId)?.scopeInstanceId
        )
      ).toEqual([formId, formId]);
      expect(formProps.some(({ name }) => name === "onStateChange")).toBe(true);
      const resultProp = formProps.find(
        ({ name }) => name === "onResultChange"
      );
      expect(resultProp?.type).toBe("action");
      if (resultProp?.type !== "action") {
        throw new Error("Expected a Form result action");
      }
      const [resultAction] = resultProp.value;
      expect(resultAction?.type).toBe("execute");
      if (resultAction?.type !== "execute") {
        throw new Error("Expected an executable Form result action");
      }
      expect(
        lintExpression({
          expression: resultAction.code,
          allowAssignment: true,
          availableVariables: new Set([
            "result",
            ...Array.from($dataSources.get().keys()).map(
              encodeDataSourceVariable
            ),
          ]),
        })
      ).toEqual([]);
      for (const name of ["results", "errors"]) {
        expect(
          Array.from($dataSources.get().values()).some(
            (dataSource) =>
              dataSource.type === "variable" && dataSource.name === name
          )
        ).toBe(true);
      }
      const result = {
        success: false,
        status: 502,
        results: [{ resourceId: "first", status: 200, body: "ok" }],
        errors: [
          {
            resourceId: "second",
            status: 502,
            body: "failed",
            message: "failed",
          },
        ],
      };
      await vi.waitFor(() => {
        expect(
          $propValuesByInstanceSelector
            .get()
            .get(getInstanceKey([formId, "bodyId"]))
            ?.get("onResultChange")
        ).toBeTypeOf("function");
      });
      const onResultChange = $propValuesByInstanceSelector
        .get()
        .get(getInstanceKey([formId, "bodyId"]))
        ?.get("onResultChange") as (value: unknown) => void;
      onResultChange(result);
      const variables = new Map(
        Array.from($dataSources.get().values())
          .filter((dataSource) => dataSource.type === "variable")
          .map((dataSource) => [
            dataSource.name,
            $dataSourceVariables.get().get(dataSource.id),
          ])
      );
      expect(variables.has("status")).toBe(false);
      expect(variables.get("results")).toBe(result.results);
      expect(variables.get("errors")).toBe(result.errors);
      for (const child of $instances.get().get(formId)?.children ?? []) {
        if (child.type !== "id") {
          continue;
        }
        const availableNames = findAvailableVariables({
          startingInstanceId: child.value,
          instances: $instances.get(),
          dataSources: $dataSources.get(),
        }).map(({ name }) => name);
        expect(availableNames).toEqual(
          expect.arrayContaining(["results", "errors"])
        );
      }
      for (const name of ["formData", "browserInfo"]) {
        const prop = formProps.find((prop) => prop.name === name);
        expect(prop?.type).toBe("parameter");
        if (prop?.type === "parameter") {
          expect($dataSources.get().get(prop.value)).toMatchObject({
            type: "parameter",
            name,
            scopeInstanceId: formId,
          });
        }
      }
      const childIds = Array.from($instances.get().values())
        .filter(
          ({ component }) =>
            component === "Input" ||
            component === "Textarea" ||
            component === "Button"
        )
        .map(({ id }) => id);
      expect(
        Array.from($props.get().values())
          .filter(
            ({ instanceId, name }) =>
              childIds.includes(instanceId) && name === "name"
          )
          .map(({ value }) => value)
      ).toEqual(["name", "email", "subject", "message"]);
      expect(
        Array.from($props.get().values()).some(
          ({ instanceId, name, value }) =>
            childIds.includes(instanceId) &&
            name === "type" &&
            value === "submit"
        )
      ).toBe(true);

      expect(
        await insertWebstudioComponentAt("form", {
          parentSelector: ["bodyId"],
          position: "end",
        })
      ).toBe(true);
      const secondFormChild = $instances.get().get("bodyId")?.children[1];
      const secondFormId =
        secondFormChild?.type === "id" ? secondFormChild.value : "";
      expect(secondFormId).not.toBe(formId);
      const secondAction = Array.from($props.get().values()).find(
        ({ instanceId, name }) =>
          instanceId === secondFormId && name === "action"
      );
      expect(secondAction?.type).toBe("json");
      if (secondAction?.type === "json") {
        if (!isFormSubmission(secondAction.value)) {
          throw new Error("Expected valid Form actions");
        }
        expect(secondAction.value).toHaveLength(2);
        expect(
          secondAction.value.map(
            ({ dataSourceId }: { dataSourceId: string }) =>
              $dataSources.get().get(dataSourceId)?.scopeInstanceId
          )
        ).toEqual([secondFormId, secondFormId]);
      }
    } finally {
      $registeredTemplates.set(previousTemplates);
    }
  });

  test("inserts component through runtime template application", async () => {
    expect(
      await insertWebstudioComponentAt("Form", {
        parentSelector: ["bodyId"],
        position: "end",
      })
    ).toBe(true);

    const body = $instances.get().get("bodyId");
    const formId =
      body?.children[0]?.type === "id" ? body.children[0].value : "";
    const form = $instances.get().get(formId);
    expect(form).toEqual({
      type: "instance",
      id: formId,
      component: "Form",
      children: expect.any(Array),
    });
  });

  test("reports rejected MDX insertion without changing instances", async () => {
    const instances = $instances.get();
    instances.get("bodyId")!.children = [{ type: "id", value: "block" }];
    instances.set("block", {
      type: "instance",
      id: "block",
      component: blockComponent,
      children: [{ type: "id", value: "mdx" }],
    });
    instances.set("mdx", {
      type: "instance",
      id: "mdx",
      component: blockBodyComponent,
      children: [],
    });
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
    const original = structuredClone(instances);
    const notify = vi.spyOn(toast, "error");
    try {
      expect(
        await insertWebstudioComponentAt("Form", {
          parentSelector: ["mdx", "block", "bodyId"],
          position: "end",
        })
      ).toBe(false);
      expect(notify).toHaveBeenCalledOnce();
      expect($instances.get()).toEqual(original);
    } finally {
      notify.mockRestore();
    }
  });
});

describe("find closest insertable", () => {
  const newBoxFragment = createFragment({
    children: [{ type: "id", value: "newBoxId" }],
    instances: [
      { type: "instance", id: "newBoxId", component: "Box", children: [] },
    ],
  });

  beforeEach(() => {
    $pages.set(
      createDefaultPages({
        homePageId: "homePageId",
        rootInstanceId: "",
      })
    );
    $selectedPageId.set("homePageId");
    selectInstance(["collectionId[1]", "collectionId", "bodyId"]);
    $registeredComponentMetas.set(defaultMetasMap);
  });

  test("returns undefined without a selected page", () => {
    $selectedPageId.set(undefined);

    expect(findClosestInsertable(newBoxFragment)).toBeUndefined();
  });

  test("puts in the end if closest instance is container", () => {
    const { instances } = renderData(
      <Body ws:id="bodyId">
        <Box ws:id="boxId">
          <Paragraph ws:id="paragraphId">
            <Bold ws:id="boldId"></Bold>
          </Paragraph>
        </Box>
      </Body>
    );
    $instances.set(instances);
    selectInstance(["boxId", "bodyId"]);
    expect(findClosestInsertable(newBoxFragment)).toEqual({
      parentSelector: ["boxId", "bodyId"],
      position: "end",
    });
  });

  test("puts in the end of root instance", () => {
    const { instances } = renderData(
      <Body ws:id="bodyId">
        <Paragraph ws:id="paragraphId"></Paragraph>
      </Body>
    );
    $instances.set(instances);
    selectInstance(["bodyId"]);
    expect(findClosestInsertable(newBoxFragment)).toEqual({
      parentSelector: ["bodyId"],
      position: "end",
    });
  });

  test("puts in the end of root instance when page root only has text", () => {
    const { instances } = renderData(<Body ws:id="bodyId">text</Body>);
    $instances.set(instances);
    selectInstance(["bodyId"]);
    expect(findClosestInsertable(newBoxFragment)).toEqual({
      parentSelector: ["bodyId"],
      position: "end",
    });
  });

  test("finds closest container and puts after its child within selection", () => {
    const { instances } = renderData(
      <Body ws:id="bodyId">
        <Paragraph ws:id="paragraphId">
          <Bold ws:id="boldId"></Bold>
        </Paragraph>
      </Body>
    );
    $instances.set(instances);
    selectInstance(["boldId", "paragraphId", "bodyId"]);
    expect(findClosestInsertable(newBoxFragment)).toEqual({
      parentSelector: ["bodyId"],
      position: 1,
    });
  });

  test("finds closest container that doesn't have an expression as a child", () => {
    const { instances } = renderData(
      <Body ws:id="bodyId">
        <Box ws:id="box1Id"></Box>
        <Paragraph ws:id="paragraphId">{expression`"bla"`}</Paragraph>
        <Box ws:id="box2Id"></Box>
      </Body>
    );
    $instances.set(instances);
    selectInstance(["paragraphId", "bodyId"]);
    expect(findClosestInsertable(newBoxFragment)).toEqual({
      parentSelector: ["bodyId"],
      position: 2,
    });
  });

  test("finds closest container without textual placeholder", () => {
    const { instances } = renderData(
      <Body ws:id="bodyId">
        <Paragraph ws:id="paragraphId"></Paragraph>
      </Body>
    );
    $instances.set(instances);
    selectInstance(["paragraphId", "bodyId"]);
    expect(findClosestInsertable(newBoxFragment)).toEqual({
      parentSelector: ["bodyId"],
      position: 1,
    });
  });

  test("finds closest container even with when parent has placeholder", () => {
    const { instances } = renderData(
      <Body ws:id="bodyId">
        <Paragraph ws:id="paragraphId">
          <Image ws:id="imageId"></Image>
        </Paragraph>
      </Body>
    );
    $instances.set(instances);
    selectInstance(["imageId", "paragraphId", "bodyId"]);
    expect(
      findClosestInsertable(renderTemplate(<Box ws:tag="span"></Box>))
    ).toEqual({
      parentSelector: ["paragraphId", "bodyId"],
      position: 1,
    });
  });

  test("forbids inserting into :root", () => {
    const { instances } = renderData(<Body ws:id="bodyId"></Body>);
    $instances.set(instances);
    selectInstance([":root"]);
    expect(findClosestInsertable(newBoxFragment)).toEqual(undefined);
  });

  test("allow inserting into collection item", () => {
    const { instances } = renderData(
      <Body ws:id="bodyId">
        <ws.collection ws:id="collectionId">
          <Box ws:id="boxId"></Box>
        </ws.collection>
      </Body>
    );
    $instances.set(instances);
    selectInstance(["collectionId[1]", "collectionId", "bodyId"]);
    expect(findClosestInsertable(newBoxFragment)).toEqual({
      parentSelector: ["collectionId", "bodyId"],
      position: "end",
    });
  });

  test("prevents inserting list item in body when validation fails", () => {
    const { instances } = renderData(<Body ws:id="bodyId"></Body>);
    $instances.set(instances);
    selectInstance(["bodyId"]);
    const newListItemFragment = renderTemplate(
      <ListItem ws:id="newListItemId"></ListItem>
    );
    expect(findClosestInsertable(newListItemFragment)).toBeUndefined();
  });
});

describe("getComponentTemplateData", () => {
  test("returns registered template data when available", () => {
    const template = createFragment({
      children: [{ type: "id", value: "template-root" }],
      instances: [
        {
          type: "instance",
          id: "template-root",
          component: "Box",
          children: [],
        },
      ],
    });
    $registeredTemplates.set(
      new Map([
        [
          "Template",
          {
            category: "general",
            order: 0,
            template,
          },
        ],
      ])
    );

    expect(getComponentTemplateData("Template")).toBe(template);
  });

  test("builds fallback fragment for component names", () => {
    $registeredTemplates.set(new Map());

    const fragment = getComponentTemplateData("Box");

    expect(fragment.children).toEqual([
      { type: "id", value: expect.any(String) },
    ]);
    expect(fragment.instances).toEqual([
      {
        type: "instance",
        id: fragment.children[0].value,
        component: "Box",
        children: [],
      },
    ]);
  });
});

test("binds an Image template source to an asset without mutating the template", () => {
  const template = createFragment({
    children: [{ type: "id", value: "image" }],
    instances: [
      { type: "instance", id: "image", component: "Image", children: [] },
    ],
    props: [
      {
        id: "source",
        instanceId: "image",
        name: "src",
        type: "string",
        value: "placeholder.png",
      },
      {
        id: "alt",
        instanceId: "image",
        name: "alt",
        type: "string",
        value: "Placeholder",
      },
    ],
  });
  $registeredTemplates.set(
    new Map([["Image", { category: "media", order: 0, template }]])
  );

  const fragment = getImageAssetFragment("asset-id");

  expect(fragment.props).toEqual([
    {
      id: "source",
      instanceId: "image",
      name: "src",
      type: "asset",
      value: "asset-id",
    },
    template.props[1],
  ]);
  expect(template.props[0]).toEqual(
    expect.objectContaining({ type: "string", value: "placeholder.png" })
  );
});

test("get undefined instead of instance path when no instances found", () => {
  expect(getInstancePath(["boxId"], new Map())).toEqual(undefined);
});

describe("insertWebstudioFragmentAt with conflictResolution", () => {
  beforeEach(() => {
    $project.set({ id: "project-id" } as Project);
  });

  test("uses conflictResolution='theirs' by default (creates new token with suffix)", async () => {
    // Existing project with a "primary" token (used by existing-box)
    const data = renderData(
      <Body ws:id="body">
        <Box
          ws:id="existing-box"
          ws:tokens={[
            token(
              "primary",
              css`
                color: blue;
              `
            ),
          ]}
        ></Box>
      </Body>
    );

    // Create fragment with token that has same name but different styles
    const fragment = renderTemplate(
      <ws.element
        ws:id="box"
        ws:tag="div"
        ws:tokens={[
          token(
            "primary",
            css`
              color: red;
            `
          ),
        ]}
      ></ws.element>
    );

    setDataStores(data);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);
    selectInstance(["body"]);

    // Insert without explicit conflictResolution (defaults to "theirs")
    await insertWebstudioFragmentAt(fragment, {
      parentSelector: ["body"],
      position: "end",
    });

    // The existing token should still have blue color (unchanged)
    const styles = Array.from($styles.get().values());
    const styleSources = Array.from($styleSources.get().values());
    const existingToken = styleSources.find(
      (s) => s.type === "token" && s.name === "primary"
    );
    const existingTokenStyle = styles.find(
      (s) =>
        s.styleSourceId === existingToken?.id &&
        s.property === "color" &&
        s.breakpointId === "base"
    );
    expect(existingTokenStyle?.value).toEqual({
      type: "keyword",
      value: "blue",
    });

    // A new token "primary-1" should be created with red color
    const newToken = styleSources.find(
      (s) => s.type === "token" && s.name === "primary-1"
    );
    expect(newToken).toBeDefined();
    const newTokenStyle = styles.find(
      (s) =>
        s.styleSourceId === newToken?.id &&
        s.property === "color" &&
        s.breakpointId === "base"
    );
    expect(newTokenStyle?.value).toEqual({ type: "keyword", value: "red" });
  });

  test("uses conflictResolution='ours' to keep existing token styles", async () => {
    // Existing project with a "primary" token (used by existing-box)
    const data = renderData(
      <Body ws:id="body">
        <Box
          ws:id="existing-box"
          ws:tokens={[
            token(
              "primary",
              css`
                color: blue;
              `
            ),
          ]}
        ></Box>
      </Body>
    );

    const fragment = renderTemplate(
      <ws.element
        ws:id="box"
        ws:tag="div"
        ws:tokens={[
          token(
            "primary",
            css`
              color: red;
            `
          ),
        ]}
      ></ws.element>
    );

    setDataStores(data);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);
    selectInstance(["body"]);

    // Insert with conflictResolution="ours" to keep existing styles
    await insertWebstudioFragmentAt(
      fragment,
      {
        parentSelector: ["body"],
        position: "end",
      },
      "ours"
    );

    // The existing token should still have blue color (kept original)
    const styles = Array.from($styles.get().values());
    const styleSources = Array.from($styleSources.get().values());
    const existingToken = styleSources.find(
      (s) => s.type === "token" && s.name === "primary"
    );
    const primaryTokenStyle = styles.find(
      (s) =>
        s.styleSourceId === existingToken?.id &&
        s.property === "color" &&
        s.breakpointId === "base"
    );
    expect(primaryTokenStyle?.value).toEqual({
      type: "keyword",
      value: "blue",
    });

    // No new token should be created
    const newToken = styleSources.find(
      (s) => s.type === "token" && s.name === "primary-1"
    );
    expect(newToken).toBeUndefined();
  });

  test("uses conflictResolution='merge' to merge styles (theirs overrides)", async () => {
    // Existing project with a "primary" token that has color and fontSize
    const data = renderData(
      <Body ws:id="body">
        <Box
          ws:id="existing-box"
          ws:tokens={[
            token(
              "primary",
              css`
                color: blue;
                font-size: 16px;
              `
            ),
          ]}
        ></Box>
      </Body>
    );

    // Fragment with same "primary" token but different color and new property
    const fragment = renderTemplate(
      <ws.element
        ws:id="box"
        ws:tag="div"
        ws:tokens={[
          token(
            "primary",
            css`
              color: red;
              font-weight: bold;
            `
          ),
        ]}
      ></ws.element>
    );

    setDataStores(data);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);
    selectInstance(["body"]);

    // Insert with conflictResolution="merge"
    await insertWebstudioFragmentAt(
      fragment,
      {
        parentSelector: ["body"],
        position: "end",
      },
      "merge"
    );

    // The existing token should now have red color (overridden by fragment)
    const styles = Array.from($styles.get().values());
    const styleSources = Array.from($styleSources.get().values());
    const existingToken = styleSources.find(
      (s) => s.type === "token" && s.name === "primary"
    );
    const colorStyle = styles.find(
      (s) =>
        s.styleSourceId === existingToken?.id &&
        s.property === "color" &&
        s.breakpointId === "base"
    );
    expect(colorStyle?.value).toEqual({ type: "keyword", value: "red" });

    // fontSize should still be there (not in fragment, so kept)
    const fontSizeStyle = styles.find(
      (s) =>
        s.styleSourceId === existingToken?.id &&
        s.property === "fontSize" &&
        s.breakpointId === "base"
    );
    expect(fontSizeStyle?.value).toEqual({
      type: "unit",
      value: 16,
      unit: "px",
    });

    // fontWeight should be added from fragment
    const fontWeightStyle = styles.find(
      (s) =>
        s.styleSourceId === existingToken?.id &&
        s.property === "fontWeight" &&
        s.breakpointId === "base"
    );
    expect(fontWeightStyle?.value).toEqual({ type: "keyword", value: "bold" });

    // No new token should be created
    const newToken = styleSources.find(
      (s) => s.type === "token" && s.name === "primary-1"
    );
    expect(newToken).toBeUndefined();
  });
});
