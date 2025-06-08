import { expect, test } from "vitest";
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
          --un-bg-opacity: 1;
          background-color: rgb(255 255 255 / var(--un-bg-opacity));
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
          border-color: var(--un-default-border-color, #e5e7eb);
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
          border-color: rgb(229 231 235 / var(--un-border-opacity));
          --un-border-opacity: 0.6;
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
          --un-ring-offset-shadow: 0 0 rgb(0 0 0 / 0);
          --un-ring-shadow: 0 0 rgb(0 0 0 / 0);
          --un-shadow-inset: ;
          --un-shadow:
            var(--un-shadow-inset) 0 1px 3px 0
              var(--un-shadow-color, rgb(0 0 0 / 0.1)),
            var(--un-shadow-inset) 0 1px 2px -1px
              var(--un-shadow-color, rgb(0 0 0 / 0.1));
          box-shadow:
            var(--un-ring-offset-shadow), var(--un-ring-shadow),
            var(--un-shadow);
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
          border-color: var(--un-default-border-color, #e5e7eb);
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
          --un-bg-opacity: 1;
          background-color: rgb(79 70 229 / var(--un-bg-opacity));
          &:hover {
            --un-bg-opacity: 1;
            background-color: rgb(99 102 241 / var(--un-bg-opacity));
          }
        `}
      ></ws.element>
    )
  );
});

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
          opacity: 0.1;
          @media (min-width: 640px) {
            opacity: 0.2;
          }
          @media (min-width: 768px) {
            opacity: 0.3;
          }
          @media (min-width: 1024px) {
            opacity: 0.4;
          }
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

test("merge tailwind breakpoints with already defined ones", async () => {
  expect(
    await generateFragmentFromTailwind(
      renderTemplate(
        <ws.element
          ws:tag="div"
          ws:style={css`
            color: red;
            @media (min-width: 640px) {
              color: green;
            }
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
          color: red;
          @media (min-width: 640px) {
            color: green;
          }
          opacity: 0.1;
          @media (min-width: 640px) {
            opacity: 0.2;
          }
          @media (min-width: 768px) {
            opacity: 0.3;
          }
        `}
      ></ws.element>
    )
  );
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
            display: grid;
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
            display: none;
            row-gap: 1rem;
            @media (min-width: 768px) {
              display: flex;
            }
          `}
        ></ws.element>
      </>
    )
  );
});
