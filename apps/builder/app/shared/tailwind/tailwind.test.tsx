import { describe, expect, test } from "vitest";
import { css, renderTemplate, ws } from "@webstudio-is/template";
import { __testing__, generateFragmentFromTailwind } from "./tailwind";

const { normalizeUnoCssForWebstudio } = __testing__;

const getBaseStyleValue = (
  fragment: Awaited<ReturnType<typeof generateFragmentFromTailwind>>,
  property: string
) => {
  return fragment.styles.find(
    (style) => style.breakpointId === "base" && style.property === property
  )?.value;
};

const hasStyleValue = (
  fragment: Awaited<ReturnType<typeof generateFragmentFromTailwind>>,
  property: string,
  predicate: (value: unknown) => boolean,
  options: { breakpointId?: string; state?: string } = {}
) => {
  const breakpointId = options.breakpointId ?? "base";
  return fragment.styles.some(
    (style) =>
      style.breakpointId === breakpointId &&
      style.property === property &&
      style.state === options.state &&
      predicate(style.value)
  );
};

const getStyleValue = (
  fragment: Awaited<ReturnType<typeof generateFragmentFromTailwind>>,
  property: string,
  options: { breakpointId?: string; state?: string } = {}
) => {
  const breakpointId = options.breakpointId ?? "base";
  return fragment.styles.find(
    (style) =>
      style.breakpointId === breakpointId &&
      style.property === property &&
      style.state === options.state
  )?.value;
};

