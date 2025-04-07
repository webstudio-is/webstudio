import { describe, expect, test } from "vitest";
import { coreMetas } from "@webstudio-is/sdk";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import { $, renderData, ws } from "@webstudio-is/template";
import { isTreeSatisfyingContentModel } from "./content-model";

const defaultMetas = new Map(
  Object.entries({ ...coreMetas, ...baseComponentMetas })
);

test("support element with ws:tag", () => {
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="span">
            <ws.element ws:tag="article"></ws.element>
          </ws.element>
        </ws.element>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeFalsy();
});

test("support Box with ws:tag", () => {
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <$.Body ws:id="bodyId">
          <$.Box ws:tag="span">
            <$.Box ws:tag="article"></$.Box>
          </$.Box>
        </$.Body>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeFalsy();
});

test("support legacy tag property", () => {
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <$.Body ws:id="bodyId">
          <$.Box tag="span">
            <$.Box tag="article"></$.Box>
          </$.Box>
        </$.Body>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeFalsy();
});

test("flow accepts flow", () => {
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="article"></ws.element>
        </ws.element>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeTruthy();
});

test("none category accepted by parent by tag", () => {
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="ul">
            <ws.element ws:tag="li"></ws.element>
          </ws.element>
        </ws.element>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeTruthy();
});

test("none category prevents unacceptable parent", () => {
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="li"></ws.element>
        </ws.element>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeFalsy();
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="ul">
            <ws.element ws:tag="div">
              <ws.element ws:tag="li"></ws.element>
            </ws.element>
          </ws.element>
        </ws.element>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeFalsy();
});

test("slot without tag accepts transparent category", () => {
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="ul">
            <$.Slot>
              <$.Fragment>
                <ws.element ws:tag="li"></ws.element>
              </$.Fragment>
            </$.Slot>
          </ws.element>
        </ws.element>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeTruthy();
});

test("collection without tag accepts transparent category", () => {
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="ul">
            <ws.collection>
              <ws.element ws:tag="li"></ws.element>
            </ws.collection>
          </ws.element>
        </ws.element>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeTruthy();
});

test("transparent category accepts flow", () => {
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="a">
            <ws.element ws:tag="article"></ws.element>
          </ws.element>
        </ws.element>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeTruthy();
});

test("phrasing category accepts element with transparent children", () => {
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="span">
            <ws.element ws:tag="a"></ws.element>
          </ws.element>
        </ws.element>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeTruthy();
});

test("transparent category should pass through phrasing category and forbid flow inside", () => {
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="span">
            <ws.element ws:tag="a">
              <ws.element ws:tag="span"></ws.element>
            </ws.element>
          </ws.element>
        </ws.element>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeTruthy();
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="span">
            <ws.element ws:tag="a">
              <ws.element ws:tag="article"></ws.element>
            </ws.element>
          </ws.element>
        </ws.element>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeFalsy();
});

test("transparent category should not pass through invalid parent", () => {
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="ul">
            <ws.element ws:tag="a">
              <ws.element ws:tag="li"></ws.element>
            </ws.element>
          </ws.element>
        </ws.element>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeFalsy();
});

test("transparent category should pass through category when check deep in the tree", () => {
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="span" ws:id="spanId">
            <ws.element ws:tag="a" ws:id="linkId">
              <ws.element ws:tag="strong"></ws.element>
            </ws.element>
          </ws.element>
        </ws.element>
      ),
      metas: defaultMetas,
      instanceSelector: ["linkId", "spanId", "bodyId"],
    })
  ).toBeTruthy();
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="span" ws:id="spanId">
            <ws.element ws:tag="a" ws:id="linkId">
              <ws.element ws:tag="article"></ws.element>
            </ws.element>
          </ws.element>
        </ws.element>
      ),
      metas: defaultMetas,
      instanceSelector: ["linkId", "spanId", "bodyId"],
    })
  ).toBeFalsy();
});

test("restrict empty category", () => {
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="hr"></ws.element>
        </ws.element>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeTruthy();
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="hr">
            <ws.element ws:tag="span"></ws.element>
          </ws.element>
        </ws.element>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeFalsy();
});

test("prevent nesting interactive instances", () => {
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="button">
            <ws.element ws:tag="button"></ws.element>
          </ws.element>
        </ws.element>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeFalsy();
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="button">
            <ws.element ws:tag="span">
              <ws.element ws:tag="a"></ws.element>
            </ws.element>
          </ws.element>
        </ws.element>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeFalsy();
});

test("prevent nesting interactive instances with slots in between", () => {
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="button">
            <$.Slot>
              <$.Fragment>
                <ws.element ws:tag="textarea"></ws.element>
              </$.Fragment>
            </$.Slot>
          </ws.element>
        </ws.element>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeFalsy();
});

test("prevent nesting interactive instances when check deep in the tree", () => {
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="button" ws:id="buttonId">
            <ws.element ws:tag="span" ws:id="spanId">
              <ws.element ws:tag="a" ws:id="linkId"></ws.element>
            </ws.element>
          </ws.element>
        </ws.element>
      ),
      metas: defaultMetas,
      instanceSelector: ["linkId", "spanId", "buttonId", "bodyId"],
    })
  ).toBeFalsy();
});

