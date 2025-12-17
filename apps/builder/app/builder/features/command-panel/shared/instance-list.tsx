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
} from "@webstudio-is/design-system";
import type { Instance } from "@webstudio-is/sdk";
import { $instances, $pages } from "~/shared/sync/data-stores";
import { getInstanceLabel } from "~/builder/shared/instance-label";
import { $awareness, findAwarenessByInstanceId } from "~/shared/awareness";
import { buildInstancePath } from "~/shared/instance-utils";
import { $commandContent } from "../command-state";
import { $activeInspectorPanel } from "~/builder/shared/nano-states";
import { BackButton } from "./back-button";

export type InstanceOption = {
  label: string;
  id: string;
  path: string[];
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
  const usedInInstances: InstanceOption[] = [];
  for (const instanceId of instanceIds) {
    const instance = instances.get(instanceId);
    if (!instance || !pages) {
      continue;
    }
    const path = buildInstancePath(instanceId, pages, instances);
    usedInInstances.push({
      label: getInstanceLabel(instance),
      id: instance.id,
      path,
    });
  }
  const [search, setSearch] = useState("");

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

  return (
    <>
      <CommandInput
        action="select"
        placeholder="Search instances..."
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
                matches.map(({ id, label, path }) => (
                  <CommandItem
                    key={id}
                    value={id}
                    onSelect={() => {
                      onSelect(id);
                    }}
                  >
                    <Text variant="labelsTitleCase">{label}</Text>
                    <Text
                      color="moreSubtle"
                      truncate
                      css={{ maxWidth: "30ch" }}
                    >
                      /{path.join("/")}
                    </Text>
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          </CommandList>
        </ScrollArea>
      </Flex>
      <CommandGroupFooter>
        <Flex grow>
          <BackButton />
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
