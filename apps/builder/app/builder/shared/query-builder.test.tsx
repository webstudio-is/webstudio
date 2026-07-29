/**
 * @vitest-environment jsdom
 */
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vitest";
import type { QueryDefinition } from "@webstudio-is/query-builder";
import { BindableQueryBuilder } from "./query-builder";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const scope = {
  $ws$system: {
    pathname: "/blog/article",
    page: 20,
  },
};
const aliases = new Map([["$ws$system", "system"]]);
let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

const renderQueryBuilder = <Query extends Record<string, unknown>>({
  value,
  capabilities,
}: {
  value: Query;
  capabilities: QueryDefinition<string, string>;
}) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <BindableQueryBuilder
        value={value}
        capabilities={capabilities}
        scope={scope}
        aliases={aliases}
        onChange={() => {}}
      />
    );
  });
  return container;
};

test("shows an evaluated filter value without changing the stored expression", () => {
  const value = {
    where: {
      all: [
        {
          field: ["path"],
          operator: "eq",
          value: "$ws$system.pathname",
        },
      ],
    },
  };
  const capabilities = {
    version: 1,
    fields: [{ path: ["path"], label: "Path", types: ["string"] }],
    operators: [
      {
        value: "eq",
        label: "Equals",
        types: ["string"],
        input: { control: "expression", defaultValue: '""' },
      },
    ],
    source: {
      fieldPathSchema: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
      },
      controls: [
        {
          type: "filter",
          key: "where",
          label: "Filters",
          defaultValue: { all: [] },
          combinators: ["all"],
          limits: { conditions: 8, depth: 3 },
          defaultCondition: { field: ["path"], operator: "eq" },
        },
      ],
    },
  } as const satisfies QueryDefinition<string, string>;

  const container = renderQueryBuilder({ value, capabilities });
  const editor = container.querySelector(".cm-content");

  expect(editor?.textContent).toBe('"/blog/article"');
  expect(value.where.all[0].value).toBe("$ws$system.pathname");
});

test("shows an evaluated value for a bound number input", () => {
  const capabilities = {
    version: 1,
    fields: [],
    operators: [],
    source: {
      fieldPathSchema: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
      },
      controls: [
        {
          type: "expression",
          key: "limit",
          label: "Limit",
          defaultValue: "20",
          input: "number",
        },
      ],
    },
  } as const satisfies QueryDefinition<string, string>;

  const container = renderQueryBuilder({
    value: { limit: "$ws$system.page" },
    capabilities,
  });
  const input = container.querySelector<HTMLInputElement>(
    'input[aria-label="Limit"]'
  );

  expect(input?.value).toBe("20");
  expect(input?.disabled).toBe(true);
});