test("normalize unocss output for webstudio parser", () => {
  const { css: normalizedCss } = normalizeUnoCssForWebstudio(`
    @property --un-shadow { syntax: "*"; inherits: false; initial-value: 0 0 #0000; }
    @property --un-from-opacity { syntax: "<percentage>"; inherits: false; initial-value: 100%; }
    .rounded-full { border-radius: calc(infinity * 1px); }
    .from-brand { --un-gradient-from: color-mix(in oklab, #F5A623 var(--un-from-opacity), transparent); }
    .bg-gradient { background-image: linear-gradient(to bottom right in oklab, var(--un-gradient-from) 0%, #E8920A 100%); }
    .shadow { box-shadow: var(--un-shadow); }
  `);

  expect(normalizedCss).toContain("--tw-shadow");
  expect(normalizedCss).toContain("border-radius: 9999px");
  expect(normalizedCss).toMatch(
    /linear-gradient\(to bottom right,\s*#F5A623 0%, #E8920A 100%\)/
  );
  expect(normalizedCss).toContain("box-shadow: 0 0 #0000");
});

test("extract local styles from tailwind classes", async () => {
  expect(
    await generateFragmentFromTailwind(
      renderTemplate(
        <ws.element ws:tag="div" class="m-2">
          <ws.element ws:tag="span" class="text-sm"></ws.element>
        </ws.element>
      )
    )
  ).toEqual(
    renderTemplate(
      <ws.element
        ws:tag="div"
        ws:style={css`
          margin: 0.5rem;
        `}
      >
        <ws.element
          ws:tag="span"
          ws:style={css`
            font-size: 0.875rem;
            line-height: 1.25rem;
          `}
        ></ws.element>
      </ws.element>
    )
  );
});

test("ignore dark mode", async () => {
  const fragment = await generateFragmentFromTailwind(
    renderTemplate(
      <ws.element ws:tag="div" class="bg-white dark:bg-gray-800"></ws.element>
    )
  );

  expect(fragment.breakpoints).toEqual([{ id: "base", label: "" }]);
  expect(getStyleValue(fragment, "backgroundColor")).toEqual(
    expect.objectContaining({
      type: "color",
      components: [1, 1, 1],
    })
  );
  expect(
    hasStyleValue(fragment, "backgroundColor", (value) => value !== undefined, {
      state: ":hover",
    })
  ).toBe(false);
});

test("ignore empty class", async () => {
  expect(
    await generateFragmentFromTailwind(
      renderTemplate(<ws.element ws:tag="div" class=""></ws.element>)
    )
  ).toEqual(renderTemplate(<ws.element ws:tag="div"></ws.element>));
});

test("preserve custom class", async () => {
  expect(
    await generateFragmentFromTailwind(
      renderTemplate(
        <ws.element ws:tag="div" class="custom-class m-2"></ws.element>
      )
    )
  ).toEqual(
    renderTemplate(
      <ws.element
        ws:tag="div"
        ws:style={css`
          margin: 0.5rem;
        `}
        class="custom-class"
      ></ws.element>
    )
  );
});

test("generate border", async () => {
  expect(
    await generateFragmentFromTailwind(
      renderTemplate(<ws.element ws:tag="div" class="border"></ws.element>)
    )
  ).toEqual(
    renderTemplate(
      <ws.element
        ws:tag="div"
        ws:style={css`
          border-style: solid;
          border-color: var(--tw-default-border-color, #e5e7eb);
          border-width: 1px;
        `}
      ></ws.element>
    )
  );
});

test("override border opacity", async () => {
  const fragment = await generateFragmentFromTailwind(
    renderTemplate(
      <ws.element
        ws:tag="div"
        class="border border-gray-200 border-opacity-60"
      ></ws.element>
    )
  );

  expect(getBaseStyleValue(fragment, "borderTopStyle")).toEqual(
    expect.objectContaining({ type: "keyword", value: "solid" })
  );
  expect(getBaseStyleValue(fragment, "borderTopWidth")).toEqual(
    expect.objectContaining({ type: "unit", unit: "px", value: 1 })
  );
  expect(getBaseStyleValue(fragment, "borderTopColor")).toEqual(
    expect.objectContaining({ type: "color", alpha: 0.6 })
  );
});

test("keep css variable shorthand border color", async () => {
  const fragment = await generateFragmentFromTailwind(
    renderTemplate(
      <ws.element
        ws:tag="div"
        class="p-8 border border-(--border-color)"
      ></ws.element>
    )
  );

  expect(fragment.props.some((prop) => prop.name === "class")).toBe(false);
  expect(getBaseStyleValue(fragment, "borderTopStyle")).toEqual(
    expect.objectContaining({ type: "keyword", value: "solid" })
  );
  expect(getBaseStyleValue(fragment, "borderTopWidth")).toEqual(
    expect.objectContaining({ type: "unit", unit: "px", value: 1 })
  );
  expect(getBaseStyleValue(fragment, "borderTopColor")).toEqual(
    expect.objectContaining({ type: "var", value: "border-color" })
  );
});

test("keep inline border-color var override", async () => {
  const fragment = await generateFragmentFromTailwind(
    renderTemplate(
      <ws.element
        ws:tag="div"
        class="p-8 border"
        ws:style={css`
          border-color: var(--border-color);
        `}
      ></ws.element>
    )
  );

  expect(getBaseStyleValue(fragment, "borderTopColor")).toEqual(
    expect.objectContaining({ type: "var", value: "border-color" })
  );
});

test("keep typed literal border color utility", async () => {
  const fragment = await generateFragmentFromTailwind(
    renderTemplate(
      <ws.element
        ws:tag="div"
        class="p-8 border border-[color:#000]"
      ></ws.element>
    )
  );

  expect(getBaseStyleValue(fragment, "borderTopColor")).toEqual(
    expect.objectContaining({ type: "color" })
  );
});

test("keep border side typed arbitrary var color utility", async () => {
  const fragment = await generateFragmentFromTailwind(
    renderTemplate(
      <ws.element
        ws:tag="div"
        class="p-8 border-t border-[color:var(--border-color)]"
      ></ws.element>
    )
  );

  expect(getBaseStyleValue(fragment, "borderTopColor")).toEqual(
    expect.objectContaining({ type: "var", value: "border-color" })
  );
});

test("keep inline border shorthand var color override", async () => {
  const fragment = await generateFragmentFromTailwind(
    renderTemplate(
      <ws.element
        ws:tag="div"
        class="p-8 border"
        ws:style={css`
          border: 1px solid var(--border-color);
        `}
      ></ws.element>
    )
  );

  expect(getBaseStyleValue(fragment, "borderTopColor")).toEqual(
    expect.objectContaining({ type: "var", value: "border-color" })
  );
});

test("generate shadow", async () => {
  const fragment = await generateFragmentFromTailwind(
    renderTemplate(<ws.element ws:tag="div" class="shadow"></ws.element>)
  );

  expect(getStyleValue(fragment, "--tw-shadow")).toEqual(
    expect.objectContaining({
      type: "unparsed",
      value: expect.stringContaining("0 1px 3px 0"),
    })
  );
  expect(getStyleValue(fragment, "boxShadow")).toEqual(
    expect.objectContaining({
      type: "layers",
      value: expect.arrayContaining([
        expect.objectContaining({
          type: "shadow",
          offsetY: expect.objectContaining({ unit: "px", value: 1 }),
          blur: expect.objectContaining({ unit: "px", value: 3 }),
        }),
        expect.objectContaining({
          type: "shadow",
          offsetY: expect.objectContaining({ unit: "px", value: 1 }),
          blur: expect.objectContaining({ unit: "px", value: 2 }),
          spread: expect.objectContaining({ unit: "px", value: -1 }),
        }),
      ]),
    })
  );
});

test("generate arbitrary gradient, full radius and shadow", async () => {
  const fragment = await generateFragmentFromTailwind(
    renderTemplate(
      <ws.element
        ws:tag="a"
        class="bg-gradient-to-br from-[#F5A623] to-[#E8920A] text-white text-sm font-bold px-6 py-2.5 rounded-full shadow-[0_4px_20px_rgba(245,166,35,0.35)]"
      >
        Free consultation
      </ws.element>
    )
  );

  expect(fragment.props.some((prop) => prop.name === "class")).toBe(false);
  expect(getStyleValue(fragment, "backgroundImage")).toEqual(
    expect.objectContaining({
      type: "layers",
      value: expect.arrayContaining([
        expect.objectContaining({
          value: expect.stringContaining("#F5A623"),
        }),
      ]),
    })
  );
  expect(getStyleValue(fragment, "borderTopLeftRadius")).toEqual(
    expect.objectContaining({ type: "unit", unit: "px", value: 9999 })
  );
  expect(getStyleValue(fragment, "boxShadow")).toEqual(
    expect.objectContaining({
      type: "layers",
      value: expect.arrayContaining([
        expect.objectContaining({
          type: "shadow",
          offsetY: expect.objectContaining({ unit: "px", value: 4 }),
          blur: expect.objectContaining({ unit: "px", value: 20 }),
          color: expect.objectContaining({ alpha: 0.35 }),
        }),
      ]),
    })
  );
});

test("generate clipped gradient text", async () => {
  const fragment = await generateFragmentFromTailwind(
    renderTemplate(
      <ws.element
        ws:tag="span"
        class="text-transparent bg-clip-text bg-gradient-to-br from-[#F5A623] to-[#F97316]"
      >
        Your solar plant
      </ws.element>
    )
  );

  expect(fragment.props.some((prop) => prop.name === "class")).toBe(false);
  expect(getStyleValue(fragment, "color")).toEqual(
    expect.objectContaining({ type: "keyword", value: "transparent" })
  );
  expect(getStyleValue(fragment, "backgroundClip")).toEqual(
    expect.objectContaining({
      type: "layers",
      value: expect.arrayContaining([
        expect.objectContaining({ type: "keyword", value: "text" }),
      ]),
    })
  );
  expect(getStyleValue(fragment, "backgroundImage")).toEqual(
    expect.objectContaining({
      type: "layers",
      value: expect.arrayContaining([
        expect.objectContaining({
          value: expect.stringContaining("#F97316"),
        }),
      ]),
    })
  );
});

test("generate gradient background with via color stop", async () => {
  const fragment = await generateFragmentFromTailwind(
    renderTemplate(
      <ws.element
        ws:tag="section"
        class="py-24 px-4 bg-gradient-to-br from-[#0A2830] via-[#0D4F5C] to-[#0A3040]"
      ></ws.element>
    )
  );

  expect(fragment.props.some((prop) => prop.name === "class")).toBe(false);
  expect(getStyleValue(fragment, "backgroundImage")).toEqual(
    expect.objectContaining({
      type: "layers",
      value: expect.arrayContaining([
        expect.objectContaining({
          value:
            "linear-gradient(to bottom right,#0A2830 0%,#0D4F5C 50%,#0A3040 100%)",
        }),
      ]),
    })
  );
  expect(getStyleValue(fragment, "paddingBlockStart")).toEqual(
    expect.objectContaining({ type: "unit", unit: "rem", value: 6 })
  );
  expect(getStyleValue(fragment, "paddingInlineStart")).toEqual(
    expect.objectContaining({ type: "unit", unit: "rem", value: 1 })
  );
});

test("input padding utilities override preflight reset", async () => {
  const fragment = await generateFragmentFromTailwind(
    renderTemplate(
      <ws.element ws:tag="div" class="grid sm:grid-cols-2 gap-6">
        <ws.element
          ws:tag="input"
          type="text"
          placeholder="Full name"
          class="w-full rounded-xl px-4 py-3 border border-gray-200"
        ></ws.element>
        <ws.element
          ws:tag="input"
          type="tel"
          placeholder="Phone number"
          class="w-full rounded-xl px-4 py-3 border border-gray-200"
        ></ws.element>
      </ws.element>
    )
  );

  const inputStyleSourceId = fragment.styleSourceSelections
    .find((selection) => selection.instanceId === "1")
    ?.values.at(-1);
  const inputStyles = fragment.styles.filter(
    (style) => style.styleSourceId === inputStyleSourceId
  );

  expect(inputStyles).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        property: "width",
        value: expect.objectContaining({ unit: "%", value: 100 }),
      }),
      expect.objectContaining({
        property: "paddingInlineStart",
        value: expect.objectContaining({ unit: "rem", value: 1 }),
      }),
      expect.objectContaining({
        property: "paddingBlockStart",
        value: expect.objectContaining({ unit: "rem", value: 0.75 }),
      }),
    ])
  );
  expect(
    inputStyles.some((style) =>
      ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"].includes(
        style.property
      )
    )
  ).toBe(false);
  expect(getStyleValue(fragment, "gridTemplateColumns")).toEqual(
    expect.objectContaining({
      type: "unparsed",
      value: "repeat(2,minmax(0,1fr))",
    })
  );
});

