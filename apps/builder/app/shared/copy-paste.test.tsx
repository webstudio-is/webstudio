import { describe, expect, test } from "vitest";
import stripIndent from "strip-indent";
import { createRegularStyleSheet } from "@webstudio-is/css-engine";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  getStyleDeclKey,
  ROOT_INSTANCE_ID,
  type WebstudioData,
} from "@webstudio-is/sdk";
import {
  $,
  ws,
  css,
  renderData,
  type TemplateStyleDecl,
  expression,
  Variable,
  ResourceValue,
  ActionValue,
} from "@webstudio-is/template";
import type { Project } from "@webstudio-is/project";
import {
  extractWebstudioFragment,
  findAvailableDataSources,
  insertWebstudioFragmentCopy,
} from "./instance-utils";
import { $project } from "./nano-states";

const pages = createDefaultPages({
  rootInstanceId: "bodyId",
  systemDataSourceId: "",
});

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
          if (styleDecl.styleSourceId === styleSourceId) {
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
  }
  return sheet.cssText;
};

const insertStyles = ({
  data,
  breakpointId,
  styleSourceId,
  style,
}: {
  data: WebstudioData;
  breakpointId: string;
  styleSourceId: string;
  style: TemplateStyleDecl[];
}) => {
  for (const styleDecl of style) {
    const newStyleDecl = { breakpointId, styleSourceId, ...styleDecl };
    data.styles.set(getStyleDeclKey(newStyleDecl), newStyleDecl);
  }
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
  insertWebstudioFragmentCopy({
    data: project,
    fragment,
    availableDataSources: new Set(),
  });
  const newInstanceId = Array.from(project.instances.keys()).at(-1);
  expect(toCss(project)).toEqual(
    stripIndent(`
      @media all {
        boxId:local {
          color: red
        }
        ${newInstanceId}:local {
          color: red
        }
      }
    `).trim()
  );
  // modify original style
  insertStyles({
    data: project,
    breakpointId: "base",
    styleSourceId: project.styleSourceSelections.get("boxId")?.values[0] ?? "",
    style: css`
      font-size: medium;
    `,
  });
  expect(toCss(project)).toEqual(
    stripIndent(`
      @media all {
        boxId:local {
          color: red;
          font-size: medium
        }
        ${newInstanceId}:local {
          color: red
        }
      }
    `).trim()
  );
});

describe("variables", () => {
  test("extract variable", () => {
    const boxVariable = new Variable("Box Variable", "");
    const data = renderData(
      <$.Body ws:id="bodyId">
        <$.Box ws:id="boxId" vars={expression`${boxVariable}`}></$.Box>
      </$.Body>
    );
    const fragment = extractWebstudioFragment({ pages, ...data }, "boxId");
    expect(fragment.dataSources).toEqual([
      expect.objectContaining({ id: "0", type: "variable" }),
    ]);
    expect(fragment.props).toEqual([
      expect.objectContaining({
        instanceId: "boxId",
        value: "$ws$dataSource$0",
      }),
    ]);
  });

  test("unset variable outside of scope", () => {
    const bodyVariable = new Variable("Body Variable", "");
    const data = renderData(
      <$.Body ws:id="bodyId" vars={expression`${bodyVariable}`}>
        <$.Box
          ws:id="boxId"
          vars={expression`${bodyVariable}`}
          action={
            new ActionValue(["state"], expression`${bodyVariable} = state`)
          }
        >
          {expression`${bodyVariable}`}
        </$.Box>
      </$.Body>
    );
    const fragment = extractWebstudioFragment({ pages, ...data }, "boxId");
    expect(fragment.dataSources).toEqual([]);
    expect(fragment.props).toEqual([
      expect.objectContaining({
        instanceId: "boxId",
        value: "Body$32$Variable",
      }),
      expect.objectContaining({
        instanceId: "boxId",
        value: [
          {
            type: "execute",
            args: ["state"],
            code: "Body$32$Variable = state",
          },
        ],
      }),
    ]);
    expect(fragment.instances).toEqual([
      expect.objectContaining({
        id: "boxId",
        children: [{ type: "expression", value: "Body$32$Variable" }],
      }),
    ]);
  });

  test("restore unset variables when insert fragment", () => {
    const bodyVariable = new Variable("Body Variable", "");
    const data = renderData(
      <$.Body ws:id="bodyId" vars={expression`${bodyVariable}`}>
        <$.Box
          ws:id="boxId"
          vars={expression`${bodyVariable} + unknownVariable`}
          action={
            new ActionValue(["state"], expression`${bodyVariable} = state`)
          }
        >
          {expression`${bodyVariable}`}
        </$.Box>
      </$.Body>
    );
    const fragment = extractWebstudioFragment({ pages, ...data }, "boxId");
    insertWebstudioFragmentCopy({
      data: { pages, ...data },
      fragment,
      availableDataSources: findAvailableDataSources(
        data.dataSources,
        data.instances,
        ["bodyId"]
      ),
    });
    const newInstanceId = Array.from(data.instances.keys()).at(-1) ?? "";
    expect(newInstanceId).not.toEqual("boxId");
    expect(data.instances.get(newInstanceId)?.children).toEqual([
      { type: "expression", value: "$ws$dataSource$0" },
    ]);
    expect(
      Array.from(data.props.values()).filter(
        (item) => item.instanceId === newInstanceId
      )
    ).toEqual([
      expect.objectContaining({
        value: "$ws$dataSource$0 + unknownVariable",
      }),
      expect.objectContaining({
        value: [expect.objectContaining({ code: "$ws$dataSource$0 = state" })],
      }),
    ]);
  });
});

