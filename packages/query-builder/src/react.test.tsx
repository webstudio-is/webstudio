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
});