test("axis padding utilities do not clear unrelated inline padding", async () => {
  const fragment = await generateFragmentFromTailwind(
    renderTemplate(
      <ws.element
        ws:tag="input"
        ws:style={css`
          padding-top: 2rem;
        `}
        class="px-4"
      ></ws.element>
    )
  );

  expect(getStyleValue(fragment, "paddingTop")).toEqual(
    expect.objectContaining({ type: "unit", unit: "rem", value: 2 })
  );
  expect(getStyleValue(fragment, "paddingInlineStart")).toEqual(
    expect.objectContaining({ type: "unit", unit: "rem", value: 1 })
  );
  expect(getStyleValue(fragment, "paddingRight")).toBeUndefined();
});

test("space-y form children stretch by default", async () => {
  const fragment = await generateFragmentFromTailwind(
    renderTemplate(
      <ws.element ws:tag="section" id="contact" class="py-24 px-4 bg-gray-50">
        <ws.element
          ws:tag="div"
          class="max-w-3xl mx-auto bg-white p-10 rounded-3xl shadow-[0_8px_50px_rgba(0,0,0,0.08)]"
        >
          <ws.element ws:tag="form" class="space-y-6">
            <ws.element ws:tag="div" class="grid sm:grid-cols-2 gap-6">
              <ws.element
                ws:tag="input"
                type="text"
                placeholder="Full name"
                class="w-full rounded-xl px-4 py-3 border border-gray-200"
              ></ws.element>
              <ws.element
                ws:tag="input"
                type="tel"
                placeholder="Phone number"
                class="w-full rounded-xl px-4 py-3 border border-gray-200"
              ></ws.element>
            </ws.element>
            <ws.element
              ws:tag="textarea"
              rows={4}
              placeholder="Project details"
              class="w-full rounded-xl px-4 py-3 border border-gray-200"
            ></ws.element>
            <ws.element
              ws:tag="button"
              type="button"
              class="w-full bg-gradient-to-br from-[#F5A623] to-[#E8920A] text-white font-bold py-4 rounded-xl"
            >
              Send request
            </ws.element>
          </ws.element>
        </ws.element>
      </ws.element>
    )
  );

  const cardStyleSourceId = fragment.styleSourceSelections
    .find((selection) => selection.instanceId === "1")
    ?.values.at(-1);
  const formStyleSourceId = fragment.styleSourceSelections
    .find((selection) => selection.instanceId === "2")
    ?.values.at(-1);

  expect(fragment.styles).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        styleSourceId: cardStyleSourceId,
        property: "maxWidth",
        value: expect.objectContaining({ unit: "rem", value: 48 }),
      }),
      expect.objectContaining({
        styleSourceId: cardStyleSourceId,
        property: "marginInlineStart",
        value: expect.objectContaining({ type: "keyword", value: "auto" }),
      }),
      expect.objectContaining({
        styleSourceId: formStyleSourceId,
        property: "display",
        value: expect.objectContaining({ type: "keyword", value: "flex" }),
      }),
      expect.objectContaining({
        styleSourceId: formStyleSourceId,
        property: "flexDirection",
        value: expect.objectContaining({ type: "keyword", value: "column" }),
      }),
    ])
  );
  expect(
    fragment.styles.some(
      (style) =>
        style.styleSourceId === formStyleSourceId &&
        style.property === "alignItems"
    )
  ).toBe(false);
});

