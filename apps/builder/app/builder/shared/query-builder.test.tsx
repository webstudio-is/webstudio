import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vitest";
import type { QueryDefinition } from "@webstudio-is/query-builder";
import { encodeDataSourceVariable, type DataSource } from "@webstudio-is/sdk";
import { $dataSources } from "~/shared/sync/data-stores";
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
  $dataSources.set(new Map());
});

const renderQueryBuilder = <Query extends Record<string, unknown>>({
  value,
  capabilities,
  sourceContainer,
}: {
  value: Query;
  capabilities: QueryDefinition<string, string>;
  sourceContainer?: Element | null;
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
        sourceContainer={sourceContainer}
        onChange={() => {}}
      />
    );
  });
  return container;
};

test("shows public variable names without changing the stored expression", () => {
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
  const source = Array.from(container.querySelectorAll(".cm-content")).at(-1);

  expect(editor?.textContent).toBe('"/blog/article"');
  expect(source?.textContent).toContain("system.pathname");
  expect(source?.textContent).not.toContain("$ws$system.pathname");
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
          integer: true,
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
  expect(input?.step).toBe("1");
  expect(input?.disabled).toBe(true);
});

test("keeps query values bound to mutable variables read-only", () => {
  const textVariable: DataSource = {
    type: "variable",
    id: "text-variable-id",
    name: "Text variable",
    value: { type: "string", value: "article" },
  };
  const numberVariable: DataSource = {
    type: "variable",
    id: "number-variable-id",
    name: "Number variable",
    value: { type: "number", value: 20 },
  };
  $dataSources.set(
    new Map([
      [textVariable.id, textVariable],
      [numberVariable.id, numberVariable],
    ])
  );
  const textIdentifier = encodeDataSourceVariable(textVariable.id);
  const numberIdentifier = encodeDataSourceVariable(numberVariable.id);
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
    value: {
      where: {
        all: [{ field: ["path"], operator: "eq", value: textIdentifier }],
      },
      limit: numberIdentifier,
    },
    capabilities,
  });
  const editor = container.querySelector<HTMLElement>(".cm-content");
  const input = container.querySelector<HTMLInputElement>(
    'input[aria-label="Limit"]'
  );

  expect(editor?.getAttribute("contenteditable")).toBe("false");
  expect(input?.disabled).toBe(true);
});

test("renders the query source inside a constrained full-size editor", () => {
  const sourceContainer = document.createElement("div");
  document.body.appendChild(sourceContainer);
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
      controls: [],
    },
  } as const satisfies QueryDefinition<string, string>;

  renderQueryBuilder({
    value: {},
    capabilities,
    sourceContainer,
  });

  const sourceLayout = sourceContainer.firstElementChild;
  const editorContent = sourceContainer.querySelector(
    '[data-chromeless="true"]'
  );
  const editorLayout = sourceLayout?.firstElementChild;
  expect(sourceLayout).not.toBeNull();
  expect(editorLayout).not.toBeNull();
  expect(editorContent).not.toBeNull();
  expect(editorLayout?.firstElementChild).toBe(editorContent);
  const scrollerStyle = getComputedStyle(
    sourceContainer.querySelector(".cm-scroller") as Element
  );
  expect(scrollerStyle.minHeight).toBe("0px");
  expect(scrollerStyle.overflowX).toBe("hidden");
  expect(scrollerStyle.overflowY).toBe("auto");
});
