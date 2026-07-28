/**
 * @vitest-environment jsdom
 */
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { createStructuredQuery } from "@webstudio-is/query-builder";
import { StructuredQueryBuilder } from "./index";
import { genericQueryCapabilities, type GenericQuery } from "./test-fixtures";

const selectionCapabilities = {
  ...genericQueryCapabilities,
  source: {
    ...genericQueryCapabilities.source,
    controls: genericQueryCapabilities.source.controls.map((parameter) =>
      parameter.type === "variant"
        ? {
            ...parameter,
            schema: {
              ...parameter.schema,
              properties: {
                ...parameter.schema.properties,
                maxBytes: { type: "number" },
              },
            },
            config: {
              ...parameter.config,
              selection: {
                label: "Output",
                emptyOption: "summary",
                baseline: { key: "includeMetadata", label: "File metadata" },
              },
              options: parameter.config.options.map((option) =>
                option.value === "full"
                  ? {
                      ...option,
                      defaultValue: { ...option.defaultValue, maxBytes: 64 },
                      fields: [
                        {
                          key: "maxBytes",
                          label: "Maximum bytes",
                          type: "number" as const,
                          min: 1,
                        },
                      ],
                    }
                  : option
              ),
            },
          }
        : parameter
    ),
  },
} as const;

const groupedSelectionCapabilities = {
  ...selectionCapabilities,
  source: {
    ...selectionCapabilities.source,
    controls: [
      ...selectionCapabilities.source.controls,
      {
        type: "variant",
        key: "content",
        label: "File content",
        defaultValue: { mode: "none" },
        schema: {
          type: "object",
          properties: { mode: { enum: ["none", "full", "range"] } },
          required: ["mode"],
          additionalProperties: true,
        },
        config: {
          discriminator: "mode",
          selection: { label: "Output", emptyOption: "none" },
          options: [
            {
              value: "none",
              label: "No content",
              defaultValue: { mode: "none" },
              fields: [],
            },
            {
              value: "full",
              label: "Full file",
              defaultValue: { mode: "full" },
              fields: [],
            },
            {
              value: "range",
              label: "Byte range",
              defaultValue: { mode: "range" },
              fields: [],
            },
          ],
        },
      },
    ],
  },
} as const;

afterEach(cleanup);

const QueryBuilderFixture = () => {
  const [query, setQuery] = useState(
    createStructuredQuery(genericQueryCapabilities) as GenericQuery
  );
  return (
    <StructuredQueryBuilder
      value={query}
      capabilities={genericQueryCapabilities}
      onChange={setQuery}
    />
  );
};

const FieldSelectionFixture = () => {
  const [query, setQuery] = useState<GenericQuery>({
    ...(createStructuredQuery(genericQueryCapabilities) as GenericQuery),
    selection: { mode: "fields", includeMetadata: true, fields: [] },
  });
  return (
    <StructuredQueryBuilder
      value={query}
      capabilities={genericQueryCapabilities}
      onChange={setQuery}
    />
  );
};

const UnknownFieldSelectionFixture = () => {
  const [query, setQuery] = useState<GenericQuery>({
    ...(createStructuredQuery(genericQueryCapabilities) as GenericQuery),
    selection: {
      mode: "fields",
      includeMetadata: true,
      fields: [["legacy", "field"]],
    },
  });
  return (
    <StructuredQueryBuilder
      value={query}
      capabilities={genericQueryCapabilities}
      onChange={setQuery}
    />
  );
};

const UnknownFilterAndSortFixture = () => {
  const [query, setQuery] = useState<GenericQuery>({
    ...(createStructuredQuery(genericQueryCapabilities) as GenericQuery),
    where: {
      all: [{ field: ["legacy", "filter"], operator: "eq", value: '"yes"' }],
    },
    sort: [{ field: ["legacy", "sort"], direction: "asc" }],
  });
  return (
    <StructuredQueryBuilder
      value={query}
      capabilities={genericQueryCapabilities}
      onChange={setQuery}
    />
  );
};

const SelectionFixture = () => {
  const [query, setQuery] = useState<GenericQuery>({
    ...(createStructuredQuery(selectionCapabilities) as GenericQuery),
    selection: {
      mode: "fields",
      includeMetadata: true,
      fields: [["title"]],
    },
  });
  return (
    <StructuredQueryBuilder
      value={query}
      capabilities={selectionCapabilities}
      onChange={setQuery}
    />
  );
};

