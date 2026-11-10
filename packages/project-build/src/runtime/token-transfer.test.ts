import { expect, test } from "vitest";
import { parseCssValue } from "@webstudio-is/css-data";
import {
  getStyleDeclKey,
  getTagStyleId,
  ROOT_INSTANCE_ID,
  type Asset,
  type StyleDecl,
} from "@webstudio-is/sdk";
import {
  copyDesignToken,
  copyStyleSourceTransfer,
  pasteDesignToken,
  pasteStyleSourceTransfer,
} from "./token-transfer";
import {
  parseTagStyleTransferData,
  parseTokenTransferData,
} from "./data-formats/token-css";
import { remapFragmentAssets } from "./fragment";
import { applyBuilderPatchTransactions } from "../state/patch";

const style = (
  styleSourceId: string,
  breakpointId: string,
  property: StyleDecl["property"],
  value: string
): StyleDecl => ({
  styleSourceId,
  breakpointId,
  property,
  value: { type: "unparsed", value },
});

const styleMap = (declarations: StyleDecl[]) =>
  new Map(
    declarations.map((declaration) => [
      getStyleDeclKey(declaration),
      declaration,
    ])
  );

test("pastes Tag styles into the matching tag and overwrites only matching declarations", () => {
  const id = getTagStyleId("button");
  const hover = { ...style(id, "base", "color", "red"), state: ":hover" };
  const copied = copyStyleSourceTransfer(
    {
      assets: new Map(),
      breakpoints: new Map([
        ["base", { id: "base", label: "Base" }],
        ["mobile", { id: "mobile", label: "Mobile", maxWidth: 600 }],
      ]),
      styleSources: new Map([[id, { type: "tag", id, tag: "button" }]]),
      styleSourceSelections: new Map(),
      styles: styleMap([
        hover,
        style(id, "base", "paddingTop", "8px"),
        style(id, "mobile", "color", "orange"),
      ]),
    },
    { styleSourceId: id, sourceType: "tag" }
  );
  const parsed = parseTagStyleTransferData(copied.data);
  expect(parsed.valid).toBe(true);
  const target = {
    assets: new Map(),
    breakpoints: new Map([
      ["target-base", { id: "target-base", label: "Base" }],
      [
        "target-mobile",
        { id: "target-mobile", label: "Mobile", maxWidth: 600 },
      ],
    ]),
    styleSources: new Map([[id, { type: "tag" as const, id, tag: "button" }]]),
    styleSourceSelections: new Map(),
    styles: styleMap([
      { ...style(id, "target-base", "color", "blue"), state: ":hover" },
      style(id, "target-base", "marginTop", "4px"),
      style(id, "target-mobile", "color", "blue"),
      style(getTagStyleId("h1"), "target-base", "color", "green"),
    ]),
  };
  const mutation = pasteStyleSourceTransfer(target, { data: copied.data });
  expect(mutation.result).toEqual({ styleSourceId: id });
  const pasted = applyBuilderPatchTransactions(target, [
    { id: "paste", payload: mutation.payload },
  ]).state;
  expect(
    pasted.styles!.get(`${id}:target-base:color::hover`)?.value
  ).toMatchObject({ value: "red" });
  expect(
    pasted.styles!.get(`${id}:target-base:paddingTop:`)?.value
  ).toMatchObject({ type: "unit", unit: "px", value: 8 });
  expect(pasted.styles!.get(`${id}:target-mobile:color:`)?.value).toMatchObject(
    {
      value: "orange",
    }
  );
  expect(
    pasted.styles!.get(`${id}:target-base:marginTop:`)?.value
  ).toMatchObject({ value: "4px" });
  expect(
    pasted.styles!.get(`${getTagStyleId("h1")}:target-base:color:`)?.value
  ).toMatchObject({ value: "green" });
});

test("copies a Tag style before it has any saved declarations", () => {
  const copied = copyStyleSourceTransfer(
    {
      assets: new Map(),
      breakpoints: new Map(),
      styleSources: new Map(),
      styleSourceSelections: new Map(),
      styles: new Map(),
    },
    { styleSourceId: getTagStyleId("div"), sourceType: "tag" }
  );
  const parsed = parseTagStyleTransferData(copied.data);
  expect(parsed.valid).toBe(true);
  if (parsed.valid) {
    expect(parsed.data.fragment.styleSources).toEqual([
      { type: "tag", id: getTagStyleId("div"), tag: "div" },
    ]);
  }
});

test("creates the matching Tag style on paste without attaching it to an instance", () => {
  const id = getTagStyleId("h1");
  const copied = copyStyleSourceTransfer(
    {
      assets: new Map(),
      breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
      styleSources: new Map([[id, { type: "tag", id, tag: "h1" }]]),
      styleSourceSelections: new Map(),
      styles: styleMap([style(id, "base", "color", "red")]),
    },
    { styleSourceId: id, sourceType: "tag" }
  );
  const target = {
    assets: new Map(),
    breakpoints: new Map([
      ["target-base", { id: "target-base", label: "Base" }],
    ]),
    styleSources: new Map(),
    styleSourceSelections: new Map(),
    styles: new Map(),
  };
  const mutation = pasteStyleSourceTransfer(target, { data: copied.data });
  const pasted = applyBuilderPatchTransactions(target, [
    { id: "paste", payload: mutation.payload },
  ]).state;
  expect(pasted.styleSources?.get(id)).toEqual({
    type: "tag",
    id,
    tag: "h1",
  });
  expect(pasted.styles?.get(`${id}:target-base:color:`)?.value).toMatchObject({
    value: "red",
  });
  expect(pasted.styleSourceSelections?.size).toBe(0);
});

