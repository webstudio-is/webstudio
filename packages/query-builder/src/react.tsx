import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Flex,
  Grid,
  InputField,
  Label,
  Select,
  SmallIconButton,
  Text,
  TextArea,
  theme,
} from "@webstudio-is/design-system";
import { PlusIcon, TrashIcon } from "@webstudio-is/icons";
import {
  createQueryCondition,
  createQuerySort,
  getCompatibleQueryOperators,
  getQueryFieldKey,
  getQueryWhereMetrics,
} from "./query-utils";
import { createQuerySourceCodec } from "./source";
import type {
  QueryCondition,
  QueryField,
  QueryGroup,
  QuerySort,
  QueryCapabilities,
  QueryParameter,
  QueryWhere,
  StructuredQuery,
} from "./types";

export type QueryValueEditorProps = {
  "aria-label": string;
  value: string;
  onChange: (value: string) => void;
  role: "condition" | "limit" | "offset";
};

export type QuerySourceEditorProps = {
  "aria-label": string;
  value: string;
  onChange: (value: string) => void;
  onChangeComplete: (value: string) => void;
};

export type QueryBuilderEditors = {
  expression: (props: QueryValueEditorProps) => ReactNode;
  source: (props: QuerySourceEditorProps) => ReactNode;
};

type BuilderProps<
  FieldType extends string,
  Operator extends string,
  Query extends StructuredQuery<string[], Operator, Record<string, unknown>>,
> = {
  value: Query;
  capabilities: QueryCapabilities<FieldType, Operator>;
  editors?: Partial<QueryBuilderEditors>;
  onChange: (value: Query) => void;
};

type SharedProps<FieldType extends string, Operator extends string> = {
  capabilities: QueryCapabilities<FieldType, Operator>;
  renderExpressionEditor: QueryBuilderEditors["expression"];
};

const getFieldSelection = <FieldType extends string>(
  fields: readonly QueryField<FieldType>[],
  path: string[]
) => {
  const selected = fields.find(
    (field) => getQueryFieldKey(field.path) === getQueryFieldKey(path)
  );
  if (selected !== undefined) {
    return { selected, options: fields };
  }
  const unknown: QueryField<FieldType> = {
    path,
    label: path.join("."),
    types: [],
  };
  return { selected: unknown, options: [unknown, ...fields] };
};

const Condition = <FieldType extends string, Operator extends string>({
  capabilities,
  renderExpressionEditor,
  condition,
  onChange,
  onDelete,
}: SharedProps<FieldType, Operator> & {
  condition: QueryCondition<string[], Operator>;
  onChange: (condition: QueryCondition<string[], Operator>) => void;
  onDelete: () => void;
}) => {
  if (capabilities.fields.length === 0) {
    return <Text color="destructive">No query fields are available.</Text>;
  }
  const { selected: selectedField, options: fieldOptions } = getFieldSelection(
    capabilities.fields,
    condition.field
  );
  const compatibleOperators = getCompatibleQueryOperators(
    selectedField.types,
    capabilities.operators
  );
  const selectedOperator = compatibleOperators.find(
    (operator) => operator.value === condition.operator
  );
  const operators =
    selectedOperator === undefined
      ? [
          {
            value: condition.operator,
            label: String(condition.operator),
            types: selectedField.types,
            input: {
              control: "expression" as const,
              defaultValue: condition.value,
            },
          },
          ...compatibleOperators,
        ]
      : compatibleOperators;

  return (
    <Grid gap={1}>
      <Grid
        gap={1}
        align="center"
        css={{ gridTemplateColumns: "1fr 1fr min-content" }}
      >
        <Select<(typeof capabilities.fields)[number]>
          aria-label="Query field"
          options={fieldOptions}
          getLabel={(field) => field.label}
          getValue={(field) => getQueryFieldKey(field.path)}
          value={selectedField}
          onChange={(field) => {
            const nextOperators = getCompatibleQueryOperators(
              field.types,
              capabilities.operators
            );
            const operator = nextOperators.some(
              (option) => option.value === condition.operator
            )
              ? condition.operator
              : nextOperators[0]?.value;
            if (operator === undefined) {
              return;
            }
            onChange({
              ...condition,
              field: field.path,
              operator,
              value:
                operator === condition.operator
                  ? condition.value
                  : (capabilities.operators.find(
                      (item) => item.value === operator
                    )?.input.defaultValue ?? condition.value),
            });
          }}
        />
        <Select<(typeof operators)[number]>
          aria-label="Query operator"
          options={operators}
          getLabel={(operator: (typeof operators)[number]) => operator.label}
          getValue={(operator: (typeof operators)[number]) =>
            String(operator.value)
          }
          value={
            operators.find(
              (operator) => operator.value === condition.operator
            ) ?? operators[0]
          }
          onChange={(operator) => {
            onChange({
              ...condition,
              operator: operator.value,
              value: operator.input.defaultValue,
            });
          }}
        />
        <SmallIconButton
          aria-label="Delete query condition"
          variant="destructive"
          icon={<TrashIcon />}
          onClick={onDelete}
        />
      </Grid>
      {(selectedOperator?.input.control ?? operators[0]?.input.control) !==
        "none" &&
        renderExpressionEditor({
          "aria-label": "Query condition value",
          value: condition.value,
          role: "condition",
          onChange: (value) => onChange({ ...condition, value }),
        })}
    </Grid>
  );
};

