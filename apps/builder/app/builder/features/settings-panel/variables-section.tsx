import {
  $livePreviewFormValues,
  getFormOccurrenceKey,
} from "~/shared/preview-form-values";
import { useEffect, useRef, useState } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  Button,
  Chip,
  css,
  cssVar,
  CssValueListArrowFocus,
  CssValueListItem,
  Flex,
  Label,
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
  Text,
  Tooltip,
  Kbd,
} from "@webstudio-is/design-system";
import { AlertIcon, PlusIcon, TrashIcon } from "@webstudio-is/icons";
import { ROOT_INSTANCE_ID, type DataSource } from "@webstudio-is/sdk";
import { $variableValuesByInstanceSelector } from "~/shared/nano-states";
import { $dataSources } from "~/shared/sync/data-stores";
import {
  $instances,
  $pages,
  $props,
  $resources,
} from "~/shared/sync/data-stores";
import {
  CollapsibleSectionRoot,
  useOpenState,
} from "~/builder/shared/collapsible-section";
import { formatValuePreview } from "~/builder/shared/expression-editor";
import { VariablePopoverTrigger } from "./variable-popover";
import { VariableContextMenu, VariableMenu } from "./variable-menu";
import { $variableToFocus, showVariableAtSource } from "./variable-navigation";
import { StyleSourceBadge } from "../style-panel/style-source";
import {
  getFormDataPreview,
  getBrowserInfoPreview,
} from "./form-context-preview";
import {
  $selectedInstance,
  $selectedInstanceSelector,
  $selectedInstanceKeyWithRoot,
  $selectedPage,
} from "~/shared/nano-states";
import {
  findAvailableVariables,
  findUsedVariables,
} from "@webstudio-is/project-build/runtime";
import {
  DeleteDataVariableDialog,
  deleteDataVariable,
} from "~/builder/shared/data-variable-utils";

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

const $usedVariables = computed(
  [$selectedInstance, $pages, $instances, $props, $dataSources, $resources],
  (selectedInstance, pages, instances, props, dataSources, resources) => {
    if (selectedInstance === undefined) {
      return new Map<DataSource["id"], number>();
    }
    return findUsedVariables({
      startingInstanceId: selectedInstance.id,
      pages,
      instances,
      props,
      dataSources,
      resources,
    });
  }
);

const EmptyVariables = () => (
  <Flex direction="column" gap="2">
    <Flex justify="center" align="center">
      <Text variant="labels" align="center">
        No variables created
        <br /> on this instance
      </Text>
    </Flex>
    <Flex justify="center" align="center">
      <VariablePopoverTrigger>
        <Button color="primary" type="button" prefix={<PlusIcon />}>
          Create variable
        </Button>
      </VariablePopoverTrigger>
    </Flex>
  </Flex>
);

const variableLabelStyle = css({
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "100%",
});

const getVariableBadge = (variable: DataSource) => {
  if (variable.type === "variable") {
    return {
      label: "Static variable",
      text: "S",
    };
  }
  if (variable.type === "resource") {
    return {
      label: "Dynamic variable",
      text: "D",
    };
  }
};

const DataVariableBadge = ({ variable }: { variable: DataSource }) => {
  const badge = getVariableBadge(variable);
  if (badge === undefined) {
    return null;
  }
  return (
    <Chip title={badge.label} aria-label={badge.label}>
      {badge.text}
    </Chip>
  );
};

