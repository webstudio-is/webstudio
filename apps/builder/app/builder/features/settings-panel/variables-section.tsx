import { useRef, useState } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  Button,
  CssValueListArrowFocus,
  CssValueListItem,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  Flex,
  Label,
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
  SmallIconButton,
  Text,
  theme,
} from "@webstudio-is/design-system";
import { EllipsesIcon, PlusIcon } from "@webstudio-is/icons";
import type { DataSource } from "@webstudio-is/sdk";
import {
  decodeDataSourceVariable,
  getExpressionIdentifiers,
} from "@webstudio-is/sdk";
import {
  $dataSources,
  $instances,
  $props,
  $resources,
  $selectedInstanceSelector,
  $variableValuesByInstanceSelector,
} from "~/shared/nano-states";
import { serverSyncStore } from "~/shared/sync";
import {
  CollapsibleSectionRoot,
  useOpenState,
} from "~/builder/shared/collapsible-section";
import {
  ValuePreviewDialog,
  formatValuePreview,
} from "~/builder/shared/expression-editor";
import {
  VariablePopoverProvider,
  VariablePopoverTrigger,
} from "./variable-popover";

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
 * instance children
 * expression prop
 * action prop
 * url resource field
 * header resource field
 * body resource fiel
 */
const $usedVariables = computed(
  [$instances, $props, $resources],
  (instances, props, resources) => {
    const usedVariables = new Set<DataSource["id"]>();
    const collectExpressionVariables = (expression: string) => {
      const identifiers = getExpressionIdentifiers(expression);
      for (const identifier of identifiers) {
        const id = decodeDataSourceVariable(identifier);
        if (id !== undefined) {
          usedVariables.add(id);
        }
      }
    };
    for (const instance of instances.values()) {
      for (const child of instance.children) {
        if (child.type === "expression") {
          collectExpressionVariables(child.value);
        }
      }
    }
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
  }
);

const deleteVariable = (variableId: DataSource["id"]) => {
  serverSyncStore.createTransaction(
    [$dataSources, $resources],
    (dataSources, resources) => {
      const dataSource = dataSources.get(variableId);
      if (dataSource === undefined) {
        return;
      }
      dataSources.delete(variableId);
      if (dataSource.type === "resource") {
        resources.delete(dataSource.resourceId);
      }
    }
  );
};

const EmptyVariables = () => {
  return (
    <Flex direction="column" css={{ gap: theme.spacing[5] }}>
      <Flex justify="center" align="center" css={{ height: theme.spacing[13] }}>
        <Text variant="labelsSentenceCase" align="center">
          No variables created
          <br /> on this instance
        </Text>
      </Flex>
      <Flex justify="center" align="center" css={{ height: theme.spacing[13] }}>
        <VariablePopoverTrigger>
          <Button prefix={<PlusIcon />}>Create variable</Button>
        </VariablePopoverTrigger>
      </Flex>
    </Flex>
  );
};

const VariablesItem = ({
  variable,
  index,
  value,
  isUsedVariable,
}: {
  variable: DataSource;
  index: number;
  value: unknown;
  isUsedVariable: boolean;
}) => {
  const label =
    value === undefined
      ? variable.name
      : `${variable.name}: ${formatValuePreview(value)}`;
  const [inspectDialogOpen, setInspectDialogOpen] = useState(false);
  return (
    <VariablePopoverTrigger key={variable.id} variable={variable}>
      <CssValueListItem
        id={variable.id}
        index={index}
        label={<Label truncate>{label}</Label>}
        buttons={
          <>
            <ValuePreviewDialog
              open={inspectDialogOpen}
              onOpenChange={setInspectDialogOpen}
              title={`Inspect "${variable.name}" value`}
              value={value}
            >
              {undefined}
            </ValuePreviewDialog>
            <DropdownMenu modal>
              <DropdownMenuTrigger asChild>
                {/* a11y is completely broken here
                  focus is not restored to button invoker
                  @todo fix it eventually and consider restoring from closed value preview dialog
              */}
                <SmallIconButton
                  tabIndex={-1}
                  aria-label="Open variable menu"
                  icon={<EllipsesIcon />}
                  onClick={() => {}}
                />
              </DropdownMenuTrigger>
              <DropdownMenuPortal>
                <DropdownMenuContent
                  css={{ width: theme.spacing[28] }}
                  onCloseAutoFocus={(event) => event.preventDefault()}
                >
                  <DropdownMenuItem onSelect={() => setInspectDialogOpen(true)}>
                    Inspect
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    // allow to delete only unused variables
                    disabled={variable.type === "parameter" || isUsedVariable}
                    onSelect={() => deleteVariable(variable.id)}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenu>
          </>
        }
      />
    </VariablePopoverTrigger>
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
        return (
          <VariablesItem
            key={variable.id}
            value={value}
            variable={variable}
            index={index}
            isUsedVariable={usedVariables.has(variable.id)}
          />
        );
      })}
    </CssValueListArrowFocus>
  );
};

export const VariablesSection = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useOpenState({
    label: "variables",
    isOpenDefault: true,
  });
  return (
    <VariablePopoverProvider value={{ containerRef }}>
      <CollapsibleSectionRoot
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
        <div ref={containerRef}>
          <VariablesList />
        </div>
      </CollapsibleSectionRoot>
    </VariablePopoverProvider>
  );
};
