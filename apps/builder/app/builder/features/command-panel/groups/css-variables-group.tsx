import { useState } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  CommandGroup,
  CommandGroupHeading,
  CommandItem,
  Text,
  toast,
  useSelectedAction,
  useResetActionIndex,
} from "@webstudio-is/design-system";
import type { Instance } from "@webstudio-is/sdk";
import type { CssProperty } from "@webstudio-is/css-engine";
import {
  DeleteCssVariableDialog,
  RenameCssVariableDialog,
  $cssVariableInstancesByVariable,
  $cssVariableDefinitionsByVariable,
  $unusedCssVariables,
} from "~/builder/shared/css-variable-utils";
import { deleteProperty } from "~/builder/features/style-panel/shared/use-style-data";
import { InstanceList, showInstance } from "../shared/instance-list";
import {
  $commandContent,
  $isCommandPanelOpen,
  closeCommandPanel,
  focusCommandPanel,
} from "../command-state";
import type { BaseOption } from "../shared/types";
import { formatUsageCount, getUsageSearchTerms } from "../shared/usage-utils";
import { getInstanceLabel } from "~/builder/shared/instance-label";

export type CssVariableOption = BaseOption & {
  type: "cssVariable";
  property: string;
  instanceId: Instance["id"];
  usages: number;
};

export const $cssVariableOptions = computed(
  [$isCommandPanelOpen, $cssVariableDefinitionsByVariable, $unusedCssVariables],
  (isOpen, definitionsByVariable, unusedVariables) => {
    const cssVariableOptions: CssVariableOption[] = [];
    if (!isOpen) {
      return cssVariableOptions;
    }

    // Create options for each defined CSS variable on each instance
    for (const [property, instanceIds] of definitionsByVariable) {
      for (const instanceId of instanceIds) {
        const usages = unusedVariables.has(property) ? 0 : 1; // 0 if unused, 1+ otherwise
        cssVariableOptions.push({
          terms: [
            "css variables",
            property,
            property.slice(2), // Include name without --
            getInstanceLabel(instanceId),
            ...getUsageSearchTerms(usages),
          ],
          type: "cssVariable",
          property,
          instanceId,
          usages,
        });
      }
    }

    return cssVariableOptions;
  }
);

const CssVariableInstances = ({ property }: { property: string }) => {
  const instancesByVariable = useStore($cssVariableInstancesByVariable);
  const usedInInstanceIds = instancesByVariable.get(property) ?? new Set();

  return (
    <InstanceList
      instanceIds={usedInInstanceIds}
      onSelect={(instanceId) => {
        showInstance(instanceId, "style");
        closeCommandPanel();
      }}
    />
  );
};

export const CssVariablesGroup = ({
  options,
}: {
  options: CssVariableOption[];
}) => {
  const action = useSelectedAction();
  const resetActionIndex = useResetActionIndex();
  const [variableDialog, setVariableDialog] = useState<
    { action: "rename" | "delete"; property: string } | undefined
  >();

  return (
    <>
      <CommandGroup
        name="cssVariable"
        heading={
          <CommandGroupHeading>
            CSS Variables ({options.length})
          </CommandGroupHeading>
        }
        actions={[
          { name: "select", label: "Select" },
          { name: "findUsages", label: "Find usages" },
          { name: "rename", label: "Rename" },
          { name: "delete", label: "Delete" },
        ]}
      >
        {options.map(({ property, instanceId, usages, terms }) => {
          return (
            <CommandItem
              keywords={terms}
              key={`${property}-${instanceId}`}
              // preserve selected state when rerender
              value={`${property}-${instanceId}`}
              onSelect={() => {
                if (action?.name === "select") {
                  showInstance(instanceId, "style");
                  closeCommandPanel();
                }
                if (action?.name === "findUsages") {
                  $commandContent.set(
                    <CssVariableInstances property={property} />
                  );
                }
                if (action?.name === "rename") {
                  setVariableDialog({ action: "rename", property });
                }
                if (action?.name === "delete") {
                  setVariableDialog({ action: "delete", property });
                }
              }}
            >
              <Text>
                {property}{" "}
                <Text as="span" color="moreSubtle">
                  {formatUsageCount(usages)}
                </Text>
              </Text>
              <Text
                as="span"
                css={{ maxWidth: "20ch" }}
                truncate
                color="moreSubtle"
              >
                {getInstanceLabel(instanceId)}
              </Text>
            </CommandItem>
          );
        })}
      </CommandGroup>
      <RenameCssVariableDialog
        cssVariable={
          variableDialog?.action === "rename" ? variableDialog : undefined
        }
        onClose={() => {
          setVariableDialog(undefined);
          resetActionIndex();
          focusCommandPanel();
        }}
        onConfirm={(_oldProperty, newProperty) => {
          toast.success(
            `CSS variable renamed from "${variableDialog?.property}" to "${newProperty}"`
          );
          setVariableDialog(undefined);
        }}
      />
      <DeleteCssVariableDialog
        cssVariable={
          variableDialog?.action === "delete" ? variableDialog : undefined
        }
        onClose={() => {
          setVariableDialog(undefined);
          resetActionIndex();
          focusCommandPanel();
        }}
        onConfirm={(property) => {
          deleteProperty(property as CssProperty);
          toast.success(`CSS variable "${variableDialog?.property}" deleted`);
          setVariableDialog(undefined);
        }}
      />
    </>
  );
};
