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
  $usedCssVariablesInInstances,
  $cssVariableInstancesByVariable,
  $cssVariableDefinitionsByVariable,
} from "~/builder/shared/css-variable-utils";
import { deleteProperty } from "~/builder/features/style-panel/shared/use-style-data";
import { InstanceList, showInstance } from "../shared/instance-list";
import {
  $commandContent,
  closeCommandPanel,
  focusCommandPanel,
} from "../command-state";
import type { BaseOption } from "../shared/types";
import { formatUsageCount, getUsageSearchTerms } from "../shared/usage-utils";
import { getInstanceLabel } from "~/builder/shared/instance-label";
import { $instances } from "~/shared/nano-states";
import { $registeredComponentMetas } from "~/shared/nano-states";

export type CssVariableOption = BaseOption & {
  type: "cssVariable";
  property: string;
  instanceId: Instance["id"];
  usages: number;
};

export const $cssVariableOptions = computed(
  [
    $cssVariableDefinitionsByVariable,
    $usedCssVariablesInInstances,
    $instances,
    $registeredComponentMetas,
  ],
  (definitionsByVariable, usedVariablesInInstances, instances, metas) => {
    const cssVariableOptions: CssVariableOption[] = [];

    // Create options for each defined CSS variable on each instance
    for (const [property, instanceIds] of definitionsByVariable) {
      for (const instanceId of instanceIds) {
        const instance = instances.get(instanceId);
        if (!instance) {
          continue;
        }
        const meta = metas.get(instance.component);
        const instanceLabel = getInstanceLabel(instance, meta);

        const usages = usedVariablesInInstances.get(property) ?? 0;
        cssVariableOptions.push({
          terms: [
            "css variables",
            property,
            property.slice(2), // Include name without --
            instanceLabel,
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
  const instances = useStore($instances);
  const metas = useStore($registeredComponentMetas);
  const [variableDialog, setVariableDialog] = useState<
    { action: "rename" | "delete"; property: string } | undefined
  >();

  return (
    <>
      <CommandGroup
        name="cssVariable"
        heading={<CommandGroupHeading>CSS Variables</CommandGroupHeading>}
        actions={["select", "find usages", "rename", "delete"]}
      >
        {options.map(({ property, instanceId, usages }) => {
          const instance = instances.get(instanceId);
          const meta = instance ? metas.get(instance.component) : undefined;
          const instanceLabel = instance
            ? getInstanceLabel(instance, meta)
            : "";

          return (
            <CommandItem
              keywords={["test"]}
              key={`${property}-${instanceId}`}
              // preserve selected state when rerender
              value={`${property}-${instanceId}`}
              onSelect={() => {
                if (action === "select") {
                  showInstance(instanceId, "style");
                  closeCommandPanel();
                }
                if (action === "find usages") {
                  $commandContent.set(
                    <CssVariableInstances property={property} />
                  );
                }
                if (action === "rename") {
                  setVariableDialog({ action: "rename", property });
                }
                if (action === "delete") {
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
              <Text as="span" color="moreSubtle">
                {instanceLabel}
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
