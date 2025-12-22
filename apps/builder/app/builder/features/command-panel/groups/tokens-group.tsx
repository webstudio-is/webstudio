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
import { $styleSources } from "~/shared/sync/data-stores";
import { $selectedStyleSources } from "~/shared/nano-states";
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
} from "../command-state";
import type { BaseOption } from "../shared/types";
import { formatUsageCount, getUsageSearchTerms } from "../shared/usage-utils";

export type TokenOption = BaseOption & {
  type: "token";
  token: Extract<StyleSource, { type: "token" }>;
  usages: number;
};

export const $tokenOptions = computed(
  [$isCommandPanelOpen, $styleSources, $styleSourceUsages],
  (isOpen, styleSources, styleSourceUsages) => {
    const tokenOptions: TokenOption[] = [];
    if (!isOpen) {
      return tokenOptions;
    }
    for (const styleSource of styleSources.values()) {
      if (styleSource.type !== "token") {
        continue;
      }
      const usages = styleSourceUsages.get(styleSource.id)?.size ?? 0;
      tokenOptions.push({
        terms: ["tokens", styleSource.name, ...getUsageSearchTerms(usages)],
        type: "token",
        token: styleSource,
        usages,
      });
    }
    return tokenOptions;
  }
);

const selectToken = (
  instanceId: Instance["id"],
  tokenId: StyleSource["id"]
) => {
  showInstance(instanceId, "style");
  const selectedStyleSources = new Map($selectedStyleSources.get());
  selectedStyleSources.set(instanceId, tokenId);
  $selectedStyleSources.set(selectedStyleSources);
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

export const TokensGroup = ({ options }: { options: TokenOption[] }) => {
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
        name="token"
        heading={
          <CommandGroupHeading>Tokens ({options.length})</CommandGroupHeading>
        }
        actions={[
          { name: "showInstances", label: "Show instances" },
          { name: "rename", label: "Rename" },
          { name: "delete", label: "Delete" },
        ]}
      >
        {options.map(({ token, usages }) => (
          <CommandItem
            key={token.id}
            // preserve selected state when rerender
            value={token.id}
            onSelect={() => {
              if (
                action?.name === "showInstances" ||
                action?.name === "findInstances" ||
                action?.name === "find"
              ) {
                $commandContent.set(<TokenInstances tokenId={token.id} />);
              }
              if (action?.name === "rename") {
                setTokenDialog({ ...token, action: "rename" });
              }
              if (action?.name === "delete") {
                setTokenDialog({ ...token, action: "delete" });
              }
            }}
          >
            <Text>
              {token.name}{" "}
              <Text as="span" color="moreSubtle">
                {formatUsageCount(usages)}
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