test("pastes Local styles into the selected instance and overwrites matching declarations", () => {
  const copied = copyStyleSourceTransfer(
    {
      assets: new Map(),
      breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
      styleSources: new Map([
        ["source-local", { type: "local", id: "source-local" }],
      ]),
      styleSourceSelections: new Map(),
      styles: styleMap([
        { ...style("source-local", "base", "color", "red"), state: ":hover" },
        style("source-local", "base", "paddingTop", "8px"),
      ]),
    },
    { styleSourceId: "source-local", sourceType: "local" }
  );
  const target = {
    assets: new Map(),
    instances: new Map([
      [
        "box",
        {
          type: "instance" as const,
          id: "box",
          component: "Box",
          children: [],
        },
      ],
    ]),
    breakpoints: new Map([
      ["target-base", { id: "target-base", label: "Base" }],
    ]),
    styleSources: new Map([
      ["target-local", { type: "local" as const, id: "target-local" }],
    ]),
    styleSourceSelections: new Map([
      ["box", { instanceId: "box", values: ["target-local"] }],
    ]),
    styles: styleMap([
      {
        ...style("target-local", "target-base", "color", "blue"),
        state: ":hover",
      },
      style("target-local", "target-base", "marginTop", "4px"),
    ]),
  };
  const mutation = pasteStyleSourceTransfer(target, {
    data: copied.data,
    instanceId: "box",
  });
  expect(mutation.result).toEqual({ styleSourceId: "target-local" });
  const pasted = applyBuilderPatchTransactions(target, [
    { id: "paste", payload: mutation.payload },
  ]).state;
  expect(
    pasted.styles?.get("target-local:target-base:color::hover")?.value
  ).toMatchObject({ value: "red" });
  expect(
    pasted.styles?.get("target-local:target-base:paddingTop:")?.value
  ).toMatchObject({ type: "unit", unit: "px", value: 8 });
  expect(
    pasted.styles?.get("target-local:target-base:marginTop:")?.value
  ).toMatchObject({ value: "4px" });
  expect(pasted.styleSourceSelections?.get("box")?.values).toEqual([
    "target-local",
  ]);
});

test("creates one Local source when pasting into an instance without one", () => {
  const copied = copyStyleSourceTransfer(
    {
      assets: new Map(),
      breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
      styleSources: new Map(),
      styleSourceSelections: new Map(),
      styles: new Map(),
    },
    { styleSourceId: "temporary-local", sourceType: "local" }
  );
  const target = {
    assets: new Map(),
    instances: new Map([
      [
        "box",
        {
          type: "instance" as const,
          id: "box",
          component: "Box",
          children: [],
        },
      ],
    ]),
    breakpoints: new Map([
      ["target-base", { id: "target-base", label: "Base" }],
    ]),
    styleSources: new Map(),
    styleSourceSelections: new Map(),
    styles: new Map(),
  };
  const mutation = pasteStyleSourceTransfer(
    target,
    { data: copied.data, instanceId: "box" },
    { createId: () => "new-local" }
  );
  expect(mutation.result).toEqual({ styleSourceId: "new-local" });
  const pasted = applyBuilderPatchTransactions(target, [
    { id: "paste", payload: mutation.payload },
  ]).state;
  expect(pasted.styleSources?.get("new-local")).toEqual({
    type: "local",
    id: "new-local",
  });
  expect(pasted.styleSourceSelections?.get("box")?.values).toEqual([
    "new-local",
  ]);
});

test("pastes Local styles into Global root without creating two Local sources", () => {
  const copied = copyStyleSourceTransfer(
    {
      assets: new Map(),
      breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
      styleSources: new Map([
        ["source-local", { type: "local", id: "source-local" }],
      ]),
      styleSourceSelections: new Map(),
      styles: styleMap([style("source-local", "base", "color", "red")]),
    },
    { styleSourceId: "source-local", sourceType: "local" }
  );
  const target = {
    assets: new Map(),
    instances: new Map(),
    breakpoints: new Map([
      ["target-base", { id: "target-base", label: "Base" }],
    ]),
    styleSources: new Map(),
    styleSourceSelections: new Map(),
    styles: new Map(),
  };
  const mutation = pasteStyleSourceTransfer(
    target,
    { data: copied.data, instanceId: ROOT_INSTANCE_ID },
    { createId: () => "root-local" }
  );
  const pasted = applyBuilderPatchTransactions(target, [
    { id: "paste", payload: mutation.payload },
  ]).state;
  expect(pasted.styleSourceSelections?.get(ROOT_INSTANCE_ID)?.values).toEqual([
    "root-local",
  ]);
  expect(pasted.styleSources?.get("root-local")).toEqual({
    type: "local",
    id: "root-local",
  });
  expect(
    pasted.styles?.get("root-local:target-base:color:")?.value
  ).toMatchObject({ value: "red" });
});

