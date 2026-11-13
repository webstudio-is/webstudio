import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";
import { pageSettingsDefaultValues } from "@webstudio-is/project-build/runtime";
import { SearchSection } from "./section-search";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test("search exclusion preserves false and can be toggled in both directions", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const onChange = vi.fn();
  const render = async (expression: string) => {
    await act(async () => {
      root.render(
        <SearchSection
          values={{
            ...pageSettingsDefaultValues,
            excludePageFromSearch: expression,
          }}
          errors={{}}
          onChange={onChange}
          showBindingControls={false}
        />
      );
    });
  };
  try {
    await render("false");
    const checkbox =
      container.querySelector<HTMLButtonElement>('[role="checkbox"]')!;
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
    await act(async () => checkbox.click());
    expect(onChange).toHaveBeenLastCalledWith({
      field: "excludePageFromSearch",
      value: "true",
    });
    await render("true");
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
    await act(async () => checkbox.click());
    expect(onChange).toHaveBeenLastCalledWith({
      field: "excludePageFromSearch",
      value: "false",
    });
    await render("false");
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