test("preserve or override existing local styles", async () => {
  expect(
    await generateFragmentFromTailwind(
      renderTemplate(
        <ws.element
          ws:tag="div"
          class="m-2"
          ws:style={css`
            margin-top: 1px;
            color: red;
          `}
        ></ws.element>
      )
    )
  ).toEqual(
    renderTemplate(
      <ws.element
        ws:tag="div"
        ws:style={css`
          color: red;
          margin: 0.5rem;
        `}
      ></ws.element>
    )
  );
});

test("add preflight matching tags", async () => {
  expect(
    await generateFragmentFromTailwind(
      renderTemplate(
        <ws.element ws:tag="p" class="text-pretty border"></ws.element>
      )
    )
  ).toEqual(
    renderTemplate(
      <ws.element
        ws:tag="p"
        ws:style={css`
          /* this one comes from tag preflight */
          margin: 0;
          border-style: solid;
          border-color: var(--tw-default-border-color, #e5e7eb);
          border-width: 1px;
          text-wrap: pretty;
        `}
      ></ws.element>
    )
  );
});

test("add preflight matching tags when no classes are used", async () => {
  expect(
    await generateFragmentFromTailwind(
      renderTemplate(<ws.element ws:tag="a"></ws.element>)
    )
  ).toEqual(
    renderTemplate(
      <ws.element
        ws:tag="a"
        ws:style={css`
          color: inherit;
          text-decoration: inherit;
        `}
      ></ws.element>
    )
  );
});