test("copies a token with breakpoint styles and transitive root CSS variables", () => {
  const source = {
    assets: new Map(),
    breakpoints: new Map([
      ["base", { id: "base", label: "Base" }],
      ["mobile", { id: "mobile", label: "Mobile", maxWidth: 600 }],
    ]),
    styleSources: new Map([
      ["token", { type: "token" as const, id: "token", name: "Button" }],
      ["root", { type: "local" as const, id: "root" }],
    ]),
    styleSourceSelections: new Map([
      [ROOT_INSTANCE_ID, { instanceId: ROOT_INSTANCE_ID, values: ["root"] }],
    ]),
    styles: styleMap([
      style("token", "base", "color", "var(--brand)"),
      style("token", "mobile", "paddingTop", "20px"),
      style("root", "base", "--brand", "var(--tone)"),
      style("root", "mobile", "--brand", "blue"),
      style("root", "base", "--tone", "red"),
      style("root", "base", "--unrelated", "black"),
    ]),
  };
  const copied = copyStyleSourceTransfer(source, {
    styleSourceId: "token",
    sourceType: "token",
  });
  expect(copied.data.startsWith('/* @webstudio/token-css/v1 "Button" */')).toBe(
    true
  );
  const parsed = parseTokenTransferData(copied.data);
  expect(parsed.valid).toBe(true);
  if (parsed.valid === false) {
    return;
  }
  expect(
    parsed.data.fragment.styles.map((item) => item.property).sort()
  ).toEqual(["color", "paddingTop", "--brand", "--brand", "--tone"].sort());
  expect(parsed.data.fragment.breakpoints).toEqual(
    expect.arrayContaining([expect.objectContaining({ maxWidth: 600 })])
  );

  const target = {
    assets: new Map(),
    instances: new Map([
      [
        "box",
        {
          type: "instance" as const,
          id: "box",
          component: "Box",
          children: [],
        },
      ],
    ]),
    breakpoints: new Map([
      ["target-base", { id: "target-base", label: "Base" }],
    ]),
    styleSources: new Map([
      ["target-root", { type: "local" as const, id: "target-root" }],
    ]),
    styleSourceSelections: new Map([
      [
        ROOT_INSTANCE_ID,
        { instanceId: ROOT_INSTANCE_ID, values: ["target-root"] },
      ],
    ]),
    styles: styleMap([style("target-root", "target-base", "--brand", "green")]),
  };
  const ids = ["target-mobile", "new-token"];
  const mutation = pasteDesignToken(
    target,
    { data: copied.data, instanceId: "box" },
    {
      createId: () => ids.shift()!,
    }
  );
  expect(mutation.result.tokenId).toBe("new-token");
  expect(
    mutation.payload.find((change) => change.namespace === "styleSources")
      ?.patches
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        value: expect.objectContaining({ name: "Button copy 1" }),
      }),
    ])
  );
  expect(mutation.payload).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        namespace: "styleSourceSelections",
        patches: expect.arrayContaining([
          expect.objectContaining({
            value: { instanceId: "box", values: ["new-token"] },
          }),
        ]),
      }),
    ])
  );
  expect(mutation.payload).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ namespace: "breakpoints" }),
      expect.objectContaining({ namespace: "styleSources" }),
      expect.objectContaining({ namespace: "styles" }),
    ])
  );
  const styles = mutation.payload.find(
    (change) => change.namespace === "styles"
  );
  expect(styles?.patches).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        path: ["new-token:target-base:color:"],
        value: expect.objectContaining({
          value: { type: "unparsed", value: "var(--brand-1)" },
        }),
      }),
      expect.objectContaining({
        path: ["target-root:target-mobile:--brand-1:"],
      }),
      expect.objectContaining({ path: ["target-root:target-base:--tone:"] }),
    ])
  );
  expect(target.styles.has("target-root:target-base:--brand-1:")).toBe(false);
  const pastedState = applyBuilderPatchTransactions(target, [
    { id: "paste", payload: mutation.payload },
  ]).state;
  const repeated = pasteDesignToken(
    pastedState,
    { data: copied.data, instanceId: "box" },
    { createId: () => "another-token" }
  );
  expect(repeated.result.tokenId).toBe("another-token");
  expect(repeated.noop).toBe(false);
  expect(
    repeated.payload.find((change) => change.namespace === "styleSources")
      ?.patches
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        value: expect.objectContaining({ name: "Button copy 2" }),
      }),
    ])
  );
});

test("copies html Tag variables below attached Global root variables", () => {
  const htmlTagStyleId = getTagStyleId("html");
  const source = {
    assets: new Map(),
    breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
    styleSources: new Map([
      ["token", { type: "token" as const, id: "token", name: "Card" }],
      [
        htmlTagStyleId,
        { type: "tag" as const, id: htmlTagStyleId, tag: "html" },
      ],
      ["root", { type: "local" as const, id: "root" }],
    ]),
    styleSourceSelections: new Map([
      [ROOT_INSTANCE_ID, { instanceId: ROOT_INSTANCE_ID, values: ["root"] }],
    ]),
    styles: styleMap([
      style("token", "base", "color", "var(--brand)"),
      style("token", "base", "paddingTop", "var(--space)"),
      style(htmlTagStyleId, "base", "--brand", "red"),
      style(htmlTagStyleId, "base", "--space", "8px"),
      style("root", "base", "--brand", "blue"),
    ]),
  };

  const copied = copyStyleSourceTransfer(source, {
    styleSourceId: "token",
    sourceType: "token",
  });
  const parsed = parseTokenTransferData(copied.data);

  expect(parsed.valid).toBe(true);
  if (parsed.valid) {
    expect(
      parsed.data.fragment.styles.map((item) => [item.property, item.value])
    ).toEqual(
      expect.arrayContaining([
        ["--brand", expect.objectContaining({ value: "blue" })],
        ["--space", expect.objectContaining({ value: 8 })],
      ])
    );
    expect(
      parsed.data.fragment.styles
        .filter((item) => item.property === "--brand")
        .map((item) => item.value)
    ).toEqual([expect.objectContaining({ value: "blue" })]);
  }
});

test("copies html Tag variables referenced by another Tag style", () => {
  const htmlTagStyleId = getTagStyleId("html");
  const tagStyleId = getTagStyleId("h1");
  const copied = copyStyleSourceTransfer(
    {
      assets: new Map(),
      breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
      styleSources: new Map([
        [
          htmlTagStyleId,
          { type: "tag" as const, id: htmlTagStyleId, tag: "html" },
        ],
        [tagStyleId, { type: "tag" as const, id: tagStyleId, tag: "h1" }],
      ]),
      styleSourceSelections: new Map(),
      styles: styleMap([
        style(tagStyleId, "base", "color", "var(--brand)"),
        style(htmlTagStyleId, "base", "--brand", "red"),
      ]),
    },
    { styleSourceId: tagStyleId, sourceType: "tag" }
  );
  const parsed = parseTagStyleTransferData(copied.data);

  expect(parsed.valid).toBe(true);
  if (parsed.valid) {
    expect(parsed.data.fragment.styles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: "--brand",
          value: expect.objectContaining({ value: "red" }),
        }),
      ])
    );
  }
});

