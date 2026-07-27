/**
 * @vitest-environment jsdom
 */
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { createStructuredQuery } from "./query-utils";
import { StructuredQueryBuilder } from "./react";
import { genericQueryCapabilities, type GenericQuery } from "./test-fixtures";

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
    selection: { mode: "fields", fields: [] },
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
    selection: { mode: "fields", fields: [["legacy", "field"]] },
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

describe("structured query builder", () => {
  test("renders and edits solely from provider-neutral capabilities", () => {
    render(<QueryBuilderFixture />);

    expect(screen.getByText("Filters")).toBeTruthy();
    expect(screen.getByText("Sort")).toBeTruthy();
    expect(screen.getByText("Selection")).toBeTruthy();

    const limit = screen.getByLabelText("Query limit");
    fireEvent.change(limit, { target: { value: "pageSize ?? 20" } });
    expect((limit as HTMLInputElement).value).toBe("pageSize ?? 20");

    const source = screen.getByLabelText("Query source");
    expect((source as HTMLTextAreaElement).value).toContain("pageSize ?? 20");
  });

  test("edits a declarative field-list parameter", () => {
    render(<FieldSelectionFixture />);

    fireEvent.click(screen.getByLabelText("Add fields"));
    expect(
      (screen.getByLabelText("Query source") as HTMLTextAreaElement).value
    ).toContain('"fields":[["title"]]');
  });

  test("preserves a selected field that is absent from current capabilities", () => {
    render(<UnknownFieldSelectionFixture />);

    expect(screen.getByText("legacy.field")).toBeTruthy();
    expect(
      (screen.getByLabelText("Query source") as HTMLTextAreaElement).value
    ).toContain('"fields":[["legacy","field"]]');
  });

  test("shows configured filter and sort fields that are absent from capabilities", () => {
    render(<UnknownFilterAndSortFixture />);

    expect(screen.getByText("legacy.filter")).toBeTruthy();
    expect(screen.getByText("legacy.sort")).toBeTruthy();
    const source = (
      screen.getByLabelText("Query source") as HTMLTextAreaElement
    ).value;
    expect(source).toContain('["legacy","filter"]');
    expect(source).toContain('["legacy","sort"]');
  });
});
