import { useMemo, useState } from "react";
import { nanoid } from "nanoid";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import {
  Button,
  CssValueListArrowFocus,
  CssValueListItem,
  Flex,
  FloatingPanelPopover,
  FloatingPanelPopoverClose,
  FloatingPanelPopoverContent,
  FloatingPanelPopoverTitle,
  FloatingPanelPopoverTrigger,
  Label,
  ScrollArea,
  Separator,
  SmallIconButton,
  Text,
  Tooltip,
  theme,
} from "@webstudio-is/design-system";
import {
  DotIcon,
  MenuIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
} from "@webstudio-is/icons";
import type { DataSource, Prop } from "@webstudio-is/sdk";
import {
  PropMeta,
  collectionComponent,
  decodeDataSourceVariable,
  encodeDataSourceVariable,
  validateExpression,
} from "@webstudio-is/react-sdk";
import {
  $dataSources,
  $instances,
  $props,
  $selectedInstanceSelector,
  $variableValuesByInstanceSelector,
} from "~/shared/nano-states";
import { serverSyncStore } from "~/shared/sync";
import type { PropValue } from "./shared";
import { getStartingValue } from "./props-section/use-props-logic";
import {
  ExpressionEditor,
  formatValuePreview,
} from "~/builder/shared/expression-editor";
import { VariablePopoverTrigger } from "./variable-popover";

const $selectedInstanceVariables = computed(
  [$selectedInstanceSelector, $dataSources, $instances],
  (instanceSelector, dataSources, instances) => {
    const matchedVariables: DataSource[] = [];
    if (instanceSelector === undefined) {
      return matchedVariables;
    }
    for (const dataSource of dataSources.values()) {
      const [instanceId] = instanceSelector;
      // prevent showing "item" parameter on collection component
      // to avoid circular undefined variable runtime error
      if (
        dataSource.type === "parameter" &&
        instanceId === dataSource.scopeInstanceId &&
        instances.get(instanceId)?.component === collectionComponent
      ) {
        continue;
      }
      if (
        dataSource.scopeInstanceId !== undefined &&
        instanceSelector.includes(dataSource.scopeInstanceId)
      ) {
        matchedVariables.push(dataSource);
      }
    }
    return matchedVariables;
  }
);

const $selectedInstanceVariableValues = computed(
  [$selectedInstanceSelector, $variableValuesByInstanceSelector],
  (instanceSelector, variableValuesByInstanceSelector) => {
    const key = JSON.stringify(instanceSelector);
    return variableValuesByInstanceSelector.get(key) ?? new Map();
  }
);

const EmptyList = () => {
  return (
    <Flex direction="column" css={{ gap: theme.spacing[5] }}>
      <Flex justify="center" align="center" css={{ height: theme.spacing[13] }}>
        <Text variant="labelsSentenceCase">No variables yet</Text>
      </Flex>
      <Flex justify="center" align="center" css={{ height: theme.spacing[13] }}>
        <VariablePopoverTrigger>
          <Button prefix={<PlusIcon />}>Create variable</Button>
        </VariablePopoverTrigger>
      </Flex>
    </Flex>
  );
};

const $usedVariables = computed([$props], (props) => {
  const usedVariables = new Set<DataSource["id"]>();
  for (const prop of props.values()) {
    if (prop.type === "expression") {
      try {
        validateExpression(prop.value, {
          transformIdentifier: (identifier) => {
            const id = decodeDataSourceVariable(identifier);
            if (id !== undefined) {
              usedVariables.add(id);
            }
            return identifier;
          },
        });
      } catch {
        // empty block
      }
    }
    if (prop.type === "action") {
      for (const value of prop.value) {
        try {
          validateExpression(value.code, {
            effectful: true,
            transformIdentifier: (identifier) => {
              const id = decodeDataSourceVariable(identifier);
              if (id !== undefined) {
                usedVariables.add(id);
              }
              return identifier;
            },
          });
        } catch {
          // empty block
        }
      }
    }
  }
  return usedVariables;
});

const deleteVariable = (variable: DataSource) => {
  serverSyncStore.createTransaction([$dataSources], (dataSources) => {
    dataSources.delete(variable.id);
  });
};

