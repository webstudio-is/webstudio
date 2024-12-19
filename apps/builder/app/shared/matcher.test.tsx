import { describe, expect, test, vi } from "vitest";
import {
  renderJsx,
  $,
  ExpressionValue,
  renderTemplate,
} from "@webstudio-is/template";
import { coreMetas } from "@webstudio-is/react-sdk";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import type { WsComponentMeta } from "@webstudio-is/react-sdk";
import type { Matcher } from "@webstudio-is/sdk";
import {
  findClosestNonTextualContainer,
  findClosestInstanceMatchingFragment,
  isInstanceMatching,
  isTreeMatching,
  findClosestContainer,
} from "./matcher";

const metas = new Map(Object.entries({ ...coreMetas, ...baseMetas }));
metas.set("ListItem", {
  ...baseMetas.ListItem,
  constraints: {
    relation: "parent",
    component: { $eq: "List" },
  },
});

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

  test("matches a child with child matcher", () => {
    expect(
      isInstanceMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.List ws:id="list">
              <$.ListItem ws:id="listitem"></$.ListItem>
            </$.List>
          </$.Body>
        ),
        instanceSelector: ["list", "body"],
        query: {
          relation: "child",
          component: { $eq: "ListItem" },
        },
      })
    ).toBeTruthy();
  });

  test("matches a child with negated child matcher", () => {
    expect(
      isInstanceMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.List ws:id="list"></$.List>
          </$.Body>
        ),
        instanceSelector: ["list", "body"],
        query: {
          relation: "child",
          component: { $neq: "ListItem" },
        },
      })
    ).toBeTruthy();
    expect(
      isInstanceMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.List ws:id="list">
              <$.Box ws:id="box"></$.Box>
            </$.List>
          </$.Body>
        ),
        instanceSelector: ["list", "body"],
        query: {
          relation: "child",
          component: { $neq: "ListItem" },
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
        instanceSelector: ["list", "body"],
        query: {
          relation: "child",
          component: { $neq: "ListItem" },
        },
      })
    ).toBeFalsy();
  });

  test("not matches a parent without a child with child matcher", () => {
    expect(
      isInstanceMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.List ws:id="list"></$.List>
          </$.Body>
        ),
        instanceSelector: ["list", "body"],
        query: {
          relation: "child",
          component: { $eq: "ListItem" },
        },
      })
    ).toBeFalsy();
  });

  test("not matches a parent with different child with child matcher", () => {
    expect(
      isInstanceMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.List ws:id="list">
              <$.Box ws:id="box"></$.Box>
            </$.List>
          </$.Body>
        ),
        instanceSelector: ["list", "body"],
        query: {
          relation: "child",
          component: { $eq: "ListItem" },
        },
      })
    ).toBeFalsy();
  });

  test("matches a child with descendant matcher", () => {
    expect(
      isInstanceMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.List ws:id="list">
              <$.ListItem ws:id="listitem"></$.ListItem>
            </$.List>
          </$.Body>
        ),
        instanceSelector: ["list", "body"],
        query: {
          relation: "descendant",
          component: { $eq: "ListItem" },
        },
      })
    ).toBeTruthy();
  });

  test("matches a descendant with descendant matcher", () => {
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
        instanceSelector: ["list", "body"],
        query: {
          relation: "descendant",
          component: { $eq: "ListItem" },
        },
      })
    ).toBeTruthy();
  });

  test("matches a descendant with negated descendant matcher", () => {
    expect(
      isInstanceMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.List ws:id="list">
              <$.Box ws:id="box"></$.Box>
            </$.List>
          </$.Body>
        ),
        instanceSelector: ["list", "body"],
        query: {
          relation: "descendant",
          component: { $neq: "ListItem" },
        },
      })
    ).toBeTruthy();
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
        instanceSelector: ["list", "body"],
        query: {
          relation: "descendant",
          component: { $neq: "ListItem" },
        },
      })
    ).toBeFalsy();
  });

  test("provide error message when negated matcher is failed", () => {
    const onError = vi.fn();
    isInstanceMatching({
      ...renderJsx(
        <$.Body ws:id="body">
          <$.Box ws:id="box"></$.Box>
        </$.Body>
      ),
      instanceSelector: ["box", "body"],
      query: {
        relation: "self",
        component: { $nin: ["Box", "Text"] },
      },
      onError,
    });
    expect(onError).toHaveBeenLastCalledWith("Box or Text is not acceptable");
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
        component: { $nin: ["Box", "Text"] },
      },
      onError,
    });
    expect(onError).toHaveBeenLastCalledWith("Box or Text is not acceptable");
  });

  test("provide error message when positive matcher is failed", () => {
    const onError = vi.fn();
    isInstanceMatching({
      ...renderJsx(
        <$.Body ws:id="body">
          <$.ListItem ws:id="listitem"></$.ListItem>
        </$.Body>
      ),
      instanceSelector: ["box", "body"],
      query: {
        relation: "self",
        component: { $in: ["Box", "Text"] },
      },
      onError,
    });
    expect(onError).toHaveBeenLastCalledWith("Box or Text is missing");
    isInstanceMatching({
      ...renderJsx(
        <$.Body ws:id="body">
          <$.ListItem ws:id="listitem"></$.ListItem>
        </$.Body>
      ),
      instanceSelector: ["box", "body"],
      query: {
        relation: "ancestor",
        component: { $in: ["Box", "Text"] },
      },
      onError,
    });
    expect(onError).toHaveBeenLastCalledWith("Box or Text is missing");
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
    [
      "Tabs",
      {
        type: "container",
        icon: "",
        constraints: {
          relation: "descendant",
          component: { $eq: "TabsTrigger" },
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

  test("match ancestors", () => {
    expect(
      isTreeMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.Tabs ws:id="tabs">
              <$.Box ws:id="box">
                <$.TabsTrigger ws:id="trigger"></$.TabsTrigger>
              </$.Box>
            </$.Tabs>
          </$.Body>
        ),
        metas,
        instanceSelector: ["trigger", "box", "tabs", "body"],
      })
    ).toBeTruthy();
    expect(
      isTreeMatching({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.Tabs ws:id="tabs">
              <$.Box ws:id="box"></$.Box>
            </$.Tabs>
          </$.Body>
        ),
        metas,
        instanceSelector: ["box", "tabs", "body"],
      })
    ).toBeFalsy();
  });
});