test("preflight does not overwrite inline styles", async () => {
  // <a style="color: white"> — preflight sets color: inherit, must not win
  expect(
    await generateFragmentFromTailwind(
      renderTemplate(
        <ws.element
          ws:tag="a"
          ws:style={css`
            color: white;
          `}
        ></ws.element>
      )
    )
  ).toEqual(
    renderTemplate(
      <ws.element
        ws:tag="a"
        ws:style={css`
          color: white;
          text-decoration: inherit;
        `}
      ></ws.element>
    )
  );
});

test("preflight does not overwrite h1 inline styles", async () => {
  // <h1 style="font-size: clamp(...); font-weight: 700; margin-bottom: 1.5rem">
  // preflight resets font-size, font-weight, margin to 0/inherit — must not win
  expect(
    await generateFragmentFromTailwind(
      renderTemplate(
        <ws.element
          ws:tag="h1"
          ws:style={css`
            font-size: clamp(2.5rem, 5vw, 4rem);
            font-weight: 700;
            margin-bottom: 1.5rem;
          `}
        ></ws.element>
      )
    )
  ).toEqual(
    renderTemplate(
      <ws.element
        ws:tag="h1"
        ws:style={css`
          font-size: clamp(2.5rem, 5vw, 4rem);
          font-weight: 700;
          margin-bottom: 1.5rem;
          margin-top: 0;
          margin-right: 0;
          margin-left: 0;
        `}
      ></ws.element>
    )
  );
});

test("extract states from tailwind classes", async () => {
  const fragment = await generateFragmentFromTailwind(
    renderTemplate(
      <ws.element
        ws:tag="div"
        class="bg-indigo-600 hover:bg-indigo-500"
      ></ws.element>
    )
  );

  expect(getStyleValue(fragment, "backgroundColor")).toEqual(
    expect.objectContaining({ type: "color", colorSpace: "oklch" })
  );
  expect(
    getStyleValue(fragment, "backgroundColor", { state: ":hover" })
  ).toEqual(expect.objectContaining({ type: "color", colorSpace: "oklch" }));
  expect(getStyleValue(fragment, "backgroundColor")).not.toEqual(
    getStyleValue(fragment, "backgroundColor", { state: ":hover" })
  );
});

