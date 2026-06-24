import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { Kbd } from "./kbd";

describe("Kbd", () => {
  test("renders click shortcuts without plus separators", () => {
    expect(
      renderToStaticMarkup(<Kbd value={["alt", "click"]} />)
    ).not.toContain("+");
    expect(renderToStaticMarkup(<Kbd value={["click"]} />)).not.toContain("+");
  });

  test("renders arrow shortcuts as symbols", () => {
    expect(
      renderToStaticMarkup(<Kbd value={["shift", "arrowup"]} />)
    ).toContain("↑");
    expect(
      renderToStaticMarkup(<Kbd value={["shift", "arrowdown"]} />)
    ).toContain("↓");
  });
});
