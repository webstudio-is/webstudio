import { describe, expect, test, jest } from "@jest/globals";

import { substituteVariables } from "./substitute"; // Import the function

const cssPreflight = `
*,
::before,
::after {
 --var-a: rgba(111, 111, 111, 0.5);
 --var-b: rgba(222, 222, 222, 0.5);
}
`;

describe("expandTailwindShorthand", () => {
  test("resolve simple variable", () => {
    const css = `
      ${cssPreflight}
      .class {
          color: var(--var-a);
      }
    `;

    expect(substituteVariables(css)).toMatchInlineSnapshot(
      `".class{color:rgba(111,111,111,0.5)}"`
    );
  });

  test("substitute latest defined variable value", () => {
    const css = `
      ${cssPreflight}
      .class {
          color: var(--var-a);
      }
      .vars {
        --var-a: rgba(222, 222, 222, 1);
      }
    `;

    expect(substituteVariables(css)).toMatchInlineSnapshot(
      `".class{color:rgba(222,222,222,1)}"`
    );
  });

  test("support variable fallback", () => {
    const css = `
      ${cssPreflight}
      .class {
          color: var(--var-not-exists, rgba(123, 123, 123, 0.1));
      }
    `;

    expect(substituteVariables(css)).toMatchInlineSnapshot(
      `".class{color:rgba(123,123,123,0.1)}"`
    );
  });

  test("resolve variables inside functions", () => {
    const css = `
      ${cssPreflight}
      .class {
          background: linear-gradient(var(--var-a), var(--var-b));
      }
    `;
    expect(substituteVariables(css)).toMatchInlineSnapshot(
      `".class{background:linear-gradient(rgba(111,111,111,0.5),rgba(222,222,222,0.5))}"`
    );
  });

  test("resolve nested dependencies", () => {
    const css = `
      ${cssPreflight}
      .class {
          --var-c: var(--var-a), var(--var-b);
          background: linear-gradient(var(--var-c));
      }
    `;
    expect(substituteVariables(css)).toMatchInlineSnapshot(
      `".class{background:linear-gradient(rgba(111,111,111,0.5),rgba(222,222,222,0.5))}"`
    );
  });

  test("warn if variable is not defined and omits property and empty selectors", () => {
    const css = `
      ${cssPreflight}
      .class {
          --var-c: var(--var-not-existed), var(--var-b);
          background: linear-gradient(var(--var-c));
      }
    `;
    const warn = jest.fn();

    expect(substituteVariables(css, warn)).toMatchInlineSnapshot(`""`);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      true,
      'Variable var(--var-not-existed) cannot be resolved for property "background:linear-gradient(var(--var-not-existed),rgba(222,222,222,0.5))" in selector ".class"'
    );
  });

  // @todo add support
  test("remove media queries", () => {
    const css = `
    ${cssPreflight}
    @media (min-width: 640px) {
    .sm\\:shadow-md {
      --var-c: var(--var-a), var(--var-b);
      background: linear-gradient(var(--var-c));
    }
    `;
    expect(substituteVariables(css)).toMatchInlineSnapshot(`""`);
  });

  // @todo add support
  test("remove pseudo selectors", () => {
    const css = `
    ${cssPreflight}
    .test {
      margin: 0;
    }
    .test:hover {
      margin: 0;
    }
    .test:focus {
      margin: 0;
    }
    `;
    expect(substituteVariables(css)).toMatchInlineSnapshot(`".test{margin:0}"`);
  });

  test("don't respect non * and class selectors i.e. ::backdrop", () => {
    const css = `
      ${cssPreflight}
      ::backdrop {
        --var-a: rgba(2, 2, 2, 0.5);
      }
      .class {
          color: var(--var-a);
      }
    `;

    expect(substituteVariables(css)).toMatchInlineSnapshot(
      `".class{color:rgba(111,111,111,0.5)}"`
    );
  });
});
