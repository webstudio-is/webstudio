export type QueryCondition<Field = string[], Operator = string> = {
  field: Field;
  operator: Operator;
  value: string;
};

export type QueryWhereTree<Condition> =
  | Condition
  | { all: QueryWhereTree<Condition>[] }
  | { any: QueryWhereTree<Condition>[] };

export type QueryWhere<Field = string[], Operator = string> = QueryWhereTree<
  QueryCondition<Field, Operator>
>;

export type QueryGroup<Field = string[], Operator = string> =
  | { all: QueryWhere<Field, Operator>[] }
  | { any: QueryWhere<Field, Operator>[] };

export type QuerySort<Field = string[]> = {
  field: Field;
  direction: string;
};

export type QueryField<FieldType extends string = string> = {
  path: string[];
  label: string;
  types: readonly FieldType[];
  operators?: readonly string[];
};

export type QueryOperator<
  FieldType extends string = string,
  Operator extends string = string,
> = {
  value: Operator;
  label: string;
  types: readonly FieldType[];
  input: {
    control: "expression" | "none";
    defaultValue: string;
  };
};

export type QueryNumberControl = {
  key: string;
  label: string;
  type: "number";
  min?: number;
  max?: number;
  exclusiveMin?: boolean;
  exclusiveMax?: boolean;
  integer?: boolean;
  optional?: boolean;
};

export type QueryFieldListControl = {
  key: string;
  label: string;
  type: "field-list";
  max?: number;
};

export type QueryParameterControlField =
  | QueryNumberControl
  | QueryFieldListControl;

export type QueryVariantControl = {
  type: "variant";
  key: string;
  label: string;
  defaultValue: unknown;
  schema: boolean | Record<string, unknown>;
  config: {
    discriminator: string;
    selection?: {
      label: string;
      emptyOption: string;
      baseline?: {
        key: string;
        label: string;
      };
    };
    options: readonly {
      value: string;
      label: string;
      defaultValue: Record<string, unknown>;
      fields: readonly QueryParameterControlField[];
    }[];
  };
};

export type QueryFilterControl<Operator extends string = string> = {
  type: "filter";
  key: string;
  label: string;
  defaultValue: QueryWhere<string[], Operator>;
  combinators: readonly ("all" | "any")[];
  limits: { conditions: number; depth: number };
  defaultCondition: Omit<QueryCondition<string[], Operator>, "value">;
  labels?: { condition?: string; conditionGroup?: string };
};

export type QuerySortControl = {
  type: "sort";
  key: string;
  label: string;
  defaultValue: QuerySort<string[]>[];
  defaultItem: QuerySort<string[]>;
  directions: readonly { value: string; label: string }[];
  max?: number;
};

export type QueryExpressionControl = {
  type: "expression";
  key: string;
  label: string;
  defaultValue: string;
  input: "number" | "expression";
  min?: number;
  max?: number;
  exclusiveMin?: boolean;
  exclusiveMax?: boolean;
  integer?: boolean;
};

export type QueryControl<Operator extends string = string> =
  | QueryFilterControl<Operator>
  | QuerySortControl
  | QueryExpressionControl
  | QueryVariantControl;

export type QueryDefinition<
  FieldType extends string = string,
  Operator extends string = string,
> = {
  version: 1;
  description?: string;
  fields: readonly QueryField<FieldType>[];
  operators: readonly QueryOperator<FieldType, Operator>[];
  source: {
    fieldPathSchema: boolean | Record<string, unknown>;
    controls: readonly QueryControl<Operator>[];
  };
};

export type QuerySourceVariantControl = Pick<
  QueryVariantControl,
  "type" | "key" | "label" | "defaultValue" | "schema"
>;

export type QuerySourceDefinition<
  FieldType extends string = string,
  Operator extends string = string,
> = Pick<QueryDefinition<FieldType, Operator>, "fields" | "operators"> & {
  source: {
    fieldPathSchema: boolean | Record<string, unknown>;
    controls: readonly (
      | QueryFilterControl<Operator>
      | QuerySortControl
      | QueryExpressionControl
      | QuerySourceVariantControl
    )[];
  };
};

export type QuerySourceResult<Query> =
  | { success: true; value: Query }
  | { success: false; message: string };

export type QuerySourceCodec<Query> = {
  parse: (source: string) => QuerySourceResult<Query>;
  format: (query: Query) => string;
};