describe("resources", () => {
  test("extract resource variable with dependant variables", () => {
    const boxVariable = new Variable("Box Variable", "");
    const resourceVariable = new ResourceValue("Box Resource", {
      url: expression`${boxVariable}`,
      method: "get",
      headers: [{ name: "auth", value: expression`${boxVariable}` }],
      body: expression`${boxVariable}`,
    });
    const data = renderData(
      <$.Body ws:id="bodyId">
        <$.Box ws:id="boxId" vars={expression`${resourceVariable}`}></$.Box>
      </$.Body>
    );
    const fragment = extractWebstudioFragment({ pages, ...data }, "boxId");
    expect(fragment.dataSources).toEqual([
      expect.objectContaining({ id: "1", type: "variable" }),
      expect.objectContaining({ id: "0", type: "resource" }),
    ]);
    expect(fragment.resources).toEqual([
      expect.objectContaining({
        url: "$ws$dataSource$1",
        headers: [{ name: "auth", value: "$ws$dataSource$1" }],
        body: "$ws$dataSource$1",
      }),
    ]);
  });

  test("extract resource variable and unset variables outside of scope", () => {
    const bodyVariable = new Variable("Body Variable", "");
    const resourceVariable = new ResourceValue("Box Resource", {
      url: expression`${bodyVariable}`,
      method: "get",
      headers: [{ name: "auth", value: expression`${bodyVariable}` }],
      body: expression`${bodyVariable}`,
    });
    const data = renderData(
      <$.Body ws:id="bodyId" vars={expression`${bodyVariable}`}>
        <$.Box ws:id="boxId" vars={expression`${resourceVariable}`}></$.Box>
      </$.Body>
    );
    const fragment = extractWebstudioFragment({ pages, ...data }, "boxId");
    expect(fragment.dataSources).toEqual([
      expect.objectContaining({ id: "1", type: "resource" }),
    ]);
    expect(fragment.resources).toEqual([
      expect.objectContaining({
        url: "Body$32$Variable",
        headers: [{ name: "auth", value: "Body$32$Variable" }],
        body: "Body$32$Variable",
      }),
    ]);
  });

  test("restore unset variables in resource variable", () => {
    const bodyVariable = new Variable("Body Variable", "");
    const resourceVariable = new ResourceValue("Box Resource", {
      url: expression`${bodyVariable}`,
      method: "get",
      headers: [{ name: "auth", value: expression`${bodyVariable}` }],
      body: expression`${bodyVariable}`,
    });
    const data = renderData(
      <$.Body ws:id="bodyId" vars={expression`${bodyVariable}`}>
        <$.Box ws:id="boxId" vars={expression`${resourceVariable}`}></$.Box>
      </$.Body>
    );
    const fragment = extractWebstudioFragment({ pages, ...data }, "boxId");
    insertWebstudioFragmentCopy({
      data: { pages, ...data },
      fragment,
      availableDataSources: findAvailableDataSources(
        data.dataSources,
        data.instances,
        ["bodyId"]
      ),
    });
    const newInstanceId = Array.from(data.instances.keys()).at(-1);
    expect(newInstanceId).not.toEqual("boxId");
    expect(Array.from(data.resources.values())).toEqual([
      expect.objectContaining({
        url: "$ws$dataSource$0",
        headers: [{ name: "auth", value: "$ws$dataSource$0" }],
        body: "$ws$dataSource$0",
      }),
      expect.objectContaining({
        url: "$ws$dataSource$0",
        headers: [{ name: "auth", value: "$ws$dataSource$0" }],
        body: "$ws$dataSource$0",
      }),
    ]);
  });

  test("extract resource prop with dependant variables", () => {
    const boxVariable = new Variable("Box Variable", "");
    const resourceProp = new ResourceValue("Box Resource", {
      url: expression`${boxVariable}`,
      method: "get",
      headers: [{ name: "auth", value: expression`${boxVariable}` }],
      body: expression`${boxVariable}`,
    });
    const data = renderData(
      <$.Body ws:id="bodyId">
        <$.Box ws:id="boxId" resource={resourceProp}></$.Box>
      </$.Body>
    );
    const fragment = extractWebstudioFragment({ pages, ...data }, "boxId");
    expect(fragment.dataSources).toEqual([
      expect.objectContaining({ id: "1", type: "variable" }),
    ]);
    expect(fragment.resources).toEqual([
      expect.objectContaining({
        url: "$ws$dataSource$1",
        headers: [{ name: "auth", value: "$ws$dataSource$1" }],
        body: "$ws$dataSource$1",
      }),
    ]);
  });

  test("extract resource prop and unset variables outside of scope", () => {
    const bodyVariable = new Variable("Body Variable", "");
    const resourceProp = new ResourceValue("Box Resource", {
      url: expression`${bodyVariable}`,
      method: "get",
      headers: [{ name: "auth", value: expression`${bodyVariable}` }],
      body: expression`${bodyVariable}`,
    });
    const data = renderData(
      <$.Body ws:id="bodyId" vars={expression`${bodyVariable}`}>
        <$.Box ws:id="boxId" resource={resourceProp}></$.Box>
      </$.Body>
    );
    const fragment = extractWebstudioFragment({ pages, ...data }, "boxId");
    expect(fragment.dataSources).toEqual([]);
    expect(fragment.resources).toEqual([
      expect.objectContaining({
        url: "Body$32$Variable",
        headers: [{ name: "auth", value: "Body$32$Variable" }],
        body: "Body$32$Variable",
      }),
    ]);
  });

  test("restore unset variables in resource prop", () => {
    const bodyVariable = new Variable("Body Variable", "");
    const resourceProp = new ResourceValue("Box Resource", {
      url: expression`${bodyVariable}`,
      method: "get",
      headers: [{ name: "auth", value: expression`${bodyVariable}` }],
      body: expression`${bodyVariable}`,
    });
    const data = renderData(
      <$.Body ws:id="bodyId" vars={expression`${bodyVariable}`}>
        <$.Box ws:id="boxId" resource={resourceProp}></$.Box>
      </$.Body>
    );
    const fragment = extractWebstudioFragment({ pages, ...data }, "boxId");
    insertWebstudioFragmentCopy({
      data: { pages, ...data },
      fragment,
      availableDataSources: findAvailableDataSources(
        data.dataSources,
        data.instances,
        ["bodyId"]
      ),
    });
    const newInstanceId = Array.from(data.instances.keys()).at(-1);
    expect(newInstanceId).not.toEqual("boxId");
    expect(Array.from(data.resources.values())).toEqual([
      expect.objectContaining({
        url: "$ws$dataSource$0",
        headers: [{ name: "auth", value: "$ws$dataSource$0" }],
        body: "$ws$dataSource$0",
      }),
      expect.objectContaining({
        url: "$ws$dataSource$0",
        headers: [{ name: "auth", value: "$ws$dataSource$0" }],
        body: "$ws$dataSource$0",
      }),
    ]);
  });
});