const Group = <FieldType extends string, Operator extends string>({
  group,
  conditionCount,
  depth,
  root = false,
  onChange,
  onDelete,
  ...shared
}: SharedProps<FieldType, Operator> & {
  group: QueryGroup<string[], Operator>;
  conditionCount: number;
  depth: number;
  root?: boolean;
  onChange: (group: QueryGroup<string[], Operator>) => void;
  onDelete?: () => void;
}) => {
  const combinator = "all" in group ? "all" : "any";
  const children = "all" in group ? group.all : group.any;
  const defaultCombinator =
    shared.capabilities.features.combinators[0] ?? "all";
  const combinators: readonly ("all" | "any")[] =
    shared.capabilities.features.combinators.includes(combinator)
      ? shared.capabilities.features.combinators
      : [combinator, ...shared.capabilities.features.combinators];
  const updateChildren = (next: QueryWhere<string[], Operator>[]) =>
    onChange(combinator === "all" ? { all: next } : { any: next });
  const canAddCondition =
    conditionCount < shared.capabilities.limits.conditions;
  const canAddGroup = depth < shared.capabilities.limits.depth;

  return (
    <Grid
      gap={2}
      css={
        root
          ? undefined
          : {
              paddingLeft: theme.spacing[3],
              borderLeft: `1px solid ${theme.colors.borderMain}`,
            }
      }
    >
      <Flex justify="between" align="center" gap={1}>
        {root ? <Label>Filters</Label> : <Text>Filter group</Text>}
        <Flex gap={1} align="center">
          <Select<"all" | "any">
            aria-label={root ? "Query logic" : "Query group logic"}
            options={combinators}
            getLabel={(value: "all" | "any") =>
              value === "all" ? "Match all" : "Match any"
            }
            value={combinator}
            onChange={(value: "all" | "any") =>
              onChange(value === "all" ? { all: children } : { any: children })
            }
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SmallIconButton
                aria-label="Add query condition or group"
                icon={<PlusIcon />}
                disabled={canAddCondition === false && canAddGroup === false}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4}>
              <DropdownMenuItem
                disabled={canAddCondition === false}
                onSelect={() =>
                  updateChildren([
                    ...children,
                    createQueryCondition(shared.capabilities),
                  ])
                }
              >
                {shared.capabilities.labels?.condition ?? "Condition"}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={canAddGroup === false}
                onSelect={() =>
                  updateChildren([
                    ...children,
                    defaultCombinator === "all" ? { all: [] } : { any: [] },
                  ])
                }
              >
                {shared.capabilities.labels?.conditionGroup ??
                  "Condition group"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {onDelete !== undefined && (
            <SmallIconButton
              aria-label="Delete query group"
              variant="destructive"
              icon={<TrashIcon />}
              onClick={onDelete}
            />
          )}
        </Flex>
      </Flex>
      {children.map((child, index) =>
        "field" in child ? (
          <Condition
            {...shared}
            key={index}
            condition={child}
            onChange={(next) => {
              const updated = [...children];
              updated[index] = next;
              updateChildren(updated);
            }}
            onDelete={() =>
              updateChildren(
                children.filter((_, position) => position !== index)
              )
            }
          />
        ) : (
          <Group
            {...shared}
            key={index}
            group={child}
            conditionCount={conditionCount}
            depth={depth + 1}
            onChange={(next) => {
              const updated = [...children];
              updated[index] = next;
              updateChildren(updated);
            }}
            onDelete={() =>
              updateChildren(
                children.filter((_, position) => position !== index)
              )
            }
          />
        )
      )}
      {children.length === 0 && (
        <Text color="subtle">
          {combinator === "all"
            ? (shared.capabilities.labels?.emptyAll ??
              "All records are included.")
            : (shared.capabilities.labels?.emptyAny ??
              "No records are included.")}
        </Text>
      )}
    </Grid>
  );
};

