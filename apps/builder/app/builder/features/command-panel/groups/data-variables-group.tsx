import { useState } from "react";
import { computed } from "nanostores";
import {
  CommandGroup,
  CommandGroupHeading,
  CommandItem,
  Text,
  toast,
  useSelectedAction,
} from "@webstudio-is/design-system";
import { $instances, $dataSources } from "~/shared/nano-states";
import { selectInstance as selectInstanceBySelector } from "~/shared/awareness";
import { $activeInspectorPanel } from "~/builder/shared/nano-states";
import { $commandContent, closeCommandPanel } from "../command-state";
import { InstanceList, selectInstance } from "../shared/instance-list";
import { deleteVariableMutable } from "~/shared/data-variables";
import { updateWebstudioData } from "~/shared/instance-utils";
import {
  DeleteDataVariableDialog,
  RenameDataVariableDialog,
  $usedVariablesInInstances,
} from "~/builder/shared/data-variable-utils";
import type { BaseOption } from "../shared/types";

export type DataVariableOption = BaseOption & {
  type: "dataVariable";
  id: string;
  name: string;
  instanceId: string;
  usages: number;
};

export const $dataVariableOptions = computed(
  [$dataSources, $instances, $usedVariablesInInstances],
  (dataSources, instances, usedInInstances) => {
    const dataVariableOptions: DataVariableOption[] = [];

    for (const dataSource of dataSources.values()) {
      if (
        dataSource.type === "variable" &&
        dataSource.scopeInstanceId !== undefined
      ) {
        const instance = instances.get(dataSource.scopeInstanceId);
        if (instance) {
          const usages = usedInInstances.get(dataSource.id)?.size ?? 0;
          dataVariableOptions.push({
            terms: ["variable", "variables", "data", dataSource.name],
            type: "dataVariable",
            id: dataSource.id,
            name: dataSource.name,
            instanceId: dataSource.scopeInstanceId,
            usages,
          });
        }
      }
    }

    return dataVariableOptions;
  }
);

const DataVariableInstances = ({ variableId }: { variableId: string }) => {
  const usedInInstances = $usedVariablesInInstances.get();
  const instanceIds = usedInInstances.get(variableId) ?? new Set();

  return (
    <InstanceList
      instanceIds={instanceIds}
      onSelect={(instanceId) => {
        selectInstance(instanceId);
        $activeInspectorPanel.set("settings");
      }}
    />
  );
};

export const DataVariablesGroup = ({
  options,
}: {
  options: DataVariableOption[];
}) => {
  const action = useSelectedAction();
  const [variableToRename, setVariableToRename] =
    useState<DataVariableOption>();
  const [variableToDelete, setVariableToDelete] =
    useState<DataVariableOption>();

  const handleSelect = (option: DataVariableOption) => {
    if (action === "find") {
      if (option.usages > 0) {
        $commandContent.set(<DataVariableInstances variableId={option.id} />);
      } else {
        toast.error("Variable is not used in any instance");
      }
      return;
    }

    if (action === "rename") {
      setVariableToRename(option);
      return;
    }

    if (action === "delete") {
      setVariableToDelete(option);
      return;
    }

    closeCommandPanel();

    // Find the instance selector
    const instanceSelector: string[] = [option.instanceId];

    // Select the instance
    selectInstanceBySelector(instanceSelector);

    // Switch to settings tab
    $activeInspectorPanel.set("settings");
  };

  return (
    <>
      <CommandGroup
        name="dataVariable"
        heading={<CommandGroupHeading>Data variables</CommandGroupHeading>}
        actions={["find", "select", "rename", "delete"]}
      >
        {options.map((option) => (
          <CommandItem
            key={option.id}
            value={option.id}
            onSelect={() => handleSelect(option)}
          >
            <Text variant="labelsSentenceCase">
              {option.name}{" "}
              <Text as="span" color="moreSubtle">
                {option.usages === 0
                  ? "unused"
                  : `${option.usages} ${option.usages === 1 ? "usage" : "usages"}`}
              </Text>
            </Text>
          </CommandItem>
        ))}
      </CommandGroup>
      <RenameDataVariableDialog
        variable={variableToRename}
        onClose={() => {
          setVariableToRename(undefined);
        }}
        onConfirm={(_variableId, newName) => {
          toast.success(
            `Variable renamed from "${variableToRename?.name}" to "${newName}"`
          );
          setVariableToRename(undefined);
        }}
      />
      <DeleteDataVariableDialog
        variable={variableToDelete}
        onClose={() => {
          setVariableToDelete(undefined);
        }}
        onConfirm={(variableId) => {
          updateWebstudioData((data) => {
            deleteVariableMutable(data, variableId);
          });
          toast.success(`Variable "${variableToDelete?.name}" deleted`);
          setVariableToDelete(undefined);
        }}
      />
    </>
  );
};
