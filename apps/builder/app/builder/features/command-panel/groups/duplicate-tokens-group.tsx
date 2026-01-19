import { useState } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { matchSorter } from "match-sorter";
import {
  CommandGroup,
  CommandGroupHeading,
  CommandFooter,
  CommandItem,
  CommandInput,
  CommandList,
  CommandBackButton,
  Text,
  Flex,
  ScrollArea,
  toast,
  useSelectedAction,
} from "@webstudio-is/design-system";
import type { Instance, StyleSource } from "@webstudio-is/sdk";
import {
  $styleSources,
  $styles,
  $breakpoints,
} from "~/shared/sync/data-stores";
import { $selectedStyleSources } from "~/shared/nano-states";
import { findDuplicateTokens } from "~/shared/style-source-utils";
import { $styleSourceUsages } from "~/builder/shared/style-source-actions";
import { InstanceList, showInstance } from "../shared/instance-list";
import {
  $commandContent,
  $commandContentKey,
  closeCommandPanel,
  openCommandPanel,
} from "../command-state";
import type { BaseOption } from "../shared/types";
import { formatUsageCount, getUsageSearchTerms } from "../shared/usage-utils";

export type DuplicateTokenOption = BaseOption & {
  type: "duplicateToken";
  token: Extract<StyleSource, { type: "token" }>;
  duplicates: StyleSource["id"][];
  usages: number;
};

export const $duplicateTokenOptions = computed(
  [$styleSources, $styles, $breakpoints, $styleSourceUsages],
  (styleSources, styles, breakpoints, styleSourceUsages) => {
    const duplicateTokenOptions: DuplicateTokenOption[] = [];

    const duplicatesMap = findDuplicateTokens({
      styleSources,
      styles,
      breakpoints,
    });

    for (const [tokenId, duplicateIds] of duplicatesMap) {
      const styleSource = styleSources.get(tokenId);
      if (styleSource?.type !== "token") {
        continue;
      }
      const usages = styleSourceUsages.get(tokenId)?.size ?? 0;
      duplicateTokenOptions.push({
        terms: [
          "duplicate tokens",
          "duplicates",
          styleSource.name,
          ...getUsageSearchTerms(usages),
        ],
        type: "duplicateToken",
        token: styleSource,
        duplicates: duplicateIds,
        usages,
      });
    }
    return duplicateTokenOptions;
  }
);

/**
 * Show the duplicate tokens view in the command panel
 */
export const showDuplicateTokensView = () => {
  const options = $duplicateTokenOptions.get();
  if (options.length === 0) {
    toast.info("No duplicate tokens found");
    return;
  }
  openCommandPanel();
  $commandContent.set(<DuplicateTokensGroup options={options} />);
};

const selectToken = (
  instanceId: Instance["id"],
  tokenId: StyleSource["id"]
) => {
  showInstance(instanceId, "style");
  const selectedStyleSources = new Map($selectedStyleSources.get());
  selectedStyleSources.set(instanceId, tokenId);
  $selectedStyleSources.set(selectedStyleSources);
};

