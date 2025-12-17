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
import type { Instance, StyleSource } from "@webstudio-is/sdk";
import {
  $styleSources,
  $styles,
  $breakpoints,
} from "~/shared/sync/data-stores";
import { $selectedStyleSources } from "~/shared/nano-states";
import { findDuplicateTokens } from "~/shared/style-source-utils";
import {
  deleteStyleSource,
  DeleteStyleSourceDialog,
  RenameStyleSourceDialog,
  $styleSourceUsages,
} from "~/builder/shared/style-source-actions";
import { InstanceList, showInstance } from "../shared/instance-list";
import {
  $commandContent,
  $isCommandPanelOpen,
  closeCommandPanel,
  focusCommandPanel,
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
  [
    $isCommandPanelOpen,
    $styleSources,
    $styles,
    $breakpoints,
    $styleSourceUsages,
  ],
  (isOpen, styleSources, styles, breakpoints, styleSourceUsages) => {
    const duplicateTokenOptions: DuplicateTokenOption[] = [];
    if (!isOpen) {
      return duplicateTokenOptions;
    }

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
}: {
  duplicateIds: StyleSource["id"][];
}) => {
  const styleSources = useStore($styleSources);
  const usages = useStore($styleSourceUsages);

  return (
    <CommandGroup
      name="duplicates"
      heading={<CommandGroupHeading>Duplicate Tokens</CommandGroupHeading>}
      actions={["find"]}
    >
      {duplicateIds.map((duplicateId) => {
        const duplicate = styleSources.get(duplicateId);
        if (duplicate?.type !== "token") {
          return null;
        }
        const duplicateUsages = usages.get(duplicateId)?.size ?? 0;
        return (
          <CommandItem
            key={duplicateId}
            value={duplicateId}
            onSelect={() => {
              $commandContent.set(<TokenInstances tokenId={duplicateId} />);
            }}
          >
            <Text variant="labelsTitleCase">
              {duplicate.name}{" "}
              <Text as="span" color="moreSubtle">
                {formatUsageCount(duplicateUsages)}
              </Text>
            </Text>
          </CommandItem>
        );
      })}
    </CommandGroup>
  );
};

const TokenInstances = ({ tokenId }: { tokenId: StyleSource["id"] }) => {
  const usages = useStore($styleSourceUsages);
  const usedInInstanceIds = usages.get(tokenId) ?? new Set();

  return (
    <InstanceList
      instanceIds={usedInInstanceIds}
      onSelect={(instanceId) => {
        selectToken(instanceId, tokenId);
        closeCommandPanel();
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
  const resetActionIndex = useResetActionIndex();
  const [tokenDialog, setTokenDialog] = useState<
    | (Extract<StyleSource, { type: "token" }> & {
        action: "rename" | "delete";
      })
    | undefined
  >();

  return (
    <>
      <CommandGroup
        name="duplicateToken"
        heading={<CommandGroupHeading>Duplicate Tokens</CommandGroupHeading>}
        actions={["show duplicates", "find", "rename", "delete"]}
      >
        {options.map(({ token, duplicates, usages }) => (
          <CommandItem
            key={token.id}
            // preserve selected state when rerender
            value={token.id}
            onSelect={() => {
              if (action === "show duplicates") {
                $commandContent.set(
                  <DuplicateTokensList duplicateIds={duplicates} />
                );
              }
              if (action === "find") {
                $commandContent.set(<TokenInstances tokenId={token.id} />);
              }
              if (action === "rename") {
                setTokenDialog({ ...token, action: "rename" });
              }
              if (action === "delete") {
                setTokenDialog({ ...token, action: "delete" });
              }
            }}
          >
            <Text variant="labelsTitleCase">
              {token.name}{" "}
              <Text as="span" color="moreSubtle">
                {formatUsageCount(usages)} · {duplicates.length} duplicate
                {duplicates.length !== 1 ? "s" : ""}
              </Text>
            </Text>
          </CommandItem>
        ))}
      </CommandGroup>
      <RenameStyleSourceDialog
        styleSource={tokenDialog?.action === "rename" ? tokenDialog : undefined}
        onClose={() => {
          setTokenDialog(undefined);
          resetActionIndex();
          focusCommandPanel();
        }}
        onConfirm={(_styleSourceId, newName) => {
          toast.success(
            `Token renamed from "${tokenDialog?.name}" to "${newName}"`
          );
          setTokenDialog(undefined);
        }}
      />
      <DeleteStyleSourceDialog
        styleSource={tokenDialog?.action === "delete" ? tokenDialog : undefined}
        onClose={() => {
          setTokenDialog(undefined);
          resetActionIndex();
          focusCommandPanel();
        }}
        onConfirm={(styleSourceId) => {
          deleteStyleSource(styleSourceId);
          toast.success(`Token "${tokenDialog?.name}" deleted`);
          setTokenDialog(undefined);
        }}
      />
    </>
  );
};
