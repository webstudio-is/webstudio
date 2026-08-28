import { describe, expect, test } from "vitest";
import {
  blockBodyComponent,
  blockComponent,
  blockTemplateComponent,
  contentBlockDocumentProp,
  contentBlockSourceProp,
  encodeDataSourceVariable,
  elementComponent,
  type Instance,
  type Prop,
} from "@webstudio-is/sdk";
import { isTextEditableInContentMode } from "./content-mode";

const instance = (id: string, component: string, childIds: string[] = []) => ({
  type: "instance" as const,
  id,
  component,
  children: childIds.map((value) => ({ type: "id" as const, value })),
});

describe("isTextEditableInContentMode", () => {
  const instances = new Map([
    ["body", instance("body", elementComponent, ["outside", "block"])],
    ["outside", instance("outside", elementComponent)],
    ["block", instance("block", blockComponent, ["inside", "templates"])],
    ["inside", instance("inside", elementComponent)],
    ["templates", instance("templates", blockTemplateComponent, ["source"])],
    ["source", instance("source", elementComponent)],
  ]);

  test("permits only Content Block descendants in content mode", () => {
    expect(
      isTextEditableInContentMode({
        isContentMode: true,
        instanceSelector: ["inside", "block", "body"],
        instances,
        props: new Map(),
      })
    ).toBe(true);
    expect(
      isTextEditableInContentMode({
        isContentMode: true,
        instanceSelector: ["outside", "body"],
        instances,
        props: new Map(),
      })
    ).toBe(false);
    expect(
      isTextEditableInContentMode({
        isContentMode: true,
        instanceSelector: ["source", "templates", "block", "body"],
        instances,
        props: new Map(),
      })
    ).toBe(false);
  });

  test("does not restrict Design mode", () => {
    expect(
      isTextEditableInContentMode({
        isContentMode: false,
        instanceSelector: ["outside", "body"],
        instances,
        props: new Map(),
      })
    ).toBe(true);
  });

  test("permits a direct frontmatter text binding outside the Body", () => {
    const document = encodeDataSourceVariable("document-source");
    const explicitInstances = new Map<string, Instance>([
      ["block", instance("block", blockComponent, ["title", "content"])],
      [
        "title",
        {
          ...instance("title", elementComponent),
          children: [
            {
              type: "expression" as const,
              value: `${document}.frontmatter.title`,
            },
          ],
        },
      ],
      ["content", instance("content", blockBodyComponent)],
    ]);
    const props = new Map<string, Prop>([
      [
        "source",
        {
          id: "source",
          instanceId: "block",
          name: contentBlockSourceProp,
          type: "asset",
          value: "article",
        },
      ],
      [
        "document",
        {
          id: "document",
          instanceId: "block",
          name: contentBlockDocumentProp,
          type: "parameter",
          value: "document-source",
        },
      ],
    ]);

    expect(
      isTextEditableInContentMode({
        isContentMode: true,
        instanceSelector: ["title", "block"],
        instances: explicitInstances,
        props,
      })
    ).toBe(true);

    props.delete("source");
    expect(
      isTextEditableInContentMode({
        isContentMode: true,
        instanceSelector: ["title", "block"],
        instances: explicitInstances,
        props,
      })
    ).toBe(false);
  });
});
