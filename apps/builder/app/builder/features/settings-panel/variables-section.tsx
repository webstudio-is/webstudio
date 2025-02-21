import { useRef, useState } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  Button,
  css,
  CssValueListArrowFocus,
  CssValueListItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  findPageByIdOrPath,
  getExpressionIdentifiers,
} from "@webstudio-is/sdk";
import {
  $dataSources,
  $instances,
  $props,
  $resources,
  $variableValuesByInstanceSelector,
} from "~/shared/nano-states";
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
  $selectedInstanceKeyWithRoot,
  $selectedPage,
} from "~/shared/awareness";
import { updateWebstudioData } from "~/shared/instance-utils";
import {
  deleteVariableMutable,
  findAvailableVariables,
} from "~/shared/data-variables";

/**
 * find variables defined specifically on this selected instance
 */
const $availableVariables = computed(
  [$selectedInstance, $instances, $dataSources],
  (selectedInstance, instances, dataSources) => {
    if (selectedInstance === undefined) {
      return [];
    }
    const availableVariables = findAvailableVariables({
      startingInstanceId: selectedInstance.id,
      instances,
      dataSources,
    });
    // order local variables first
    return Array.from(availableVariables.values()).sort((left, right) => {
      const leftRank = left.scopeInstanceId === selectedInstance.id ? 0 : 1;
      const rightRank = right.scopeInstanceId === selectedInstance.id ? 0 : 1;
      return leftRank - rightRank;
    });
  }
);

const $instanceVariableValues = computed(
  [$selectedInstanceKeyWithRoot, $variableValuesByInstanceSelector],
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
  const selectedPage = useStore($selectedPage);
  const [inspectDialogOpen, setInspectDialogOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
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
              <DropdownMenuContent
                css={{ width: theme.spacing[28] }}
                onCloseAutoFocus={(event) => event.preventDefault()}
              >
                <DropdownMenuItem onSelect={() => setInspectDialogOpen(true)}>
                  Inspect
                </DropdownMenuItem>
                {source === "local" && variable.type !== "parameter" && (
                  <DropdownMenuItem
                    onSelect={() => {
                      if (usageCount > 0) {
                        setIsDeleteDialogOpen(true);
                      } else {
                        updateWebstudioData((data) => {
                          deleteVariableMutable(data, variable.id);
                        });
                      }
                    }}
                  >
                    Delete {usageCount > 0 && `(${usageCount} bindings)`}
                  </DropdownMenuItem>
                )}
                {source === "local" &&
                  variable.id === selectedPage?.systemDataSourceId && (
                    <DropdownMenuItem
                      onSelect={() => {
                        updateWebstudioData((data) => {
                          const page = findPageByIdOrPath(
                            selectedPage.id,
                            data.pages
                          );
                          delete page?.systemDataSourceId;
                          deleteVariableMutable(data, variable.id);
                        });
                      }}
                    >
                      Delete legacy system variable
                    </DropdownMenuItem>
                  )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog
              open={isDeleteDialogOpen}
              onOpenChange={setIsDeleteDialogOpen}
            >
              <DialogContent>
                <DialogTitle>Delete Variable?</DialogTitle>
                <DialogDescription
                  className={css({
                    paddingInline: theme.panel.paddingInline,
                    textWrap: "nowrap",
                  }).toString()}
                >
                  Variable "{variable.name}" is used in {usageCount}&nbsp;
                  {usageCount === 1 ? "expression" : "expressions"}.
                </DialogDescription>
                <DialogActions>
                  <Button
                    color="destructive"
                    onClick={() => {
                      updateWebstudioData((data) => {
                        deleteVariableMutable(data, variable.id);
                      });
                    }}
                  >
                    Delete
                  </Button>
                </DialogActions>
              </DialogContent>
            </Dialog>
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

const label = "Data Variables";

export const VariablesSection = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useOpenState(label);
  return (
    <VariablePopoverProvider value={{ containerRef }}>
      <CollapsibleSectionRoot
        label={label}
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
