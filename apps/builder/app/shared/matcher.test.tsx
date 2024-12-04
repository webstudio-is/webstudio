import { describe, expect, test } from "vitest";
import { renderJsx, $, ExpressionValue } from "@webstudio-is/sdk/testing";
import { coreMetas } from "@webstudio-is/react-sdk";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import type { WsComponentMeta } from "@webstudio-is/react-sdk";
import type { Matcher, WebstudioFragment } from "@webstudio-is/sdk";
import {
  findClosestContainer,
  findClosestInstanceMatchingFragment,
  isInstanceMatching,
  isTreeMatching,
} from "./matcher";

const metas = new Map(Object.entries({ ...coreMetas, ...baseMetas }));

describe("is instance matching", () => {
  test("matches self with self matcher", () => {
    expect(
      isInstanceMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.List ws:id="list">
              <$.ListItem ws:id="listitem"></$.ListItem>
            </$.List>
          </$.Body>
        ),
        instanceSelector: ["listitem", "list", "body"],
        query: {
          relation: "self",
          component: { $eq: "ListItem" },
        },
      })
    ).toBeTruthy();
    expect(
      isInstanceMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.List ws:id="list">
              <$.ListItem ws:id="listitem"></$.ListItem>
            </$.List>
          </$.Body>
        ),
        instanceSelector: ["listitem", "list", "body"],
        query: {
          relation: "self",
          component: { $in: ["ListItem", "ListBox"] },
        },
      })
    ).toBeTruthy();
  });

  test("matches self with negated self matcher", () => {
    expect(
      isInstanceMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.List ws:id="list">
              <$.ListItem ws:id="listitem"></$.ListItem>
            </$.List>
          </$.Body>
        ),
        instanceSelector: ["listitem", "list", "body"],
        query: {
          relation: "self",
          component: { $neq: "Box" },
        },
      })
    ).toBeTruthy();
    expect(
      isInstanceMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.List ws:id="list">
              <$.ListItem ws:id="listitem"></$.ListItem>
            </$.List>
          </$.Body>
        ),
        instanceSelector: ["listitem", "list", "body"],
        query: {
          relation: "self",
          component: { $nin: ["Box", "List"] },
        },
      })
    ).toBeTruthy();
  });

  test("matches parent with parent matcher", () => {
    expect(
      isInstanceMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.List ws:id="list">
              <$.ListItem ws:id="listitem"></$.ListItem>
            </$.List>
          </$.Body>
        ),
        instanceSelector: ["listitem", "list", "body"],
        query: {
          relation: "parent",
          component: { $eq: "List" },
        },
      })
    ).toBeTruthy();
  });

  test("not matches ancestor with parent matcher", () => {
    expect(
      isInstanceMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.List ws:id="list">
              <$.Box ws:id="box">
                <$.ListItem ws:id="listitem"></$.ListItem>
              </$.Box>
            </$.List>
          </$.Body>
        ),
        instanceSelector: ["listitem", "box", "list", "body"],
        query: {
          relation: "parent",
          component: { $eq: "List" },
        },
      })
    ).toBeFalsy();
  });

  test("not matches another parent with parent matcher", () => {
    expect(
      isInstanceMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.ListItem ws:id="listitem"></$.ListItem>
          </$.Body>
        ),
        instanceSelector: ["listitem", "body"],
        query: {
          relation: "parent",
          component: { $eq: "List" },
        },
      })
    ).toBeFalsy();
  });

  test("matches parent with negated parent matcher", () => {
    expect(
      isInstanceMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.ListItem ws:id="listitem"></$.ListItem>
          </$.Body>
        ),
        instanceSelector: ["listitem", "body"],
        query: {
          relation: "parent",
          component: { $neq: "List" },
        },
      })
    ).toBeTruthy();
  });

  test("not matches parent with negated parent matcher", () => {
    expect(
      isInstanceMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.List ws:id="list">
              <$.ListItem ws:id="listitem"></$.ListItem>
            </$.List>
          </$.Body>
        ),
        instanceSelector: ["listitem", "list", "body"],
        query: {
          relation: "parent",
          component: { $neq: "List" },
        },
      })
    ).toBeFalsy();
  });

  test("matches parent with ancestor matcher", () => {
    expect(
      isInstanceMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.List ws:id="list">
              <$.ListItem ws:id="listitem"></$.ListItem>
            </$.List>
          </$.Body>
        ),
        instanceSelector: ["listitem", "list", "body"],
        query: {
          relation: "ancestor",
          component: { $eq: "List" },
        },
      })
    ).toBeTruthy();
  });

  test("matches parent with ancestor matcher", () => {
    expect(
      isInstanceMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.List ws:id="list">
              <$.Box ws:id="box">
                <$.ListItem ws:id="listitem"></$.ListItem>
              </$.Box>
            </$.List>
          </$.Body>
        ),
        instanceSelector: ["listitem", "box", "list", "body"],
        query: {
          relation: "ancestor",
          component: { $eq: "List" },
        },
      })
    ).toBeTruthy();
  });

  test("not matches another ancestor with ancestor matcher", () => {
    expect(
      isInstanceMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.Box ws:id="box">
              <$.ListItem ws:id="listitem"></$.ListItem>
            </$.Box>
          </$.Body>
        ),
        instanceSelector: ["listitem", "box", "body"],
        query: {
          relation: "ancestor",
          component: { $eq: "List" },
        },
      })
    ).toBeFalsy();
  });

  test("matches ancestor with negated ancestor matcher", () => {
    expect(
      isInstanceMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.Box ws:id="box">
              <$.ListItem ws:id="listitem"></$.ListItem>
            </$.Box>
          </$.Body>
        ),
        instanceSelector: ["listitem", "box", "body"],
        query: {
          relation: "ancestor",
          component: { $neq: "List" },
        },
      })
    ).toBeTruthy();
  });

  test("not matches ancestor with negated ancestor matcher", () => {
    expect(
      isInstanceMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.List ws:id="list">
              <$.ListItem ws:id="listitem"></$.ListItem>
            </$.List>
          </$.Body>
        ),
        instanceSelector: ["listitem", "list", "body"],
        query: {
          relation: "ancestor",
          component: { $neq: "List" },
        },
      })
    ).toBeFalsy();
  });

  test("combines self, parent and ancestor matchers", () => {
    expect(
      isInstanceMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.List ws:id="list">
              <$.ListItem ws:id="listitem"></$.ListItem>
            </$.List>
          </$.Body>
        ),
        instanceSelector: ["listitem", "list", "body"],
        query: [
          {
            relation: "self",
            component: { $eq: "ListItem" },
          },
          {
            relation: "parent",
            component: { $eq: "List" },
          },
          {
            relation: "ancestor",
            component: { $eq: "Body" },
          },
        ],
      })
    ).toBeTruthy();
    expect(
      isInstanceMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.Box ws:id="box">
              <$.ListItem ws:id="listitem"></$.ListItem>
            </$.Box>
          </$.Body>
        ),
        instanceSelector: ["listitem", "box", "body"],
        query: [
          {
            relation: "self",
            component: { $eq: "ListItem" },
          },
          {
            relation: "parent",
            component: { $eq: "List" },
          },
          {
            relation: "ancestor",
            component: { $eq: "Body" },
          },
        ],
      })
    ).toBeFalsy();
  });

  test("negated ancestor matcher should not interfere with self relation", () => {
    expect(
      isInstanceMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.List ws:id="list"></$.List>
          </$.Body>
        ),
        instanceSelector: ["list", "body"],
        query: {
          relation: "ancestor",
          component: { $neq: "List" },
        },
      })
    ).toBeTruthy();
  });

  test("combines multiple ancestor matchers", () => {
    const query: Matcher[] = [
      {
        relation: "ancestor",
        component: { $eq: "Body" },
      },
      {
        relation: "ancestor",
        component: { $in: ["Box"] },
      },
    ];
    expect(
      isInstanceMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.Box ws:id="box">
              <$.List ws:id="list"></$.List>
            </$.Box>
          </$.Body>
        ),
        instanceSelector: ["list", "box", "body"],
        query,
      })
    ).toBeTruthy();
    expect(
      isInstanceMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.List ws:id="list"></$.List>
          </$.Body>
        ),
        instanceSelector: ["list", "body"],
        query,
      })
    ).toBeFalsy();
  });
});