const ConfigurableSelectionFixture = () => {
  const [query, setQuery] = useState<GenericQuery>({
    ...(createStructuredQuery(selectionCapabilities) as GenericQuery),
    selection: {
      mode: "full",
      includeMetadata: false,
      maxBytes: 64,
    },
  });
  return (
    <StructuredQueryBuilder
      value={query}
      capabilities={selectionCapabilities}
      onChange={setQuery}
    />
  );
};

const GroupedSelectionFixture = () => {
  const [query, setQuery] = useState(
    createStructuredQuery(groupedSelectionCapabilities) as GenericQuery & {
      content: { mode: "none" | "full" | "range" };
    }
  );
  return (
    <StructuredQueryBuilder
      value={query}
      capabilities={groupedSelectionCapabilities}
      onChange={setQuery}
    />
  );
};

describe("structured query builder", () => {
  test("renders and edits solely from provider-neutral capabilities", () => {
    render(<QueryBuilderFixture />);

    expect(screen.getByText("Filters")).toBeTruthy();
    expect(screen.getByText("Sort")).toBeTruthy();
    expect(screen.getByText("Selection")).toBeTruthy();

    const limit = screen.getByLabelText("Limit");
    expect((limit as HTMLInputElement).type).toBe("number");
    fireEvent.change(limit, { target: { value: "20" } });
    expect((limit as HTMLInputElement).value).toBe("20");

    const source = screen.getByLabelText("Query");
    expect((source as HTMLTextAreaElement).value).toContain("limit: 20");
  });

  test("edits a declarative field-list parameter", () => {
    render(<FieldSelectionFixture />);

    fireEvent.click(screen.getByLabelText("Add fields"));
    expect(
      (screen.getByLabelText("Query") as HTMLTextAreaElement).value
    ).toContain('fields: [["title"]]');
  });

  test("preserves a selected field that is absent from current capabilities", () => {
    render(<UnknownFieldSelectionFixture />);

    expect(screen.getByText("legacy.field")).toBeTruthy();
    expect(
      (screen.getByLabelText("Query") as HTMLTextAreaElement).value
    ).toContain('fields: [["legacy", "field"]]');
  });

  test("shows configured filter and sort fields that are absent from capabilities", () => {
    render(<UnknownFilterAndSortFixture />);

    expect(screen.getByText("legacy.filter")).toBeTruthy();
    expect(screen.getByText("legacy.sort")).toBeTruthy();
    const source = (screen.getByLabelText("Query") as HTMLTextAreaElement)
      .value;
    expect(source).toContain('["legacy","filter"]');
    expect(source).toContain('["legacy", "sort"]');
  });

  test("renders projections from a declarative Output section", () => {
    render(<SelectionFixture />);

    expect(screen.getByText("Output")).toBeTruthy();
    expect(screen.getByText("File metadata")).toBeTruthy();
    expect(screen.getByLabelText("Add output")).toBeTruthy();
    expect(screen.getByText("Title")).toBeTruthy();
    expect(
      (screen.getByLabelText("Query") as HTMLTextAreaElement).value
    ).toContain('fields: [["title"]]');
    fireEvent.click(screen.getByLabelText("Delete file metadata"));
    expect(
      (screen.getByLabelText("Query") as HTMLTextAreaElement).value
    ).toContain("includeMetadata: false");
    expect(
      (screen.getByLabelText("Delete title") as HTMLButtonElement).disabled
    ).toBe(true);
  });

  test("edits a configurable output from its single list row", () => {
    render(<ConfigurableSelectionFixture />);

    fireEvent.click(screen.getByRole("button", { name: "Full" }));
    expect(screen.getByText("Maximum bytes")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Maximum bytes"), {
      target: { value: "128" },
    });
    expect(
      (screen.getByLabelText("Query") as HTMLTextAreaElement).value
    ).toContain("maxBytes: 128");
  });

  test("groups mutually exclusive output families in the add menu", () => {
    render(<GroupedSelectionFixture />);

    fireEvent.keyDown(screen.getByLabelText("Add output"), { key: "Enter" });
    expect(screen.getByText("Selection")).toBeTruthy();
    expect(screen.getByText("File content")).toBeTruthy();
    expect(screen.getByRole("separator")).toBeTruthy();
  });
});