test("prevent nesting forms", () => {
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="form">
            <ws.element ws:tag="button"></ws.element>
          </ws.element>
        </ws.element>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeTruthy();
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="form" ws:id="formId">
            <ws.element ws:tag="div" ws:id="divId">
              <ws.element ws:tag="form" ws:id="anotherFormId">
                <ws.element ws:tag="button"></ws.element>
              </ws.element>
            </ws.element>
          </ws.element>
        </ws.element>
      ),
      metas: defaultMetas,
      instanceSelector: ["anotherFormId", "divId", "formId", "bodyId"],
    })
  ).toBeFalsy();
});

test("allow wrapping labelable controls with label", () => {
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="label">
            <ws.element ws:tag="span">
              <ws.element ws:tag="input"></ws.element>
            </ws.element>
          </ws.element>
          <ws.element ws:tag="label">
            <ws.element ws:tag="span">
              <ws.element ws:tag="button"></ws.element>
            </ws.element>
          </ws.element>
        </ws.element>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeTruthy();
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="label">
            <ws.element ws:tag="span">
              <ws.element ws:tag="a"></ws.element>
            </ws.element>
          </ws.element>
        </ws.element>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeFalsy();
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="label">
            <ws.element ws:tag="button">
              <ws.element ws:tag="input"></ws.element>
            </ws.element>
          </ws.element>
        </ws.element>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeFalsy();
});

test("edge case: allow inserting div where phrasing is required", () => {
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="button">
            <ws.element ws:tag="div"></ws.element>
          </ws.element>
        </ws.element>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeTruthy();
});

test("edge case: support a > img", () => {
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="a">
            <ws.element ws:tag="img"></ws.element>
          </ws.element>
        </ws.element>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeTruthy();
});

describe("component content model", () => {
  test("restrict children with specific component", () => {
    expect(
      isTreeSatisfyingContentModel({
        ...renderData(
          <ws.element ws:tag="body" ws:id="bodyId">
            <$.HtmlEmbed>
              <ws.descendant />
            </$.HtmlEmbed>
          </ws.element>
        ),
        metas: defaultMetas,
        instanceSelector: ["bodyId"],
      })
    ).toBeTruthy();
    expect(
      isTreeSatisfyingContentModel({
        ...renderData(
          <ws.element ws:tag="body" ws:id="bodyId">
            <$.HtmlEmbed>
              <ws.element ws:tag="div" />
            </$.HtmlEmbed>
          </ws.element>
        ),
        metas: defaultMetas,
        instanceSelector: ["bodyId"],
      })
    ).toBeFalsy();
  });

  test("restrict components within specific ancestor", () => {
    expect(
      isTreeSatisfyingContentModel({
        ...renderData(
          <ws.element ws:tag="body" ws:id="bodyId">
            <$.Vimeo>
              <$.VimeoSpinner></$.VimeoSpinner>
            </$.Vimeo>
          </ws.element>
        ),
        metas: defaultMetas,
        instanceSelector: ["bodyId"],
      })
    ).toBeTruthy();
    expect(
      isTreeSatisfyingContentModel({
        ...renderData(
          <ws.element ws:tag="body" ws:id="bodyId">
            <$.Vimeo>
              <ws.element ws:tag="div">
                <$.VimeoSpinner></$.VimeoSpinner>
              </ws.element>
            </$.Vimeo>
          </ws.element>
        ),
        metas: defaultMetas,
        instanceSelector: ["bodyId"],
      })
    ).toBeTruthy();
    expect(
      isTreeSatisfyingContentModel({
        ...renderData(
          <ws.element ws:tag="body" ws:id="bodyId">
            <$.VimeoSpinner></$.VimeoSpinner>
          </ws.element>
        ),
        metas: defaultMetas,
        instanceSelector: ["bodyId"],
      })
    ).toBeFalsy();
  });

  test("prevent self nesting with descendants restriction", () => {
    expect(
      isTreeSatisfyingContentModel({
        ...renderData(
          <ws.element ws:tag="body" ws:id="bodyId">
            <$.Vimeo>
              <$.VimeoSpinner>
                <$.VimeoSpinner></$.VimeoSpinner>
              </$.VimeoSpinner>
            </$.Vimeo>
          </ws.element>
        ),
        metas: defaultMetas,
        instanceSelector: ["bodyId"],
      })
    ).toBeFalsy();
    expect(
      isTreeSatisfyingContentModel({
        ...renderData(
          <ws.element ws:tag="body" ws:id="bodyId">
            <$.Vimeo>
              <$.VimeoSpinner>
                <$.Vimeo>
                  <$.VimeoSpinner></$.VimeoSpinner>
                </$.Vimeo>
              </$.VimeoSpinner>
            </$.Vimeo>
          </ws.element>
        ),
        metas: defaultMetas,
        instanceSelector: ["bodyId"],
      })
    ).toBeTruthy();
  });

  test("pass constraints when check deep in the tree", () => {
    expect(
      isTreeSatisfyingContentModel({
        ...renderData(
          <ws.element ws:tag="body" ws:id="bodyId">
            <$.Vimeo ws:id="vimeoId">
              <ws.element ws:tag="div" ws:id="divId">
                <$.VimeoSpinner></$.VimeoSpinner>
              </ws.element>
            </$.Vimeo>
          </ws.element>
        ),
        metas: defaultMetas,
        instanceSelector: ["divId", "vimeoId", "bodyId"],
      })
    ).toBeTruthy();
  });
});
