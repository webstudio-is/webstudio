import { useState } from "react";
import { matchSorter } from "match-sorter";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  CommandGroup,
  CommandGroupHeading,
  CommandInput,
  CommandItem,
  CommandList,
  Flex,
  ScrollArea,
  Text,
  toast,
  useSelectedAction,
} from "@webstudio-is/design-system";
import type { Instance, Instances, StyleSource } from "@webstudio-is/sdk";
import {
  $instances,
  $pages,
  $registeredComponentMetas,
  $selectedStyleSources,
  $styleSources,
  $styleSourceSelections,
} from "~/shared/nano-states";
import { getInstanceLabel } from "~/shared/instance-utils";
import type { InstanceSelector } from "~/shared/tree-utils";
import { $awareness } from "~/shared/awareness";
import { $commandContent, closeCommandPanel } from "./command-state";

export type TokenOption = {
  terms: string[];
  type: "token";
  token: Extract<StyleSource, { type: "token" }>;
  usages: number;
};

const $styleSourceUsages = computed(
  $styleSourceSelections,
  (styleSourceSelections) => {
    const styleSourceUsages = new Map<StyleSource["id"], Set<Instance["id"]>>();
    for (const { instanceId, values } of styleSourceSelections.values()) {
      for (const styleSourceId of values) {
        let usages = styleSourceUsages.get(styleSourceId);
        if (usages === undefined) {
          usages = new Set();
          styleSourceUsages.set(styleSourceId, usages);
        }
        usages.add(instanceId);
      }
    }
    return styleSourceUsages;
  }
);

export const $tokenOptions = computed(
  [$styleSources, $styleSourceUsages],
  (styleSources, styleSourceUsages) => {
    const tokenOptions: TokenOption[] = [];
    for (const styleSource of styleSources.values()) {
      if (styleSource.type !== "token") {
        continue;
      }
      tokenOptions.push({
        terms: ["tokens", styleSource.name],
        type: "token",
        token: styleSource,
        usages: styleSourceUsages.get(styleSource.id)?.size ?? 0,
      });
    }
    return tokenOptions;
  }
);

/**
 * very loose selector finder
 * will not work properly with collections
 */
const findInstanceById = (
  instances: Instances,
  instanceSelector: InstanceSelector,
  targetId: Instance["id"]
): undefined | InstanceSelector => {
  const [instanceId] = instanceSelector;
  if (instanceId === targetId) {
    return instanceSelector;
  }
  const instance = instances.get(instanceId);
  if (instance) {
    for (const child of instance.children) {
      if (child.type === "id") {
        const matched = findInstanceById(
          instances,
          [child.value, ...instanceSelector],
          targetId
        );
        if (matched) {
          return matched;
        }
      }
    }
  }
};

const selectToken = (
  instanceId: Instance["id"],
  tokenId: StyleSource["id"]
) => {
  const instances = $instances.get();
  const pagesData = $pages.get();
  if (pagesData === undefined) {
    return;
  }
  const pages = [pagesData.homePage, ...pagesData.pages];
  for (const page of pages) {
    const instanceSelector = findInstanceById(
      instances,
      [page.rootInstanceId],
      instanceId
    );
    if (instanceSelector) {
      $awareness.set({ pageId: page.id, instanceSelector });
      const selectedStyleSources = new Map($selectedStyleSources.get());
      selectedStyleSources.set(instanceId, tokenId);
      $selectedStyleSources.set(selectedStyleSources);
      break;
    }
  }
};

type InstanceOption = {
  label: string;
  id: string;
};

const TokenInstances = ({ tokenId }: { tokenId: StyleSource["id"] }) => {
  const usages = useStore($styleSourceUsages);
  const usedInInstanceIds = usages.get(tokenId) ?? new Set();
  const instances = $instances.get();
  const metas = $registeredComponentMetas.get();
  const usedInInstances: InstanceOption[] = [];
  for (const instanceId of usedInInstanceIds) {
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
      <CommandInput value={search} onValueChange={setSearch} />
      <Flex direction="column" css={{ maxHeight: 300 }}>
        <ScrollArea>
          <CommandList>
            {matches.map(({ id, label }) => (
              <CommandItem
                key={id}
                // preserve selected state when rerender
                value={id}
                onSelect={() => {
                  selectToken(id, tokenId);
                  closeCommandPanel();
                }}
              >
                <Text variant="labelsTitleCase">{label}</Text>
              </CommandItem>
            ))}
          </CommandList>
        </ScrollArea>
      </Flex>
    </>
  );
};

export const TokenGroup = ({ options }: { options: TokenOption[] }) => {
  const action = useSelectedAction();
  return (
    <CommandGroup
      name="token"
      heading={<CommandGroupHeading>Tokens</CommandGroupHeading>}
      actions={["find"]}
    >
      {options.map(({ token, usages }) => (
        <CommandItem
          key={token.id}
          // preserve selected state when rerender
          value={token.id}
          onSelect={() => {
            if (action === "find") {
              if (usages > 0) {
                $commandContent.set(<TokenInstances tokenId={token.id} />);
              } else {
                toast.error("Token should be added to instance");
              }
            }
          }}
        >
          <Text variant="labelsTitleCase">
            {token.name}{" "}
            {usages > 0 && (
              <Text as="span" color="moreSubtle">
                {usages} usages
              </Text>
            )}
          </Text>
        </CommandItem>
      ))}
    </CommandGroup>
  );
};