describe("is tree matching", () => {
  const metas = new Map<string, WsComponentMeta>([
    [
      "ListItem",
      {
        type: "container",
        icon: "",
        constraints: {
          relation: "parent",
          component: { $eq: "List" },
        },
      },
    ],
  ]);

  test("match selected instance", () => {
    expect(
      isTreeMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.List ws:id="list">
              <$.ListItem ws:id="listitem"></$.ListItem>
            </$.List>
          </$.Body>
        ),
        metas,
        instanceSelector: ["listitem", "list", "body"],
      })
    ).toBeTruthy();
    expect(
      isTreeMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.ListItem ws:id="listitem"></$.ListItem>
          </$.Body>
        ),
        metas,
        instanceSelector: ["listitem", "body"],
      })
    ).toBeFalsy();
  });

  test("match all descendants", () => {
    expect(
      isTreeMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.List ws:id="list">
              <$.ListItem ws:id="listitem"></$.ListItem>
            </$.List>
          </$.Body>
        ),
        metas,
        instanceSelector: ["list", "body"],
      })
    ).toBeTruthy();
    expect(
      isTreeMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.ListItem ws:id="listitem"></$.ListItem>
            <$.Box ws:id="box"></$.Box>
          </$.Body>
        ),
        metas,
        instanceSelector: ["body"],
      })
    ).toBeFalsy();
  });
});

