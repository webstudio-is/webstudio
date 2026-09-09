import { act } from "react-dom/test-utils";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";
import { userEvent } from "@vitest/browser/context";
import { TooltipProvider } from "@webstudio-is/design-system";
import { Time } from "@webstudio-is/sdk-components-react/metas";
import { renderControl } from "./combined";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test.each([
  ["2025-07-07", "date", "2025-07-07", "2025-08-09", "2025-08-09"],
  [
    "2025-07-07T12:30:00+02:00",
    "datetime-local",
    "2025-07-07T10:30",
    "2025-08-09T11:45",
    "2025-08-09T11:45:00.000Z",
  ],
  [
    "2025-07-07T12:30",
    "datetime-local",
    "2025-07-07T12:30",
    "2025-08-09T11:45",
    "2025-08-09T11:45",
  ],
  ["", "date", "", "2025-08-09", "2025-08-09"],
  ["not a date", "text", "not a date", "2025-08-09", "2025-08-09"],
])(
  "edits Date Time value %s without changing it on focus",
  async (source, type, displayed, edited, saved) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onChange = vi.fn();
    const Harness = () => {
      const [value, setValue] = useState(source);
      return (
        <TooltipProvider>
          {renderControl({
            instanceId: "date",
            propName: "datetime",
            meta: Time.props!.datetime,
            prop: {
              id: "datetime",
              instanceId: "date",
              name: "datetime",
              type: "string",
              value,
            },
            computedValue: value,
            onChange: (next) => {
              onChange(next);
              if (next.type === "string") {
                setValue(next.value);
              }
            },
          })}
        </TooltipProvider>
      );
    };
    try {
      await act(async () => root.render(<Harness />));
      const input = container.querySelector<HTMLInputElement>("input")!;
      expect(input?.type).toBe(type);
      expect(input.value).toBe(displayed);
      await act(async () => userEvent.click(input));
      await act(async () => input.blur());
      expect(onChange).not.toHaveBeenCalled();
      await act(async () => userEvent.fill(input, edited));
      await act(async () => input.blur());
      expect(onChange).toHaveBeenLastCalledWith({
        type: "string",
        value: saved,
      });
      await act(async () => userEvent.fill(input, ""));
      await act(async () => input.blur());
      expect(onChange).toHaveBeenLastCalledWith({ type: "string", value: "" });
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  }
);