test("copies the winning root variable when root sources overlap", () => {
  const copied = copyDesignToken(
    {
      assets: new Map(),
      breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
      styleSources: new Map([
        ["token", { type: "token", id: "token", name: "Button" }],
        ["local", { type: "local", id: "local" }],
        ["theme", { type: "token", id: "theme", name: "Theme" }],
      ]),
      styleSourceSelections: new Map([
        [
          ROOT_INSTANCE_ID,
          { instanceId: ROOT_INSTANCE_ID, values: ["theme", "local"] },
        ],
      ]),
      styles: styleMap([
        style("token", "base", "color", "var(--brand)"),
        style("local", "base", "--brand", "red"),
        style("theme", "base", "--brand", "blue"),
      ]),
    },
    { tokenId: "token" }
  );
  const parsed = parseTokenTransferData(copied.data);
  expect(parsed.valid).toBe(true);
  if (parsed.valid === false) {
    return;
  }
  expect(
    parsed.data.fragment.styles.filter((item) => item.property === "--brand")
  ).toEqual([
    expect.objectContaining({
      property: "--brand",
      value: { type: "unparsed", value: "red" },
    }),
  ]);
});

test("keeps project breakpoint order when equal media rules overlap", () => {
  const copied = copyDesignToken(
    {
      assets: new Map(),
      breakpoints: new Map([
        ["base", { id: "base", label: "Base" }],
        ["first", { id: "first", label: "First", maxWidth: 600 }],
        ["second", { id: "second", label: "Second", maxWidth: 600 }],
      ]),
      styleSources: new Map([
        ["token", { type: "token", id: "token", name: "Button" }],
      ]),
      styleSourceSelections: new Map(),
      styles: styleMap([
        style("token", "second", "color", "blue"),
        style("token", "first", "color", "red"),
      ]),
    },
    { tokenId: "token" }
  );
  const parsed = parseTokenTransferData(copied.data);
  expect(parsed.valid).toBe(true);
  if (parsed.valid) {
    expect(
      parsed.data.fragment.styles
        .filter((item) => item.property === "color")
        .at(-1)?.value
    ).toEqual({ type: "keyword", value: "blue" });
  }
});

test("maps duplicate source breakpoints to the created target breakpoint", () => {
  const copied = copyDesignToken(
    {
      assets: new Map(),
      breakpoints: new Map([
        ["base", { id: "base", label: "Base" }],
        ["small-a", { id: "small-a", label: "Small", maxWidth: 600 }],
        ["small-b", { id: "small-b", label: "Small", maxWidth: 600 }],
      ]),
      styleSources: new Map([
        ["token", { type: "token", id: "token", name: "Button" }],
      ]),
      styleSourceSelections: new Map(),
      styles: styleMap([
        style("token", "small-a", "color", "red"),
        style("token", "small-b", "paddingTop", "12px"),
      ]),
    },
    { tokenId: "token" }
  );
  const target = {
    assets: new Map(),
    breakpoints: new Map([
      ["target-base", { id: "target-base", label: "Base" }],
    ]),
    styleSources: new Map(),
    styleSourceSelections: new Map(),
    styles: new Map(),
  };
  const ids = ["target-small", "new-token"];
  const mutation = pasteDesignToken(
    target,
    { data: copied.data },
    {
      createId: () => ids.shift()!,
    }
  );
  const pasted = applyBuilderPatchTransactions(target, [
    { id: "paste", payload: mutation.payload },
  ]).state;
  expect(pasted.breakpoints?.has("target-small")).toBe(true);
  expect(
    Array.from(pasted.styles?.values() ?? [], (item) => item.breakpointId)
  ).toEqual(["target-small", "target-small"]);
});

test("keeps root variables supplied by a root-attached token", () => {
  const copied = copyDesignToken(
    {
      assets: new Map(),
      breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
      styleSources: new Map([
        ["token", { type: "token", id: "token", name: "Button" }],
        ["source-root", { type: "local", id: "source-root" }],
      ]),
      styleSourceSelections: new Map([
        [
          ROOT_INSTANCE_ID,
          { instanceId: ROOT_INSTANCE_ID, values: ["token", "source-root"] },
        ],
      ]),
      styles: styleMap([
        style("token", "base", "--base", "red"),
        style("token", "base", "color", "var(--alias)"),
        style("token", "base", "backgroundColor", "var(--base)"),
        style("source-root", "base", "--alias", "var(--base)"),
      ]),
    },
    { tokenId: "token" }
  );
  const target = {
    assets: new Map(),
    instances: new Map([
      [
        "box",
        {
          type: "instance" as const,
          id: "box",
          component: "Box",
          children: [],
        },
      ],
    ]),
    breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
    styleSources: new Map([
      ["target-root", { type: "local" as const, id: "target-root" }],
    ]),
    styleSourceSelections: new Map([
      [
        ROOT_INSTANCE_ID,
        { instanceId: ROOT_INSTANCE_ID, values: ["target-root"] },
      ],
    ]),
    styles: styleMap([style("target-root", "base", "--base", "blue")]),
  };
  const mutation = pasteDesignToken(
    target,
    { data: copied.data, instanceId: "box" },
    { createId: () => "new-token" }
  );
  const pasted = applyBuilderPatchTransactions(target, [
    { id: "paste", payload: mutation.payload },
  ]).state;
  expect(pasted.styles?.get("target-root:base:--base-1:")?.value).toEqual({
    type: "unparsed",
    value: "red",
  });
  expect(pasted.styles?.get("target-root:base:--alias:")?.value).toEqual({
    type: "unparsed",
    value: "var(--base-1)",
  });
  expect(pasted.styles?.get("new-token:base:--base-1:")?.value).toEqual({
    type: "unparsed",
    value: "red",
  });
  expect(pasted.styles?.get("new-token:base:backgroundColor:")?.value).toEqual({
    type: "unparsed",
    value: "var(--base-1)",
  });
});

