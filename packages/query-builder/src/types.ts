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
  direction: "asc" | "desc";
};

export type StructuredQuery<
  Field = string[],
  Operator = string,
  Extension extends object = object,
> = {
  where: QueryWhere<Field, Operator>;
  sort: QuerySort<Field>[];
  limit: string;
  offset: string;
} & Extension;

export type QueryField<FieldType extends string = string> = {
  path: string[];
  label: string;
  types: readonly FieldType[];
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

export type QueryParameter = {
  key: string;
  label: string;
  defaultValue: unknown;
  schema: boolean | Record<string, unknown>;
  control: {
    type: "variant";
    discriminator: string;
    options: readonly {
      value: string;
      label: string;
      defaultValue: Record<string, unknown>;
      fields: readonly QueryParameterControlField[];
    }[];
  };
};

export type QueryLimits = {
  conditions: number;
  depth: number;
  sortFields: number;
};

export type QueryCapabilities<
  FieldType extends string = string,
  Operator extends string = string,
> = {
  version: 1;
  fields: readonly QueryField<FieldType>[];
  operators: readonly QueryOperator<FieldType, Operator>[];
  features: {
    combinators: readonly ("all" | "any")[];
    sort: boolean;
    limit: boolean;
    offset: boolean;
  };
  limits: QueryLimits;
  defaults: {
    condition: Omit<QueryCondition<string[], Operator>, "value">;
    sort: QuerySort<string[]>;
    limit: string;
    offset: string;
  };
  source: {
    rootKey: string;
    fieldPathSchema: boolean | Record<string, unknown>;
    parameters: readonly QueryParameter[];
  };
  labels?: {
    condition?: string;
    conditionGroup?: string;
    emptyAll?: string;
    emptyAny?: string;
  };
};

export type QuerySourceResult<Query> =
  | { success: true; value: Query }
  | { success: false; message: string };

export type QuerySourceCodec<Query> = {
  parse: (source: string) => QuerySourceResult<Query>;
  format: (query: Query) => string;
};
