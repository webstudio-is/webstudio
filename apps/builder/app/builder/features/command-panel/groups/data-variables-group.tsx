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
import { $dataSources, $instances } from "~/shared/nano-states";
import {
  $commandContent,
  closeCommandPanel,
  focusCommandPanel,
} from "../command-state";
import { InstanceList, showInstance } from "../shared/instance-list";
import { deleteVariableMutable } from "~/shared/data-variables";
import { updateWebstudioData } from "~/shared/instance-utils";
import {
  DeleteDataVariableDialog,
  RenameDataVariableDialog,
  $usedVariablesInInstances,
} from "~/builder/shared/data-variable-utils";
import type { BaseOption } from "../shared/types";
import { formatUsageCount, getUsageSearchTerms } from "../shared/usage-utils";
import { getInstanceLabel } from "~/builder/shared/instance-label";
import { $registeredComponentMetas } from "~/shared/nano-states";

export type DataVariableOption = BaseOption & {
  type: "dataVariable";
  id: string;
  name: string;
  instanceId: string;
  usages: number;
};

export const $dataVariableOptions = computed(
  [
    $dataSources,
    $instances,
    $usedVariablesInInstances,
    $registeredComponentMetas,
  ],
  (dataSources, instances, usedInInstances, metas) => {
    const dataVariableOptions: DataVariableOption[] = [];

    for (const dataSource of dataSources.values()) {
      if (
        dataSource.type === "variable" &&
        dataSource.scopeInstanceId !== undefined
      ) {
        const instance = instances.get(dataSource.scopeInstanceId);
        if (instance) {
          const meta = metas.get(instance.component);
          const instanceLabel = getInstanceLabel(instance, meta);
          const usages = usedInInstances.get(dataSource.id)?.size ?? 0;
          dataVariableOptions.push({
            terms: [
              "variable",
              "variables",
              "data",
              dataSource.name,
              instanceLabel,
              ...getUsageSearchTerms(usages),
            ],
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
        showInstance(instanceId, "settings");
        closeCommandPanel();
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
  const resetActionIndex = useResetActionIndex();
  const instances = useStore($instances);
  const metas = useStore($registeredComponentMetas);
  const [variableDialog, setVariableDialog] = useState<
    (DataVariableOption & { action: "rename" | "delete" }) | undefined
  >();

  return (
    <>
      <CommandGroup
        name="dataVariable"
        heading={<CommandGroupHeading>Data variables</CommandGroupHeading>}
        actions={["select", "find usages", "rename", "delete"]}
      >
        {options.map((option) => {
          const instance = instances.get(option.instanceId);
          const meta = instance ? metas.get(instance.component) : undefined;
          const instanceLabel = instance
            ? getInstanceLabel(instance, meta)
            : "";

          return (
            <CommandItem
              key={option.id}
              value={option.id}
              onSelect={() => {
                if (action === "select") {
                  showInstance(option.instanceId, "settings");
                  closeCommandPanel();
                }
                if (action === "find usages") {
                  $commandContent.set(
                    <DataVariableInstances variableId={option.id} />
                  );
                }
                if (action === "rename") {
                  setVariableDialog({ ...option, action: "rename" });
                }
                if (action === "delete") {
                  setVariableDialog({ ...option, action: "delete" });
                }
              }}
            >
              <Text variant="labelsSentenceCase">
                {option.name}{" "}
                <Text as="span" color="moreSubtle">
                  {formatUsageCount(option.usages)}
                </Text>
              </Text>
              <Text as="span" color="moreSubtle">
                {instanceLabel}
              </Text>
            </CommandItem>
          );
        })}
      </CommandGroup>
      <RenameDataVariableDialog
        variable={
          variableDialog?.action === "rename" ? variableDialog : undefined
        }
        onClose={() => {
          setVariableDialog(undefined);
          resetActionIndex();
          focusCommandPanel();
        }}
        onConfirm={(_variableId, newName) => {
          toast.success(
            `Variable renamed from "${variableDialog?.name}" to "${newName}"`
          );
          setVariableDialog(undefined);
        }}
      />
      <DeleteDataVariableDialog
        variable={
          variableDialog?.action === "delete" ? variableDialog : undefined
        }
        onClose={() => {
          setVariableDialog(undefined);
          resetActionIndex();
          focusCommandPanel();
        }}
        onConfirm={(variableId) => {
          updateWebstudioData((data) => {
            deleteVariableMutable(data, variableId);
          });
          toast.success(`Variable "${variableDialog?.name}" deleted`);
          setVariableDialog(undefined);
        }}
      />
    </>
  );
};
