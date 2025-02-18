import { describe, expect, test } from "vitest";
import stripIndent from "strip-indent";
import { createRegularStyleSheet } from "@webstudio-is/css-engine";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  encodeDataVariableId,
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
  renderTemplate,
  Parameter,
} from "@webstudio-is/template";
import type { Project } from "@webstudio-is/project";
import {
  extractWebstudioFragment,
  insertWebstudioFragmentCopy,
} from "./instance-utils";
import { $project } from "./nano-states";
import { findAvailableVariables } from "./data-variables";

$project.set({ id: "current_project" } as Project);

const createStub = (element: JSX.Element) => {
  const project = {
    pages: createDefaultPages({ rootInstanceId: "" }),
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

test("extract the instance by id and all its descendants including slot instances", () => {
  const data = renderData(
    <$.Body ws:id="bodyId">
      <$.Box ws:id="boxId">
        <$.Slot>
          <$.Fragment></$.Fragment>
        </$.Slot>
      </$.Box>
      <$.Text ws:id="textId"></$.Text>
    </$.Body>
  );
  const { instances } = extractWebstudioFragment(data, "boxId");
  expect(instances).toEqual([
    expect.objectContaining({ component: "Box" }),
    expect.objectContaining({ component: "Slot" }),
    expect.objectContaining({ component: "Fragment" }),
  ]);
});

test("insert instances with slots", () => {
  const data = renderData(<$.Body ws:id="bodyId"></$.Body>);
  const fragment = renderTemplate(
    <$.Slot ws:id="slotId">
      <$.Fragment ws:id="fragmentId">
        <$.Box ws:id="boxId"></$.Box>
      </$.Fragment>
    </$.Slot>
  );
  expect(data.instances.size).toEqual(1);
  insertWebstudioFragmentCopy({
    data,
    fragment,
    availableVariables: [],
  });
  expect(data.instances.size).toEqual(4);
  insertWebstudioFragmentCopy({
    data,
    fragment,
    availableVariables: [],
  });
  expect(data.instances.size).toEqual(5);
  expect(Array.from(data.instances.values())).toEqual([
    expect.objectContaining({ component: "Body" }),
    // id of slot instances are preserved
    expect.objectContaining({ component: "Fragment", id: "fragmentId" }),
    expect.objectContaining({ component: "Box", id: "boxId" }),
    expect.objectContaining({ component: "Slot" }),
    expect.objectContaining({ component: "Slot" }),
  ]);
});

test("insert instances with multiple roots", () => {
  const data = renderData(<$.Body ws:id="bodyId"></$.Body>);
  const fragment = renderTemplate(
    <>
      <$.Box>
        <$.Text></$.Text>
      </$.Box>
      <$.Box>
        <$.Text></$.Text>
      </$.Box>
    </>
  );
  expect(data.instances.size).toEqual(1);
  insertWebstudioFragmentCopy({
    data,
    fragment,
    availableVariables: [],
  });
  expect(data.instances.size).toEqual(5);
});

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
    availableVariables: [],
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
    availableVariables: [],
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
    availableVariables: [],
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

describe("props", () => {
  test("extract all props bound to fragment instances", () => {
    const data = renderData(
      <$.Body ws:id="bodyId" data-body="">
        <$.Box ws:id="boxId" data-box="">
          <$.Text ws:id="textId" data-text=""></$.Text>
        </$.Box>
      </$.Body>
    );
    const { props } = extractWebstudioFragment(data, "boxId");
    expect(props).toEqual([
      expect.objectContaining({ name: "data-box" }),
      expect.objectContaining({ name: "data-text" }),
    ]);
  });

  test("insert props with new ids", () => {
    const data = renderData(<$.Body ws:id="bodyId"></$.Body>);
    const fragment = renderTemplate(
      <$.Box ws:id="boxId" data-box="">
        <$.Text ws:id="textId" data-text=""></$.Text>
      </$.Box>
    );
    insertWebstudioFragmentCopy({
      data,
      fragment,
      availableVariables: [],
    });
    expect(Array.from(data.props.values())).toEqual([
      expect.objectContaining({
        id: expect.toSatisfy((value) => value !== fragment.props[0].id),
        name: "data-box",
      }),
      expect.objectContaining({
        id: expect.toSatisfy((value) => value !== fragment.props[1].id),
        name: "data-text",
      }),
    ]);
  });

  test("preserve ids when insert props from slots", () => {
    const data = renderData(<$.Body ws:id="bodyId"></$.Body>);
    const fragment = renderTemplate(
      <$.Slot>
        <$.Fragment>
          <$.Box ws:id="boxId" data-box="">
            <$.Text ws:id="textId" data-text=""></$.Text>
          </$.Box>
        </$.Fragment>
      </$.Slot>
    );
    insertWebstudioFragmentCopy({
      data,
      fragment,
      availableVariables: [],
    });
    expect(Array.from(data.props.values())).toEqual([
      expect.objectContaining({
        id: fragment.props[0].id,
        name: "data-box",
      }),
      expect.objectContaining({
        id: fragment.props[1].id,
        name: "data-text",
      }),
    ]);
  });
});

describe("variables", () => {
  test("extract variable", () => {
    const boxVariable = new Variable("Box Variable", "");
    const data = renderData(
      <$.Body ws:id="bodyId">
        <$.Box ws:id="boxId" vars={expression`${boxVariable}`}></$.Box>
      </$.Body>
    );
    const fragment = extractWebstudioFragment(data, "boxId");
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
    const fragment = extractWebstudioFragment(data, "boxId");
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

  test("insert variables with new ids", () => {
    const boxParameter = new Parameter("My Parameter");
    const data = renderData(<$.Body ws:id="bodyId"></$.Body>);
    const fragment = renderTemplate(
      <$.Box
        ws:id="boxId"
        vars={expression`${boxParameter}`}
        action={new ActionValue([], expression`${boxParameter}`)}
        parameter={boxParameter}
      >
        {expression`${boxParameter}`}
      </$.Box>
    );
    insertWebstudioFragmentCopy({
      data,
      fragment,
      availableVariables: [],
    });
    const [newDataSourceId] = data.dataSources.keys();
    expect(Array.from(data.dataSources.values())).toEqual([
      expect.objectContaining({
        id: expect.toSatisfy((value) => value !== fragment.dataSources[0].id),
        name: "My Parameter",
      }),
    ]);
    expect(Array.from(data.props.values())).toEqual([
      expect.objectContaining({
        name: "vars",
        value: encodeDataVariableId(newDataSourceId),
      }),
      expect.objectContaining({
        name: "action",
        value: [
          {
            type: "execute",
            args: [],
            code: encodeDataVariableId(newDataSourceId),
          },
        ],
      }),
      expect.objectContaining({
        name: "parameter",
        value: newDataSourceId,
      }),
    ]);
  });

  test("preserve ids when insert variables from portals", () => {
    const boxParameter = new Parameter("My Parameter");
    const data = renderData(<$.Body ws:id="bodyId"></$.Body>);
    const fragment = renderTemplate(
      <$.Slot>
        <$.Fragment>
          <$.Box
            ws:id="boxId"
            vars={expression`${boxParameter}`}
            action={new ActionValue([], expression`${boxParameter}`)}
            parameter={boxParameter}
          >
            {expression`${boxParameter}`}
          </$.Box>
        </$.Fragment>
      </$.Slot>
    );
    insertWebstudioFragmentCopy({
      data,
      fragment,
      availableVariables: [],
    });
    expect(Array.from(data.dataSources.values())).toEqual([
      expect.objectContaining({
        id: fragment.dataSources[0].id,
        name: "My Parameter",
      }),
    ]);
    expect(Array.from(data.props.values())).toEqual([
      expect.objectContaining({
        name: "vars",
        value: encodeDataVariableId(fragment.dataSources[0].id),
      }),
      expect.objectContaining({
        name: "action",
        value: [
          {
            type: "execute",
            args: [],
            code: encodeDataVariableId(fragment.dataSources[0].id),
          },
        ],
      }),
      expect.objectContaining({
        name: "parameter",
        value: fragment.dataSources[0].id,
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
    const fragment = extractWebstudioFragment(data, "boxId");
    insertWebstudioFragmentCopy({
      data,
      fragment,
      availableVariables: findAvailableVariables({
        ...data,
        startingInstanceId: "bodyId",
      }),
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
    const fragment = extractWebstudioFragment(data, "boxId");
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
    const fragment = extractWebstudioFragment(data, "boxId");
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
    const fragment = extractWebstudioFragment(data, "boxId");
    insertWebstudioFragmentCopy({
      data,
      fragment,
      availableVariables: findAvailableVariables({
        ...data,
        startingInstanceId: "bodyId",
      }),
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
    const fragment = extractWebstudioFragment(data, "boxId");
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
    const fragment = extractWebstudioFragment(data, "boxId");
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
    const fragment = extractWebstudioFragment(data, "boxId");
    insertWebstudioFragmentCopy({
      data,
      fragment,
      availableVariables: findAvailableVariables({
        ...data,
        startingInstanceId: "bodyId",
      }),
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

  test("insert resources with new ids", () => {
    const boxVariable = new Variable("Box Variable", "");
    const resourceProp = new ResourceValue("Box Resource", {
      url: expression`${boxVariable}`,
      method: "get",
      headers: [{ name: "auth", value: expression`${boxVariable}` }],
      body: expression`${boxVariable}`,
    });
    const resourceVariable = new ResourceValue("Box Resource", {
      url: expression`${boxVariable}`,
      method: "get",
      headers: [{ name: "auth", value: expression`${boxVariable}` }],
      body: expression`${boxVariable}`,
    });
    const data = renderData(<$.Body ws:id="bodyId"></$.Body>);
    const fragment = renderTemplate(
      <$.Box
        ws:id="boxId"
        action={resourceProp}
        vars={expression`${resourceVariable}`}
      ></$.Box>
    );
    insertWebstudioFragmentCopy({
      data,
      fragment,
      availableVariables: [],
    });
    const [newPropResourceId, newVariableResourceId] = data.resources.keys();
    const [newBoxVariableId] = data.dataSources.keys();
    const newVariableIdentifier = encodeDataVariableId(newBoxVariableId);
    expect(Array.from(data.dataSources.values())).toEqual([
      expect.objectContaining({
        name: "Box Variable",
      }),
      expect.objectContaining({
        name: "Box Resource",
        resourceId: newVariableResourceId,
      }),
    ]);
    expect(Array.from(data.resources.values())).toEqual([
      expect.objectContaining({
        id: expect.toSatisfy((value) => value !== fragment.resources[0].id),
        url: newVariableIdentifier,
        headers: [{ name: "auth", value: newVariableIdentifier }],
        body: newVariableIdentifier,
      }),
      expect.objectContaining({
        id: expect.toSatisfy((value) => value !== fragment.resources[1].id),
        url: newVariableIdentifier,
        headers: [{ name: "auth", value: newVariableIdentifier }],
        body: newVariableIdentifier,
      }),
    ]);
    expect(Array.from(data.props.values())).toEqual([
      expect.objectContaining({
        name: "action",
        value: newPropResourceId,
      }),
      expect.objectContaining({ name: "vars" }),
    ]);
  });

  test("preserve ids when insert resource from slot", () => {
    const boxVariable = new Variable("Box Variable", "");
    const resourceProp = new ResourceValue("Box Resource", {
      url: expression`${boxVariable}`,
      method: "get",
      headers: [{ name: "auth", value: expression`${boxVariable}` }],
      body: expression`${boxVariable}`,
    });
    const resourceVariable = new ResourceValue("Box Resource", {
      url: expression`${boxVariable}`,
      method: "get",
      headers: [{ name: "auth", value: expression`${boxVariable}` }],
      body: expression`${boxVariable}`,
    });
    const data = renderData(<$.Body ws:id="bodyId"></$.Body>);
    const fragment = renderTemplate(
      <$.Slot ws:id="slotId">
        <$.Fragment ws:id="fragmentId">
          <$.Box
            ws:id="boxId"
            action={resourceProp}
            vars={expression`${resourceVariable}`}
          ></$.Box>
        </$.Fragment>
      </$.Slot>
    );
    insertWebstudioFragmentCopy({
      data,
      fragment,
      availableVariables: [],
    });
    expect(Array.from(data.dataSources.values())).toEqual([
      expect.objectContaining({
        name: "Box Variable",
      }),
      expect.objectContaining({
        name: "Box Resource",
        resourceId: fragment.resources[1].id,
      }),
    ]);
    const oldVariableIdentifier = encodeDataVariableId(
      fragment.dataSources[0].id
    );
    expect(Array.from(data.resources.values())).toEqual([
      expect.objectContaining({
        id: fragment.resources[0].id,
        url: oldVariableIdentifier,
        headers: [{ name: "auth", value: oldVariableIdentifier }],
        body: oldVariableIdentifier,
      }),
      expect.objectContaining({
        id: fragment.resources[1].id,
        url: oldVariableIdentifier,
        headers: [{ name: "auth", value: oldVariableIdentifier }],
        body: oldVariableIdentifier,
      }),
    ]);
    expect(Array.from(data.props.values())).toEqual([
      expect.objectContaining({
        name: "action",
        value: fragment.resources[0].id,
      }),
      expect.objectContaining({ name: "vars" }),
    ]);
  });
});