const VariablesItem = ({
  variable,
  source,
  index,
  value,
  usageCount,
  isOpen = true,
}: {
  variable: DataSource;
  source: "local" | "remote";
  index: number;
  value: unknown;
  usageCount: number;
  isOpen?: boolean;
}) => {
  const selectedPage = useStore($selectedPage);
  const variableToFocus = useStore($variableToFocus);
  const rowRef = useRef<HTMLButtonElement>(null);
  const [isVariableDialogOpen, setIsVariableDialogOpen] = useState(false);
  useEffect(() => {
    if (isOpen && variableToFocus?.id === variable.id) {
      rowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      rowRef.current?.focus({ preventScroll: true });
      $variableToFocus.set(undefined);
    }
  }, [isOpen, variableToFocus, variable.id]);
  const instances = useStore($instances);
  const props = useStore($props);
  const liveFormValues = useStore($livePreviewFormValues);
  const selectedInstanceSelector = useStore($selectedInstanceSelector);
  const dataSources = useStore($dataSources);
  const valueSourceId = variable.scopeInstanceId ?? ROOT_INSTANCE_ID;
  const valueSource = instances.get(valueSourceId);
  const valueSourceName =
    valueSourceId === ROOT_INSTANCE_ID
      ? "Global root"
      : (valueSource?.label ?? valueSource?.component ?? "System");
  const shadowed =
    source === "local" && variable.scopeInstanceId
      ? findAvailableVariables({
          startingInstanceId: variable.scopeInstanceId,
          instances,
          dataSources: new Map(
            [...dataSources].filter(
              ([, other]) => other.scopeInstanceId !== variable.scopeInstanceId
            )
          ),
        }).find(
          (other) =>
            other.scopeInstanceId !== variable.scopeInstanceId &&
            other.name === variable.name
        )
      : undefined;
  if (
    variable.type === "parameter" &&
    instances.get(variable.scopeInstanceId ?? "")?.component === "NativeForm"
  ) {
    if (variable.name === "formData") {
      value =
        liveFormValues.get(
          getFormOccurrenceKey(
            selectedInstanceSelector,
            variable.scopeInstanceId!
          ) ?? ""
        ) ?? getFormDataPreview(instances, props, variable.scopeInstanceId!);
    }
    if (variable.name === "browserInfo") {
      value = getBrowserInfoPreview();
    }
  }
  const canDelete = source === "local" && variable.type !== "parameter";
  const requestDelete = () =>
    setVariableToDelete({
      id: variable.id,
      name: variable.name,
      usages: usageCount,
    });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [variableToDelete, setVariableToDelete] = useState<{
    id: string;
    name: string;
    usages: number;
  }>();
  return (
    <VariablePopoverTrigger
      key={variable.id}
      variable={variable}
      onOpenChange={setIsVariableDialogOpen}
    >
      <CssValueListItem
        ref={rowRef}
        aria-label={`Variable ${variable.name}`}
        id={variable.id}
        index={index}
        label={
          <Flex align="center">
            <Tooltip
              onPointerDown={(event) => event.preventDefault()}
              triggerProps={{
                onClick: (event) => {
                  if (event.altKey && canDelete) {
                    event.preventDefault();
                    event.stopPropagation();
                    requestDelete();
                  }
                },
              }}
              content={
                <Flex direction="column" gap="2">
                  <Text variant="labels">{variable.name}</Text>
                  <Text>
                    {variable.type === "variable"
                      ? `${variable.value.type === "json" ? "JSON" : variable.value.type} · Static`
                      : variable.type === "resource"
                        ? "Resource · Dynamic"
                        : "JSON · Dynamic parameter"}
                  </Text>
                  <Text color="moreSubtle">Value comes from</Text>
                  <Flex gap="1" wrap="wrap">
                    {source === "local" && (
                      <StyleSourceBadge source="local" variant="small">
                        Local
                      </StyleSourceBadge>
                    )}
                    <button
                      type="button"
                      style={{
                        border: 0,
                        padding: 0,
                        background: "transparent",
                        display: "inline-flex",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        showVariableAtSource(variable.id, valueSourceId);
                      }}
                    >
                      <StyleSourceBadge source="instance" variant="small">
                        {valueSourceName}
                      </StyleSourceBadge>
                    </button>
                  </Flex>
                  {canDelete && (
                    <Button
                      color="neutral-destructive"
                      prefix={<TrashIcon />}
                      suffix={
                        <Kbd value={["alt", "click"]} color="moreSubtle" />
                      }
                      onClick={requestDelete}
                    >
                      Delete
                    </Button>
                  )}
                </Flex>
              }
            >
              <Label tag="label" color={source}>
                {variable.name}
              </Label>
            </Tooltip>
            {shadowed && (
              <Tooltip
                content={`This variable shadows ${shadowed.name} from ${instances.get(shadowed.scopeInstanceId ?? "")?.label ?? instances.get(shadowed.scopeInstanceId ?? "")?.component ?? "an ancestor"}. Delete the local variable to reveal it.`}
              >
                <AlertIcon color={cssVar("--foreground-warning")} />
              </Tooltip>
            )}
            {value !== undefined && (
              <span className={variableLabelStyle.toString()}>
                &nbsp;
                {formatValuePreview(value)}
              </span>
            )}
          </Flex>
        }
        data-state={isMenuOpen || isVariableDialogOpen ? "open" : undefined}
        suffix={<DataVariableBadge variable={variable} />}
        buttons={
          <>
            <VariableMenu
              variable={variable}
              canDelete={
                canDelete ||
                (source === "local" &&
                  variable.id === selectedPage?.systemDataSourceId)
              }
              onOpenChange={setIsMenuOpen}
            />

            <DeleteDataVariableDialog
              variable={variableToDelete}
              onClose={() => {
                setVariableToDelete(undefined);
              }}
              onConfirm={(variableId) => {
                deleteDataVariable(variableId);
                setVariableToDelete(undefined);
              }}
            />
          </>
        }
      />
    </VariablePopoverTrigger>
  );
};

const VariablesList = ({ isOpen }: { isOpen: boolean }) => {
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
          isOpen={isOpen}
        />
      ))}
    </CssValueListArrowFocus>
  );
};

const label = "Variables";

export const VariablesSection = () => {
  const variableToFocus = useStore($variableToFocus);
  const availableVariables = useStore($availableVariables);
  const selectedInstance = useStore($selectedInstance);
  const selectedScopeId = selectedInstance?.id ?? ROOT_INSTANCE_ID;
  const [isOpen, setIsOpen] = useOpenState(label);
  useEffect(() => {
    if (variableToFocus === undefined) {
      return;
    }
    if (variableToFocus.scopeInstanceId !== selectedScopeId) {
      return;
    }
    if (availableVariables.some(({ id }) => id === variableToFocus.id)) {
      if (isOpen === false) {
        setIsOpen(true);
      }
    } else {
      $variableToFocus.set(undefined);
    }
  }, [availableVariables, isOpen, selectedScopeId, setIsOpen, variableToFocus]);
  return (
    <VariableContextMenu>
      <CollapsibleSectionRoot
        label={label}
        fullWidth={true}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        trigger={
          <SectionTitle
            suffix={
              <Flex align="center">
                <VariablePopoverTrigger>
                  <SectionTitleButton
                    type="button"
                    aria-label="Add variable"
                    prefix={<PlusIcon />}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                    }}
                    // open panel when adding a new variable
                    onClick={() => {
                      if (isOpen === false) {
                        setIsOpen(true);
                      }
                    }}
                  />
                </VariablePopoverTrigger>
              </Flex>
            }
          >
            <SectionTitleLabel>Variables</SectionTitleLabel>
          </SectionTitle>
        }
      >
        {/* prevent applyig gap to list items */}
        <div>
          <VariablesList isOpen={isOpen} />
        </div>
      </CollapsibleSectionRoot>
    </VariableContextMenu>
  );
};

export const __testing__ = { VariablesItem };