describe("extract breakpoints", () => {
  test("extract new breakpoints from tailwind classes", async () => {
    expect(
      await generateFragmentFromTailwind(
        renderTemplate(
          <ws.element
            ws:tag="div"
            class="opacity-10 sm:opacity-20 md:opacity-30 lg:opacity-40 xl:opacity-50 2xl:opacity-60"
          ></ws.element>
        )
      )
    ).toEqual(
      renderTemplate(
        <ws.element
          ws:tag="div"
          ws:style={css`
            /* base -> max-width: 639px */
            @media (max-width: 639px) {
              opacity: 0.1;
            }
            /* min-width: 640px -> max-width: 767px */
            @media (max-width: 767px) {
              opacity: 0.2;
            }
            /* min-width: 768px -> max-width: 1023px */
            @media (max-width: 1023px) {
              opacity: 0.3;
            }
            /* min-width: 1024px -> base */
            opacity: 0.4;
            /* unchanged */
            @media (min-width: 1280px) {
              opacity: 0.5;
            }
            /* min-width: 1536px -> min-width: 1536px */
            @media (min-width: 1536px) {
              opacity: 0.6;
            }
          `}
        ></ws.element>
      )
    );
  });

  test("base is first breakpoint", async () => {
    expect(
      await generateFragmentFromTailwind(
        renderTemplate(
          <ws.element
            ws:tag="div"
            class="opacity-10 sm:opacity-20"
          ></ws.element>
        )
      )
    ).toEqual(
      renderTemplate(
        <ws.element
          ws:tag="div"
          ws:style={css`
            @media (max-width: 639px) {
              opacity: 0.1;
            }
            opacity: 0.2;
          `}
        ></ws.element>
      )
    );
  });

  test("base is last breakpoint", async () => {
    expect(
      await generateFragmentFromTailwind(
        renderTemplate(
          <ws.element
            ws:tag="div"
            class="opacity-10 xl:opacity-20"
          ></ws.element>
        )
      )
    ).toEqual(
      renderTemplate(
        <ws.element
          ws:tag="div"
          ws:style={css`
            opacity: 0.1;
            @media (min-width: 1280px) {
              opacity: 0.2;
            }
          `}
        ></ws.element>
      )
    );
  });

  test("base is middle breakpoint", async () => {
    expect(
      await generateFragmentFromTailwind(
        renderTemplate(
          <ws.element
            ws:tag="div"
            class="opacity-10 sm:opacity-20 xl:opacity-30"
          ></ws.element>
        )
      )
    ).toEqual(
      renderTemplate(
        <ws.element
          ws:tag="div"
          ws:style={css`
            @media (max-width: 639px) {
              opacity: 0.1;
            }
            opacity: 0.2;
            @media (min-width: 1280px) {
              opacity: 0.3;
            }
          `}
        ></ws.element>
      )
    );
  });

  test("container class without user min-width breakpoints", async () => {
    // container class should only create max-width breakpoints, not min-width
    // this prevents unwanted 1280/1440 breakpoints from being created
    expect(
      await generateFragmentFromTailwind(
        renderTemplate(<ws.element ws:tag="div" class="container"></ws.element>)
      )
    ).toEqual(
      renderTemplate(
        <ws.element
          ws:tag="div"
          ws:style={css`
            @media (max-width: 639px) {
              max-width: none;
            }
            @media (max-width: 767px) {
              max-width: 640px;
            }
            @media (max-width: 1023px) {
              max-width: 768px;
            }
            max-width: 1024px;
            width: 100%;
          `}
        ></ws.element>
      )
    );
  });

  test("container class with user min-width breakpoints", async () => {
    // when user already has min-width breakpoints, container should use them
    expect(
      await generateFragmentFromTailwind(
        renderTemplate(
          <ws.element
            ws:tag="div"
            ws:style={css`
              @media (min-width: 1280px) {
                color: red;
              }
            `}
            class="container"
          ></ws.element>
        )
      )
    ).toEqual(
      renderTemplate(
        <ws.element
          ws:tag="div"
          ws:style={css`
            @media (min-width: 1280px) {
              color: red;
            }
            @media (max-width: 639px) {
              max-width: none;
            }
            @media (max-width: 767px) {
              max-width: 640px;
            }
            @media (max-width: 1023px) {
              max-width: 768px;
            }
            max-width: 1024px;
            @media (min-width: 1280px) {
              max-width: 1280px;
            }
            @media (min-width: 1536px) {
              max-width: 1536px;
            }
            width: 100%;
          `}
        ></ws.element>
      )
    );
  });

  test("explicit xl class creates min-width breakpoint", async () => {
    // explicit xl: classes should create min-width breakpoints
    // unlike container which is special-cased
    expect(
      await generateFragmentFromTailwind(
        renderTemplate(
          <ws.element ws:tag="div" class="text-sm xl:text-lg"></ws.element>
        )
      )
    ).toEqual(
      renderTemplate(
        <ws.element
          ws:tag="div"
          ws:style={css`
            font-size: 0.875rem;
            @media (min-width: 1280px) {
              font-size: 1.125rem;
            }
            line-height: 1.25rem;
            @media (min-width: 1280px) {
              line-height: 1.75rem;
            }
          `}
        ></ws.element>
      )
    );
  });

  test("container combined with explicit xl class", async () => {
    // container shouldn't create min-width breakpoints
    // but explicit xl: class should
    expect(
      await generateFragmentFromTailwind(
        renderTemplate(
          <ws.element ws:tag="div" class="container xl:text-lg"></ws.element>
        )
      )
    ).toEqual(
      renderTemplate(
        <ws.element
          ws:tag="div"
          ws:style={css`
            @media (max-width: 639px) {
              max-width: none;
            }
            @media (max-width: 767px) {
              max-width: 640px;
            }
            @media (max-width: 1023px) {
              max-width: 768px;
            }
            max-width: 1024px;
            width: 100%;
            font-size: unset;
            @media (min-width: 1280px) {
              font-size: 1.125rem;
            }
            line-height: unset;
            @media (min-width: 1280px) {
              line-height: 1.75rem;
            }
          `}
        ></ws.element>
      )
    );
  });

  test("merge tailwind breakpoints with already defined ones", async () => {
    expect(
      await generateFragmentFromTailwind(
        renderTemplate(
          <ws.element
            ws:tag="div"
            ws:style={css`
              @media (max-width: 479px) {
                color: red;
              }
              color: green;
            `}
            class="opacity-10 sm:opacity-20 md:opacity-30"
          ></ws.element>
        )
      )
    ).toEqual(
      renderTemplate(
        <ws.element
          ws:tag="div"
          ws:style={css`
            @media (max-width: 479px) {
              color: red;
            }
            color: green;
            @media (max-width: 639px) {
              opacity: 0.1;
            }
            @media (max-width: 767px) {
              opacity: 0.2;
            }
            opacity: 0.3;
          `}
        ></ws.element>
      )
    );
  });

  test("state", async () => {
    expect(
      await generateFragmentFromTailwind(
        renderTemplate(
          <ws.element
            ws:tag="div"
            class="opacity-10 sm:hover:opacity-20"
          ></ws.element>
        )
      )
    ).toEqual(
      renderTemplate(
        <ws.element
          ws:tag="div"
          ws:style={css`
            opacity: 0.1;
            @media (max-width: 639px) {
              &:hover {
                opacity: unset;
              }
            }
            &:hover {
              opacity: 0.2;
            }
          `}
        ></ws.element>
      )
    );
  });

  test("adapt max-* breakpoints", async () => {
    expect(
      await generateFragmentFromTailwind(
        renderTemplate(
          <ws.element
            ws:tag="div"
            class="max-sm:opacity-10 max-md:opacity-20 max-lg:opacity-30 max-xl:opacity-40 max-2xl:opacity-50 opacity-60"
          ></ws.element>
        )
      )
    ).toEqual(
      renderTemplate(
        <ws.element
          ws:tag="div"
          ws:style={css`
            @media (max-width: 639px) {
              opacity: 0.1;
            }
            @media (max-width: 767px) {
              opacity: 0.2;
            }
            @media (max-width: 1023px) {
              opacity: 0.3;
            }
            opacity: 0.4;
            @media (min-width: 1280px) {
              opacity: 0.5;
            }
            @media (min-width: 1536px) {
              opacity: 0.6;
            }
          `}
        ></ws.element>
      )
    );
  });

  test("ignore composite breakpoints", async () => {
    expect(
      await generateFragmentFromTailwind(
        renderTemplate(
          <ws.element
            ws:tag="div"
            class="opacity-10 md:max-xl:flex"
          ></ws.element>
        )
      )
    ).toEqual(
      renderTemplate(
        <ws.element
          ws:tag="div"
          ws:style={css`
            opacity: 0.1;
          `}
        ></ws.element>
      )
    );
  });

  test("use unset for missing base breakpoint 1", async () => {
    expect(
      await generateFragmentFromTailwind(
        renderTemplate(
          <ws.element ws:tag="div" class="sm:opacity-10"></ws.element>
        )
      )
    ).toEqual(
      renderTemplate(
        <ws.element
          ws:tag="div"
          ws:style={css`
            @media (max-width: 639px) {
              opacity: unset;
            }
            opacity: 0.1;
          `}
        ></ws.element>
      )
    );
  });

  test("use unset for missing base breakpoint 2", async () => {
    expect(
      await generateFragmentFromTailwind(
        renderTemplate(
          <ws.element
            ws:tag="div"
            class="max-sm:opacity-10 md:opacity-20"
          ></ws.element>
        )
      )
    ).toEqual(
      renderTemplate(
        <ws.element
          ws:tag="div"
          ws:style={css`
            @media (max-width: 639px) {
              opacity: 0.1;
            }
            @media (max-width: 767px) {
              opacity: unset;
            }
            opacity: 0.2;
          `}
        ></ws.element>
      )
    );
  });

  test("non-responsive classes create only base breakpoint", async () => {
    const fragment = await generateFragmentFromTailwind(
      renderTemplate(
        <ws.element ws:tag="div" class="m-2 p-4 text-red-500"></ws.element>
      )
    );
    expect(fragment.breakpoints).toEqual([{ id: "base", label: "" }]);
  });

  test("container class creates only needed breakpoints", async () => {
    const fragment = await generateFragmentFromTailwind(
      renderTemplate(<ws.element ws:tag="div" class="container"></ws.element>)
    );
    // container should only create max-width breakpoints, not 1280/1440/1920 min-width ones
    expect(fragment.breakpoints).toEqual([
      { id: "0", label: "639", maxWidth: 639 },
      { id: "1", label: "767", maxWidth: 767 },
      { id: "2", label: "1023", maxWidth: 1023 },
      { id: "base", label: "" },
    ]);
  });

  test("sm:class creates only needed breakpoints", async () => {
    const fragment = await generateFragmentFromTailwind(
      renderTemplate(
        <ws.element ws:tag="div" class="opacity-50 sm:opacity-100"></ws.element>
      )
    );
    // sm: should only create 639 max-width and base, not all breakpoints
    expect(fragment.breakpoints).toEqual([
      { id: "0", label: "639", maxWidth: 639 },
      { id: "base", label: "" },
    ]);
  });
});

