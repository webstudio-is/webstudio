import { isLiteralExpression } from "@webstudio-is/expression";
import { InputField } from "@webstudio-is/design-system";
import {
  StructuredQueryBuilder,
  type QueryValueEditorProps,
} from "@webstudio-is/query-builder-react";
import type { QueryDefinition } from "@webstudio-is/query-builder";
import { evaluateExpressionWithinScope } from "./binding-popover";
import { BindableExpressionControl } from "./bindable-expression";
import { ExpressionEditor, formatValue } from "./expression-editor";

const BoundExpression = ({
  "aria-label": label,
  value,
  scope,
  aliases,
  onChange,
  input,
  min,
  max,
}: QueryValueEditorProps & {
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
}) => {
  const bound = isLiteralExpression(value) === false;
  const evaluatedValue = evaluateExpressionWithinScope(value, scope);

  if (input === "number") {
    const number = Number(evaluatedValue);
    const displayedValue = Number.isNaN(number) ? "" : String(number);
    return (
      <BindableExpressionControl
        expression={value}
        value={displayedValue}
        bound={bound}
        scope={scope}
        aliases={aliases}
        validate={(value) =>
          value !== undefined && typeof value !== "number"
            ? `${label} expects a number value`
            : undefined
        }
        parseValue={Number}
        onChangeValue={onChange}
        onChangeExpression={onChange}
        onRemove={(value) => onChange(String(Number(value) || 0))}
        renderControl={({ value, readOnly, onChangeValue }) => (
          <InputField
            aria-label={label}
            type="number"
            min={min}
            max={max}
            step={1}
            disabled={readOnly}
            value={value}
            onChange={(event) => onChangeValue(event.target.value)}
          />
        )}
      />
    );
  }

  const displayedValue = bound ? formatValue(evaluatedValue) : value;
  return (
    <BindableExpressionControl
      expression={value}
      value={displayedValue}
      bound={bound}
      scope={scope}
      aliases={aliases}
      parseValue={(value) => evaluateExpressionWithinScope(value, {})}
      onChangeValue={onChange}
      onChangeExpression={onChange}
      onRemove={(value) => onChange(JSON.stringify(value) ?? "undefined")}
      renderControl={({ value, readOnly, onChangeValue }) => {
        const updateValue = (nextValue: string) => {
          if (bound && isLiteralExpression(nextValue) === false) {
            return;
          }
          onChangeValue(nextValue);
        };
        return (
          <div>
            <ExpressionEditor
              aria-label={label}
              readOnly={readOnly}
              value={value}
              onChange={updateValue}
              onChangeComplete={updateValue}
            />
          </div>
        );
      }}
    />
  );
};

export const BindableQueryBuilder = <
  FieldType extends string,
  Operator extends string,
  Query extends Record<string, unknown>,
>({
  value,
  capabilities,
  scope,
  aliases,
  sectionPaddingInline,
  onChange,
}: {
  value: Query;
  capabilities: QueryDefinition<FieldType, Operator>;
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
  sectionPaddingInline?: string;
  onChange: (value: Query) => void;
}) => (
  <StructuredQueryBuilder<FieldType, Operator, Query>
    value={value}
    capabilities={capabilities}
    sectionPaddingInline={sectionPaddingInline}
    editors={{
      expression: (props) => (
        <BoundExpression {...props} scope={scope} aliases={aliases} />
      ),
      source: (props) => (
        <ExpressionEditor {...props} scope={scope} aliases={aliases} />
      ),
    }}
    onChange={onChange}
  />
);