test("reserves token-local variables when renaming imported root variables", () => {
  const copied = copyDesignToken(
    {
      assets: new Map(),
      breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
      styleSources: new Map([
        ["token", { type: "token", id: "token", name: "Button" }],
        ["source-root", { type: "local", id: "source-root" }],
      ]),
      styleSourceSelections: new Map([
        [
          ROOT_INSTANCE_ID,
          { instanceId: ROOT_INSTANCE_ID, values: ["source-root"] },
        ],
      ]),
      styles: styleMap([
        style("token", "base", "color", "var(--brand)"),
        style("token", "base", "--brand-1", "green"),
        style("source-root", "base", "--brand", "red"),
      ]),
    },
    { tokenId: "token" }
  );
  const target = {
    assets: new Map(),
    breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
    styleSources: new Map([
      ["target-root", { type: "local" as const, id: "target-root" }],
    ]),
    styleSourceSelections: new Map([
      [
        ROOT_INSTANCE_ID,
        { instanceId: ROOT_INSTANCE_ID, values: ["target-root"] },
      ],
    ]),
    styles: styleMap([
      style("target-root", "base", "--brand", "blue"),
      style("target-root", "base", "--brand-1", "red"),
    ]),
  };
  const mutation = pasteDesignToken(
    target,
    { data: copied.data },
    {
      createId: () => "new-token",
    }
  );
  const pasted = applyBuilderPatchTransactions(target, [
    { id: "paste", payload: mutation.payload },
  ]).state;
  expect(pasted.styles?.get("target-root:base:--brand-2:")?.value).toEqual({
    type: "unparsed",
    value: "red",
  });
  expect(pasted.styles?.get("new-token:base:color:")?.value).toEqual({
    type: "unparsed",
    value: "var(--brand-2)",
  });
  expect(pasted.styles?.get("new-token:base:--brand-1:")?.value).toEqual({
    type: "unparsed",
    value: "green",
  });
});

test.each([
  ["declaration", style("target-local", "base", "--brand-1", "green")],
  [
    "fallback reference",
    style("target-local", "base", "color", "var(--brand-1, green)"),
  ],
])("reserves destination variable names (%s)", (_scenario, localStyle) => {
  const copied = copyDesignToken(
    {
      assets: new Map(),
      breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
      styleSources: new Map([
        ["token", { type: "token", id: "token", name: "Button" }],
        ["source-root", { type: "local", id: "source-root" }],
      ]),
      styleSourceSelections: new Map([
        [
          ROOT_INSTANCE_ID,
          { instanceId: ROOT_INSTANCE_ID, values: ["source-root"] },
        ],
      ]),
      styles: styleMap([
        style("token", "base", "color", "var(--brand)"),
        style("source-root", "base", "--brand", "red"),
      ]),
    },
    { tokenId: "token" }
  );
  const target = {
    assets: new Map(),
    instances: new Map([
      [
        "box",
        {
          type: "instance" as const,
          id: "box",
          component: "Box",
          children: [],
        },
      ],
    ]),
    breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
    styleSources: new Map([
      ["target-root", { type: "local" as const, id: "target-root" }],
      ["target-local", { type: "local" as const, id: "target-local" }],
    ]),
    styleSourceSelections: new Map([
      [
        ROOT_INSTANCE_ID,
        { instanceId: ROOT_INSTANCE_ID, values: ["target-root"] },
      ],
      ["box", { instanceId: "box", values: ["target-local"] }],
    ]),
    styles: styleMap([
      style("target-root", "base", "--brand", "blue"),
      localStyle,
    ]),
  };
  const mutation = pasteDesignToken(
    target,
    { data: copied.data, instanceId: "box" },
    { createId: () => "new-token" }
  );
  const pasted = applyBuilderPatchTransactions(target, [
    { id: "paste", payload: mutation.payload },
  ]).state;
  expect(pasted.styles?.get("target-root:base:--brand-2:")?.value).toEqual({
    type: "unparsed",
    value: "red",
  });
  expect(pasted.styles?.get("new-token:base:color:")?.value).toEqual({
    type: "unparsed",
    value: "var(--brand-2)",
  });
});

test("renames imported variables inside nested fallbacks", () => {
  const copied = copyDesignToken(
    {
      assets: new Map(),
      breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
      styleSources: new Map([
        ["token", { type: "token", id: "token", name: "Button" }],
        ["source-root", { type: "local", id: "source-root" }],
      ]),
      styleSourceSelections: new Map([
        [
          ROOT_INSTANCE_ID,
          { instanceId: ROOT_INSTANCE_ID, values: ["source-root"] },
        ],
      ]),
      styles: styleMap([
        style("token", "base", "color", "var(--missing, var(--brand))"),
        style("source-root", "base", "--brand", "red"),
      ]),
    },
    { tokenId: "token" }
  );
  const target = {
    assets: new Map(),
    breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
    styleSources: new Map([
      ["target-root", { type: "local" as const, id: "target-root" }],
    ]),
    styleSourceSelections: new Map([
      [
        ROOT_INSTANCE_ID,
        { instanceId: ROOT_INSTANCE_ID, values: ["target-root"] },
      ],
    ]),
    styles: styleMap([style("target-root", "base", "--brand", "blue")]),
  };
  const mutation = pasteDesignToken(
    target,
    { data: copied.data },
    { createId: () => "new-token" }
  );
  const pasted = applyBuilderPatchTransactions(target, [
    { id: "paste", payload: mutation.payload },
  ]).state;
  expect(pasted.styles?.get("new-token:base:color:")?.value).toEqual({
    type: "unparsed",
    value: "var(--missing,var(--brand-1))",
  });
});