test("generate space without display property", async () => {
  expect(
    await generateFragmentFromTailwind(
      renderTemplate(
        <>
          <ws.element ws:tag="div" class="space-x-4 md:space-x-6"></ws.element>
          <ws.element ws:tag="div" class="space-y-4 md:space-y-6"></ws.element>
        </>
      )
    )
  ).toEqual(
    renderTemplate(
      <>
        <ws.element
          ws:tag="div"
          ws:style={css`
            display: flex;
            @media (max-width: 767px) {
              column-gap: 1rem;
            }
            column-gap: 1.5rem;
          `}
        ></ws.element>
        <ws.element
          ws:tag="div"
          ws:style={css`
            display: flex;
            flex-direction: column;
            @media (max-width: 767px) {
              row-gap: 1rem;
            }
            row-gap: 1.5rem;
          `}
        ></ws.element>
      </>
    )
  );
});

test("generate space with display property", async () => {
  const fragment = await generateFragmentFromTailwind(
    renderTemplate(
      <>
        <ws.element ws:tag="div" class="flex space-x-4"></ws.element>
        <ws.element ws:tag="div" class="hidden md:flex space-y-4"></ws.element>
      </>
    )
  );

  const firstStyleSourceId = fragment.styleSourceSelections
    .find((selection) => selection.instanceId === "0")
    ?.values.at(-1);
  const secondStyleSourceId = fragment.styleSourceSelections
    .find((selection) => selection.instanceId === "1")
    ?.values.at(-1);

  expect(
    fragment.styles.some(
      (style) =>
        style.styleSourceId === firstStyleSourceId &&
        style.breakpointId === "base" &&
        style.property === "display" &&
        (style.value as { value?: string }).value === "flex"
    )
  ).toBe(true);
  expect(
    fragment.styles.some(
      (style) =>
        style.styleSourceId === firstStyleSourceId &&
        style.breakpointId === "base" &&
        style.property === "columnGap"
    )
  ).toBe(true);
  expect(
    fragment.styles.some(
      (style) =>
        style.styleSourceId === secondStyleSourceId &&
        style.breakpointId === "base" &&
        style.property === "display" &&
        (style.value as { value?: string }).value === "flex"
    )
  ).toBe(true);
  expect(
    fragment.styles.some(
      (style) =>
        style.styleSourceId === secondStyleSourceId &&
        style.property === "rowGap"
    )
  ).toBe(true);
  expect(
    fragment.styles.some(
      (style) =>
        style.styleSourceId === secondStyleSourceId &&
        style.property === "display" &&
        (style.value as { value?: string }).value === "none" &&
        style.breakpointId !== "base"
    )
  ).toBe(true);
});

test("keep typed arbitrary var border color utility", async () => {
  const fragment = await generateFragmentFromTailwind(
    renderTemplate(
      <ws.element
        ws:tag="div"
        class="p-8 border border-[color:var(--border-color)]"
      ></ws.element>
    )
  );
  expect(getBaseStyleValue(fragment, "borderTopColor")).toEqual(
    expect.objectContaining({ type: "var", value: "border-color" })
  );
});