const ListItem = ({
  index,
  selected,
  deletable,
  variable,
  value,
  onSelect,
}: {
  index: number;
  selected: boolean;
  deletable: boolean;
  variable: DataSource;
  value: unknown;
  onSelect: (variableId: DataSource["id"]) => void;
}) => {
  return (
    <CssValueListItem
      label={
        <Label truncate>
          {value === undefined
            ? variable.name
            : `${variable.name}: ${formatValuePreview(value)}`}
        </Label>
      }
      id={variable.id}
      index={index}
      active={selected}
      buttons={
        <>
          <Tooltip content="Edit variable" side="bottom" asChild>
            <VariablePopoverTrigger variable={variable}>
              <SmallIconButton
                tabIndex={-1}
                aria-label="Edit variable"
                icon={<MenuIcon />}
              />
            </VariablePopoverTrigger>
          </Tooltip>
          <Tooltip content="Delete variable" side="bottom">
            <SmallIconButton
              tabIndex={-1}
              disabled={deletable === false}
              aria-label="Delete variable"
              variant="destructive"
              icon={<MinusIcon />}
              onClick={() => deleteVariable(variable)}
            />
          </Tooltip>
        </>
      }
      onClick={() => onSelect(variable.id)}
    />
  );
};

const getExpressionVariables = (expression: string) => {
  const variableIds = new Set<DataSource["id"]>();
  if (expression === "") {
    return variableIds;
  }
  validateExpression(expression, {
    transformIdentifier: (identifier) => {
      const id = decodeDataSourceVariable(identifier);
      if (id !== undefined) {
        variableIds.add(id);
      }
      return identifier;
    },
  });
  return variableIds;
};

const setPropValue = ({
  propId,
  propName,
  propValue,
}: {
  propId: undefined | Prop["id"];
  propName: Prop["name"];
  propValue: PropValue;
}) => {
  const instanceSelector = $selectedInstanceSelector.get();
  if (instanceSelector === undefined) {
    return;
  }
  const [instanceId] = instanceSelector;

  serverSyncStore.createTransaction([$props], (props) => {
    let prop = propId === undefined ? undefined : props.get(propId);
    // create new prop or update existing one
    if (prop === undefined) {
      prop = { id: nanoid(), instanceId, name: propName, ...propValue };
    } else {
      prop = { ...prop, ...propValue };
    }
    props.set(prop.id, prop);
  });
};

const ListPanel = ({
  prop,
  onChange,
}: {
  prop: undefined | Prop;
  onChange: (value: undefined | PropValue) => void;
}) => {
  const matchedVariables = useStore($selectedInstanceVariables);
  const propExpression = prop?.type === "expression" ? prop?.value ?? "" : "";
  const exoressionVariables = useMemo(
    () => getExpressionVariables(propExpression),
    [propExpression]
  );
  const usedVariables = useStore($usedVariables);
  const [expression, setExpression] = useState<undefined | string>();

  const variableValues = useStore($selectedInstanceVariableValues);
  const editorScope = useMemo(() => {
    const scope: Record<string, unknown> = {};
    for (const [variableId, variableValue] of variableValues) {
      scope[encodeDataSourceVariable(variableId)] = variableValue;
    }
    return scope;
  }, [variableValues]);
  const editorAliases = useMemo(() => {
    const aliases = new Map<string, string>();
    for (const variable of matchedVariables) {
      aliases.set(encodeDataSourceVariable(variable.id), variable.name);
    }
    return aliases;
  }, [matchedVariables]);

  return (
    <ScrollArea
      css={{
        display: "flex",
        flexDirection: "column",
        width: theme.spacing[30],
        padding: `${theme.spacing[5]} 0 ${theme.spacing[9]}`,
      }}
    >
      {matchedVariables.length === 0 ? (
        <EmptyList />
      ) : (
        <>
          <CssValueListArrowFocus>
            {matchedVariables.map((variable, index) => (
              <ListItem
                key={variable.id}
                index={index}
                variable={variable}
                value={variableValues.get(variable.id)}
                // mark all variables used in expression as selected
                selected={exoressionVariables.has(variable.id)}
                deletable={
                  variable.type === "variable" &&
                  usedVariables.has(variable.id) === false
                }
                onSelect={() =>
                  // convert variable to expression
                  onChange({
                    type: "expression",
                    value: encodeDataSourceVariable(variable.id),
                  })
                }
              />
            ))}
          </CssValueListArrowFocus>
          <Separator />
          <Flex
            direction="column"
            css={{
              padding: `${theme.spacing[5]} ${theme.spacing[9]} ${theme.spacing[9]}`,
              gap: theme.spacing[3],
            }}
          >
            <Label>Expression</Label>
            <ExpressionEditor
              scope={editorScope}
              aliases={editorAliases}
              value={expression ?? propExpression}
              onChange={setExpression}
              onBlur={() => {
                // skip when expression is not changed
                if (expression === undefined) {
                  return;
                }

                if (expression.trim() === "") {
                  onChange(undefined);
                  setExpression(undefined);
                  return;
                }

                try {
                  validateExpression(expression, {
                    transformIdentifier: (id) => {
                      if (editorAliases.has(id) === false) {
                        throw Error(`Unknown variable "${id}"`);
                      }
                      return id;
                    },
                  });
                } catch (error) {
                  // @todo show errors
                  (error as Error).message;
                  return;
                }

                onChange({ type: "expression", value: expression });
                setExpression(undefined);
              }}
            />
          </Flex>
        </>
      )}
    </ScrollArea>
  );
};

