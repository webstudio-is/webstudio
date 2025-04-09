import { describe, expect, test } from "vitest";
import { coreMetas } from "@webstudio-is/sdk";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import { $, expression, renderData, ws } from "@webstudio-is/template";
import {
  findClosestNonTextualContainer,
  findClosestRichText,
  isRichTextTree,
  isTreeSatisfyingContentModel,
} from "./content-model";

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

describe("rich text tree", () => {
  test("check empty instance is rich text", () => {
    expect(
      isRichTextTree({
        ...renderData(<$.Bold ws:id="instanceId"></$.Bold>),
        metas: defaultMetas,
        instanceId: "instanceId",
      })
    ).toBeTruthy();
    expect(
      isRichTextTree({
        ...renderData(<$.HeadSlot ws:id="instanceId"></$.HeadSlot>),
        metas: defaultMetas,
        instanceId: "instanceId",
      })
    ).toBeFalsy();
  });

  test("any instance with text can be edited", () => {
    expect(
      isRichTextTree({
        ...renderData(<$.HeadSlot ws:id="instanceId">my text</$.HeadSlot>),
        metas: defaultMetas,
        instanceId: "instanceId",
      })
    ).toBeTruthy();
    expect(
      isRichTextTree({
        ...renderData(
          <$.HeadSlot ws:id="instanceId">{expression``}</$.HeadSlot>
        ),
        metas: defaultMetas,
        instanceId: "instanceId",
      })
    ).toBeTruthy();
  });

  test("rich text content tags can be edited", () => {
    expect(
      isRichTextTree({
        ...renderData(
          <$.Bold ws:id="instanceId">
            <$.Italic></$.Italic>
          </$.Bold>
        ),
        metas: defaultMetas,
        instanceId: "instanceId",
      })
    ).toBeTruthy();
  });

  test("rich text instances with rich text content can be edited", () => {
    expect(
      isRichTextTree({
        ...renderData(
          <$.Paragraph ws:id="instanceId">
            <$.Bold>bold</$.Bold>
          </$.Paragraph>
        ),
        metas: defaultMetas,
        instanceId: "instanceId",
      })
    ).toBeTruthy();
    expect(
      isRichTextTree({
        ...renderData(
          <$.HeadSlot ws:id="instanceId">
            <$.Bold>bold</$.Bold>
          </$.HeadSlot>
        ),
        metas: defaultMetas,
        instanceId: "instanceId",
      })
    ).toBeFalsy();
  });

  test("div with paragraph cannot be rich text", () => {
    expect(
      isRichTextTree({
        ...renderData(
          <$.Box ws:id="instanceId">
            <$.Paragraph></$.Paragraph>
          </$.Box>
        ),
        metas: defaultMetas,
        instanceId: "instanceId",
      })
    ).toBeFalsy();
  });

  test("finds closest rich text with rich text content", () => {
    expect(
      findClosestRichText({
        ...renderData(
          <ws.element ws:tag="body" ws:id="bodyId">
            <ws.element ws:tag="p" ws:id="paragraphId">
              <ws.element ws:tag="b" ws:id="boldId"></ws.element>
            </ws.element>
          </ws.element>
        ),
        metas: defaultMetas,
        instanceSelector: ["boldId", "paragraphId", "bodyId"],
      })
    ).toEqual(["paragraphId", "bodyId"]);
  });

  test("finds closest rich text with rich text content", () => {
    expect(
      findClosestRichText({
        ...renderData(
          <ws.element ws:tag="body" ws:id="bodyId">
            <ws.element ws:tag="p" ws:id="paragraphId">
              text
            </ws.element>
          </ws.element>
        ),
        metas: defaultMetas,
        instanceSelector: ["paragraphId", "bodyId"],
      })
    ).toEqual(["paragraphId", "bodyId"]);
  });

  test("treat body as rich text when has text inside", () => {
    expect(
      findClosestRichText({
        ...renderData(
          <ws.element ws:tag="body" ws:id="bodyId">
            text
            <ws.element ws:tag="p" ws:id="paragraphId">
              <ws.element ws:tag="b" ws:id="boldId"></ws.element>
            </ws.element>
          </ws.element>
        ),
        metas: defaultMetas,
        instanceSelector: ["boldId", "paragraphId", "bodyId"],
      })
    ).toEqual(["bodyId"]);
  });

  test("ignore <a> with <div> inside", () => {
    const data = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <ws.element ws:tag="a" ws:id="linkId">
          <ws.element ws:tag="div" ws:id="divId"></ws.element>
        </ws.element>
      </ws.element>
    );
    expect(
      findClosestRichText({
        ...data,
        metas: defaultMetas,
        instanceSelector: ["divId", "linkId", "bodyId"],
      })
    ).toEqual(["divId", "linkId", "bodyId"]);
    expect(
      findClosestRichText({
        ...data,
        metas: defaultMetas,
        instanceSelector: ["linkId", "bodyId"],
      })
    ).toEqual(undefined);
  });

  test("finds link rich text", () => {
    expect(
      findClosestRichText({
        ...renderData(
          <ws.element ws:tag="body" ws:id="bodyId">
            <ws.element ws:tag="div" ws:id="divId">
              <ws.element ws:tag="a" ws:id="linkId">
                my link
              </ws.element>
            </ws.element>
          </ws.element>
        ),
        metas: defaultMetas,
        instanceSelector: ["linkId", "divId", "bodyId"],
      })
    ).toEqual(["linkId", "divId", "bodyId"]);
  });

  test("finds span rich text", () => {
    expect(
      findClosestRichText({
        ...renderData(
          <ws.element ws:tag="body" ws:id="bodyId">
            <ws.element ws:tag="div" ws:id="divId">
              <ws.element ws:tag="span" ws:id="spanId">
                my span
              </ws.element>
            </ws.element>
          </ws.element>
        ),
        metas: defaultMetas,
        instanceSelector: ["spanId", "divId", "bodyId"],
      })
    ).toEqual(["spanId", "divId", "bodyId"]);
  });

  test("finds rich text with mixed children", () => {
    expect(
      findClosestRichText({
        ...renderData(
          <ws.element ws:tag="body" ws:id="bodyId">
            <ws.element ws:tag="div" ws:id="divId">
              <ws.element ws:tag="span" ws:id="spanId">
                my link
              </ws.element>
              <ws.element ws:tag="b" ws:id="boldId">
                my link
              </ws.element>
            </ws.element>
          </ws.element>
        ),
        metas: defaultMetas,
        instanceSelector: ["spanId", "divId", "bodyId"],
      })
    ).toEqual(["divId", "bodyId"]);
  });
});

