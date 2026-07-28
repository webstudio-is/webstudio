import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  CssValueListArrowFocus,
  CssValueListItem,
  Flex,
  Grid,
  IconButton,
  InputField,
  Label,
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
  Select,
  SmallIconButton,
  Text,
  TextArea,
  theme,
} from "@webstudio-is/design-system";
import { MinusIcon, PlusIcon } from "@webstudio-is/icons";
import {
  createQueryCondition,
  createQuerySort,
  createQuerySourceCodec,
  getCompatibleQueryOperators,
  getQueryFieldKey,
  getQueryWhereMetrics,
  type QueryCondition,
  type QueryField,
  type QueryGroup,
  type QuerySort,
  type QueryDefinition,
  type QueryFilterControl,
  type QueryExpressionControl,
  type QuerySortControl,
  type QueryVariantControl,
  type QueryWhere,
} from "@webstudio-is/query-builder";

export type QueryValueEditorProps = {
  "aria-label": string;
  value: string;
  onChange: (value: string) => void;
  role: "condition" | "value";
  input: "expression" | "number";
  min?: number;
  max?: number;
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
  Query extends Record<string, unknown>,
> = {
  value: Query;
  capabilities: QueryDefinition<FieldType, Operator>;
  editors?: Partial<QueryBuilderEditors>;
  sectionPaddingInline?: string;
  onChange: (value: Query) => void;
};

type SharedProps<FieldType extends string, Operator extends string> = {
  capabilities: QueryDefinition<FieldType, Operator>;
  filter: QueryFilterControl<Operator>;
  renderExpressionEditor: QueryBuilderEditors["expression"];
  sectionPaddingInline?: string;
};

const QuerySelectionListItem = ({
  id,
  index,
  label,
  canDelete,
  onDelete,
  settings,
}: {
  id: string;
  index: number;
  label: string;
  canDelete: boolean;
  onDelete: () => void;
  settings?: ReactNode;
}) => {
  const item = (
    <CssValueListItem
      id={id}
      index={index}
      type="button"
      label={<Label>{label}</Label>}
      buttons={
        <SmallIconButton
          tabIndex={-1}
          aria-label={`Delete ${label.toLowerCase()}`}
          disabled={canDelete === false}
          variant="destructive"
          icon={<MinusIcon />}
          onClick={onDelete}
        />
      }
    />
  );
  if (settings === undefined) {
    return item;
  }
  return (
    <Popover>
      <PopoverTrigger asChild>{item}</PopoverTrigger>
      <PopoverContent align="start">
        <PopoverTitle>{label}</PopoverTitle>
        <Grid
          gap={2}
          css={{ padding: theme.spacing[5], minWidth: theme.spacing[35] }}
        >
          {settings}
        </Grid>
      </PopoverContent>
    </Popover>
  );
};

const getField = <FieldType extends string>(
  fields: readonly QueryField<FieldType>[],
  path: string[]
) => {
  const key = getQueryFieldKey(path);
  return (
    fields.find((field) => getQueryFieldKey(field.path) === key) ?? {
      path,
      label: path.join("."),
      types: [],
    }
  );
};

const getFieldSelection = <FieldType extends string>(
  fields: readonly QueryField<FieldType>[],
  path: string[]
) => {
  const selected = getField(fields, path);
  return {
    selected,
    options: fields.includes(selected) ? fields : [selected, ...fields],
  };
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
    capabilities.operators,
    selectedField.operators
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
              capabilities.operators,
              field.operators
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
          icon={<MinusIcon />}
          onClick={onDelete}
        />
      </Grid>
      {(selectedOperator?.input.control ?? operators[0]?.input.control) !==
        "none" &&
        renderExpressionEditor({
          "aria-label": "Query condition value",
          value: condition.value,
          role: "condition",
          input: "expression",
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
  const defaultCombinator = shared.filter.combinators[0] ?? "all";
  const combinators: readonly ("all" | "any")[] =
    shared.filter.combinators.includes(combinator)
      ? shared.filter.combinators
      : [combinator, ...shared.filter.combinators];
  const updateChildren = (next: QueryWhere<string[], Operator>[]) =>
    onChange(combinator === "all" ? { all: next } : { any: next });
  const canAddCondition = conditionCount < shared.filter.limits.conditions;
  const canAddGroup = depth < shared.filter.limits.depth;

  return (
    <Grid
      gap={2}
      css={{
        ...(root
          ? {
              paddingInline: shared.sectionPaddingInline,
              borderTop: `1px solid ${theme.colors.borderMain}`,
              paddingTop: theme.spacing[7],
            }
          : {
              paddingLeft: theme.spacing[3],
              borderLeft: `1px solid ${theme.colors.borderMain}`,
            }),
      }}
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
              <IconButton
                aria-label="Add query condition or group"
                disabled={canAddCondition === false && canAddGroup === false}
              >
                <PlusIcon />
              </IconButton>
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
                {shared.filter.labels?.condition ?? "Condition"}
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
                {shared.filter.labels?.conditionGroup ?? "Condition group"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {onDelete !== undefined && (
            <SmallIconButton
              aria-label="Delete query group"
              variant="destructive"
              icon={<MinusIcon />}
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
    </Grid>
  );
};

const Sorting = <FieldType extends string, Operator extends string>({
  sort,
  onChange,
  capabilities,
  control,
  sectionPaddingInline,
}: Pick<
  SharedProps<FieldType, Operator>,
  "capabilities" | "sectionPaddingInline"
> & {
  control: QuerySortControl;
  sort: QuerySort<string[]>[];
  onChange: (sort: QuerySort<string[]>[]) => void;
}) => (
  <Grid gap={2} css={{ paddingInline: sectionPaddingInline }}>
    <Flex justify="between" align="center">
      <Label>Sort</Label>
      <IconButton
        aria-label="Add query sort"
        disabled={sort.length >= control.max}
        onClick={() => onChange([...sort, createQuerySort(capabilities)])}
      >
        <PlusIcon />
      </IconButton>
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
          css={{ gridTemplateColumns: "1fr 1fr min-content" }}
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
            icon={<MinusIcon />}
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
  sectionPaddingInline,
  onChange,
}: {
  parameters: readonly QueryVariantControl[];
  fields: readonly QueryField[];
  value: Record<string, unknown>;
  sectionPaddingInline?: string;
  onChange: (key: string, value: unknown) => void;
}) => {
  const getCurrent = (parameter: QueryVariantControl) =>
    typeof value[parameter.key] === "object" &&
    value[parameter.key] !== null &&
    Array.isArray(value[parameter.key]) === false
      ? (value[parameter.key] as Record<string, unknown>)
      : parameter.config.options[0]?.defaultValue;
  const getSelected = (parameter: QueryVariantControl) => {
    const current = getCurrent(parameter);
    return {
      current,
      option: parameter.config.options.find(
        (option) => current?.[parameter.config.discriminator] === option.value
      ),
    };
  };
  const selectionParameters = parameters.filter(
    (parameter) => parameter.config.selection !== undefined
  );
  const regularParameters = parameters.filter(
    (parameter) => parameter.config.selection === undefined
  );
  const selectionLabel =
    selectionParameters[0]?.config.selection?.label ?? "Selection";

  const renderNumberFields = (
    parameter: QueryVariantControl,
    current: Record<string, unknown>,
    option: QueryVariantControl["config"]["options"][number]
  ) =>
    option.fields.map((field) =>
      field.type === "number" ? (
        <Grid key={field.key} gap={1}>
          <Label>{field.label}</Label>
          <InputField
            aria-label={field.label}
            type="number"
            min={field.min}
            max={field.max}
            value={
              current[field.key] === undefined ? "" : String(current[field.key])
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
        </Grid>
      ) : null
    );

  const renderRegularFields = (
    parameter: QueryVariantControl,
    current: Record<string, unknown>,
    option: QueryVariantControl["config"]["options"][number]
  ) => (
    <Grid gap={1}>
      {option.fields.map((control) => {
        if (control.type === "number") {
          return renderNumberFields(parameter, current, {
            ...option,
            fields: [control],
          });
        }
        const paths = Array.isArray(current[control.key])
          ? (current[control.key] as unknown[]).filter(
              (path): path is string[] =>
                Array.isArray(path) &&
                path.every((segment) => typeof segment === "string")
            )
          : [];
        const selectedKeys = new Set(paths.map(getQueryFieldKey));
        const available = fields.filter(
          ({ path }) => selectedKeys.has(getQueryFieldKey(path)) === false
        );
        return (
          <Grid key={control.key} gap={1}>
            {paths.map((path, index) => {
              const selectedField = getField(fields, path);
              return (
                <Grid
                  key={`${getQueryFieldKey(path)}:${index}`}
                  gap={1}
                  css={{ gridTemplateColumns: "1fr auto" }}
                >
                  <Select<QueryField>
                    aria-label={`${control.label} ${index + 1}`}
                    options={[selectedField, ...available]}
                    getLabel={(field) => field.label}
                    getValue={(field) => getQueryFieldKey(field.path)}
                    value={selectedField}
                    onChange={(field) =>
                      onChange(parameter.key, {
                        ...current,
                        [control.key]: paths.map((value, position) =>
                          position === index ? field.path : value
                        ),
                      })
                    }
                  />
                  <SmallIconButton
                    aria-label={`Delete ${control.label.toLowerCase()}`}
                    variant="destructive"
                    icon={<MinusIcon />}
                    onClick={() =>
                      onChange(parameter.key, {
                        ...current,
                        [control.key]: paths.filter(
                          (_, position) => position !== index
                        ),
                      })
                    }
                  />
                </Grid>
              );
            })}
            {available.length > 0 &&
              (control.max === undefined || paths.length < control.max) && (
                <IconButton
                  aria-label={`Add ${control.label.toLowerCase()}`}
                  onClick={() =>
                    onChange(parameter.key, {
                      ...current,
                      [control.key]: [...paths, available[0].path],
                    })
                  }
                >
                  <PlusIcon />
                </IconButton>
              )}
          </Grid>
        );
      })}
    </Grid>
  );

  const getOptionPaths = (
    current: Record<string, unknown>,
    option: QueryVariantControl["config"]["options"][number]
  ) => {
    const fieldList = option.fields.find(
      (field) => field.type === "field-list"
    );
    return {
      fieldList,
      paths:
        fieldList !== undefined && Array.isArray(current[fieldList.key])
          ? (current[fieldList.key] as string[][])
          : [],
    };
  };

  const withCurrentBaseline = (
    parameter: QueryVariantControl,
    current: Record<string, unknown>,
    next: Record<string, unknown>
  ) => {
    const baseline = parameter.config.selection?.baseline;
    return baseline === undefined
      ? next
      : { ...next, [baseline.key]: current[baseline.key] !== false };
  };

  let selectionItemCount = 0;
  for (const parameter of selectionParameters) {
    const { current, option } = getSelected(parameter);
    const selection = parameter.config.selection;
    if (
      current === undefined ||
      option === undefined ||
      selection === undefined
    ) {
      continue;
    }
    if (
      selection.baseline !== undefined &&
      current[selection.baseline.key] !== false
    ) {
      selectionItemCount += 1;
    }
    if (option.value !== selection.emptyOption) {
      const { fieldList, paths } = getOptionPaths(current, option);
      selectionItemCount += fieldList === undefined ? 1 : paths.length;
    }
  }
  let selectionItemIndex = 0;

  const getSelectionMenuItems = (parameter: QueryVariantControl) => {
    const { current, option: selected } = getSelected(parameter);
    const selection = parameter.config.selection;
    if (current === undefined || selection === undefined) {
      return [];
    }
    const items: ReactNode[] = [];
    const baseline = selection.baseline;
    if (baseline !== undefined && current[baseline.key] === false) {
      items.push(
        <DropdownMenuItem
          key={`${parameter.key}:${baseline.key}`}
          onSelect={() =>
            onChange(parameter.key, {
              ...current,
              [baseline.key]: true,
            })
          }
        >
          {baseline.label}
        </DropdownMenuItem>
      );
    }
    for (const option of parameter.config.options) {
      if (option.value === selection.emptyOption) {
        continue;
      }
      const fieldList = option.fields.find(
        (field) => field.type === "field-list"
      );
      if (fieldList === undefined) {
        items.push(
          <DropdownMenuItem
            key={`${parameter.key}:${option.value}`}
            disabled={selected?.value === option.value}
            onSelect={() =>
              onChange(
                parameter.key,
                withCurrentBaseline(
                  parameter,
                  current,
                  structuredClone(option.defaultValue)
                )
              )
            }
          >
            {option.label}
          </DropdownMenuItem>
        );
        continue;
      }
      const paths =
        selected?.value === option.value &&
        Array.isArray(current[fieldList.key])
          ? (current[fieldList.key] as string[][])
          : [];
      const selectedKeys = new Set(paths.map(getQueryFieldKey));
      for (const field of fields) {
        items.push(
          <DropdownMenuItem
            key={`${parameter.key}:${option.value}:${getQueryFieldKey(field.path)}`}
            disabled={
              selectedKeys.has(getQueryFieldKey(field.path)) ||
              (fieldList.max !== undefined && paths.length >= fieldList.max)
            }
            onSelect={() =>
              onChange(parameter.key, {
                ...withCurrentBaseline(
                  parameter,
                  current,
                  structuredClone(option.defaultValue)
                ),
                [fieldList.key]: [...paths, field.path],
              })
            }
          >
            {field.label}
          </DropdownMenuItem>
        );
      }
    }
    return items;
  };

  return (
    <>
      {selectionParameters.length > 0 && (
        <Grid
          gap={2}
          css={{
            borderTop: `1px solid ${theme.colors.borderMain}`,
            paddingTop: theme.spacing[7],
          }}
        >
          <Flex
            justify="between"
            align="center"
            css={{ paddingInline: sectionPaddingInline }}
          >
            <Label>{selectionLabel}</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton aria-label={`Add ${selectionLabel.toLowerCase()}`}>
                  <PlusIcon />
                </IconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={4}>
                {selectionParameters.map((parameter, index) => (
                  <Fragment key={parameter.key}>
                    {index > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>{parameter.label}</DropdownMenuLabel>
                      {getSelectionMenuItems(parameter)}
                    </DropdownMenuGroup>
                  </Fragment>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </Flex>
          <CssValueListArrowFocus>
            {selectionParameters.map((parameter) => {
              const { current, option } = getSelected(parameter);
              const selection = parameter.config.selection;
              if (
                current === undefined ||
                option === undefined ||
                selection === undefined
              ) {
                return null;
              }
              const empty = parameter.config.options.find(
                ({ value }) => value === selection.emptyOption
              );
              const { fieldList, paths } = getOptionPaths(current, option);
              const baseline = selection.baseline;
              const canDelete = selectionItemCount > 1;
              return (
                <Grid key={parameter.key} gap={1}>
                  {baseline !== undefined &&
                    current[baseline.key] !== false && (
                      <QuerySelectionListItem
                        id={`${parameter.key}:${baseline.key}`}
                        index={selectionItemIndex++}
                        label={baseline.label}
                        canDelete={canDelete}
                        onDelete={() =>
                          onChange(parameter.key, {
                            ...current,
                            [baseline.key]: false,
                          })
                        }
                      />
                    )}
                  {option.value !== selection.emptyOption &&
                    (fieldList === undefined ? (
                      <QuerySelectionListItem
                        id={`${parameter.key}:${option.value}`}
                        index={selectionItemIndex++}
                        label={option.label}
                        canDelete={canDelete}
                        onDelete={() =>
                          empty !== undefined &&
                          onChange(
                            parameter.key,
                            withCurrentBaseline(
                              parameter,
                              current,
                              structuredClone(empty.defaultValue)
                            )
                          )
                        }
                        settings={
                          option.fields.some((field) => field.type === "number")
                            ? renderNumberFields(parameter, current, option)
                            : undefined
                        }
                      />
                    ) : (
                      paths.map((path, index) => {
                        const selectedField = getField(fields, path);
                        return (
                          <QuerySelectionListItem
                            key={`${getQueryFieldKey(path)}:${index}`}
                            id={`${parameter.key}:${getQueryFieldKey(path)}:${index}`}
                            index={selectionItemIndex++}
                            label={selectedField.label}
                            canDelete={canDelete}
                            onDelete={() => {
                              const nextPaths = paths.filter(
                                (_, position) => position !== index
                              );
                              onChange(
                                parameter.key,
                                nextPaths.length === 0 && empty !== undefined
                                  ? withCurrentBaseline(
                                      parameter,
                                      current,
                                      structuredClone(empty.defaultValue)
                                    )
                                  : {
                                      ...current,
                                      [fieldList.key]: nextPaths,
                                    }
                              );
                            }}
                          />
                        );
                      })
                    ))}
                </Grid>
              );
            })}
          </CssValueListArrowFocus>
        </Grid>
      )}
      {regularParameters.map((parameter) => {
        const { current, option } = getSelected(parameter);
        if (current === undefined || option === undefined) {
          return null;
        }
        return (
          <Grid
            key={parameter.key}
            gap={1}
            css={{ paddingInline: sectionPaddingInline }}
          >
            <Label>{parameter.label}</Label>
            <Select<(typeof parameter.config.options)[number]>
              aria-label={parameter.label}
              options={parameter.config.options}
              getLabel={(item) => item.label}
              getValue={(item) => item.value}
              value={option}
              onChange={(item) =>
                onChange(parameter.key, structuredClone(item.defaultValue))
              }
            />
            {renderRegularFields(parameter, current, option)}
          </Grid>
        );
      })}
    </>
  );
};

const defaultExpressionEditor = ({
  "aria-label": ariaLabel,
  value,
  onChange,
  input,
  min,
  max,
}: QueryValueEditorProps) => (
  <InputField
    aria-label={ariaLabel}
    type={input === "number" ? "number" : "text"}
    min={input === "number" ? min : undefined}
    max={input === "number" ? max : undefined}
    step={input === "number" ? 1 : undefined}
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
  Query extends Record<string, unknown>,
>({
  value,
  capabilities,
  editors,
  sectionPaddingInline,
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
  const renderExpressionEditor = editors?.expression ?? defaultExpressionEditor;
  const renderSourceEditor = editors?.source ?? defaultSourceEditor;
  return (
    <Grid css={{ gap: theme.spacing[7] }}>
      {capabilities.source.controls.map((control) => {
        if (control.type === "variant") {
          const selectionLabel = control.config.selection?.label;
          const parameters = capabilities.source.controls.filter(
            (candidate): candidate is QueryVariantControl =>
              candidate.type === "variant" &&
              (selectionLabel === undefined
                ? candidate.key === control.key
                : candidate.config.selection?.label === selectionLabel)
          );
          if (parameters[0] !== control) {
            return null;
          }
          return (
            <QueryParameters
              key={control.key}
              parameters={parameters}
              fields={capabilities.fields}
              value={value}
              sectionPaddingInline={sectionPaddingInline}
              onChange={(key, parameterValue) =>
                commit({ ...value, [key]: parameterValue } as Query)
              }
            />
          );
        }
        if (control.type === "filter") {
          const current = value[control.key] ?? control.defaultValue;
          const where =
            "field" in (current as QueryWhere<string[], Operator>)
              ? control.combinators[0] === "any"
                ? { any: [current as QueryWhere<string[], Operator>] }
                : { all: [current as QueryWhere<string[], Operator>] }
              : (current as QueryGroup<string[], Operator>);
          const metrics = getQueryWhereMetrics(where);
          return (
            <Group
              key={control.key}
              capabilities={capabilities}
              filter={control}
              renderExpressionEditor={renderExpressionEditor}
              sectionPaddingInline={sectionPaddingInline}
              group={where}
              conditionCount={metrics.conditions}
              depth={1}
              root={true}
              onChange={(next) =>
                commit({ ...value, [control.key]: next } as Query)
              }
            />
          );
        }
        if (control.type === "sort") {
          return (
            <Sorting
              key={control.key}
              capabilities={capabilities}
              control={control}
              sectionPaddingInline={sectionPaddingInline}
              sort={
                (value[control.key] ?? control.defaultValue) as QuerySort<
                  string[]
                >[]
              }
              onChange={(next) =>
                commit({ ...value, [control.key]: next } as Query)
              }
            />
          );
        }
        const controlIndex = capabilities.source.controls.indexOf(control);
        let expressionRunStart = controlIndex;
        while (
          capabilities.source.controls[expressionRunStart - 1]?.type ===
          "expression"
        ) {
          expressionRunStart -= 1;
        }
        if ((controlIndex - expressionRunStart) % 2 === 1) {
          return null;
        }
        const expressionControls = capabilities.source.controls
          .slice(controlIndex, controlIndex + 2)
          .filter(
            (candidate): candidate is QueryExpressionControl =>
              candidate.type === "expression"
          );
        if (expressionControls[0] !== control) {
          return null;
        }
        return (
          <Grid
            key={control.key}
            gap={2}
            css={{
              paddingInline: sectionPaddingInline,
              gridTemplateColumns: `repeat(${expressionControls.length}, 1fr)`,
            }}
          >
            {expressionControls.map((item) => (
              <Grid key={item.key} gap={1}>
                <Label>{item.label}</Label>
                {renderExpressionEditor({
                  "aria-label": item.label,
                  value: String(value[item.key] ?? item.defaultValue),
                  role: "value",
                  input: item.input,
                  min: item.min,
                  max: item.max,
                  onChange: (next) =>
                    commit({ ...value, [item.key]: next } as Query),
                })}
              </Grid>
            ))}
          </Grid>
        );
      })}
      <Grid gap={1} css={{ paddingInline: sectionPaddingInline }}>
        <Label>Query</Label>
        {renderSourceEditor({
          "aria-label": "Query",
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