test("keeps conditional token overrides of an imported root variable", () => {
  const copied = copyDesignToken(
    {
      assets: new Map(),
      breakpoints: new Map([
        ["base", { id: "base", label: "Base" }],
        ["mobile", { id: "mobile", label: "Mobile", maxWidth: 600 }],
      ]),
      styleSources: new Map([
        ["token", { type: "token", id: "token", name: "Button" }],
        ["source-root", { type: "local", id: "source-root" }],
      ]),
      styleSourceSelections: new Map([
        [
          ROOT_INSTANCE_ID,
          { instanceId: ROOT_INSTANCE_ID, values: ["source-root"] },
        ],
      ]),
      styles: styleMap([
        style("token", "base", "color", "var(--brand)"),
        style("token", "mobile", "--brand", "green"),
        style("source-root", "base", "--brand", "red"),
      ]),
    },
    { tokenId: "token" }
  );
  const target = {
    assets: new Map(),
    breakpoints: new Map([
      ["base", { id: "base", label: "Base" }],
      ["mobile", { id: "mobile", label: "Mobile", maxWidth: 600 }],
    ]),
    styleSources: new Map([
      ["target-root", { type: "local" as const, id: "target-root" }],
    ]),
    styleSourceSelections: new Map([
      [
        ROOT_INSTANCE_ID,
        { instanceId: ROOT_INSTANCE_ID, values: ["target-root"] },
      ],
    ]),
    styles: styleMap([style("target-root", "base", "--brand", "blue")]),
  };
  const mutation = pasteDesignToken(
    target,
    { data: copied.data },
    { createId: () => "new-token" }
  );
  const pasted = applyBuilderPatchTransactions(target, [
    { id: "paste", payload: mutation.payload },
  ]).state;
  expect(pasted.styles?.get("target-root:base:--brand-1:")?.value).toEqual({
    type: "unparsed",
    value: "red",
  });
  expect(pasted.styles?.get("new-token:base:color:")?.value).toEqual({
    type: "unparsed",
    value: "var(--brand-1)",
  });
  expect(pasted.styles?.get("new-token:mobile:--brand-1:")?.value).toEqual({
    type: "unparsed",
    value: "green",
  });
});

test("keeps distinct root variables separate from token overrides", () => {
  const copied = copyDesignToken(
    {
      assets: new Map(),
      breakpoints: new Map([
        ["base", { id: "base", label: "Base" }],
        ["mobile", { id: "mobile", label: "Mobile", maxWidth: 600 }],
      ]),
      styleSources: new Map([
        ["token", { type: "token", id: "token", name: "Button" }],
        ["source-root", { type: "local", id: "source-root" }],
      ]),
      styleSourceSelections: new Map([
        [
          ROOT_INSTANCE_ID,
          { instanceId: ROOT_INSTANCE_ID, values: ["source-root"] },
        ],
      ]),
      styles: styleMap([
        style("token", "base", "color", "var(--brand)"),
        style("token", "base", "backgroundColor", "var(--brand-1)"),
        style("token", "mobile", "--brand", "green"),
        style("source-root", "base", "--brand", "red"),
        style("source-root", "base", "--brand-1", "red"),
      ]),
    },
    { tokenId: "token" }
  );
  const target = {
    assets: new Map(),
    breakpoints: new Map([
      ["base", { id: "base", label: "Base" }],
      ["mobile", { id: "mobile", label: "Mobile", maxWidth: 600 }],
    ]),
    styleSources: new Map([
      ["target-root", { type: "local" as const, id: "target-root" }],
    ]),
    styleSourceSelections: new Map([
      [
        ROOT_INSTANCE_ID,
        { instanceId: ROOT_INSTANCE_ID, values: ["target-root"] },
      ],
    ]),
    styles: styleMap([
      style("target-root", "base", "--brand", "blue"),
      style("target-root", "base", "--brand-1", "red"),
    ]),
  };
  const mutation = pasteDesignToken(
    target,
    { data: copied.data },
    { createId: () => "new-token" }
  );
  const pasted = applyBuilderPatchTransactions(target, [
    { id: "paste", payload: mutation.payload },
  ]).state;
  expect(pasted.styles?.get("new-token:base:color:")?.value).toEqual({
    type: "unparsed",
    value: "var(--brand-2)",
  });
  expect(pasted.styles?.get("new-token:base:backgroundColor:")?.value).toEqual({
    type: "unparsed",
    value: "var(--brand-1-1)",
  });
  expect(pasted.styles?.get("target-root:base:--brand-1-1:")?.value).toEqual({
    type: "unparsed",
    value: "red",
  });
  expect(pasted.styles?.get("new-token:mobile:--brand-2:")?.value).toEqual({
    type: "unparsed",
    value: "green",
  });
});

test("preserves variables that depend on each other across breakpoints", () => {
  const copied = copyDesignToken(
    {
      assets: new Map(),
      breakpoints: new Map([
        ["base", { id: "base", label: "Base" }],
        ["mobile", { id: "mobile", label: "Mobile", maxWidth: 600 }],
      ]),
      styleSources: new Map([
        ["token", { type: "token", id: "token", name: "Button" }],
        ["source-root", { type: "local", id: "source-root" }],
      ]),
      styleSourceSelections: new Map([
        [
          ROOT_INSTANCE_ID,
          { instanceId: ROOT_INSTANCE_ID, values: ["source-root"] },
        ],
      ]),
      styles: styleMap([
        style("token", "base", "color", "var(--b)"),
        style("source-root", "base", "--a", "red"),
        style("source-root", "base", "--b", "var(--a)"),
        style("source-root", "mobile", "--a", "var(--b)"),
        style("source-root", "mobile", "--b", "green"),
      ]),
    },
    { tokenId: "token" }
  );
  const target = {
    assets: new Map(),
    breakpoints: new Map([
      ["base", { id: "base", label: "Base" }],
      ["mobile", { id: "mobile", label: "Mobile", maxWidth: 600 }],
    ]),
    styleSources: new Map([
      ["target-root", { type: "local" as const, id: "target-root" }],
    ]),
    styleSourceSelections: new Map([
      [
        ROOT_INSTANCE_ID,
        { instanceId: ROOT_INSTANCE_ID, values: ["target-root"] },
      ],
    ]),
    styles: styleMap([
      style("target-root", "base", "--a", "blue"),
      style("target-root", "base", "--b", "var(--a)"),
      style("target-root", "mobile", "--a", "var(--b)"),
      style("target-root", "mobile", "--b", "green"),
    ]),
  };
  const mutation = pasteDesignToken(
    target,
    { data: copied.data },
    { createId: () => "new-token" }
  );
  const pasted = applyBuilderPatchTransactions(target, [
    { id: "paste", payload: mutation.payload },
  ]).state;
  expect(pasted.styles?.get("new-token:base:color:")?.value).toEqual({
    type: "unparsed",
    value: "var(--b-1)",
  });
  expect(pasted.styles?.get("target-root:base:--b-1:")?.value).toEqual({
    type: "unparsed",
    value: "var(--a-1)",
  });
  expect(pasted.styles?.get("target-root:mobile:--a-1:")?.value).toEqual({
    type: "unparsed",
    value: "var(--b-1)",
  });
});