describe("closest non textual container", () => {
  test("skips non-container instances", () => {
    expect(
      findClosestNonTextualContainer({
        ...renderData(
          <$.Body ws:id="bodyId">
            <$.Box ws:id="boxId">
              <$.Image ws:id="imageId" />
            </$.Box>
          </$.Body>
        ),
        metas: defaultMetas,
        instanceSelector: ["imageId", "boxId", "bodyId"],
      })
    ).toEqual(["boxId", "bodyId"]);
  });

  test("skips containers with text", () => {
    expect(
      findClosestNonTextualContainer({
        ...renderData(
          <$.Body ws:id="bodyId">
            <$.Box ws:id="boxId">
              <$.Box ws:id="box-with-text">text</$.Box>
            </$.Box>
          </$.Body>
        ),
        metas: defaultMetas,
        instanceSelector: ["box-with-text", "boxId", "bodyId"],
      })
    ).toEqual(["boxId", "bodyId"]);
  });

  test("skips containers with expression", () => {
    expect(
      findClosestNonTextualContainer({
        ...renderData(
          <$.Body ws:id="bodyId">
            <$.Box ws:id="boxId">
              <$.Box ws:id="box-with-expr">{expression`1 + 1`}</$.Box>
            </$.Box>
          </$.Body>
        ),
        metas: defaultMetas,
        instanceSelector: ["box-with-expr", "boxId", "bodyId"],
      })
    ).toEqual(["boxId", "bodyId"]);
  });

  test("skips containers with rich text children", () => {
    expect(
      findClosestNonTextualContainer({
        ...renderData(
          <$.Body ws:id="bodyId">
            <$.Box ws:id="boxId">
              <$.Box ws:id="box-with-bold">
                <$.Bold ws:id="boldId"></$.Bold>
              </$.Box>
            </$.Box>
          </$.Body>
        ),
        metas: defaultMetas,
        instanceSelector: ["box-with-bold", "boxId", "bodyId"],
      })
    ).toEqual(["boxId", "bodyId"]);
  });

  test("allow root with text", () => {
    expect(
      findClosestNonTextualContainer({
        ...renderData(<$.Body ws:id="body">text</$.Body>),
        metas: defaultMetas,
        instanceSelector: ["body"],
      })
    ).toEqual(["body"]);
  });

  test("matches empty div", () => {
    expect(
      findClosestNonTextualContainer({
        ...renderData(
          <ws.element ws:tag="body" ws:id="bodyId">
            <ws.element ws:tag="div" ws:id="divId"></ws.element>
          </ws.element>
        ),
        metas: defaultMetas,
        instanceSelector: ["divId", "bodyId"],
      })
    ).toEqual(["divId", "bodyId"]);
  });
});