const DuplicateTokensList = ({
  duplicateIds,
  tokenName,
}: {
  duplicateIds: StyleSource["id"][];
  tokenName: string;
}) => {
  const styleSources = useStore($styleSources);
  const usages = useStore($styleSourceUsages);
  const duplicateTokenOptions = $duplicateTokenOptions.get();
  const action = useSelectedAction();
  const [search, setSearch] = useState("");

  // Build options for search
  const options = duplicateIds
    .map((duplicateId) => {
      const duplicate = styleSources.get(duplicateId);
      if (duplicate?.type !== "token") {
        return null;
      }
      const duplicateUsages = usages.get(duplicateId)?.size ?? 0;
      return {
        id: duplicateId,
        token: duplicate,
        usages: duplicateUsages,
        terms: [duplicate.name, ...getUsageSearchTerms(duplicateUsages)],
      };
    })
    .filter((opt): opt is NonNullable<typeof opt> => opt !== null);

  let matches = options;
  // prevent searching when value is empty to preserve original items order
  if (search.trim().length > 0) {
    for (const word of search.trim().split(/\s+/)) {
      matches = matchSorter(matches, word, {
        keys: ["terms"],
      });
    }
  }

  const goBack = () => {
    // Go back to duplicate tokens view
    $commandContentKey.set($commandContentKey.get() + 1);
    $commandContent.set(
      <DuplicateTokensGroup options={duplicateTokenOptions} />
    );
  };

  return (
    <>
      <CommandInput
        placeholder="Search duplicates..."
        value={search}
        onValueChange={(value) => setSearch(value)}
        prefix={<CommandBackButton onClick={goBack} />}
        onBack={goBack}
      />
      <Flex direction="column" css={{ maxHeight: 300 }}>
        <ScrollArea>
          <CommandList key={tokenName}>
            <CommandGroup
              name="duplicates"
              heading={
                <CommandGroupHeading>
                  Duplicates of {tokenName}
                </CommandGroupHeading>
              }
              actions={[
                { name: "show duplicates", label: "Show duplicates" },
                { name: "show instances", label: "Show instances" },
              ]}
            >
              {matches.map(({ id, token, usages: duplicateUsages }) => (
                <CommandItem
                  key={id}
                  value={id}
                  onSelect={() => {
                    if (action?.name === "showDuplicates" || !action) {
                      // Show duplicates of this duplicate token
                      const allDuplicates = duplicateTokenOptions.find(
                        (opt) => opt.token.id === id
                      )?.duplicates;
                      if (allDuplicates) {
                        $commandContentKey.set($commandContentKey.get() + 1);
                        $commandContent.set(
                          <DuplicateTokensList
                            duplicateIds={allDuplicates}
                            tokenName={token.name}
                          />
                        );
                      }
                    }
                    if (
                      action?.name === "showInstances" ||
                      action?.name === "findInstances" ||
                      action?.name === "find"
                    ) {
                      $commandContentKey.set($commandContentKey.get() + 1);
                      $commandContent.set(<TokenInstances tokenId={id} />);
                    }
                  }}
                >
                  <Text>
                    {token.name}{" "}
                    <Text as="span" color="moreSubtle">
                      {formatUsageCount(duplicateUsages)}
                    </Text>
                  </Text>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </ScrollArea>
      </Flex>
      <CommandFooter />
    </>
  );
};

const TokenInstances = ({ tokenId }: { tokenId: StyleSource["id"] }) => {
  const usages = useStore($styleSourceUsages);
  const usedInInstanceIds = usages.get(tokenId) ?? new Set();
  const duplicateTokenOptions = $duplicateTokenOptions.get();

  return (
    <InstanceList
      instanceIds={usedInInstanceIds}
      onSelect={(instanceId) => {
        selectToken(instanceId, tokenId);
        closeCommandPanel();
      }}
      onBack={() => {
        // Go back to duplicate tokens view
        $commandContentKey.set($commandContentKey.get() + 1);
        $commandContent.set(
          <DuplicateTokensGroup options={duplicateTokenOptions} />
        );
      }}
    />
  );
};

export const DuplicateTokensGroup = ({
  options,
}: {
  options: DuplicateTokenOption[];
}) => {
  const action = useSelectedAction();
  const [search, setSearch] = useState("");

  let matches = options;
  // prevent searching when value is empty to preserve original items order
  if (search.trim().length > 0) {
    for (const word of search.trim().split(/\s+/)) {
      matches = matchSorter(matches, word, {
        keys: ["terms"],
      });
    }
  }

  const goBack = () => {
    // Go back to main command panel
    $commandContentKey.set($commandContentKey.get() + 1);
    $commandContent.set(undefined);
  };

  return (
    <>
      <CommandInput
        placeholder="Search duplicate tokens..."
        value={search}
        onValueChange={(value) => setSearch(value)}
        prefix={<CommandBackButton onClick={goBack} />}
        onBack={goBack}
      />
      <Flex direction="column" css={{ maxHeight: 300 }}>
        <ScrollArea>
          <CommandList key="duplicate-tokens-main">
            <CommandGroup
              name="duplicateToken"
              heading={
                <CommandGroupHeading>Duplicate tokens</CommandGroupHeading>
              }
              actions={[
                { name: "showDuplicates", label: "Show duplicates" },
                { name: "showInstances", label: "Show instances" },
              ]}
            >
              {matches.map(({ token, duplicates, usages }) => (
                <CommandItem
                  key={token.id}
                  // preserve selected state when rerender
                  value={token.id}
                  onSelect={() => {
                    if (action?.name === "showDuplicates" || !action) {
                      $commandContentKey.set($commandContentKey.get() + 1);
                      $commandContent.set(
                        <DuplicateTokensList
                          duplicateIds={duplicates}
                          tokenName={token.name}
                        />
                      );
                    }
                    if (
                      action?.name === "showInstances" ||
                      action?.name === "findInstances" ||
                      action?.name === "find"
                    ) {
                      $commandContentKey.set($commandContentKey.get() + 1);
                      $commandContent.set(
                        <TokenInstances tokenId={token.id} />
                      );
                    }
                  }}
                >
                  <Text variant="labels">
                    {token.name}{" "}
                    <Text as="span" color="moreSubtle">
                      {formatUsageCount(usages)} · {duplicates.length} duplicate
                      {duplicates.length !== 1 ? "s" : ""}
                    </Text>
                  </Text>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </ScrollArea>
      </Flex>
      <CommandFooter />
    </>
  );
};
