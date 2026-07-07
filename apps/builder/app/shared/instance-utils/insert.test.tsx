import {
  findClosestInsertable,
  getComponentTemplateData,
  insertWebstudioFragmentAt,
} from "./insert";
import {
  insertInstanceChildrenMutable,
  insertWebstudioElementAt,
} from "./insert";
import { enableMapSet } from "immer";
import { describe, test, expect, beforeEach, vi } from "vitest";
import { toast } from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  $,
  ws,
  css,
  expression,
  renderTemplate,
  renderData,
  token,
} from "@webstudio-is/template";
import * as defaultMetas from "@webstudio-is/sdk-components-react/metas";
import type { WebstudioData, WebstudioFragment } from "@webstudio-is/sdk";
import { coreMetas, elementComponent } from "@webstudio-is/sdk";
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
import { getInstancePath } from "../nano-states";
import { selectPage } from "../nano-states";
import { selectInstance } from "../nano-states";
import { $selectedPageId } from "../nano-states/pages";
import { expectSlotsShareFragment } from "../slot-test-utils";

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

describe("insert instance children", () => {
  test("insert instance children into empty target", () => {
    const data = renderData(
      <ws.element ws:tag="body" ws:id="bodyId"></ws.element>
    );
    const [div] = renderTemplate(
      <ws.element ws:tag="div" ws:id="divId"></ws.element>
    ).instances;
    data.instances.set(div.id, div);
    insertInstanceChildrenMutable(data, [{ type: "id", value: "divId" }], {
      parentSelector: ["bodyId"],
      position: "end",
    });
    expect(data).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="div" ws:id="divId"></ws.element>
        </ws.element>
      )
    );
  });

  test("insert instance children into the end of target", () => {
    const data = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <ws.element ws:tag="div" ws:id="textId"></ws.element>
      </ws.element>
    );
    const [div] = renderTemplate(
      <ws.element ws:tag="div" ws:id="divId"></ws.element>
    ).instances;
    data.instances.set(div.id, div);
    insertInstanceChildrenMutable(data, [{ type: "id", value: "divId" }], {
      parentSelector: ["bodyId"],
      position: "end",
    });
    expect(data).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="div" ws:id="textId"></ws.element>
          <ws.element ws:tag="div" ws:id="divId"></ws.element>
        </ws.element>
      )
    );
  });

  test("insert instance children into legacy slot with direct children", () => {
    const data = renderData(
      <$.Body ws:id="bodyId">
        <$.Slot ws:id="slotId">
          <$.Box ws:id="boxId"></$.Box>
        </$.Slot>
      </$.Body>
    );
    const [div] = renderTemplate(
      <ws.element ws:tag="div" ws:id="divId"></ws.element>
    ).instances;
    data.instances.set(div.id, div);

    insertInstanceChildrenMutable(data, [{ type: "id", value: "divId" }], {
      parentSelector: ["slotId", "bodyId"],
      position: "end",
    });

    const fragmentId = data.instances.get("slotId")?.children[0]?.value;
    expect(data).toEqual(
      renderData(
        <$.Body ws:id="bodyId">
          <$.Slot ws:id="slotId">
            <$.Fragment ws:id={fragmentId}>
              <$.Box ws:id="boxId"></$.Box>
              <ws.element ws:tag="div" ws:id="divId"></ws.element>
            </$.Fragment>
          </$.Slot>
        </$.Body>
      )
    );
  });

  test("insert instance children into the start of target", () => {
    const data = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <ws.element ws:tag="div" ws:id="textId"></ws.element>
      </ws.element>
    );
    const [div] = renderTemplate(
      <ws.element ws:tag="div" ws:id="divId"></ws.element>
    ).instances;
    data.instances.set(div.id, div);
    insertInstanceChildrenMutable(data, [{ type: "id", value: "divId" }], {
      parentSelector: ["bodyId"],
      position: 0,
    });
    expect(data).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="div" ws:id="divId"></ws.element>
          <ws.element ws:tag="div" ws:id="textId"></ws.element>
        </ws.element>
      )
    );
  });

  test("insert instance children at the start of text", () => {
    const data = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <ws.element ws:tag="div" ws:id="textId">
          text
        </ws.element>
      </ws.element>
    );
    const [div] = renderTemplate(
      <ws.element ws:tag="div" ws:id="divId"></ws.element>
    ).instances;
    data.instances.set(div.id, div);
    insertInstanceChildrenMutable(data, [{ type: "id", value: "divId" }], {
      parentSelector: ["textId", "bodyId"],
      position: 0,
    });
    const [_bodyId, _textId, _divId, spanId] = data.instances.keys();
    expect(data).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="div" ws:id="textId">
            <ws.element ws:tag="div" ws:id="divId"></ws.element>
            <ws.element ws:tag="span" ws:id={spanId}>
              text
            </ws.element>
          </ws.element>
        </ws.element>
      )
    );
  });

  test("insert instance children at the end of text", () => {
    const data = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <ws.element ws:tag="div" ws:id="textId">
          text
        </ws.element>
      </ws.element>
    );
    const [div] = renderTemplate(
      <ws.element ws:tag="div" ws:id="divId"></ws.element>
    ).instances;
    data.instances.set(div.id, div);
    insertInstanceChildrenMutable(data, [{ type: "id", value: "divId" }], {
      parentSelector: ["textId", "bodyId"],
      position: "end",
    });
    const [_bodyId, _textId, _divId, spanId] = data.instances.keys();
    expect(data).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="div" ws:id="textId">
            <ws.element ws:tag="span" ws:id={spanId}>
              text
            </ws.element>
            <ws.element ws:tag="div" ws:id="divId"></ws.element>
          </ws.element>
        </ws.element>
      )
    );
  });

  test("insert instance children between text children", () => {
    const data = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <ws.element ws:tag="div" ws:id="textId">
          <ws.element ws:tag="strong" ws:id="strongId">
            strong
          </ws.element>
          text
          <ws.element ws:tag="em" ws:id="emId">
            emphasis
          </ws.element>
        </ws.element>
      </ws.element>
    );
    const [div] = renderTemplate(
      <ws.element ws:tag="div" ws:id="divId"></ws.element>
    ).instances;
    data.instances.set(div.id, div);
    insertInstanceChildrenMutable(data, [{ type: "id", value: "divId" }], {
      parentSelector: ["textId", "bodyId"],
      position: 1,
    });
    const [
      _bodyId,
      _textId,
      _strongId,
      _emId,
      _divId,
      leftSpanId,
      rightSpanId,
    ] = data.instances.keys();
    expect(data).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="div" ws:id="textId">
            <ws.element ws:tag="span" ws:id={leftSpanId}>
              <ws.element ws:tag="strong" ws:id="strongId">
                strong
              </ws.element>
            </ws.element>
            <ws.element ws:tag="div" ws:id="divId"></ws.element>
            <ws.element ws:tag="span" ws:id={rightSpanId}>
              text
              <ws.element ws:tag="em" ws:id="emId">
                emphasis
              </ws.element>
            </ws.element>
          </ws.element>
        </ws.element>
      )
    );
  });
});

