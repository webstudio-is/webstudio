import { expect, test } from "vitest";
import { parseCssValue } from "@webstudio-is/css-data";
import {
  getStyleDeclKey,
  ROOT_INSTANCE_ID,
  type Asset,
  type StyleDecl,
} from "@webstudio-is/sdk";
import {
  copyDesignToken,
  pasteDesignToken,
  remapTokenTransferAssets,
} from "./token-transfer";
import { parseTokenTransferData } from "./data-formats/token-transfer";
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
  const copied = copyDesignToken(source, { tokenId: "token" });
  const parsed = parseTokenTransferData(copied.data);
  expect(parsed.valid).toBe(true);
  if (parsed.valid === false) {
    return;
  }
  expect(parsed.data.fragment.styles.map((item) => item.property)).toEqual([
    "color",
    "paddingTop",
    "--brand",
    "--brand",
    "--tone",
  ]);
  expect(parsed.data.fragment.breakpoints.map((item) => item.id)).toEqual([
    "base",
    "mobile",
  ]);

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
  ).toEqual([style("local", "base", "--brand", "red")]);
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
    value: "var(--brand-1)",
  });
  expect(pasted.styles?.get("new-token:mobile:--brand-2:")?.value).toEqual({
    type: "unparsed",
    value: "green",
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
  const remapped = remapTokenTransferAssets(
    copied.data,
    new Map<string, Asset>([
      [image.id, { ...image, id: "target-image", projectId: "target" }],
      [
        font.id,
        {
          ...font,
          id: "target-font",
          projectId: "target",
          meta: { ...font.meta, family: "Target Font" },
        },
      ],
    ])
  );
  const parsed = parseTokenTransferData(remapped);
  expect(parsed.valid).toBe(true);
  if (parsed.valid === false) {
    return;
  }
  expect(parsed.data.fragment.assets).toEqual([]);
  expect(parsed.data.fragment.styles.map((item) => item.value)).toEqual([
    { type: "image", value: { type: "asset", value: "target-image" } },
    { type: "fontFamily", value: ["Target Font"] },
  ]);
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
  expect(parsed.data.fragment.assets).toEqual([font]);
  const remapped = remapTokenTransferAssets(
    copied.data,
    new Map([
      [
        font.id,
        {
          ...font,
          id: "target-font",
          projectId: "target",
          meta: { ...font.meta, family: "Target Font" },
        },
      ],
    ])
  );
  const transferred = parseTokenTransferData(remapped);
  expect(transferred.valid).toBe(true);
  if (transferred.valid === false) {
    return;
  }
  const variable = transferred.data.fragment.styles.find(
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
