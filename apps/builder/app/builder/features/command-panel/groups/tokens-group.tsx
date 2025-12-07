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
} from "@webstudio-is/design-system";
import type { Instance, StyleSource } from "@webstudio-is/sdk";
import { $selectedStyleSources, $styleSources } from "~/shared/nano-states";
import {
  deleteStyleSource,
  DeleteStyleSourceDialog,
  RenameStyleSourceDialog,
  $styleSourceUsages,
} from "~/builder/shared/style-source-utils";
import { findInstanceById } from "../shared/instance-utils";
import { InstanceList } from "../shared/instance-list";
import { $instances, $pages } from "~/shared/nano-states";
import { $awareness } from "~/shared/awareness";
import { $commandContent } from "../command-state";
import type { BaseOption } from "../shared/types";

export type TokenOption = BaseOption & {
  type: "token";
  token: Extract<StyleSource, { type: "token" }>;
  usages: number;
};

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

const TokenInstances = ({ tokenId }: { tokenId: StyleSource["id"] }) => {
  const usages = useStore($styleSourceUsages);
  const usedInInstanceIds = usages.get(tokenId) ?? new Set();

  return (
    <InstanceList
      instanceIds={usedInInstanceIds}
      onSelect={(instanceId) => selectToken(instanceId, tokenId)}
    />
  );
};

export const TokensGroup = ({ options }: { options: TokenOption[] }) => {
  const action = useSelectedAction();
  const [tokenToRename, setTokenToRename] =
    useState<Extract<StyleSource, { type: "token" }>>();
  const [tokenToDelete, setTokenToDelete] =
    useState<Extract<StyleSource, { type: "token" }>>();

  return (
    <>
      <CommandGroup
        name="token"
        heading={<CommandGroupHeading>Tokens</CommandGroupHeading>}
        actions={["find", "rename", "delete"]}
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
                  toast.error("Token is not used in any instance");
                }
              }
              if (action === "rename") {
                setTokenToRename(token);
              }
              if (action === "delete") {
                setTokenToDelete(token);
              }
            }}
          >
            <Text variant="labelsTitleCase">
              {token.name}{" "}
              <Text as="span" color="moreSubtle">
                {usages === 0
                  ? "unused"
                  : `${usages} ${usages === 1 ? "usage" : "usages"}`}
              </Text>
            </Text>
          </CommandItem>
        ))}
      </CommandGroup>
      <RenameStyleSourceDialog
        styleSource={tokenToRename}
        onClose={() => {
          setTokenToRename(undefined);
        }}
        onConfirm={(_styleSourceId, newName) => {
          toast.success(
            `Token renamed from "${tokenToRename?.name}" to "${newName}"`
          );
          setTokenToRename(undefined);
        }}
      />
      <DeleteStyleSourceDialog
        styleSource={tokenToDelete}
        onClose={() => {
          setTokenToDelete(undefined);
        }}
        onConfirm={(styleSourceId) => {
          deleteStyleSource(styleSourceId);
          toast.success(`Token "${tokenToDelete?.name}" deleted`);
          setTokenToDelete(undefined);
        }}
      />
    </>
  );
};
