import { describe, expect, test } from "vitest";
import { $, ws, renderData, renderTemplate } from "@webstudio-is/template";
import { ROOT_INSTANCE_ID } from "@webstudio-is/sdk";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import {
  findClosestInsertTarget,
  findElementTagForInsertTarget,
  getDefaultElementInsertTarget,
  resolveComponentInsertTarget,
  resolveFragmentInsertTarget,
  resolveInsertTargetPosition,
} from "./insert-target";
import { getComponentTemplates } from "./component-templates";
import { builderRuntimeContext } from "./context";

const emptyProps = new Map();

describe("insert target", () => {
  test("resolves default target after a selected textual container", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <ws.element ws:id="div" ws:tag="div">
          text
        </ws.element>
        <ws.element ws:id="span" ws:tag="span"></ws.element>
      </$.Body>
    );

    expect(
      getDefaultElementInsertTarget({
        instances: data.instances,
        props: emptyProps,
        metas: componentMetas,
        instanceSelector: ["div", "body"],
      })
    ).toEqual({ parentSelector: ["body"], position: 1 });
  });

  test("finds the first valid html tag for an element target", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <ws.element ws:id="list" ws:tag="ul"></ws.element>
      </$.Body>
    );

    expect(
      findElementTagForInsertTarget({
        instances: data.instances,
        props: emptyProps,
        metas: componentMetas,
        insertTarget: { parentSelector: ["list", "body"], position: "end" },
      })
    ).toBe("li");
  });

  test("finds closest content-model-compatible insertion target", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.List ws:id="list">
          <$.ListItem ws:id="item"></$.ListItem>
        </$.List>
      </$.Body>
    );
    const fragment = renderTemplate(<$.Paragraph ws:id="paragraph" />);

    expect(
      findClosestInsertTarget({
        fragment,
        instances: data.instances,
        props: emptyProps,
        metas: componentMetas,
        rootInstanceId: "body",
        selectedInstanceSelector: ["item", "list", "body"],
      })
    ).toEqual({ parentSelector: ["body"], position: 1 });
  });

  test("keeps explicit matching target", () => {
    const data = renderData(<$.Body ws:id="body"></$.Body>);
    const fragment = renderTemplate(
      <ws.element ws:id="element" ws:tag="section" />
    );

    expect(
      findClosestInsertTarget({
        fragment,
        instances: data.instances,
        props: emptyProps,
        metas: componentMetas,
        rootInstanceId: "body",
        from: { parentSelector: ["body"], position: "end" },
      })
    ).toEqual({ parentSelector: ["body"], position: "end" });
  });

  test("reports global root target", () => {
    const data = renderData(<$.Body ws:id="body"></$.Body>);
    const fragment = renderTemplate(
      <ws.element ws:id="element" ws:tag="section" />
    );
    let didReportRootTarget = false;

    expect(
      findClosestInsertTarget({
        fragment,
        instances: data.instances,
        props: emptyProps,
        metas: componentMetas,
        rootInstanceId: "body",
        selectedInstanceSelector: [ROOT_INSTANCE_ID],
        onRootTarget: () => {
          didReportRootTarget = true;
        },
      })
    ).toBeUndefined();
    expect(didReportRootTarget).toBe(true);
  });

  test("finds default div tag for body insertion", () => {
    const data = renderData(<$.Body ws:id="body"></$.Body>);

    expect(
      findElementTagForInsertTarget({
        instances: data.instances,
        props: emptyProps,
        metas: componentMetas,
        insertTarget: { parentSelector: ["body"], position: "end" },
      })
    ).toBe("div");
  });

  test("normalizes after position to the next sibling index", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="first"></$.Box>
        <$.Box ws:id="second"></$.Box>
      </$.Body>
    );

    expect(
      resolveInsertTargetPosition({
        insertTarget: { parentSelector: ["first", "body"], position: "after" },
        instancePath: [
          {
            instance: data.instances.get("first")!,
            instanceSelector: ["first", "body"],
          },
          {
            instance: data.instances.get("body")!,
            instanceSelector: ["body"],
          },
        ],
      })
    ).toEqual({ parentSelector: ["body"], position: 1 });
  });

  test("normalizes after position on root selection to end", () => {
    const data = renderData(<$.Body ws:id="body"></$.Body>);

    expect(
      resolveInsertTargetPosition({
        insertTarget: { parentSelector: ["body"], position: "after" },
        instancePath: [
          {
            instance: data.instances.get("body")!,
            instanceSelector: ["body"],
          },
        ],
      })
    ).toEqual({ parentSelector: ["body"], position: "end" });
  });

  test("resolves component target with template-aware matching", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.List ws:id="list">
          <$.ListItem ws:id="item"></$.ListItem>
        </$.List>
      </$.Body>
    );

    expect(
      resolveComponentInsertTarget({
        component: "Paragraph",
        templates: getComponentTemplates(),
        context: builderRuntimeContext,
        instances: data.instances,
        props: emptyProps,
        metas: componentMetas,
        rootInstanceId: "body",
        selectedInstanceSelector: ["item", "list", "body"],
      })
    ).toMatchObject({
      parentInstanceId: "body",
      parentSelector: ["body"],
      insertIndex: 1,
    });
  });

  test("resolves element target with matching html tag", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <ws.element ws:id="list" ws:tag="ul"></ws.element>
      </$.Body>
    );

    expect(
      resolveComponentInsertTarget({
        component: "ws:element",
        templates: getComponentTemplates(),
        context: builderRuntimeContext,
        instances: data.instances,
        props: emptyProps,
        metas: componentMetas,
        rootInstanceId: "body",
        selectedInstanceSelector: ["list", "body"],
        from: { parentSelector: ["list", "body"], position: "end" },
      })
    ).toMatchObject({
      parentInstanceId: "list",
      parentSelector: ["list", "body"],
      tag: "li",
    });
  });

  test("reports missing resolved target", () => {
    const fragment = renderTemplate(<$.Paragraph ws:id="paragraph" />);
    let didReportMissingTarget = false;

    expect(
      resolveFragmentInsertTarget({
        fragment,
        instances: new Map(),
        props: emptyProps,
        metas: componentMetas,
        rootInstanceId: "body",
        from: { parentSelector: ["body"], position: "end" },
        onMissingTarget: () => {
          didReportMissingTarget = true;
        },
      })
    ).toBeUndefined();
    expect(didReportMissingTarget).toBe(true);
  });
});