const Sorting = <FieldType extends string, Operator extends string>({
  sort,
  onChange,
  capabilities,
}: Pick<SharedProps<FieldType, Operator>, "capabilities"> & {
  sort: QuerySort<string[]>[];
  onChange: (sort: QuerySort<string[]>[]) => void;
}) => (
  <Grid gap={2}>
    <Flex justify="between" align="center">
      <Label>Sort</Label>
      <SmallIconButton
        aria-label="Add query sort"
        icon={<PlusIcon />}
        disabled={sort.length >= capabilities.limits.sortFields}
        onClick={() => onChange([...sort, createQuerySort(capabilities)])}
      />
    </Flex>
    {sort.map((order, index) => {
      if (capabilities.fields.length === 0) {
        return null;
      }
      const { selected: selectedField, options: fieldOptions } =
        getFieldSelection(capabilities.fields, order.field);
      return (
        <Grid
          key={index}
          gap={1}
          align="center"
          css={{ gridTemplateColumns: "1fr 110px min-content" }}
        >
          <Select<(typeof capabilities.fields)[number]>
            aria-label="Query sort field"
            options={fieldOptions}
            getLabel={(field) => field.label}
            getValue={(field) => getQueryFieldKey(field.path)}
            value={selectedField}
            onChange={(field) => {
              const next = [...sort];
              next[index] = { ...order, field: field.path };
              onChange(next);
            }}
          />
          <Select<"asc" | "desc">
            aria-label="Query sort direction"
            options={["asc", "desc"]}
            getLabel={(direction: "asc" | "desc") =>
              direction === "asc" ? "Ascending" : "Descending"
            }
            value={order.direction}
            onChange={(direction: "asc" | "desc") => {
              const next = [...sort];
              next[index] = { ...order, direction };
              onChange(next);
            }}
          />
          <SmallIconButton
            aria-label="Delete query sort"
            variant="destructive"
            icon={<TrashIcon />}
            onClick={() =>
              onChange(sort.filter((_, position) => position !== index))
            }
          />
        </Grid>
      );
    })}
  </Grid>
);

