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
} from "@webstudio-is/design-system";
import type { Instance } from "@webstudio-is/sdk";
import type { CssProperty } from "@webstudio-is/css-engine";
import {
  DeleteCssVariableDialog,
  RenameCssVariableDialog,
  $usedCssVariablesInInstances,
  $cssVariableInstancesByVariable,
  $definedCssVariables,
  $cssVariableDefinitionsByVariable,
} from "~/builder/shared/css-variable-utils";
import { deleteProperty } from "~/builder/features/style-panel/shared/use-style-data";
import { InstanceList, selectInstance } from "../shared/instance-list";
import { $activeInspectorPanel } from "~/builder/shared/nano-states";
import { $commandContent, closeCommandPanel } from "../command-state";
import type { BaseOption } from "../shared/types";

export type CssVariableOption = BaseOption & {
  type: "cssVariable";
  property: string;
  usages: number;
};

export const $cssVariableOptions = computed(
  [$definedCssVariables, $usedCssVariablesInInstances],
  (definedVariables, usedVariablesInInstances) => {
    const cssVariableOptions: CssVariableOption[] = [];

    // Create options for each defined CSS variable
    for (const property of definedVariables) {
      cssVariableOptions.push({
        terms: ["css variables", property, property.slice(2)], // Include name without --
        type: "cssVariable",
        property,
        usages: usedVariablesInInstances.get(property) ?? 0,
      });
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
      onSelect={(instanceId) => selectInstance(instanceId)}
    />
  );
};

export const CssVariablesGroup = ({
  options,
}: {
  options: CssVariableOption[];
}) => {
  const action = useSelectedAction();
  const definitionsByVariable = useStore($cssVariableDefinitionsByVariable);
  const [variableToRename, setVariableToRename] = useState<{
    property: string;
  }>();
  const [variableToDelete, setVariableToDelete] = useState<{
    property: string;
  }>();

  return (
    <>
      <CommandGroup
        name="cssVariable"
        heading={<CommandGroupHeading>CSS Variables</CommandGroupHeading>}
        actions={["find", "select", "rename", "delete"]}
      >
        {options.map(({ property, usages }) => (
          <CommandItem
            key={property}
            // preserve selected state when rerender
            value={property}
            onSelect={() => {
              if (action === "select") {
                const definedInInstances = definitionsByVariable.get(property);
                if (definedInInstances && definedInInstances.size > 0) {
                  // Select the first instance where the variable is defined
                  const [firstInstanceId] = definedInInstances;
                  $activeInspectorPanel.set("style");
                  selectInstance(firstInstanceId);
                  closeCommandPanel();
                } else {
                  toast.error("CSS variable definition not found");
                }
              }
              if (action === "find") {
                $activeInspectorPanel.set("style");
                $commandContent.set(
                  <CssVariableInstances property={property} />
                );
              }
              if (action === "rename") {
                setVariableToRename({ property });
              }
              if (action === "delete") {
                setVariableToDelete({ property });
              }
            }}
          >
            <Text>
              {property}{" "}
              <Text as="span" color="moreSubtle">
                {usages === 0
                  ? "unused"
                  : `${usages} ${usages === 1 ? "usage" : "usages"}`}
              </Text>
            </Text>
          </CommandItem>
        ))}
      </CommandGroup>
      <RenameCssVariableDialog
        cssVariable={variableToRename}
        onClose={() => {
          setVariableToRename(undefined);
        }}
        onConfirm={(_oldProperty, newProperty) => {
          toast.success(
            `CSS variable renamed from "${variableToRename?.property}" to "${newProperty}"`
          );
          setVariableToRename(undefined);
        }}
      />
      <DeleteCssVariableDialog
        cssVariable={variableToDelete}
        onClose={() => {
          setVariableToDelete(undefined);
        }}
        onConfirm={(property) => {
          deleteProperty(property as CssProperty);
          toast.success(`CSS variable "${variableToDelete?.property}" deleted`);
          setVariableToDelete(undefined);
        }}
      />
    </>
  );
};
