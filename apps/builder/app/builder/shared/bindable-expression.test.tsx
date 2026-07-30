/**
 * @vitest-environment jsdom
 */
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { encodeDataSourceVariable, type DataSource } from "@webstudio-is/sdk";
import { $dataSourceVariables } from "~/shared/nano-states";
import { $dataSources } from "~/shared/sync/data-stores";
import { BindableExpressionControl } from "./bindable-expression";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  $dataSources.set(new Map());
  $dataSourceVariables.set(new Map());
});

const renderControl = ({
  expression,
  bound,
  allowBindingOverwrite,
  parseValue,
  onChangeValue,
}: {
  expression: string;
  bound: boolean;
  allowBindingOverwrite?: boolean;
  parseValue?: (value: string) => unknown;
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
        allowBindingOverwrite={allowBindingOverwrite}
        parseValue={parseValue}
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

test("updates a directly bound variable without replacing its expression", () => {
  const variable: DataSource = {
    type: "variable",
    id: "variable-id",
    name: "Variable",
    value: { type: "string", value: "initial" },
  };
  $dataSources.set(new Map([[variable.id, variable]]));
  const onChangeValue = vi.fn();
  const button = renderControl({
    expression: encodeDataSourceVariable(variable.id),
    bound: true,
    onChangeValue,
  });

  act(() => button.click());

  expect($dataSourceVariables.get().get(variable.id)).toBe("changed");
  expect(onChangeValue).not.toHaveBeenCalled();
});

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

test("parses bound values before updating the variable", () => {
  const variable: DataSource = {
    type: "variable",
    id: "variable-id",
    name: "Variable",
    value: { type: "string", value: "initial" },
  };
  $dataSources.set(new Map([[variable.id, variable]]));
  const parseValue = vi.fn((value: string) => ({ value }));
  const button = renderControl({
    expression: encodeDataSourceVariable(variable.id),
    bound: true,
    parseValue,
    onChangeValue: () => {},
  });

  act(() => button.click());

  expect(parseValue).toHaveBeenCalledExactlyOnceWith("changed");
  expect($dataSourceVariables.get().get(variable.id)).toEqual({
    value: "changed",
  });
});

test("does not parse literal input", () => {
  const parseValue = vi.fn((value: string) => ({ value }));
  const onChangeValue = vi.fn();
  const literalButton = renderControl({
    expression: '"displayed"',
    bound: false,
    parseValue,
    onChangeValue,
  });
  act(() => literalButton.click());
  expect(parseValue).not.toHaveBeenCalled();
  expect(onChangeValue).toHaveBeenCalledExactlyOnceWith("changed");
});

test("can keep directly bound values read-only", () => {
  const variable: DataSource = {
    type: "variable",
    id: "variable-id",
    name: "Variable",
    value: { type: "string", value: "initial" },
  };
  $dataSources.set(new Map([[variable.id, variable]]));
  const button = renderControl({
    expression: encodeDataSourceVariable(variable.id),
    bound: true,
    allowBindingOverwrite: false,
    onChangeValue: () => {},
  });

  expect(button.disabled).toBe(true);
});
