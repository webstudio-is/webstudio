import { useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import { nanoid } from "nanoid";
import {
  Box,
  Button,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  Flex,
  InputField,
  Text,
  theme,
} from "@webstudio-is/design-system";
import {
  decodeDataSourceVariable,
  isCustomSlotComponentDataSource,
  type DataSource,
  type Instance,
} from "@webstudio-is/sdk";
import {
  findCustomSlotSchemaDataSource,
  findCustomSlotValuesDataSource,
  getSlotContentRootId,
  customSlotComponent,
  customSlotSchemaVariable,
  customSlotValuesVariable,
} from "@webstudio-is/sdk";
import {
  BindingControl,
  BindingPopover,
  evaluateExpressionWithinScope,
} from "~/builder/shared/binding-popover";
import { formatValue } from "~/builder/shared/expression-editor";
import { CodeEditor } from "~/shared/code-editor";
import { $dataSources, $instances } from "~/shared/nano-states";
import {
  createCustomSlotLiteralValue,
  evaluateCustomSlotFieldValue,
  parseCustomSlotFieldEditorValue,
  parseCustomSlotFieldValues,
  parseCustomSlotSchema,
  type CustomSlotFieldSchema,
  type CustomSlotFieldValue,
  type CustomSlotFieldValues,
} from "~/shared/custom-slot-field-values";
import { updateWebstudioData } from "~/shared/instance-utils";
import {
  $selectedInstanceScope,
  updateExpressionValue,
  useBindingState,
  useLocalValue,
} from "./shared";

const normalizeFieldName = (value: string) => {
  const trimmed = value.trim();

  const normalized = trimmed
    .replace(/[^a-zA-Z0-9_$]+/g, "_")
    .replace(/^[^a-zA-Z_$]+/g, "");

  return normalized.length > 0 ? normalized : "field";
};

const ensureUniqueFieldName = (
  schema: CustomSlotFieldSchema[],
  fieldId: string,
  rawName: string
) => {
  const base = normalizeFieldName(rawName);
  let candidate = base;
  let index = 2;

  while (
    schema.some(
      (field) =>
        field.id !== fieldId &&
        field.name.toLowerCase() === candidate.toLowerCase()
    )
  ) {
    candidate = `${base}${index}`;
    index += 1;
  }

  return candidate;
};

const setJsonVariable = ({
  scopeInstanceId,
  name,
  value,
}: {
  scopeInstanceId: string;
  name: string;
  value: unknown;
}) => {
  updateWebstudioData((data) => {
    let existing: DataSource | undefined;

    for (const dataSource of data.dataSources.values()) {
      if (
        dataSource.type === "variable" &&
        dataSource.scopeInstanceId === scopeInstanceId &&
        dataSource.name === name
      ) {
        existing = dataSource;
        break;
      }
    }

    if (existing?.type === "variable") {
      data.dataSources.set(existing.id, {
        ...existing,
        value: {
          type: "json",
          value,
        },
      });
      return;
    }

    const id = nanoid();
    data.dataSources.set(id, {
      id,
      type: "variable",
      scopeInstanceId,
      name,
      value: {
        type: "json",
        value,
      },
    });
  });
};

const formatFieldEditorValue = (value: unknown) => {
  if (typeof value === "string") {
    return value;
  }

  if (value === undefined) {
    return "";
  }

  return formatValue(value) ?? "";
};

const findAllCustomSlotInstancesSharingFragment = (
  instances: Map<string, Instance>,
  fragmentId: string
) => {
  const result: Instance[] = [];

  for (const instance of instances.values()) {
    if (
      instance.component === customSlotComponent &&
      getSlotContentRootId(instances, instance.id) === fragmentId
    ) {
      result.push(instance);
    }
  }

  return result;
};

const getSchemaTargetFragmentIds = (
  instances: Map<string, Instance>,
  selectedInstance: Instance
) => {
  const sharedFragmentId = getSlotContentRootId(instances, selectedInstance.id);

  if (sharedFragmentId === undefined) {
    return [];
  }

  return Array.from(
    new Set(
      findAllCustomSlotInstancesSharingFragment(
        instances,
        sharedFragmentId
      ).flatMap(
        (instance) => getSlotContentRootId(instances, instance.id) ?? []
      )
    )
  );
};

const updateSchemaAcrossTargets = ({
  targetFragmentIds,
  nextSchema,
}: {
  targetFragmentIds: string[];
  nextSchema: CustomSlotFieldSchema[];
}) => {
  updateWebstudioData((data) => {
    for (const fragmentId of targetFragmentIds) {
      const existingSchema = findCustomSlotSchemaDataSource(
        data.dataSources,
        fragmentId
      );

      if (existingSchema?.type === "variable") {
        data.dataSources.set(existingSchema.id, {
          ...existingSchema,
          value: {
            type: "json",
            value: nextSchema,
          },
        });
      } else {
        const id = nanoid();
        data.dataSources.set(id, {
          id,
          type: "variable",
          scopeInstanceId: fragmentId,
          name: customSlotSchemaVariable,
          value: {
            type: "json",
            value: nextSchema,
          },
        });
      }
    }
  });
};

const CustomSlotFieldRow = ({
  field,
  schema,
  scope,
  aliases,
  value,
  isRenaming,
  onRename,
  onStartRenaming,
  onStopRenaming,
  onValueChange,
  onDelete,
}: {
  field: CustomSlotFieldSchema;
  schema: CustomSlotFieldSchema[];
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
  value: undefined | CustomSlotFieldValue;
  isRenaming: boolean;
  onRename: (name: string) => void;
  onStartRenaming: () => void;
  onStopRenaming: () => void;
  onValueChange: (value: CustomSlotFieldValue) => void;
  onDelete: () => void;
}) => {
  const nameLocal = useLocalValue(field.name, (nextName) => {
    onRename(ensureUniqueFieldName(schema, field.id, nextName));
  });

  const evaluatedValue = evaluateCustomSlotFieldValue({
    fieldValue: value,
    evaluateExpression: (expression) =>
      evaluateExpressionWithinScope(expression, scope),
  });
  const editorValue = formatFieldEditorValue(evaluatedValue);
  const expression =
    value?.type === "expression"
      ? value.value
      : (formatValue(value?.type === "literal" ? value.value : "") ?? `""`);
  const { overwritable, variant } = useBindingState(
    value?.type === "expression" ? value.value : undefined
  );
  const valueLocal = useLocalValue(editorValue, (nextValue) => {
    const nextLiteral = parseCustomSlotFieldEditorValue(nextValue);

    if (value?.type === "expression") {
      if (overwritable) {
        updateExpressionValue(value.value, nextLiteral.value);
      }
      return;
    }

    onValueChange(nextLiteral);
  });

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Box
          css={{
            padding: 8,
            border: "1px solid var(--colors-borderMain)",
            borderRadius: 6,
            transition: "background-color 120ms ease",
            "&:hover": {
              backgroundColor: theme.colors.backgroundHover,
            },
          }}
        >
          <Flex direction="column" gap="2">
            {isRenaming ? (
              <InputField
                autoFocus
                aria-label="Field name"
                value={nameLocal.value}
                onChange={(event) => {
                  nameLocal.set(event.target.value);
                }}
                onBlur={() => {
                  nameLocal.save();
                  onStopRenaming();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    nameLocal.save();
                    onStopRenaming();
                  }
                }}
              />
            ) : (
              <Text variant="regularBold">{field.name}</Text>
            )}
            <BindingControl>
              <CodeEditor
                size="small"
                readOnly={overwritable === false}
                value={valueLocal.value}
                onChange={valueLocal.set}
                onChangeComplete={valueLocal.save}
              />
              <BindingPopover
                scope={scope}
                aliases={aliases}
                variant={variant}
                value={expression}
                onChange={(newExpression) => {
                  onValueChange({
                    type: "expression",
                    value: newExpression,
                  });
                }}
                onRemove={(evaluatedValue) => {
                  onValueChange(createCustomSlotLiteralValue(evaluatedValue));
                }}
              />
            </BindingControl>
          </Flex>
        </Box>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={onStartRenaming}>Rename</ContextMenuItem>
        <ContextMenuItem destructive onSelect={onDelete}>
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export const CustomSlotFieldsSection = ({
  selectedInstance,
}: {
  selectedInstance: Instance;
}) => {
  const dataSources = useStore($dataSources);
  const instances = useStore($instances);
  const selectedInstanceScope = useStore($selectedInstanceScope);
  const [editingFieldId, setEditingFieldId] = useState<undefined | string>();
  const fragmentRootId = getSlotContentRootId(instances, selectedInstance.id);

  const schemaDataSource =
    fragmentRootId === undefined
      ? undefined
      : findCustomSlotSchemaDataSource(dataSources, fragmentRootId);

  const valuesDataSource = findCustomSlotValuesDataSource(
    dataSources,
    selectedInstance.id
  );

  const schema = parseCustomSlotSchema(
    schemaDataSource?.type === "variable" &&
      schemaDataSource.value.type === "json"
      ? schemaDataSource.value.value
      : undefined
  );

  const values = parseCustomSlotFieldValues(
    valuesDataSource?.type === "variable" &&
      valuesDataSource.value.type === "json"
      ? valuesDataSource.value.value
      : undefined
  );

  const { scope, aliases } = useMemo(() => {
    const nextScope: Record<string, unknown> = {};
    const nextAliases = new Map<string, string>();

    for (const [identifier, name] of selectedInstanceScope.aliases) {
      const dataSourceId = decodeDataSourceVariable(identifier);
      const dataSource =
        dataSourceId === undefined ? undefined : dataSources.get(dataSourceId);

      if (isCustomSlotComponentDataSource(instances, dataSource)) {
        continue;
      }

      nextAliases.set(identifier, name);
      nextScope[identifier] = selectedInstanceScope.scope[identifier];
    }

    return { scope: nextScope, aliases: nextAliases };
  }, [dataSources, instances, selectedInstanceScope]);

  const schemaTargetFragmentIds = getSchemaTargetFragmentIds(
    instances,
    selectedInstance
  );

  const updateSchema = (
    updater: (schema: CustomSlotFieldSchema[]) => CustomSlotFieldSchema[]
  ) => {
    updateSchemaAcrossTargets({
      targetFragmentIds: schemaTargetFragmentIds,
      nextSchema: updater(schema),
    });
  };

  const updateCurrentValues = (
    updater: (values: CustomSlotFieldValues) => CustomSlotFieldValues
  ) => {
    setJsonVariable({
      scopeInstanceId: selectedInstance.id,
      name: customSlotValuesVariable,
      value: updater(values),
    });
  };

  const handleAddField = () => {
    const fieldId = nanoid();
    const fieldName = ensureUniqueFieldName(schema, fieldId, "field");

    updateSchema((current) => [...current, { id: fieldId, name: fieldName }]);

    updateCurrentValues((current) => ({
      ...current,
      [fieldId]: createCustomSlotLiteralValue(""),
    }));
    setEditingFieldId(fieldId);
  };

  return (
    <Box
      css={{
        padding: 12,
        borderTop: "1px solid var(--colors-borderMain)",
      }}
    >
      <Flex direction="column" gap="3">
        <Text variant="regularBold">Component fields</Text>

        {schema.length === 0 && (
          <Text color="subtle">No fields yet. Add one below.</Text>
        )}

        <Flex direction="column" gap="2">
          {schema.map((field) => (
            <CustomSlotFieldRow
              key={field.id}
              field={field}
              schema={schema}
              scope={scope}
              aliases={aliases}
              value={values[field.id]}
              isRenaming={editingFieldId === field.id}
              onRename={(nextName) => {
                updateSchema((current) =>
                  current.map((item) =>
                    item.id === field.id ? { ...item, name: nextName } : item
                  )
                );
              }}
              onStartRenaming={() => {
                setEditingFieldId(field.id);
              }}
              onStopRenaming={() => {
                setEditingFieldId((current) =>
                  current === field.id ? undefined : current
                );
              }}
              onValueChange={(nextValue) => {
                updateCurrentValues((current) => ({
                  ...current,
                  [field.id]: nextValue,
                }));
              }}
              onDelete={() => {
                updateSchema((current) =>
                  current.filter((item) => item.id !== field.id)
                );

                const valueTargetInstances =
                  fragmentRootId === undefined
                    ? [selectedInstance]
                    : findAllCustomSlotInstancesSharingFragment(
                        instances,
                        fragmentRootId
                      );

                updateWebstudioData((data) => {
                  for (const customSlotInstance of valueTargetInstances) {
                    let existing: DataSource | undefined;

                    for (const dataSource of data.dataSources.values()) {
                      if (
                        dataSource.type === "variable" &&
                        dataSource.scopeInstanceId === customSlotInstance.id &&
                        dataSource.name === customSlotValuesVariable
                      ) {
                        existing = dataSource;
                        break;
                      }
                    }

                    if (
                      existing?.type === "variable" &&
                      existing.value.type === "json"
                    ) {
                      const nextValues = parseCustomSlotFieldValues(
                        existing.value.value
                      );
                      delete nextValues[field.id];

                      data.dataSources.set(existing.id, {
                        ...existing,
                        value: {
                          type: "json",
                          value: nextValues,
                        },
                      });
                    }
                  }
                });
              }}
            />
          ))}
        </Flex>

        <Button onClick={handleAddField}>Add field</Button>
      </Flex>
    </Box>
  );
};
