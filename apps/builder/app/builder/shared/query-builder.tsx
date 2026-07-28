import { isLiteralExpression } from "@webstudio-is/expression";
import { InputField } from "@webstudio-is/design-system";
import {
  StructuredQueryBuilder,
  type QueryValueEditorProps,
} from "@webstudio-is/query-builder-react";
import type { QueryDefinition } from "@webstudio-is/query-builder";
import { BindingControl, BindingPopover } from "./binding-popover";
import { ExpressionEditor } from "./expression-editor";

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
}) =>
  input === "expression" ? (
    <BindingControl>
      <div>
        <ExpressionEditor
          aria-label={label}
          value={value}
          onChange={onChange}
          onChangeComplete={onChange}
        />
      </div>
      <BindingPopover
        scope={scope}
        aliases={aliases}
        variant={isLiteralExpression(value) ? "default" : "bound"}
        onChange={onChange}
        value={value}
        onRemove={(literal) => onChange(JSON.stringify(literal))}
      />
    </BindingControl>
  ) : (
    <InputField
      aria-label={label}
      type="number"
      min={min}
      max={max}
      step={1}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );

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
