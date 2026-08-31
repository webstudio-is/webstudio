import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import {
  blockComponent,
  contentBlockDocumentProp,
  encodeDataSourceVariable,
  type Instance,
  type Prop,
} from "@webstudio-is/sdk";
import { $builderMode, selectInstance } from "~/shared/nano-states";
import { $instances, $props } from "~/shared/sync/data-stores";
import { $externalContentRoots } from "~/shared/external-content-mutations";
import { TextControl } from "./text";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const block: Instance = {
    type: "instance",
    id: "block",
    component: blockComponent,
    children: [{ type: "id", value: "heading" }],
  };
  const heading: Instance = {
    type: "instance",
    id: "heading",
    component: "Heading",
    children: [],
  };
  const documentProp: Prop = {
    id: "document",
    instanceId: block.id,
    name: contentBlockDocumentProp,
    type: "parameter",
    value: "document-data-source",
  };
  const titleProp: Prop = {
    id: "title",
    instanceId: heading.id,
    name: "title",
    type: "expression",
    value: `${encodeDataSourceVariable("document-data-source")}.frontmatter.title`,
    mode: "readwrite",
  };
  const sourceProp: Prop = {
    id: "source",
    instanceId: block.id,
    name: "src",
    type: "asset",
    value: "article",
  };
  $instances.set(
    new Map([
      [block.id, block],
      [heading.id, heading],
    ])
  );
  $props.set(
    new Map<string, Prop>([
      [documentProp.id, documentProp],
      [sourceProp.id, sourceProp],
      [titleProp.id, titleProp],
    ])
  );
  $externalContentRoots.set(
    new Map([
      [
        "root",
        {
          blockInstanceId: block.id,
          instanceIds: new Set([heading.id]),
          mutationRevision: 0,
          document: {
            frontmatter: { properties: { title: "Before" } },
            children: [],
          },
        },
      ],
    ])
  );
  $builderMode.set("content");
  selectInstance([heading.id, block.id]);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  selectInstance(undefined);
  $instances.set(new Map());
  $props.set(new Map());
  $externalContentRoots.set(new Map());
  $builderMode.set("design");
});

test("saves an edited direct frontmatter binding without exposing the binding", () => {
  const onChange = vi.fn();
  const prop = $props.get().get("title");
  if (prop === undefined) {
    throw new Error("Expected title prop");
  }
  act(() => {
    root.render(
      <TooltipProvider>
        <TextControl
          instanceId="heading"
          meta={{ type: "string", control: "text", required: false }}
          prop={prop}
          propName="title"
          computedValue="Before"
          onChange={onChange}
        />
      </TooltipProvider>
    );
  });
  const input = container.querySelector<HTMLTextAreaElement>("textarea");
  if (input === null) {
    throw new Error("Expected text control");
  }

  expect(input.disabled).toBe(false);
  expect(container.querySelector('[data-variant="bound"]')).toBeNull();
  act(() => {
    input.focus();
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value"
    )?.set?.call(input, "After");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  act(() => {
    input.blur();
  });

  expect(onChange).toHaveBeenCalledWith({ type: "string", value: "After" });
});
