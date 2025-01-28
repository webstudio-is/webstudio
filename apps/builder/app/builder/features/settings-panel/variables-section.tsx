import { useRef, useState } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  Button,
  css,
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
import {
  $selectedInstance,
  $selectedInstanceKey,
  $selectedInstancePath,
  $selectedPage,
} from "~/shared/awareness";

/**
 * find variables defined specifically on this selected instance
 */
const $availableVariables = computed(
  [$selectedInstancePath, $dataSources],
  (instancePath, dataSources) => {
    if (instancePath === undefined) {
      return [];
    }
    const [{ instanceSelector }] = instancePath;
    const [selectedInstanceId] = instanceSelector;
    const availableVariables = new Map<DataSource["name"], DataSource>();
    // order from ancestor to descendant
    // so descendants can override ancestor variables
    for (const { instance } of instancePath.slice().reverse()) {
      for (const dataSource of dataSources.values()) {
        if (dataSource.scopeInstanceId === instance.id) {
          availableVariables.set(dataSource.name, dataSource);
        }
      }
    }
    // order local variables first
    return Array.from(availableVariables.values()).sort((left, right) => {
      const leftRank = left.scopeInstanceId === selectedInstanceId ? 0 : 1;
      const rightRank = right.scopeInstanceId === selectedInstanceId ? 0 : 1;
      return leftRank - rightRank;
    });
  }
);

const $instanceVariableValues = computed(
  [$selectedInstanceKey, $variableValuesByInstanceSelector],
  (instanceKey, variableValuesByInstanceSelector) =>
    variableValuesByInstanceSelector.get(instanceKey ?? "") ??
    new Map<string, unknown>()
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
  [$instances, $props, $resources, $selectedPage],
  (instances, props, resources, page) => {
    const usedVariables = new Map<DataSource["id"], number>();
    const collectExpressionVariables = (expression: string) => {
      const identifiers = getExpressionIdentifiers(expression);
      for (const identifier of identifiers) {
        const id = decodeDataSourceVariable(identifier);
        if (id !== undefined) {
          const count = usedVariables.get(id) ?? 0;
          usedVariables.set(id, count + 1);
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
    if (page) {
      collectExpressionVariables(page.title);
      collectExpressionVariables(page.meta.description ?? "");
      collectExpressionVariables(page.meta.excludePageFromSearch ?? "");
      collectExpressionVariables(page.meta.socialImageUrl ?? "");
      collectExpressionVariables(page.meta.language ?? "");
      collectExpressionVariables(page.meta.status ?? "");
      collectExpressionVariables(page.meta.redirect ?? "");
      if (page.meta.custom) {
        for (const { content } of page.meta.custom) {
          collectExpressionVariables(content);
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
    <Flex direction="column" gap="2">
      <Flex justify="center" align="center">
        <Text variant="labelsSentenceCase" align="center">
          No data variables created
          <br /> on this instance
        </Text>
      </Flex>
      <Flex justify="center" align="center">
        <VariablePopoverTrigger>
          <Button prefix={<PlusIcon />}>Create data variable</Button>
        </VariablePopoverTrigger>
      </Flex>
    </Flex>
  );
};

const variableLabelStyle = css({
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "100%",
});

const VariablesItem = ({
  variable,
  source,
  index,
  value,
  usageCount,
}: {
  variable: DataSource;
  source: "local" | "remote";
  index: number;
  value: unknown;
  usageCount: number;
}) => {
  const [inspectDialogOpen, setInspectDialogOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <VariablePopoverTrigger key={variable.id} variable={variable}>
      <CssValueListItem
        id={variable.id}
        index={index}
        label={
          <Flex align="center">
            <Label tag="label" color={source}>
              {variable.name}
            </Label>
            {value !== undefined && (
              <span className={variableLabelStyle.toString()}>
                &nbsp;
                {formatValuePreview(value)}
              </span>
            )}
          </Flex>
        }
        disabled={source === "remote"}
        data-state={isMenuOpen ? "open" : undefined}
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
            <DropdownMenu modal onOpenChange={setIsMenuOpen}>
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
                  {source === "local" && (
                    <DropdownMenuItem
                      // allow to delete only unused variables
                      disabled={variable.type === "parameter" || usageCount > 0}
                      onSelect={() => deleteVariable(variable.id)}
                    >
                      Delete {usageCount > 0 && `(${usageCount} bindings)`}
                    </DropdownMenuItem>
                  )}
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
  const instance = useStore($selectedInstance);
  const availableVariables = useStore($availableVariables);
  const variableValues = useStore($instanceVariableValues);
  const usedVariables = useStore($usedVariables);

  if (availableVariables.length === 0) {
    return <EmptyVariables />;
  }

  return (
    <CssValueListArrowFocus>
      {/* local variables should be ordered first to not block tab to first item */}
      {availableVariables.map((variable, index) => (
        <VariablesItem
          key={variable.id}
          source={
            instance?.id === variable.scopeInstanceId ? "local" : "remote"
          }
          value={variableValues.get(variable.id)}
          variable={variable}
          index={index}
          usageCount={usedVariables.get(variable.id) ?? 0}
        />
      ))}
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
        label="Data Variables"
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
            <SectionTitleLabel>Data Variables</SectionTitleLabel>
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
