import { useState } from "react";
import { matchSorter } from "match-sorter";
import {
  CommandGroup,
  CommandGroupFooter,
  CommandInput,
  CommandItem,
  CommandList,
  Flex,
  ScrollArea,
  Text,
  Button,
  Kbd,
} from "@webstudio-is/design-system";
import type { Instance } from "@webstudio-is/sdk";
import {
  $instances,
  $pages,
  $registeredComponentMetas,
} from "~/shared/nano-states";
import { getInstanceLabel } from "~/builder/shared/instance-label";
import { $awareness, findAwarenessByInstanceId } from "~/shared/awareness";
import { $commandContent } from "../command-state";
import { $activeInspectorPanel } from "~/builder/shared/nano-states";

export type InstanceOption = {
  label: string;
  id: string;
};

type InstanceListProps = {
  instanceIds: Set<Instance["id"]>;
  onSelect: (instanceId: Instance["id"]) => void;
};

export const InstanceList = ({ instanceIds, onSelect }: InstanceListProps) => {
  const instances = $instances.get();
  const metas = $registeredComponentMetas.get();
  const usedInInstances: InstanceOption[] = [];
  for (const instanceId of instanceIds) {
    const instance = instances.get(instanceId);
    const meta = metas.get(instance?.component ?? "");
    if (instance && meta) {
      usedInInstances.push({
        label: getInstanceLabel(instance, meta),
        id: instance.id,
      });
    }
  }
  const [search, setSearch] = useState("");

  const goBack = () => {
    $commandContent.set(undefined);
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

  return (
    <>
      <CommandInput
        action="select"
        value={search}
        onValueChange={setSearch}
        onKeyDown={(event) => {
          if (event.key === "Backspace" && search === "") {
            event.preventDefault();
            goBack();
          }
        }}
      />
      <Flex direction="column" css={{ maxHeight: 300 }}>
        <ScrollArea>
          <CommandList>
            <CommandGroup name="instance" actions={["select"]}>
              {matches.length === 0 ? (
                <Flex justify="center" align="center" css={{ minHeight: 100 }}>
                  <Text color="subtle">No instances found</Text>
                </Flex>
              ) : (
                matches.map(({ id, label }) => (
                  <CommandItem
                    key={id}
                    value={id}
                    onSelect={() => {
                      onSelect(id);
                    }}
                  >
                    <Text variant="labelsTitleCase">{label}</Text>
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          </CommandList>
        </ScrollArea>
      </Flex>
      <CommandGroupFooter>
        <Flex grow>
          <Button tabIndex={-1} color="ghost" onClick={goBack}>
            Back <Kbd value={["backspace"]} />
          </Button>
        </Flex>
      </CommandGroupFooter>
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