describe("find closest instance matching fragment", () => {
  test("finds closest list with list item fragment", () => {
    const { instances } = renderJsx(
      <$.Body ws:id="body">
        <$.List ws:id="list">
          <$.ListItem ws:id="listitem"></$.ListItem>
        </$.List>
      </$.Body>
    );
    const fragment = renderTemplate(<$.ListItem ws:id="new"></$.ListItem>);
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
    const fragment = renderTemplate(<$.Button ws:id="new"></$.Button>);
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
    const fragment = renderTemplate(
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

  test("report first error", () => {
    const onError = vi.fn();
    const { instances } = renderJsx(<$.Body ws:id="body"></$.Body>);
    const fragment = renderTemplate(<$.ListItem ws:id="listitem"></$.ListItem>);
    findClosestInstanceMatchingFragment({
      metas,
      instances,
      instanceSelector: ["body"],
      fragment,
      onError,
    });
    expect(onError).toHaveBeenLastCalledWith("List is missing");
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

  test("allow containers with text", () => {
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
    ).toEqual(0);
  });

  test("allow containers with expression", () => {
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
    ).toEqual(0);
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

describe("find closest non textual container", () => {
  test("skips non-container instances", () => {
    expect(
      findClosestNonTextualContainer({
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
      findClosestNonTextualContainer({
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
      findClosestNonTextualContainer({
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

  test("skips containers with rich text children", () => {
    expect(
      findClosestNonTextualContainer({
        ...renderJsx(
          <$.Body ws:id="body">
            <$.Box ws:id="box">
              <$.Box ws:id="box-with-bold">
                <$.Bold ws:id="bold"></$.Bold>
              </$.Box>
            </$.Box>
          </$.Body>
        ),
        metas,
        instanceSelector: ["box-with-bold", "box", "body"],
      })
    ).toEqual(1);
  });

  test("allow root with text", () => {
    expect(
      findClosestNonTextualContainer({
        ...renderJsx(<$.Body ws:id="body">text</$.Body>),
        metas,
        instanceSelector: ["body"],
      })
    ).toEqual(0);
  });
});
