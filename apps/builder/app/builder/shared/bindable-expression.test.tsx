import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { encodeDataSourceVariable } from "@webstudio-is/sdk";
import { BindableExpressionControl } from "./bindable-expression";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

const renderControl = ({
  expression,
  bound,
  onChangeValue,
}: {
  expression: string;
  bound: boolean;
  onChangeValue: (value: string) => void;
}) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <BindableExpressionControl
        expression={expression}
        value="displayed"
        bound={bound}
        showBinding={false}
        scope={{}}
        aliases={new Map()}
        onChangeValue={onChangeValue}
        onChangeExpression={() => {}}
        onRemove={() => {}}
        renderControl={({ value, readOnly, onChangeValue }) => (
          <button
            type="button"
            disabled={readOnly}
            onClick={() => onChangeValue("changed")}
          >
            {value}
          </button>
        )}
      />
    );
  });
  return container.querySelector("button") as HTMLButtonElement;
};

test("passes literal input changes to its consumer", () => {
  const onChangeValue = vi.fn();
  const button = renderControl({
    expression: '"displayed"',
    bound: false,
    onChangeValue,
  });

  act(() => button.click());

  expect(onChangeValue).toHaveBeenCalledExactlyOnceWith("changed");
});

test("keeps directly bound values read-only", () => {
  const button = renderControl({
    expression: encodeDataSourceVariable("variable-id"),
    bound: true,
    onChangeValue: () => {},
  });

  expect(button.disabled).toBe(true);
});