export const VariablesPanel = ({
  propId,
  propName,
  propMeta,
}: {
  propId: undefined | Prop["id"];
  propName: Prop["id"];
  propMeta: PropMeta;
}) => {
  // compute prop instead of using passed one
  // because data source props are converted into values
  const prop = useStore(
    useMemo(
      () =>
        computed($props, (props) => {
          if (propId) {
            return props.get(propId);
          }
        }),
      [propId]
    )
  );

  const removeExpression = () => {
    // reset prop with initial value from meta
    const propValue = getStartingValue(propMeta);
    if (propValue) {
      setPropValue({
        propId,
        propName,
        propValue,
      });
    } else if (propId !== undefined) {
      // delete prop when not possible to infer default value from meta
      serverSyncStore.createTransaction([$props], (props) => {
        props.delete(propId);
      });
    }
  };

  return (
    <>
      <ListPanel
        prop={prop}
        onChange={(propValue) => {
          if (propValue === undefined) {
            removeExpression();
          } else {
            setPropValue({ propId, propName, propValue });
          }
        }}
      />
      {/* put after content to avoid auto focusing "New variable" button */}
      <FloatingPanelPopoverTitle
        actions={
          <>
            {prop?.type === "expression" && (
              <Tooltip content="Remove expression" side="bottom">
                {/* automatically close popover when remove expression */}
                <FloatingPanelPopoverClose asChild>
                  <Button
                    aria-label="Remove expression"
                    prefix={<TrashIcon />}
                    color="ghost"
                    onClick={removeExpression}
                  />
                </FloatingPanelPopoverClose>
              </Tooltip>
            )}
            <Tooltip content="New variable" side="bottom" asChild>
              <VariablePopoverTrigger>
                <Button
                  aria-label="New variable"
                  prefix={<PlusIcon />}
                  color="ghost"
                />
              </VariablePopoverTrigger>
            </Tooltip>
          </>
        }
      >
        Variables
      </FloatingPanelPopoverTitle>
    </>
  );
};

export const VariablesButton = ({
  propId,
  propName,
  propMeta,
}: {
  propId: undefined | Prop["id"];
  propName: Prop["name"];
  propMeta: PropMeta;
}) => {
  if (isFeatureEnabled("bindings") === false) {
    return;
  }
  return (
    <FloatingPanelPopover modal>
      <FloatingPanelPopoverTrigger asChild>
        <SmallIconButton
          css={{
            position: "absolute",
            top: -10,
            left: -10,
          }}
          icon={<DotIcon />}
        />
      </FloatingPanelPopoverTrigger>
      <FloatingPanelPopoverContent side="left" align="start">
        <VariablesPanel
          propId={propId}
          propName={propName}
          propMeta={propMeta}
        />
      </FloatingPanelPopoverContent>
    </FloatingPanelPopover>
  );
};
