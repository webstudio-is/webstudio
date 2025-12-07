import { computed } from "nanostores";
import {
  CommandGroup,
  CommandGroupHeading,
  CommandItem,
  Text,
} from "@webstudio-is/design-system";
import { $instances, $dataSources } from "~/shared/nano-states";
import { selectInstance } from "~/shared/awareness";
import { $activeInspectorPanel } from "~/builder/shared/nano-states";
import { closeCommandPanel } from "../command-state";
import { $usedVariablesAcrossProject } from "~/shared/data-variables-utils";

export type DataVariableOption = {
  terms: string[];
  type: "dataVariable";
  id: string;
  name: string;
  instanceId: string;
  usages: number;
};

export const $dataVariableOptions = computed(
  [$dataSources, $instances, $usedVariablesAcrossProject],
  (dataSources, instances, variableUsages) => {
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
          });
        }
      }
    }

    return dataVariableOptions;
  }
);

const handleSelect = (option: DataVariableOption) => {
  closeCommandPanel();

  // Find the instance selector
  const instanceSelector: string[] = [option.instanceId];

  // Select the instance
  selectInstance(instanceSelector);

  // Switch to settings tab
  $activeInspectorPanel.set("settings");
};

export const DataVariablesGroup = ({
  options,
}: {
  options: DataVariableOption[];
}) => {
  return (
    <CommandGroup
      name="dataVariable"
      heading={<CommandGroupHeading>Data variables</CommandGroupHeading>}
      actions={["select"]}
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