describe("insert webstudio element at", () => {
  beforeEach(() => {
    $styleSourceSelections.set(new Map());
    $styleSources.set(new Map());
    $breakpoints.set(new Map());
    $styles.set(new Map());
    $dataSources.set(new Map());
    $resources.set(new Map());
    $props.set(new Map());
    $assets.set(new Map());
  });

  test("insert element with div tag into body", () => {
    $instances.set(renderData(<$.Body ws:id="bodyId"></$.Body>).instances);
    insertWebstudioElementAt({
      parentSelector: ["bodyId"],
      position: "end",
    });
    const [_bodyId, newInstanceId] = $instances.get().keys();
    expect($instances.get()).toEqual(
      renderData(
        <$.Body ws:id="bodyId">
          <ws.element ws:id={newInstanceId} ws:tag="div" />
        </$.Body>
      ).instances
    );
  });

  test("insert element with li tag into ul", () => {
    $instances.set(
      renderData(
        <$.Body ws:id="bodyId">
          <ws.element ws:id="listId" ws:tag="ul"></ws.element>
        </$.Body>
      ).instances
    );
    insertWebstudioElementAt({
      parentSelector: ["listId", "bodyId"],
      position: "end",
    });
    const [_bodyId, _listId, newInstanceId] = $instances.get().keys();
    expect($instances.get()).toEqual(
      renderData(
        <$.Body ws:id="bodyId">
          <ws.element ws:id="listId" ws:tag="ul">
            <ws.element ws:id={newInstanceId} ws:tag="li" />
          </ws.element>
        </$.Body>
      ).instances
    );
  });

  test("insert element into selected instance", () => {
    $pages.set(
      createDefaultPages({ homePageId: "homePageId", rootInstanceId: "bodyId" })
    );
    $instances.set(
      renderData(
        <$.Body ws:id="bodyId">
          <ws.element ws:id="divId" ws:tag="div"></ws.element>
        </$.Body>
      ).instances
    );
    selectPage("homePageId");
    selectInstance(["divId", "bodyId"]);
    insertWebstudioElementAt();
    const [_bodyId, _divId, newInstanceId] = $instances.get().keys();
    expect($instances.get()).toEqual(
      renderData(
        <$.Body ws:id="bodyId">
          <ws.element ws:id="divId" ws:tag="div">
            <ws.element ws:id={newInstanceId} ws:tag="div" />
          </ws.element>
        </$.Body>
      ).instances
    );
  });

  test("insert element into selected legacy slot with direct children", () => {
    $pages.set(
      createDefaultPages({ homePageId: "homePageId", rootInstanceId: "bodyId" })
    );
    $instances.set(
      renderData(
        <$.Body ws:id="bodyId">
          <$.Slot ws:id="slotId">
            <$.Box ws:id="boxId"></$.Box>
          </$.Slot>
        </$.Body>
      ).instances
    );
    selectPage("homePageId");
    selectInstance(["slotId", "bodyId"]);

    insertWebstudioElementAt();

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
        <$.Body ws:id="bodyId">
          <$.Slot ws:id="slotId">
            <$.Fragment ws:id={fragmentId}>
              <$.Box ws:id="boxId"></$.Box>
              <ws.element ws:id={newInstanceId} ws:tag="div" />
            </$.Fragment>
          </$.Slot>
        </$.Body>
      ).instances
    );
  });

  test("insert element into shared slot content", () => {
    $pages.set(
      createDefaultPages({ homePageId: "homePageId", rootInstanceId: "bodyId" })
    );
    $instances.set(
      renderData(
        <$.Body ws:id="bodyId">
          <$.Slot ws:id="slot1">
            <$.Fragment ws:id="fragment">
              <$.Box ws:id="box"></$.Box>
            </$.Fragment>
          </$.Slot>
          <$.Slot ws:id="slot2">
            {/* same ids */}
            <$.Fragment ws:id="fragment">
              <$.Box ws:id="box"></$.Box>
            </$.Fragment>
          </$.Slot>
        </$.Body>
      ).instances
    );
    selectPage("homePageId");
    selectInstance(["slot1", "bodyId"]);

    insertWebstudioElementAt();

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

  test("insert element at start of shared slot content", () => {
    $instances.set(
      renderData(
        <$.Body ws:id="bodyId">
          <$.Slot ws:id="slot1">
            <$.Fragment ws:id="fragment">
              <$.Box ws:id="box"></$.Box>
            </$.Fragment>
          </$.Slot>
          <$.Slot ws:id="slot2">
            {/* same ids */}
            <$.Fragment ws:id="fragment">
              <$.Box ws:id="box"></$.Box>
            </$.Fragment>
          </$.Slot>
        </$.Body>
      ).instances
    );

    insertWebstudioElementAt({
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

  test("insert element into nested shared slot content", () => {
    $pages.set(
      createDefaultPages({ homePageId: "homePageId", rootInstanceId: "bodyId" })
    );
    $instances.set(
      renderData(
        <$.Body ws:id="bodyId">
          <$.Slot ws:id="slot1">
            <$.Fragment ws:id="fragment">
              <ws.element ws:id="div" ws:tag="div"></ws.element>
            </$.Fragment>
          </$.Slot>
          <$.Slot ws:id="slot2">
            {/* same ids */}
            <$.Fragment ws:id="fragment">
              <ws.element ws:id="div" ws:tag="div"></ws.element>
            </$.Fragment>
          </$.Slot>
        </$.Body>
      ).instances
    );
    selectPage("homePageId");
    selectInstance(["div", "fragment", "slot1", "bodyId"]);

    insertWebstudioElementAt();

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

  test("insert element into closest non-textual container", () => {
    $pages.set(
      createDefaultPages({ homePageId: "homePageId", rootInstanceId: "bodyId" })
    );
    $instances.set(
      renderData(
        <$.Body ws:id="bodyId">
          <ws.element ws:id="divId" ws:tag="div">
            text
          </ws.element>
          <ws.element ws:id="spanId" ws:tag="span"></ws.element>
        </$.Body>
      ).instances
    );
    selectPage("homePageId");
    selectInstance(["divId", "bodyId"]);
    insertWebstudioElementAt();
    const [_bodyId, _divId, _spanId, newInstanceId] = $instances.get().keys();
    expect($instances.get()).toEqual(
      renderData(
        <$.Body ws:id="bodyId">
          <ws.element ws:id="divId" ws:tag="div">
            text
          </ws.element>
          <ws.element ws:id={newInstanceId} ws:tag="div" />
          <ws.element ws:id="spanId" ws:tag="span"></ws.element>
        </$.Body>
      ).instances
    );
  });

  test("insert element into closest non-empty container", () => {
    $pages.set(
      createDefaultPages({ homePageId: "homePageId", rootInstanceId: "bodyId" })
    );
    $instances.set(
      renderData(
        <$.Body ws:id="bodyId">
          <ws.element ws:id="imgId" ws:tag="img"></ws.element>
          <ws.element ws:id="spanId" ws:tag="span"></ws.element>
        </$.Body>
      ).instances
    );
    selectPage("homePageId");
    selectInstance(["imgId", "bodyId"]);
    insertWebstudioElementAt();
    const [_bodyId, _imgId, _spanId, newInstanceId] = $instances.get().keys();
    expect($instances.get()).toEqual(
      renderData(
        <$.Body ws:id="bodyId">
          <ws.element ws:id="imgId" ws:tag="img"></ws.element>
          <ws.element ws:id={newInstanceId} ws:tag="div" />
          <ws.element ws:id="spanId" ws:tag="span"></ws.element>
        </$.Body>
      ).instances
    );
  });

  test("reports unresolved explicit element insert target", () => {
    const toastError = vi.spyOn(toast, "error").mockImplementation(() => "");
    $instances.set(renderData(<$.Body ws:id="bodyId"></$.Body>).instances);

    expect(
      insertWebstudioElementAt({
        parentSelector: ["missingId"],
        position: "end",
      })
    ).toBe(false);

    expect(toastError).toHaveBeenCalledWith(
      "Cannot insert: the target no longer exists."
    );
    expect($instances.get()).toEqual(
      renderData(<$.Body ws:id="bodyId"></$.Body>).instances
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

  test("insert multiple instances", () => {
    $instances.set(renderData(<$.Body ws:id="bodyId"></$.Body>).instances);
    insertWebstudioFragmentAt(
      renderTemplate(
        <>
          <$.Heading ws:id="headingId"></$.Heading>
          <$.Paragraph ws:id="paragraphId"></$.Paragraph>
        </>
      ),
      {
        parentSelector: ["bodyId"],
        position: "end",
      }
    );
    expect($instances.get()).toEqual(
      renderData(
        <$.Body ws:id="bodyId">
          <$.Heading ws:id={expect.any(String)}></$.Heading>
          <$.Paragraph ws:id={expect.any(String)}></$.Paragraph>
        </$.Body>
      ).instances
    );
  });

  test("returns false for empty fragments", () => {
    expect(insertWebstudioFragmentAt(createFragment({}))).toBe(false);
  });

  test("returns false for tokens-only fragments without a project", () => {
    $project.set(undefined);

    expect(
      insertWebstudioFragmentAt(
        createFragment({
          styleSources: [{ type: "token", id: "token", name: "Token" }],
        })
      )
    ).toBe(false);
  });

  test("insert fragment after insertable", () => {
    $instances.set(
      renderData(
        <$.Body ws:id="bodyId">
          <$.Box ws:id="boxId"></$.Box>
        </$.Body>
      ).instances
    );
    insertWebstudioFragmentAt(
      renderTemplate(<$.Heading ws:id="headingId"></$.Heading>),
      {
        parentSelector: ["boxId", "bodyId"],
        position: "after",
      }
    );
    expect($instances.get()).toEqual(
      renderData(
        <$.Body ws:id="bodyId">
          <$.Box ws:id="boxId"></$.Box>
          <$.Heading ws:id={expect.any(String)}></$.Heading>
        </$.Body>
      ).instances
    );
  });

  test("insert fragment inside of body when configured to place after insertable", () => {
    $instances.set(renderData(<$.Body ws:id="bodyId"></$.Body>).instances);
    insertWebstudioFragmentAt(
      renderTemplate(<$.Heading ws:id="headingId"></$.Heading>),
      {
        parentSelector: ["bodyId"],
        position: "after",
      }
    );
    expect($instances.get()).toEqual(
      renderData(
        <$.Body ws:id="bodyId">
          <$.Heading ws:id={expect.any(String)}></$.Heading>
        </$.Body>
      ).instances
    );
  });

  test("reports unresolved explicit insert target", () => {
    const toastError = vi.spyOn(toast, "error").mockImplementation(() => "");
    $instances.set(renderData(<$.Body ws:id="bodyId"></$.Body>).instances);

    expect(
      insertWebstudioFragmentAt(
        renderTemplate(<$.Heading ws:id="headingId"></$.Heading>),
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
      renderData(<$.Body ws:id="bodyId"></$.Body>).instances
    );
    toastError.mockRestore();
  });

  test("insert fragment into shared slot content", () => {
    $project.set({ id: "current_project" } as Project);
    $instances.set(
      renderData(
        <$.Body ws:id="bodyId">
          <$.Slot ws:id="slot1">
            <$.Fragment ws:id="fragment">
              <$.Box ws:id="box"></$.Box>
            </$.Fragment>
          </$.Slot>
          <$.Slot ws:id="slot2">
            {/* same ids */}
            <$.Fragment ws:id="fragment">
              <$.Box ws:id="box"></$.Box>
            </$.Fragment>
          </$.Slot>
        </$.Body>
      ).instances
    );

    insertWebstudioFragmentAt(
      renderTemplate(<$.Heading ws:id="heading"></$.Heading>),
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

  test("insert fragment into legacy shared slot content normalizes all occurrences", () => {
    $project.set({ id: "current_project" } as Project);
    $instances.set(
      renderData(
        <$.Body ws:id="bodyId">
          <$.Slot ws:id="slot1">
            <$.Box ws:id="box"></$.Box>
          </$.Slot>
          <$.Slot ws:id="slot2">
            {/* same ids */}
            <$.Box ws:id="box"></$.Box>
          </$.Slot>
        </$.Body>
      ).instances
    );

    insertWebstudioFragmentAt(
      renderTemplate(<$.Heading ws:id="heading"></$.Heading>),
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

  test("insert fragment after shared slot child", () => {
    $project.set({ id: "current_project" } as Project);
    $instances.set(
      renderData(
        <$.Body ws:id="bodyId">
          <$.Slot ws:id="slot1">
            <$.Fragment ws:id="fragment">
              <$.Box ws:id="box"></$.Box>
            </$.Fragment>
          </$.Slot>
          <$.Slot ws:id="slot2">
            {/* same ids */}
            <$.Fragment ws:id="fragment">
              <$.Box ws:id="box"></$.Box>
            </$.Fragment>
          </$.Slot>
        </$.Body>
      ).instances
    );

    insertWebstudioFragmentAt(
      renderTemplate(<$.Heading ws:id="heading"></$.Heading>),
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

  test("insert fragment after nested shared slot child", () => {
    $project.set({ id: "current_project" } as Project);
    $instances.set(
      renderData(
        <$.Body ws:id="bodyId">
          <$.Slot ws:id="slot1">
            <$.Fragment ws:id="fragment">
              <ws.element ws:id="div" ws:tag="div">
                <$.Box ws:id="box"></$.Box>
              </ws.element>
            </$.Fragment>
          </$.Slot>
          <$.Slot ws:id="slot2">
            {/* same ids */}
            <$.Fragment ws:id="fragment">
              <ws.element ws:id="div" ws:tag="div">
                <$.Box ws:id="box"></$.Box>
              </ws.element>
            </$.Fragment>
          </$.Slot>
        </$.Body>
      ).instances
    );

    insertWebstudioFragmentAt(
      renderTemplate(<$.Heading ws:id="heading"></$.Heading>),
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
      <$.Body ws:id="bodyId">
        <$.Box ws:id="boxId">
          <$.Paragraph ws:id="paragraphId">
            <$.Bold ws:id="boldId"></$.Bold>
          </$.Paragraph>
        </$.Box>
      </$.Body>
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
      <$.Body ws:id="bodyId">
        <$.Paragraph ws:id="paragraphId"></$.Paragraph>
      </$.Body>
    );
    $instances.set(instances);
    selectInstance(["bodyId"]);
    expect(findClosestInsertable(newBoxFragment)).toEqual({
      parentSelector: ["bodyId"],
      position: "end",
    });
  });

  test("puts in the end of root instance when page root only has text", () => {
    const { instances } = renderData(<$.Body ws:id="bodyId">text</$.Body>);
    $instances.set(instances);
    selectInstance(["bodyId"]);
    expect(findClosestInsertable(newBoxFragment)).toEqual({
      parentSelector: ["bodyId"],
      position: "end",
    });
  });

  test("finds closest container and puts after its child within selection", () => {
    const { instances } = renderData(
      <$.Body ws:id="bodyId">
        <$.Paragraph ws:id="paragraphId">
          <$.Bold ws:id="boldId"></$.Bold>
        </$.Paragraph>
      </$.Body>
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
      <$.Body ws:id="bodyId">
        <$.Box ws:id="box1Id"></$.Box>
        <$.Paragraph ws:id="paragraphId">{expression`"bla"`}</$.Paragraph>
        <$.Box ws:id="box2Id"></$.Box>
      </$.Body>
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
      <$.Body ws:id="bodyId">
        <$.Paragraph ws:id="paragraphId"></$.Paragraph>
      </$.Body>
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
      <$.Body ws:id="bodyId">
        <$.Paragraph ws:id="paragraphId">
          <$.Image ws:id="imageId"></$.Image>
        </$.Paragraph>
      </$.Body>
    );
    $instances.set(instances);
    selectInstance(["imageId", "paragraphId", "bodyId"]);
    expect(
      findClosestInsertable(renderTemplate(<$.Box ws:tag="span"></$.Box>))
    ).toEqual({
      parentSelector: ["paragraphId", "bodyId"],
      position: 1,
    });
  });

  test("forbids inserting into :root", () => {
    const { instances } = renderData(<$.Body ws:id="bodyId"></$.Body>);
    $instances.set(instances);
    selectInstance([":root"]);
    expect(findClosestInsertable(newBoxFragment)).toEqual(undefined);
  });

  test("allow inserting into collection item", () => {
    const { instances } = renderData(
      <$.Body ws:id="bodyId">
        <ws.collection ws:id="collectionId">
          <$.Box ws:id="boxId"></$.Box>
        </ws.collection>
      </$.Body>
    );
    $instances.set(instances);
    selectInstance(["collectionId[1]", "collectionId", "bodyId"]);
    expect(findClosestInsertable(newBoxFragment)).toEqual({
      parentSelector: ["collectionId", "bodyId"],
      position: "end",
    });
  });

  test("prevents inserting list item in body when validation fails", () => {
    const { instances } = renderData(<$.Body ws:id="bodyId"></$.Body>);
    $instances.set(instances);
    selectInstance(["bodyId"]);
    const newListItemFragment = renderTemplate(
      <$.ListItem ws:id="newListItemId"></$.ListItem>
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

test("get undefined instead of instance path when no instances found", () => {
  expect(getInstancePath(["boxId"], new Map())).toEqual(undefined);
});

describe("insertWebstudioFragmentAt with conflictResolution", () => {
  beforeEach(() => {
    $project.set({ id: "project-id" } as Project);
  });

  test("uses conflictResolution='theirs' by default (creates new token with suffix)", () => {
    // Existing project with a "primary" token (used by existing-box)
    const data = renderData(
      <$.Body ws:id="body">
        <$.Box
          ws:id="existing-box"
          ws:tokens={[
            token(
              "primary",
              css`
                color: blue;
              `
            ),
          ]}
        ></$.Box>
      </$.Body>
    );

    // Create fragment with token that has same name but different styles
    const fragment = renderTemplate(
      <$.Box
        ws:id="box"
        ws:tokens={[
          token(
            "primary",
            css`
              color: red;
            `
          ),
        ]}
      ></$.Box>
    );

    setDataStores(data);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);
    selectInstance(["body"]);

    // Insert without explicit conflictResolution (defaults to "theirs")
    insertWebstudioFragmentAt(fragment, {
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

  test("uses conflictResolution='ours' to keep existing token styles", () => {
    // Existing project with a "primary" token (used by existing-box)
    const data = renderData(
      <$.Body ws:id="body">
        <$.Box
          ws:id="existing-box"
          ws:tokens={[
            token(
              "primary",
              css`
                color: blue;
              `
            ),
          ]}
        ></$.Box>
      </$.Body>
    );

    const fragment = renderTemplate(
      <$.Box
        ws:id="box"
        ws:tokens={[
          token(
            "primary",
            css`
              color: red;
            `
          ),
        ]}
      ></$.Box>
    );

    setDataStores(data);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);
    selectInstance(["body"]);

    // Insert with conflictResolution="ours" to keep existing styles
    insertWebstudioFragmentAt(
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

  test("uses conflictResolution='merge' to merge styles (theirs overrides)", () => {
    // Existing project with a "primary" token that has color and fontSize
    const data = renderData(
      <$.Body ws:id="body">
        <$.Box
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
        ></$.Box>
      </$.Body>
    );

    // Fragment with same "primary" token but different color and new property
    const fragment = renderTemplate(
      <$.Box
        ws:id="box"
        ws:tokens={[
          token(
            "primary",
            css`
              color: red;
              font-weight: bold;
            `
          ),
        ]}
      ></$.Box>
    );

    setDataStores(data);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);
    selectInstance(["body"]);

    // Insert with conflictResolution="merge"
    insertWebstudioFragmentAt(
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
