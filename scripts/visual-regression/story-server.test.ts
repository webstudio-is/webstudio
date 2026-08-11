import assert from "node:assert/strict";
import test from "node:test";
import { parse, type DefaultTreeAdapterTypes as Html } from "parse5";
import { visualStoryHtml } from "./story-server";

const findElement = (
  node: Html.Node,
  predicate: (element: Html.Element) => boolean
): Html.Element | undefined => {
  if ("tagName" in node && predicate(node)) {
    return node;
  }
  if ("childNodes" in node) {
    for (const child of node.childNodes) {
      const match = findElement(child, predicate);
      if (match !== undefined) {
        return match;
      }
    }
  }
};

test("keeps the bundled story stylesheet outside the disposable body content", () => {
  const document = parse(visualStoryHtml);
  const stylesheet = findElement(
    document,
    (element) =>
      element.tagName === "link" &&
      element.attrs.some(
        ({ name, value }) => name === "href" && value === "/harness.css"
      )
  );
  assert.equal(stylesheet?.parentNode?.nodeName, "head");
});