describe("find closest instance matching fragment", () => {
  const createFragment = (element: JSX.Element): WebstudioFragment => {
    const { instances } = renderJsx(element);
    const instancesArray = Array.from(instances.values());
    return {
      children: instancesArray[0].children,
      instances: instancesArray,
      styleSourceSelections: [],
      styleSources: [],
      breakpoints: [],
      styles: [],
      dataSources: [],
      resources: [],
      props: [],
      assets: [],
    };
  };

  test("finds closest list with list item fragment", () => {
    const { instances } = renderJsx(
      <$.Body ws:id="body">
        <$.List ws:id="list">
          <$.ListItem ws:id="listitem"></$.ListItem>
        </$.List>
      </$.Body>
    );
    const fragment = createFragment(
      // only children are tested
      <>
        <$.ListItem ws:id="new"></$.ListItem>
      </>
    );
    expect(
      findClosestInstanceMatchingFragment({
        metas,
        instances,
        instanceSelector: ["list", "body"],
        fragment,
      })
    ).toEqual(0);
    expect(
      findClosestInstanceMatchingFragment({
        metas,
        instances,
        // looks up until list parent is reached
        instanceSelector: ["listitem", "list", "body"],
        fragment,
      })
    ).toEqual(1);
    expect(
      findClosestInstanceMatchingFragment({
        metas,
        instances,
        instanceSelector: ["body"],
        fragment,
      })
    ).toEqual(-1);
  });

  test("finds button parent with button fragment", () => {
    const { instances } = renderJsx(
      <$.Body ws:id="body">
        <$.Button ws:id="button"></$.Button>
      </$.Body>
    );
    const fragment = createFragment(
      // only children are tested
      <>
        <$.Button ws:id="new"></$.Button>
      </>
    );
    expect(
      findClosestInstanceMatchingFragment({
        metas,
        instances,
        instanceSelector: ["button", "body"],
        fragment,
      })
    ).toEqual(1);
  });

  test("finds button parent with button+span fragment", () => {
    const { instances } = renderJsx(
      <$.Body ws:id="body">
        <$.Button ws:id="button"></$.Button>
      </$.Body>
    );
    const fragment = createFragment(
      // only children are tested
      <>
        <$.Button ws:id="new-button"></$.Button>
        <$.Text ws:id="new-text"></$.Text>
      </>
    );
    expect(
      findClosestInstanceMatchingFragment({
        metas,
        instances,
        instanceSelector: ["button", "body"],
        fragment,
      })
    ).toEqual(1);
  });
});

describe("find closest container", () => {
  test("skips non-container instances", () => {
    expect(
      findClosestContainer({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.Box ws:id="box">
              <$.Image ws:id="image" />
            </$.Box>
          </$.Body>
        ),
        metas,
        instanceSelector: ["image", "box", "body"],
      })
    ).toEqual(1);
  });

  test("skips containers with text", () => {
    expect(
      findClosestContainer({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.Box ws:id="box">
              <$.Box ws:id="box-with-text">text</$.Box>
            </$.Box>
          </$.Body>
        ),
        metas,
        instanceSelector: ["box-with-text", "box", "body"],
      })
    ).toEqual(1);
  });

  test("skips containers with expression", () => {
    expect(
      findClosestContainer({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.Box ws:id="box">
              <$.Box ws:id="box-with-expr">
                {new ExpressionValue("1 + 1")}
              </$.Box>
            </$.Box>
          </$.Body>
        ),
        metas,
        instanceSelector: ["box-with-expr", "box", "body"],
      })
    ).toEqual(1);
  });

  test("allow root with text", () => {
    expect(
      findClosestContainer({
        ...renderJsx(<$.Body ws:id="body">text</$.Body>),
        metas,
        instanceSelector: ["body"],
      })
    ).toEqual(0);
  });
});
