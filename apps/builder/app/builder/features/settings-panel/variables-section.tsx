import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  Button,
  CssValueListArrowFocus,
  CssValueListItem,
  Flex,
  Label,
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
  SmallIconButton,
  Text,
  Tooltip,
  theme,
} from "@webstudio-is/design-system";
import { MinusIcon, PlusIcon } from "@webstudio-is/icons";
import type { DataSource } from "@webstudio-is/sdk";
import {
  decodeDataSourceVariable,
  validateExpression,
} from "@webstudio-is/react-sdk";
import {
  $dataSources,
  $props,
  $resources,
  $selectedInstanceSelector,
  $variableValuesByInstanceSelector,
} from "~/shared/nano-states";
import { serverSyncStore } from "~/shared/sync";
import {
  CollapsibleSectionBase,
  useOpenState,
} from "~/builder/shared/collapsible-section";
import { formatValuePreview } from "~/builder/shared/expression-editor";
import { VariablePopoverTrigger } from "./variable-popover";

/**
 * find variables defined specifically on this selected instance
 */
const $instanceVariables = computed(
  [$selectedInstanceSelector, $dataSources],
  (instanceSelector, dataSources) => {
    const matchedVariables: DataSource[] = [];
    if (instanceSelector === undefined) {
      return matchedVariables;
    }
    const [instanceId] = instanceSelector;
    for (const dataSource of dataSources.values()) {
      if (instanceId === dataSource.scopeInstanceId) {
        matchedVariables.push(dataSource);
      }
    }
    return matchedVariables;
  }
);

const $instanceVariableValues = computed(
  [$selectedInstanceSelector, $variableValuesByInstanceSelector],
  (instanceSelector, variableValuesByInstanceSelector) => {
    const key = JSON.stringify(instanceSelector);
    return variableValuesByInstanceSelector.get(key) ?? new Map();
  }
);

/**
 * find variables used in
 *
 * expression prop
 * action prop
 * url resource field
 * header resource field
 * body resource fiel
 */
const $usedVariables = computed([$props, $resources], (props, resources) => {
  const usedVariables = new Set<DataSource["id"]>();
  const collectExpressionVariables = (expression: string) => {
    try {
      validateExpression(expression, {
        // parse any expression
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
  };
  for (const resource of resources.values()) {
    collectExpressionVariables(resource.url);
    for (const { value } of resource.headers) {
      collectExpressionVariables(value);
    }
    if (resource.body) {
      collectExpressionVariables(resource.body);
    }
  }
  for (const prop of props.values()) {
    if (prop.type === "expression") {
      collectExpressionVariables(prop.value);
    }
    if (prop.type === "action") {
      for (const value of prop.value) {
        collectExpressionVariables(value.code);
      }
    }
  }
  return usedVariables;
});

const deleteVariable = (variableId: DataSource["id"]) => {
  serverSyncStore.createTransaction([$dataSources], (dataSources) => {
    dataSources.delete(variableId);
  });
};

const EmptyVariables = () => {
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

const VariablesList = () => {
  const availableVariables = useStore($instanceVariables);
  const variableValues = useStore($instanceVariableValues);
  const usedVariables = useStore($usedVariables);

  if (availableVariables.length === 0) {
    return <EmptyVariables />;
  }

  return (
    <CssValueListArrowFocus>
      {availableVariables.map((variable, index) => {
        const value = variableValues.get(variable.id);
        const label =
          value === undefined
            ? variable.name
            : `${variable.name}: ${formatValuePreview(value)}`;
        // user should be able to create and delete
        const deletable =
          variable.type === "variable" || variable.type === "resource";
        return (
          <VariablePopoverTrigger key={variable.id} variable={variable}>
            <CssValueListItem
              id={variable.id}
              index={index}
              label={<Label truncate>{label}</Label>}
              buttons={
                <Tooltip content="Delete variable" side="bottom">
                  <SmallIconButton
                    tabIndex={-1}
                    // allow to delete only unused variables
                    disabled={
                      deletable === false || usedVariables.has(variable.id)
                    }
                    aria-label="Delete variable"
                    variant="destructive"
                    icon={<MinusIcon />}
                    onClick={() => deleteVariable(variable.id)}
                  />
                </Tooltip>
              }
            />
          </VariablePopoverTrigger>
        );
      })}
    </CssValueListArrowFocus>
  );
};

export const VariablesSection = () => {
  const [isOpen, setIsOpen] = useOpenState({
    label: "variables",
    isOpenDefault: true,
  });
  return (
    <CollapsibleSectionBase
      label="Variables"
      fullWidth={true}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <SectionTitle
          suffix={
            <VariablePopoverTrigger>
              <SectionTitleButton
                prefix={<PlusIcon />}
                // open panel when add new varable
                onClick={() => {
                  if (isOpen === false) {
                    setIsOpen(true);
                  }
                }}
              />
            </VariablePopoverTrigger>
          }
        >
          <SectionTitleLabel>Variables</SectionTitleLabel>
        </SectionTitle>
      }
    >
      {/* prevent applyig gap to list items */}
      <div>
        <VariablesList />
      </div>
    </CollapsibleSectionBase>
  );
};
