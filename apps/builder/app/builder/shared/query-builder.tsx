import { isLiteralExpression } from "@webstudio-is/expression";
import { Grid, InputField } from "@webstudio-is/design-system";
import { createPortal } from "react-dom";
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
  exclusiveMin,
  exclusiveMax,
  integer,
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
        validate={(value) => {
          if (value !== undefined && typeof value !== "number") {
            return `${label} expects a number value`;
          }
          if (typeof value !== "number") {
            return;
          }
          if (integer && Number.isInteger(value) === false) {
            return `${label} expects an integer value`;
          }
          if (
            min !== undefined &&
            (exclusiveMin ? value <= min : value < min)
          ) {
            return `${label} expects a value ${exclusiveMin ? "greater than" : "greater than or equal to"} ${min}`;
          }
          if (
            max !== undefined &&
            (exclusiveMax ? value >= max : value > max)
          ) {
            return `${label} expects a value ${exclusiveMax ? "less than" : "less than or equal to"} ${max}`;
          }
        }}
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
            step={integer === true ? 1 : "any"}
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
  sourceContainer,
  sectionPaddingInline,
  onChange,
}: {
  value: Query;
  capabilities: QueryDefinition<FieldType, Operator>;
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
  sourceContainer?: Element | null;
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
        <ExpressionEditor
          {...props}
          scope={scope}
          aliases={aliases}
          size={sourceContainer === undefined ? "default" : "full"}
          chromeless={sourceContainer !== undefined}
        />
      ),
    }}
    renderSource={
      sourceContainer === undefined
        ? undefined
        : (source) =>
            sourceContainer === null
              ? null
              : createPortal(
                  <Grid
                    css={{
                      height: "100%",
                      minHeight: 0,
                      gridTemplateRows: "minmax(0, 1fr) auto",
                    }}
                  >
                    {source}
                  </Grid>,
                  sourceContainer
                )
    }
    onChange={onChange}
  />
);
