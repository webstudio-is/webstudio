import { useState } from "react";
import { matchSorter } from "match-sorter";
import {
  CommandGroup,
  CommandFooter,
  CommandInput,
  CommandItem,
  CommandList,
  CommandBackButton,
  Flex,
  ScrollArea,
  Text,
  useSelectedAction,
  useCommandState,
} from "@webstudio-is/design-system";
import type { Instance } from "@webstudio-is/sdk";
import { $instances, $pages } from "~/shared/sync/data-stores";
import { getInstanceLabel } from "~/builder/shared/instance-label";
import { buildInstancePath } from "~/shared/instance-utils";
import { $commandContent } from "~/builder/features/command-panel/command-state";
import { findAwarenessByInstanceId } from "~/shared/awareness";
import { $awareness } from "~/shared/awareness";
import { $activeInspectorPanel } from "~/builder/shared/nano-states";
import { useAutoSelectFirstItem } from "./auto-select";
import { InstancePathFooter } from "./instance-path-footer";

export type InstanceOption = {
  label: string;
  id: string;
  path: string[];
  pageName: string;
};

type InstanceListProps = {
  instanceIds: Set<Instance["id"]>;
  onSelect: (instanceId: Instance["id"]) => void;
  onBack?: () => void;
};

export const InstanceList = ({
  instanceIds,
  onSelect,
  onBack,
}: InstanceListProps) => {
  const instances = $instances.get();
  const pages = $pages.get();
  const action = useSelectedAction();
  const highlightedValue = useCommandState((state) => state.value);
  const usedInInstances: InstanceOption[] = [];
  for (const instanceId of instanceIds) {
    const instance = instances.get(instanceId);
    if (!instance || !pages) {
      continue;
    }
    const path = buildInstancePath(instanceId, pages, instances);
    const awareness = findAwarenessByInstanceId(pages, instances, instanceId);
    const page = pages.pages.find((p) => p.id === awareness.pageId);
    usedInInstances.push({
      label: getInstanceLabel(instance),
      id: instance.id,
      path,
      pageName: page?.name ?? "",
    });
  }
  const [search, setSearch] = useState("");

  const listRef = useAutoSelectFirstItem(search);

  const goBack = () => {
    if (onBack) {
      onBack();
    } else {
      $commandContent.set(undefined);
    }
  };

  let matches = usedInInstances;
  // prevent searching when value is empty
  // to preserve original items order
  if (search.trim().length > 0) {
    for (const word of search.trim().split(/\s+/)) {
      matches = matchSorter(matches, word, {
        keys: ["label"],
      });
    }
  }

  const selectedInstance = usedInInstances.find(
    (instance) => instance.id === highlightedValue
  );

  return (
    <>
      <CommandInput
        action={{ name: "select", label: "Select" }}
        placeholder="Search instances..."
        value={search}
        onValueChange={setSearch}
        prefix={<CommandBackButton onClick={goBack} />}
        onBack={goBack}
      />
      <Flex direction="column" css={{ maxHeight: 300 }}>
        <ScrollArea>
          <CommandList ref={listRef}>
            <CommandGroup
              name="instance"
              actions={[
                { name: "select", label: "Select" },
                { name: "settings", label: "Settings" },
              ]}
            >
              {matches.length === 0 ? (
                <Flex justify="center" align="center" css={{ minHeight: 100 }}>
                  <Text color="subtle">No instances found</Text>
                </Flex>
              ) : (
                matches.map(({ id, label, pageName }) => (
                  <CommandItem
                    key={id}
                    value={id}
                    onSelect={() => {
                      if (action?.name === "select" || !action) {
                        onSelect(id);
                      }
                      if (action?.name === "settings") {
                        showInstance(id, "settings");
                      }
                    }}
                  >
                    <Text>{label}</Text>
                    <Text color="moreSubtle">{pageName}</Text>
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          </CommandList>
        </ScrollArea>
      </Flex>
      <CommandFooter>
        {selectedInstance && (
          <InstancePathFooter instanceId={selectedInstance.id} />
        )}
      </CommandFooter>
    </>
  );
};

export const showInstance = (
  instanceId: Instance["id"],
  panel?: "style" | "settings"
) => {
  const instances = $instances.get();
  const pagesData = $pages.get();
  if (pagesData === undefined) {
    return;
  }
  const awareness = findAwarenessByInstanceId(pagesData, instances, instanceId);
  $awareness.set(awareness);
  if (panel !== undefined) {
    $activeInspectorPanel.set(panel);
  }
};
