import { test, expect } from "vitest";
import { createHeadlessEditor } from "@lexical/headless";
import { LinkNode } from "@lexical/link";
import { $, renderData, renderTemplate, ws } from "@webstudio-is/template";
import { $convertToLexical, $convertToUpdates, type Refs } from "./interop";

const { instances } = renderData(
  <$.Body ws:id="bodyId">
    <$.Box ws:id="emptyBoxId"></$.Box>
    <$.Box ws:id="textBoxId">
      Hello{"\n"}
      <$.Bold ws:id="boldId">
        <$.Italic ws:id="italicId">world</$.Italic>
      </$.Bold>
      {"\n"}
      <$.Span ws:id="spanId">and</$.Span>
      {"\n"}
      <$.RichTextLink ws:id="linkId" href="/my-url">
        other realms
      </$.RichTextLink>
    </$.Box>
    <ws.element ws:tag="div" ws:id="textElementId">
      Hello{"\n"}
      <ws.element ws:tag="b" ws:id="boldElementId">
        <ws.element ws:tag="i" ws:id="italicElementId">
          world
        </ws.element>
      </ws.element>
      {"\n"}
      <ws.element ws:tag="span" ws:id="spanElementId">
        and
      </ws.element>
      {"\n"}
      <ws.element ws:tag="a" ws:id="linkElementId" href="/my-url">
        other realms
      </ws.element>
    </ws.element>
  </$.Body>
);

const expectedState = {
  root: expect.objectContaining({
    type: "root",
    children: [
      expect.objectContaining({
        type: "paragraph",
        children: [
          expect.objectContaining({
            type: "text",
            format: 0,
            style: "",
            text: "Hello",
          }),
          expect.objectContaining({ type: "linebreak" }),
          expect.objectContaining({
            type: "text",
            format: 3,
            style: "",
            text: "world",
          }),
          expect.objectContaining({ type: "linebreak" }),
          expect.objectContaining({
            type: "text",
            format: 0,
            style: "--style-node-trigger: 1;",
            text: "and",
          }),
          expect.objectContaining({ type: "linebreak" }),
          expect.objectContaining({
            type: "link",
            format: "",
            rel: null,
            target: null,
            title: null,
            url: "",
            children: [
              expect.objectContaining({
                type: "text",
                format: 0,
                style: "",
                text: "other realms",
              }),
            ],
          }),
        ],
      }),
    ],
  }),
};

test("convert legacy instances to lexical", async () => {
  const refs: Refs = new Map();
  const editor = createHeadlessEditor({
    nodes: [LinkNode],
  });
  await new Promise<void>((resolve) => {
    editor.update(
      () => {
        $convertToLexical(instances, "textBoxId", refs);
      },
      { onUpdate: resolve }
    );
  });
  expect(editor.getEditorState().toJSON()).toEqual(expectedState);
  expect(refs).toEqual(
    new Map([
      ["4:bold", "boldId"],
      ["4:italic", "italicId"],
      ["6:span", "spanId"],
      ["8", "linkId"],
    ])
  );
});

test("convert element instances to lexical", async () => {
  const refs: Refs = new Map();
  const editor = createHeadlessEditor({
    nodes: [LinkNode],
  });
  await new Promise<void>((resolve) => {
    editor.update(
      () => {
        $convertToLexical(instances, "textElementId", refs);
      },
      { onUpdate: resolve }
    );
  });
  expect(editor.getEditorState().toJSON()).toEqual(expectedState);
  expect(refs).toEqual(
    new Map([
      ["13:bold", "boldElementId"],
      ["13:italic", "italicElementId"],
      ["15:span", "spanElementId"],
      ["17", "linkElementId"],
    ])
  );
});

test("convert lexical to element instances updates", async () => {
  const refs: Refs = new Map();
  const editor = createHeadlessEditor({
    nodes: [LinkNode],
  });
  await new Promise<void>((resolve) => {
    editor.update(
      () => {
        $convertToLexical(instances, "textElementId", refs);
      },
      { onUpdate: resolve }
    );
  });
  const treeRootInstance = instances.get("textElementId");
  if (treeRootInstance === undefined) {
    throw Error("Tree root instance should be in test data");
  }
  const updates = editor.getEditorState().read(() => {
    return $convertToUpdates(treeRootInstance, refs, new Map());
  });
  expect(updates).toEqual(
    renderTemplate(
      <ws.element ws:tag="div" ws:id="textElementId">
        Hello{"\n"}
        <ws.element ws:tag="b" ws:id="boldElementId">
          <ws.element ws:tag="i" ws:id="italicElementId">
            world
          </ws.element>
        </ws.element>
        {"\n"}
        <ws.element ws:tag="span" ws:id="spanElementId">
          and
        </ws.element>
        {"\n"}
        <ws.element ws:tag="a" ws:id="linkElementId" href="/my-url">
          other realms
        </ws.element>
      </ws.element>
    ).instances
  );
});
