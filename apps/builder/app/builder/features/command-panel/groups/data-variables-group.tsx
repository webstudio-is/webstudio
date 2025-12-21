import { useState } from "react";
import { computed } from "nanostores";
import {
  CommandGroup,
  CommandGroupHeading,
  CommandItem,
  Text,
  toast,
  useSelectedAction,
  useResetActionIndex,
} from "@webstudio-is/design-system";
import { $dataSources } from "~/shared/sync/data-stores";
import {
  $commandContent,
  $isCommandPanelOpen,
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

export type DataVariableOption = BaseOption & {
  type: "dataVariable";
  id: string;
  name: string;
  instanceId: string;
  usages: number;
};

export const $dataVariableOptions = computed(
  [$isCommandPanelOpen, $dataSources, $usedVariablesInInstances],
  (isOpen, dataSources, usedInInstances) => {
    const dataVariableOptions: DataVariableOption[] = [];
    if (!isOpen) {
      return dataVariableOptions;
    }

    for (const dataSource of dataSources.values()) {
      if (
        dataSource.type === "variable" &&
        dataSource.scopeInstanceId !== undefined
      ) {
        const usages = usedInInstances.get(dataSource.id)?.size ?? 0;
        dataVariableOptions.push({
          terms: [
            "variable",
            "variables",
            "data",
            dataSource.name,
            getInstanceLabel(dataSource.scopeInstanceId) ?? "Unused",
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
  const [variableDialog, setVariableDialog] = useState<
    (DataVariableOption & { action: "rename" | "delete" }) | undefined
  >();

  return (
    <>
      <CommandGroup
        name="dataVariable"
        heading={
          <CommandGroupHeading>
            Data variables ({options.length})
          </CommandGroupHeading>
        }
        actions={[
          { name: "select", label: "Select" },
          { name: "findUsages", label: "Find usages" },
          { name: "rename", label: "Rename" },
          { name: "delete", label: "Delete" },
        ]}
      >
        {options.map((option) => {
          return (
            <CommandItem
              keywords={option.terms}
              key={option.id}
              value={option.id}
              onSelect={() => {
                if (action?.name === "select") {
                  showInstance(option.instanceId, "settings");
                  closeCommandPanel();
                }
                if (action?.name === "findUsages") {
                  $commandContent.set(
                    <DataVariableInstances variableId={option.id} />
                  );
                }
                if (action?.name === "rename") {
                  setVariableDialog({ ...option, action: "rename" });
                }
                if (action?.name === "delete") {
                  setVariableDialog({ ...option, action: "delete" });
                }
              }}
            >
              <Text>
                {option.name}{" "}
                <Text as="span" color="moreSubtle">
                  {formatUsageCount(option.usages)}
                </Text>
              </Text>
              <Text as="span" color="moreSubtle">
                {getInstanceLabel(option.instanceId)}
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
