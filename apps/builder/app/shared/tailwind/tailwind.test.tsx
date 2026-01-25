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
          border-color: rgb(229 231 235 / var(--tw-border-opacity));
          border-width: 1px;
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
            @media (max-width: 479px) {
              max-width: none;
            }
            @media (max-width: 767px) {
              max-width: 640px;
            }
            @media (max-width: 991px) {
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
            @media (max-width: 479px) {
              max-width: none;
            }
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
            @media (max-width: 479px) {
              max-width: none;
            }
            @media (max-width: 767px) {
              max-width: 640px;
            }
            @media (max-width: 991px) {
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
            @media (max-width: 479px) {
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
            @media (max-width: 479px) {
              opacity: 0.1;
            }
            @media (max-width: 767px) {
              opacity: 0.2;
            }
            @media (max-width: 991px) {
              opacity: 0.3;
            }
            opacity: 0.4;
            @media (min-width: 1280px) {
              opacity: 0.5;
            }
            @media (min-width: 1440px) {
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
            @media (max-width: 479px) {
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
            @media (max-width: 479px) {
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
      { id: "0", label: "479", maxWidth: 479 },
      { id: "1", label: "767", maxWidth: 767 },
      { id: "2", label: "991", maxWidth: 991 },
      { id: "base", label: "" },
    ]);
  });

  test("sm:class creates only needed breakpoints", async () => {
    const fragment = await generateFragmentFromTailwind(
      renderTemplate(
        <ws.element ws:tag="div" class="opacity-50 sm:opacity-100"></ws.element>
      )
    );
    // sm: should only create 479 max-width and base, not all breakpoints
    expect(fragment.breakpoints).toEqual([
      { id: "0", label: "479", maxWidth: 479 },
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
            align-items: start;
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
            display: flex;
            row-gap: 1rem;
          `}
        ></ws.element>
      </>
    )
  );
});
