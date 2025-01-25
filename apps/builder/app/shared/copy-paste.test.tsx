import { expect, test } from "vitest";
import stripIndent from "strip-indent";
import { createRegularStyleSheet } from "@webstudio-is/css-engine";
import { createDefaultPages } from "@webstudio-is/project-build";
import { ROOT_INSTANCE_ID, type WebstudioData } from "@webstudio-is/sdk";
import { $, ws, css, renderData } from "@webstudio-is/template";
import type { Project } from "@webstudio-is/project";
import {
  extractWebstudioFragment,
  insertWebstudioFragmentCopy,
} from "./instance-utils";
import { $project } from "./nano-states";

$project.set({ id: "current_project" } as Project);

const createStub = (element: JSX.Element) => {
  const project = {
    pages: createDefaultPages({ rootInstanceId: "", systemDataSourceId: "" }),
    ...renderData(element),
  };
  // global root instance is never stored in data
  project.instances.delete(ROOT_INSTANCE_ID);
  return project;
};

const toCss = (data: WebstudioData) => {
  const sheet = createRegularStyleSheet();
  sheet.addMediaRule("base");
  for (const { instanceId, values } of data.styleSourceSelections.values()) {
    for (const styleSourceId of values) {
      const styleSource = data.styleSources.get(styleSourceId);
      let name;
      if (styleSource?.type === "local") {
        name = `${instanceId}:local`;
      }
      if (styleSource?.type === "token") {
        name = `${instanceId}:token(${styleSource.name})`;
      }
      if (name) {
        const rule = sheet.addNestingRule(name);
        for (const styleDecl of data.styles.values()) {
          rule.setDeclaration({
            breakpoint: styleDecl.breakpointId,
            selector: styleDecl.state ?? "",
            property: styleDecl.property,
            value: styleDecl.value,
          });
        }
      }
    }
  }
  return sheet.cssText;
};

test("should add :root local styles", () => {
  const oldProject = createStub(
    <ws.root
      ws:id={ROOT_INSTANCE_ID}
      ws:style={css`
        color: red;
      `}
    >
      <$.Body></$.Body>
    </ws.root>
  );
  const newProject = createStub(<$.Body></$.Body>);
  const fragment = extractWebstudioFragment(oldProject, ROOT_INSTANCE_ID);
  insertWebstudioFragmentCopy({
    data: newProject,
    fragment,
    availableDataSources: new Set(),
  });
  expect(toCss(newProject)).toEqual(
    stripIndent(`
        @media all {
          :root:local {
            color: red
          }
        }
      `).trim()
  );
});

test("should merge :root local styles", () => {
  const oldProject = createStub(
    <ws.root
      ws:id={ROOT_INSTANCE_ID}
      ws:style={css`
        color: red;
      `}
    >
      <$.Body></$.Body>
    </ws.root>
  );
  const newProject = createStub(
    <ws.root
      ws:id={ROOT_INSTANCE_ID}
      ws:style={css`
        font-size: medium;
      `}
    >
      <$.Body></$.Body>
    </ws.root>
  );
  const fragment = extractWebstudioFragment(oldProject, ROOT_INSTANCE_ID);
  insertWebstudioFragmentCopy({
    data: newProject,
    fragment,
    availableDataSources: new Set(),
  });
  expect(toCss(newProject)).toEqual(
    stripIndent(`
      @media all {
        :root:local {
          font-size: medium;
          color: red
        }
      }
    `).trim()
  );
});

test("should copy local styles of duplicated instance", () => {
  const project = createStub(
    <$.Body>
      <$.Box
        ws:id="boxId"
        ws:style={css`
          color: red;
        `}
      ></$.Box>
    </$.Body>
  );
  const fragment = extractWebstudioFragment(project, "boxId");
  expect(Array.from(project.styles.values())).toEqual([
    expect.objectContaining({
      property: "color",
      value: { type: "keyword", value: "red" },
    }),
  ]);
  insertWebstudioFragmentCopy({
    data: project,
    fragment,
    availableDataSources: new Set(),
  });
  expect(Array.from(project.styles.values())).toEqual([
    expect.objectContaining({
      property: "color",
      value: { type: "keyword", value: "red" },
    }),
    expect.objectContaining({
      property: "color",
      value: { type: "keyword", value: "red" },
    }),
  ]);
});
