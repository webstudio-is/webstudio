import { expect, test } from "vitest";
import { coreMetas } from "@webstudio-is/sdk";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import { $, renderData, ws } from "@webstudio-is/template";
import { isTreeSatisfyingContentModel } from "./content-model";

const defaultMetas = new Map(
  Object.entries({ ...coreMetas, ...baseComponentMetas })
);

test("flow accepts flow", () => {
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <$.Body ws:id="bodyId">
          <$.Box ws:id="articleId" tag="article"></$.Box>
        </$.Body>
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
        <$.Body ws:id="bodyId">
          <$.List ws:id="listId">
            <$.ListItem ws:id="itemId"></$.ListItem>
          </$.List>
        </$.Body>
      ),
      metas: defaultMetas,
      instanceSelector: ["listId"],
    })
  ).toBeTruthy();
});

test("none category prevents unacceptable parent 1", () => {
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <$.Body ws:id="bodyId">
          <$.ListItem ws:id="itemId"></$.ListItem>
        </$.Body>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeFalsy();
});

test("none category prevents unacceptable parent 2", () => {
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <$.Body ws:id="bodyId">
          <$.List ws:id="listId">
            <$.Box ws:id="divId">
              <$.ListItem ws:id="itemId"></$.ListItem>
            </$.Box>
          </$.List>
        </$.Body>
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
        <$.Body ws:id="bodyId">
          <$.List ws:id="listId">
            <$.Slot ws:id="slotId">
              <$.Fragment ws:id="fragmentId">
                <$.ListItem ws:id="itemId"></$.ListItem>
              </$.Fragment>
            </$.Slot>
          </$.List>
        </$.Body>
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
        <$.Body ws:id="bodyId">
          <$.List ws:id="listId">
            <ws.collection ws:id="collectionId">
              <$.ListItem ws:id="itemId"></$.ListItem>
            </ws.collection>
          </$.List>
        </$.Body>
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
        <$.Body ws:id="bodyId">
          <$.Link ws:id="linkId">
            <$.Box ws:id="articleId" tag="article"></$.Box>
          </$.Link>
        </$.Body>
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
        <$.Body ws:id="bodyId">
          <$.Box ws:id="spanId" tag="span">
            <$.Link ws:id="linkId"></$.Link>
          </$.Box>
        </$.Body>
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
        <$.Body ws:id="bodyId">
          <$.Box ws:id="spanId" tag="span">
            <$.Link ws:id="linkId">
              <$.Box ws:id="anotherSpanId" tag="span"></$.Box>
            </$.Link>
          </$.Box>
        </$.Body>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeTruthy();
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <$.Body ws:id="bodyId">
          <$.Box ws:id="spanId" tag="span">
            <$.Link ws:id="linkId">
              <$.Box ws:id="articleId" tag="article"></$.Box>
            </$.Link>
          </$.Box>
        </$.Body>
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
        <$.Body ws:id="bodyId">
          <$.List ws:id="listId">
            <$.Link ws:id="linkId">
              <$.ListItem ws:id="itemId"></$.ListItem>
            </$.Link>
          </$.List>
        </$.Body>
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
        <$.Body ws:id="bodyId">
          <$.Box ws:id="spanId" tag="span">
            <$.Link ws:id="linkId">
              <$.Bold ws:id="boldId"></$.Bold>
            </$.Link>
          </$.Box>
        </$.Body>
      ),
      metas: defaultMetas,
      instanceSelector: ["linkId", "spanId", "bodyId"],
    })
  ).toBeTruthy();
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <$.Body ws:id="bodyId">
          <$.Box ws:id="spanId" tag="span">
            <$.Link ws:id="linkId">
              <$.Box ws:id="articleId" tag="article"></$.Box>
            </$.Link>
          </$.Box>
        </$.Body>
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
        <$.Body ws:id="bodyId">
          <$.Separator ws:id="separatorId" />
        </$.Body>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeTruthy();
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <$.Body ws:id="bodyId">
          <$.Separator ws:id="separatorId">
            <$.Box ws:id="spanId" tag="span"></$.Box>
          </$.Separator>
        </$.Body>
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
        <$.Body ws:id="bodyId">
          <$.Button>
            <$.Button></$.Button>
          </$.Button>
        </$.Body>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeFalsy();
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <$.Body ws:id="bodyId">
          <$.Button>
            <$.Box tag="span">
              <$.Link></$.Link>
            </$.Box>
          </$.Button>
        </$.Body>
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
        <$.Body ws:id="bodyId">
          <$.Button>
            <$.Slot>
              <$.Fragment>
                <$.Textarea></$.Textarea>
              </$.Fragment>
            </$.Slot>
          </$.Button>
        </$.Body>
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
        <$.Body ws:id="bodyId">
          <$.Button ws:id="buttonId">
            <$.Box ws:id="spanId" tag="span">
              <$.Link ws:id="linkId"></$.Link>
            </$.Box>
          </$.Button>
        </$.Body>
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
        <$.Body ws:id="bodyId">
          <$.Form>
            <$.Button></$.Button>
          </$.Form>
        </$.Body>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeTruthy();
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <$.Body ws:id="bodyId">
          <$.Form ws:id="formId">
            <$.Box ws:id="divId">
              <$.Form ws:id="anotherFormId">
                <$.Button ws:id="buttonId"></$.Button>
              </$.Form>
            </$.Box>
          </$.Form>
        </$.Body>
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
        <$.Body ws:id="bodyId">
          <$.Label>
            <$.Box tag="span">
              <$.Input />
            </$.Box>
          </$.Label>
          <$.Label>
            <$.Box tag="span">
              <$.Button />
            </$.Box>
          </$.Label>
        </$.Body>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeTruthy();
  expect(
    isTreeSatisfyingContentModel({
      ...renderData(
        <$.Body ws:id="bodyId">
          <$.Label>
            <$.Box tag="span">
              <$.Link />
            </$.Box>
          </$.Label>
        </$.Body>
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
        <$.Body ws:id="bodyId">
          <$.Button>
            <$.Box></$.Box>
          </$.Button>
        </$.Body>
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
        <$.Body ws:id="bodyId">
          <$.Link>
            <$.Image />
          </$.Link>
        </$.Body>
      ),
      metas: defaultMetas,
      instanceSelector: ["bodyId"],
    })
  ).toBeTruthy();
});
