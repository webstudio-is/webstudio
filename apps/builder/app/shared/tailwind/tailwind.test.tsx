import { describe, expect, test } from "vitest";
import { css, renderTemplate, ws } from "@webstudio-is/template";
import { generateFragmentFromTailwind } from "./tailwind";

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
  expect(
    await generateFragmentFromTailwind(
      renderTemplate(
        <ws.element ws:tag="div" class="bg-white dark:bg-gray-800"></ws.element>
      )
    )
  ).toEqual(
    renderTemplate(
      <ws.element
        ws:tag="div"
        ws:style={css`
          --tw-bg-opacity: 1;
          background-color: rgb(255 255 255 / var(--tw-bg-opacity));
        `}
      ></ws.element>
    )
  );
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
  expect(
    await generateFragmentFromTailwind(
      renderTemplate(
        <ws.element
          ws:tag="div"
          class="border border-gray-200 border-opacity-60"
        ></ws.element>
      )
    )
  ).toEqual(
    renderTemplate(
      <ws.element
        ws:tag="div"
        ws:style={css`
          border-style: solid;
          border-width: 1px;
          border-color: rgb(229 231 235 / var(--tw-border-opacity));
          --tw-border-opacity: 0.6;
        `}
      ></ws.element>
    )
  );
});

test("generate shadow", async () => {
  expect(
    await generateFragmentFromTailwind(
      renderTemplate(<ws.element ws:tag="div" class="shadow"></ws.element>)
    )
  ).toEqual(
    renderTemplate(
      <ws.element
        ws:tag="div"
        ws:style={css`
          --tw-ring-offset-shadow: 0 0 rgb(0 0 0 / 0);
          --tw-ring-shadow: 0 0 rgb(0 0 0 / 0);
          --tw-shadow-inset: ;
          --tw-shadow:
            var(--tw-shadow-inset) 0 1px 3px 0
              var(--tw-shadow-color, rgb(0 0 0 / 0.1)),
            var(--tw-shadow-inset) 0 1px 2px -1px
              var(--tw-shadow-color, rgb(0 0 0 / 0.1));
          box-shadow:
            var(--tw-ring-offset-shadow), var(--tw-ring-shadow),
            var(--tw-shadow);
        `}
      ></ws.element>
    )
  );
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

test("extract states from tailwind classes", async () => {
  expect(
    await generateFragmentFromTailwind(
      renderTemplate(
        <ws.element
          ws:tag="div"
          class="bg-indigo-600 hover:bg-indigo-500"
        ></ws.element>
      )
    )
  ).toEqual(
    renderTemplate(
      <ws.element
        ws:tag="div"
        ws:style={css`
          --tw-bg-opacity: 1;
          background-color: rgb(79 70 229 / var(--tw-bg-opacity));
          &:hover {
            --tw-bg-opacity: 1;
            background-color: rgb(99 102 241 / var(--tw-bg-opacity));
          }
        `}
      ></ws.element>
    )
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
            /* base -> max-width: 479px */
            @media (max-width: 479px) {
              opacity: 0.1;
            }
            /* min-width: 640px -> max-width: 767px */
            @media (max-width: 767px) {
              opacity: 0.2;
            }
            /* min-width: 768px -> max-width: 991px */
            @media (max-width: 991px) {
              opacity: 0.3;
            }
            /* min-width: 1024px -> base */
            opacity: 0.4;
            /* unchanged */
            @media (min-width: 1280px) {
              opacity: 0.5;
            }
            /* min-width: 1536px -> min-width: 1440px */
            @media (min-width: 1440px) {
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
            @media (max-width: 479px) {
              opacity: 0.1;
            }
            opacity: 0.2;
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
            @media (max-width: 479px) {
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
            @media (max-width: 479px) {
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

  test("preserve breakpoint when no base breakpoint", async () => {
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
            @media (min-width: 480px) {
              opacity: 0.1;
            }
          `}
        ></ws.element>
      )
    );
  });

  test("extract container class", async () => {
    expect(
      await generateFragmentFromTailwind(
        renderTemplate(<ws.element ws:tag="div" class="container"></ws.element>)
      )
    ).toEqual(
      renderTemplate(
        <ws.element
          ws:tag="div"
          ws:style={css`
            @media (max-width: 479px) {
              max-width: none;
            }
            width: 100%;
            @media (max-width: 767px) {
              max-width: 640px;
            }
            @media (max-width: 991px) {
              max-width: 768px;
            }
            max-width: 1024px;
            @media (min-width: 1280px) {
              max-width: 1280px;
            }
            @media (min-width: 1440px) {
              max-width: 1536px;
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
            @media (max-width: 479px) {
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
            @media (min-width: 480px) {
              &:hover {
                opacity: 0.2;
              }
            }
          `}
        ></ws.element>
      )
    );
  });
});

test("generate space without display property", async () => {
  expect(
    await generateFragmentFromTailwind(
      renderTemplate(
        <>
          <ws.element ws:tag="div" class="space-x-4"></ws.element>
          <ws.element ws:tag="div" class="space-y-4"></ws.element>
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
            column-gap: 1rem;
          `}
        ></ws.element>
        <ws.element
          ws:tag="div"
          ws:style={css`
            display: flex;
            flex-direction: column;
            align-items: start;
            row-gap: 1rem;
          `}
        ></ws.element>
      </>
    )
  );
});

test("generate space with display property", async () => {
  expect(
    await generateFragmentFromTailwind(
      renderTemplate(
        <>
          <ws.element ws:tag="div" class="flex space-x-4"></ws.element>
          <ws.element
            ws:tag="div"
            class="hidden md:flex space-y-4"
          ></ws.element>
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
            column-gap: 1rem;
          `}
        ></ws.element>
        <ws.element
          ws:tag="div"
          ws:style={css`
            @media (max-width: 767px) {
              display: none;
            }
            row-gap: 1rem;
            display: flex;
          `}
        ></ws.element>
      </>
    )
  );
});
