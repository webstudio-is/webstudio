// Locks the public JSX component and intrinsic-element spellings at the
// server evaluator boundary.
import { expect, test } from "vitest";
import { evaluateWebstudioJsxFragment } from "./fragment.server";

test("uses intrinsic tags and direct component identifiers", async () => {
  const fragment = await evaluateWebstudioJsxFragment(
    '<section><Heading tag="h2">Title</Heading></section>'
  );

  expect(fragment.instances).toMatchObject([
    { component: "ws:element", tag: "section" },
    { component: "Heading" },
  ]);
  expect(fragment.props).toContainEqual(
    expect.objectContaining({
      instanceId: fragment.instances[1]?.id,
      name: "tag",
      value: "h2",
    })
  );
});

test("uses a stable prefix for namespaced component-name collisions", async () => {
  const fragment = await evaluateWebstudioJsxFragment("<RadixCheckbox />");

  expect(fragment.instances).toMatchObject([
    {
      component: "@webstudio-is/sdk-components-react-radix:Checkbox",
    },
  ]);
});

test("rejects component member syntax", async () => {
  await expect(
    evaluateWebstudioJsxFragment("<Library.Card />")
  ).rejects.toThrow("JSX component namespaces are not supported");
});