test("reserves undefined variable references in the incoming token", () => {
  const copied = copyDesignToken(
    {
      assets: new Map(),
      breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
      styleSources: new Map([
        ["token", { type: "token", id: "token", name: "Button" }],
        ["source-root", { type: "local", id: "source-root" }],
      ]),
      styleSourceSelections: new Map([
        [
          ROOT_INSTANCE_ID,
          { instanceId: ROOT_INSTANCE_ID, values: ["source-root"] },
        ],
      ]),
      styles: styleMap([
        style("token", "base", "color", "var(--brand)"),
        style("token", "base", "backgroundColor", "var(--brand-1, green)"),
        style("source-root", "base", "--brand", "red"),
      ]),
    },
    { tokenId: "token" }
  );
  const target = {
    assets: new Map(),
    breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
    styleSources: new Map([
      ["target-root", { type: "local" as const, id: "target-root" }],
    ]),
    styleSourceSelections: new Map([
      [
        ROOT_INSTANCE_ID,
        { instanceId: ROOT_INSTANCE_ID, values: ["target-root"] },
      ],
    ]),
    styles: styleMap([style("target-root", "base", "--brand", "blue")]),
  };
  const mutation = pasteDesignToken(
    target,
    { data: copied.data },
    { createId: () => "new-token" }
  );
  const pasted = applyBuilderPatchTransactions(target, [
    { id: "paste", payload: mutation.payload },
  ]).state;
  expect(pasted.styles?.get("target-root:base:--brand-2:")?.value).toEqual({
    type: "unparsed",
    value: "red",
  });
  expect(pasted.styles?.get("new-token:base:color:")?.value).toEqual({
    type: "unparsed",
    value: "var(--brand-2)",
  });
  expect(pasted.styles?.get("new-token:base:backgroundColor:")?.value).toEqual({
    type: "unparsed",
    value: "var(--brand-1, green)",
  });
});

test("rejects incomplete token data", () => {
  expect(() =>
    pasteDesignToken(
      {
        assets: new Map(),
        breakpoints: new Map(),
        styleSources: new Map(),
        styleSourceSelections: new Map(),
        styles: new Map(),
      },
      { data: "{}" }
    )
  ).toThrow();
});

test("attaches a pasted token to the virtual root alongside its CSS variables", () => {
  const copied = copyDesignToken(
    {
      assets: new Map(),
      breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
      styleSources: new Map([
        ["token", { type: "token", id: "token", name: "Body" }],
        ["source-root", { type: "local", id: "source-root" }],
      ]),
      styleSourceSelections: new Map([
        [
          ROOT_INSTANCE_ID,
          { instanceId: ROOT_INSTANCE_ID, values: ["source-root"] },
        ],
      ]),
      styles: styleMap([
        style("token", "base", "color", "var(--accent)"),
        style("source-root", "base", "--accent", "red"),
      ]),
    },
    { tokenId: "token" }
  );
  const target = {
    assets: new Map(),
    instances: new Map(),
    breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
    styleSources: new Map(),
    styleSourceSelections: new Map(),
    styles: new Map(),
  };
  const ids = ["local", "new-token"];
  const mutation = pasteDesignToken(
    target,
    { data: copied.data, instanceId: ROOT_INSTANCE_ID },
    { createId: () => ids.shift()! }
  );
  const pasted = applyBuilderPatchTransactions(target, [
    { id: "paste", payload: mutation.payload },
  ]).state;
  expect(pasted.styleSourceSelections?.get(ROOT_INSTANCE_ID)?.values).toEqual([
    "local",
    "new-token",
  ]);
});

