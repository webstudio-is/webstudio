import { isLiteralExpression } from "@webstudio-is/sdk";
import {
  StructuredQueryBuilder,
  type QueryValueEditorProps,
} from "@webstudio-is/query-builder/react";
import type {
  QueryCapabilities,
  StructuredQuery,
} from "@webstudio-is/query-builder";
import { BindingControl, BindingPopover } from "./binding-popover";
import { ExpressionEditor } from "./expression-editor";

const BoundExpression = ({
  "aria-label": label,
  value,
  scope,
  aliases,
  onChange,
}: QueryValueEditorProps & {
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
}) => (
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
      value={value}
      onChange={onChange}
      onRemove={(literal) => onChange(JSON.stringify(literal))}
    />
  </BindingControl>
);

export const WebstudioQueryBuilder = <
  FieldType extends string,
  Operator extends string,
  Query extends StructuredQuery<string[], Operator>,
>({
  value,
  capabilities,
  scope,
  aliases,
  onChange,
}: {
  value: Query;
  capabilities: QueryCapabilities<FieldType, Operator>;
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
  onChange: (value: Query) => void;
}) => (
  <StructuredQueryBuilder<FieldType, Operator, Query>
    value={value}
    capabilities={capabilities}
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