const QueryParameters = ({
  parameters,
  fields,
  value,
  onChange,
}: {
  parameters: readonly QueryParameter[];
  fields: readonly QueryField[];
  value: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) => (
  <>
    {parameters.map((parameter) => {
      const current =
        typeof value[parameter.key] === "object" &&
        value[parameter.key] !== null &&
        Array.isArray(value[parameter.key]) === false
          ? (value[parameter.key] as Record<string, unknown>)
          : parameter.control.options[0]?.defaultValue;
      if (current === undefined) {
        return null;
      }
      const selected =
        parameter.control.options.find(
          (option) => current[parameter.control.discriminator] === option.value
        ) ?? parameter.control.options[0];
      if (selected === undefined) {
        return null;
      }
      return (
        <Grid key={parameter.key} gap={1}>
          <Label>{parameter.label}</Label>
          <Select<(typeof parameter.control.options)[number]>
            aria-label={parameter.label}
            options={parameter.control.options}
            getLabel={(option) => option.label}
            getValue={(option) => option.value}
            value={selected}
            onChange={(option) =>
              onChange(parameter.key, structuredClone(option.defaultValue))
            }
          />
          {selected.fields.length > 0 && (
            <Grid gap={1}>
              {selected.fields.map((field) => {
                if (field.type === "number") {
                  return (
                    <InputField
                      key={field.key}
                      aria-label={field.label}
                      type="number"
                      min={field.min}
                      max={field.max}
                      value={
                        current[field.key] === undefined
                          ? ""
                          : String(current[field.key])
                      }
                      onChange={(event) =>
                        onChange(parameter.key, {
                          ...current,
                          [field.key]:
                            field.optional && event.target.value === ""
                              ? undefined
                              : Number(event.target.value),
                        })
                      }
                    />
                  );
                }
                const paths = Array.isArray(current[field.key])
                  ? (current[field.key] as unknown[]).filter(
                      (path): path is string[] =>
                        Array.isArray(path) &&
                        path.every((segment) => typeof segment === "string")
                    )
                  : [];
                const selectedKeys = new Set(paths.map(getQueryFieldKey));
                const available = fields.filter(
                  ({ path }) =>
                    selectedKeys.has(getQueryFieldKey(path)) === false
                );
                return (
                  <Grid key={field.key} gap={1}>
                    {paths.map((path, index) => {
                      const selectedField = fields.find(
                        (candidate) =>
                          getQueryFieldKey(candidate.path) ===
                          getQueryFieldKey(path)
                      ) ?? {
                        path,
                        label: path.join("."),
                        types: [],
                      };
                      return (
                        <Grid
                          key={`${getQueryFieldKey(path)}:${index}`}
                          gap={1}
                          css={{ gridTemplateColumns: "1fr auto" }}
                        >
                          <Select<QueryField>
                            aria-label={`${field.label} ${index + 1}`}
                            options={[selectedField, ...available]}
                            getLabel={(option) => option.label}
                            getValue={(option) => getQueryFieldKey(option.path)}
                            value={selectedField}
                            onChange={(option) =>
                              onChange(parameter.key, {
                                ...current,
                                [field.key]: paths.map((value, position) =>
                                  position === index ? option.path : value
                                ),
                              })
                            }
                          />
                          <SmallIconButton
                            aria-label={`Delete ${field.label.toLowerCase()}`}
                            variant="destructive"
                            icon={<TrashIcon />}
                            onClick={() =>
                              onChange(parameter.key, {
                                ...current,
                                [field.key]: paths.filter(
                                  (_, position) => position !== index
                                ),
                              })
                            }
                          />
                        </Grid>
                      );
                    })}
                    {available.length > 0 &&
                      (field.max === undefined || paths.length < field.max) && (
                        <SmallIconButton
                          aria-label={`Add ${field.label.toLowerCase()}`}
                          icon={<PlusIcon />}
                          onClick={() =>
                            onChange(parameter.key, {
                              ...current,
                              [field.key]: [...paths, available[0].path],
                            })
                          }
                        />
                      )}
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Grid>
      );
    })}
  </>
);

const defaultExpressionEditor = ({
  "aria-label": ariaLabel,
  value,
  onChange,
}: QueryValueEditorProps) => (
  <InputField
    aria-label={ariaLabel}
    value={value}
    onChange={(event) => onChange(event.target.value)}
  />
);

const defaultSourceEditor = ({
  "aria-label": ariaLabel,
  value,
  onChange,
  onChangeComplete,
}: QuerySourceEditorProps) => (
  <TextArea
    aria-label={ariaLabel}
    value={value}
    variant="mono"
    onChange={onChange}
    onBlur={(event) => onChangeComplete(event.currentTarget.value)}
  />
);

export const StructuredQueryBuilder = <
  FieldType extends string,
  Operator extends string,
  Query extends StructuredQuery<string[], Operator>,
>({
  value,
  capabilities,
  editors,
  onChange,
}: BuilderProps<FieldType, Operator, Query>) => {
  const sourceCodec = useMemo(
    () => createQuerySourceCodec<FieldType, Operator, Query>(capabilities),
    [capabilities]
  );
  const formatSource = sourceCodec.format;
  const formattedSource = useMemo(() => {
    try {
      return formatSource(value);
    } catch {
      return;
    }
  }, [formatSource, value]);
  const [source, setSource] = useState(formattedSource ?? "");
  const [sourceError, setSourceError] = useState<string>();
  const sourceInvalidRef = useRef(false);

  useEffect(() => {
    if (formattedSource === undefined || sourceInvalidRef.current) {
      return;
    }
    setSource(formattedSource);
  }, [formattedSource]);

  const commit = (next: Query) => {
    try {
      setSource(sourceCodec.format(next));
      setSourceError(undefined);
      sourceInvalidRef.current = false;
    } catch {
      setSourceError("Complete every query field.");
    }
    onChange(next);
  };
  const commitSource = (nextSource: string) => {
    setSource(nextSource);
    const parsed = sourceCodec.parse(nextSource);
    if (parsed.success) {
      setSourceError(undefined);
      sourceInvalidRef.current = false;
      onChange(parsed.value);
    } else {
      setSourceError(parsed.message);
      sourceInvalidRef.current = true;
    }
  };
  const defaultCombinator = capabilities.features.combinators[0] ?? "all";
  const where =
    "field" in value.where
      ? defaultCombinator === "all"
        ? { all: [value.where] }
        : { any: [value.where] }
      : value.where;
  const metrics = getQueryWhereMetrics(where);
  const renderExpressionEditor = editors?.expression ?? defaultExpressionEditor;
  const renderSourceEditor = editors?.source ?? defaultSourceEditor;
  const shared = {
    capabilities,
    renderExpressionEditor,
  };

  return (
    <Grid gap={3}>
      <Group
        {...shared}
        group={where}
        conditionCount={metrics.conditions}
        depth={1}
        root={true}
        onChange={(nextWhere) => commit({ ...value, where: nextWhere })}
      />
      {capabilities.features.sort && (
        <Sorting
          capabilities={capabilities}
          sort={value.sort}
          onChange={(sort) => commit({ ...value, sort })}
        />
      )}
      {(capabilities.features.limit || capabilities.features.offset) && (
        <Grid
          gap={2}
          css={{
            gridTemplateColumns:
              capabilities.features.limit && capabilities.features.offset
                ? "1fr 1fr"
                : "1fr",
          }}
        >
          {capabilities.features.limit && (
            <Grid gap={1}>
              <Label>Limit</Label>
              {renderExpressionEditor({
                "aria-label": "Query limit",
                value: value.limit,
                role: "limit",
                onChange: (limit) => commit({ ...value, limit }),
              })}
            </Grid>
          )}
          {capabilities.features.offset && (
            <Grid gap={1}>
              <Label>Offset</Label>
              {renderExpressionEditor({
                "aria-label": "Query offset",
                value: value.offset,
                role: "offset",
                onChange: (offset) => commit({ ...value, offset }),
              })}
            </Grid>
          )}
        </Grid>
      )}
      <QueryParameters
        parameters={capabilities.source.parameters}
        fields={capabilities.fields}
        value={value}
        onChange={(key, parameterValue) =>
          commit({ ...value, [key]: parameterValue })
        }
      />
      <Grid gap={1}>
        <Label>Query source</Label>
        {renderSourceEditor({
          "aria-label": "Query source",
          value: source,
          onChange: setSource,
          onChangeComplete: commitSource,
        })}
        {sourceError !== undefined && (
          <Text color="destructive">{sourceError}</Text>
        )}
      </Grid>
    </Grid>
  );
};