test("remaps image and font dependencies after transfer", () => {
  const image: Asset = {
    id: "source-image",
    projectId: "source",
    name: "image.png",
    type: "image",
    format: "png",
    meta: { width: 100, height: 100 },
    size: 100,
    description: null,
    createdAt: "2026-01-01",
  };
  const font: Asset = {
    id: "source-font",
    projectId: "source",
    name: "font.woff2",
    type: "font",
    format: "woff2",
    meta: { family: "Source Font", style: "normal", weight: 400 },
    size: 100,
    description: null,
    createdAt: "2026-01-01",
  };
  const copied = copyDesignToken(
    {
      assets: new Map<string, Asset>([
        [image.id, image],
        [font.id, font],
      ]),
      breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
      styleSources: new Map([
        ["token", { type: "token", id: "token", name: "Card" }],
      ]),
      styleSourceSelections: new Map(),
      styles: styleMap([
        {
          styleSourceId: "token",
          breakpointId: "base",
          property: "backgroundImage",
          value: { type: "image", value: { type: "asset", value: image.id } },
        },
        {
          styleSourceId: "token",
          breakpointId: "base",
          property: "fontFamily",
          value: { type: "fontFamily", value: ["Source Font"] },
        },
      ]),
    },
    { tokenId: "token" }
  );
  const copiedParsed = parseTokenTransferData(copied.data);
  expect(copiedParsed.valid).toBe(true);
  if (copiedParsed.valid === false) {
    return;
  }
  const importedAssets = new Map(
    copiedParsed.data.fragment.assets.map(
      (asset) =>
        [
          asset.id,
          asset.type === "font"
            ? {
                ...font,
                id: "target-font",
                projectId: "target",
                meta: { ...font.meta, family: "Target Font" },
              }
            : { ...image, id: "target-image", projectId: "target" },
        ] as const
    )
  );
  const remapped = remapFragmentAssets(
    copiedParsed.data.fragment,
    importedAssets
  );
  expect(remapped.assets).toEqual([]);
  expect(remapped.styles.map((item) => item.value)).toEqual([
    {
      type: "layers",
      value: [
        { type: "image", value: { type: "asset", value: "target-image" } },
      ],
    },
    { type: "fontFamily", value: ["Target Font", "sans-serif"] },
  ]);
  const target = {
    assets: new Map(
      [...importedAssets.values()].map((asset) => [asset.id, asset])
    ),
    breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
    styleSources: new Map(),
    styleSourceSelections: new Map(),
    styles: new Map(),
  };
  const mutation = pasteDesignToken(
    target,
    {
      data: copied.data,
      assetIds: [...importedAssets].map(([sourceId, asset]) => [
        sourceId,
        asset.id,
      ]),
    },
    { createId: () => "pasted-token" }
  );
  const pasted = applyBuilderPatchTransactions(target, [
    { id: "paste", payload: mutation.payload },
  ]).state;
  expect(
    [...(pasted.styles?.values() ?? [])].map((style) => style.value)
  ).toEqual(remapped.styles.map((style) => style.value));
});

test("remaps an image asset referenced through a root variable", () => {
  const image: Asset = {
    id: "source-image",
    projectId: "source",
    name: "hero.svg",
    type: "image",
    format: "svg",
    meta: { width: 100, height: 100 },
    size: 100,
    description: null,
    createdAt: "2026-01-01",
  };
  const copied = copyDesignToken(
    {
      assets: new Map([[image.id, image]]),
      breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
      styleSources: new Map([
        ["token", { type: "token", id: "token", name: "Hero" }],
        ["root", { type: "local", id: "root" }],
      ]),
      styleSourceSelections: new Map([
        [ROOT_INSTANCE_ID, { instanceId: ROOT_INSTANCE_ID, values: ["root"] }],
      ]),
      styles: styleMap([
        style("token", "base", "backgroundImage", "var(--hero)"),
        {
          styleSourceId: "root",
          breakpointId: "base",
          property: "--hero",
          value: { type: "image", value: { type: "asset", value: image.id } },
        },
      ]),
    },
    { tokenId: "token", sourceOrigin: "https://builder.example.com" }
  );
  const parsed = parseTokenTransferData(copied.data);
  expect(parsed.valid).toBe(true);
  if (parsed.valid === false) {
    return;
  }
  expect(parsed.data.fragment.assets).toEqual([
    expect.objectContaining({ name: "hero.svg", type: "image" }),
  ]);
  const importedImage = { ...image, id: "target-image", name: "target.svg" };
  const remapped = remapFragmentAssets(
    parsed.data.fragment,
    new Map([[parsed.data.fragment.assets[0].id, importedImage]])
  );
  expect(
    remapped.styles.find((item) => item.property === "--hero")?.value
  ).toEqual({
    type: "unparsed",
    value: "url(/cgi/image/target.svg?format=raw)",
  });
});

test("rejects a copied token with a missing image asset", () => {
  expect(() =>
    copyDesignToken(
      {
        assets: new Map(),
        breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
        styleSources: new Map([
          ["token", { type: "token", id: "token", name: "Hero" }],
        ]),
        styleSourceSelections: new Map(),
        styles: styleMap([
          {
            styleSourceId: "token",
            breakpointId: "base",
            property: "backgroundImage",
            value: {
              type: "image",
              value: { type: "asset", value: "missing" },
            },
          },
        ]),
      },
      { tokenId: "token" }
    )
  ).toThrow("Token asset is missing");
});

test("copies font assets used by a root CSS variable", () => {
  const font: Asset = {
    id: "heading-font",
    projectId: "source",
    name: "heading.woff2",
    type: "font",
    format: "woff2",
    meta: { family: "Playfair Display", style: "normal", weight: 400 },
    size: 100,
    description: null,
    createdAt: "2026-01-01",
  };
  const copied = copyDesignToken(
    {
      assets: new Map([[font.id, font]]),
      breakpoints: new Map([["base", { id: "base", label: "Base" }]]),
      styleSources: new Map([
        ["token", { type: "token", id: "token", name: "Heading" }],
        ["root", { type: "local", id: "root" }],
      ]),
      styleSourceSelections: new Map([
        [ROOT_INSTANCE_ID, { instanceId: ROOT_INSTANCE_ID, values: ["root"] }],
      ]),
      styles: styleMap([
        style("token", "base", "fontFamily", "var(--heading-font)"),
        style("root", "base", "--heading-font", "'Playfair Display', serif"),
      ]),
    },
    { tokenId: "token" }
  );
  const parsed = parseTokenTransferData(copied.data);
  expect(parsed.valid).toBe(true);
  if (parsed.valid === false) {
    return;
  }
  expect(parsed.data.fragment.assets).toEqual([
    expect.objectContaining({ name: font.name, type: "font", meta: font.meta }),
  ]);
  const remapped = remapFragmentAssets(
    parsed.data.fragment,
    new Map([
      [
        parsed.data.fragment.assets[0].id,
        {
          ...font,
          id: "target-font",
          projectId: "target",
          meta: { ...font.meta, family: "Target Font" },
        },
      ],
    ])
  );
  const variable = remapped.styles.find(
    (item) => item.property === "--heading-font"
  );
  expect(variable?.value.type).toBe("unparsed");
  if (variable?.value.type === "unparsed") {
    expect(parseCssValue("font-family", variable.value.value)).toEqual({
      type: "fontFamily",
      value: ["Target Font", "serif"],
    });
  }
});
