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
import {
  $usedVariablesAcrossProject,
  $usedVariablesInInstances,
} from "~/shared/data-variables-utils";
import type { BaseOption } from "../shared/types";

export type DataVariableOption = BaseOption & {
  type: "dataVariable";
  id: string;
  name: string;
  instanceId: string;
  usages: number;
  usedIn: Set<string>;
};

export const $dataVariableOptions = computed(
  [
    $dataSources,
    $instances,
    $usedVariablesAcrossProject,
    $usedVariablesInInstances,
  ],
  (dataSources, instances, variableUsages, usedInInstances) => {
    const dataVariableOptions: DataVariableOption[] = [];

    for (const dataSource of dataSources.values()) {
      if (
        dataSource.type === "variable" &&
        dataSource.scopeInstanceId !== undefined
      ) {
        const instance = instances.get(dataSource.scopeInstanceId);
        if (instance) {
          const usages = variableUsages.get(dataSource.id) ?? 0;
          dataVariableOptions.push({
            terms: ["variable", "variables", "data", dataSource.name],
            type: "dataVariable",
            id: dataSource.id,
            name: dataSource.name,
            instanceId: dataSource.scopeInstanceId,
            usages,
            usedIn: usedInInstances.get(dataSource.id) ?? new Set(),
          });
        }
      }
    }

    return dataVariableOptions;
  }
);

const DataVariableInstances = ({ option }: { option: DataVariableOption }) => {
  return (
    <InstanceList
      instanceIds={option.usedIn}
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

  const handleSelect = (option: DataVariableOption) => {
    if (action === "find") {
      if (option.usages > 0) {
        $commandContent.set(<DataVariableInstances option={option} />);
      } else {
        toast.error("Variable is not used in any instance");
      }
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
    <CommandGroup
      name="dataVariable"
      heading={<CommandGroupHeading>Data variables</CommandGroupHeading>}
      actions={["find", "select"]}
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
  );
};
