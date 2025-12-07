import { useStore } from "@nanostores/react";
import { matchSorter } from "match-sorter";
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  ScrollArea,
  Flex,
  CommandFooter,
  toast,
} from "@webstudio-is/design-system";
import { mapGroupBy } from "~/shared/shim";
import {
  $commandContent,
  $isCommandPanelOpen,
  $commandSearch,
  $isDeleteUnusedTokensDialogOpen,
  closeCommandPanel,
} from "./command-state";
import {
  deleteUnusedTokens,
  DeleteUnusedTokensDialog,
} from "~/builder/shared/style-source-utils";
import {
  $allOptions,
  groups,
  type ComponentOption,
  type TagOption,
  type BreakpointOption,
  type PageOption,
  type CommandOption,
  type TokenOption,
} from "./groups";

const CommandDialogContent = () => {
  const search = useStore($commandSearch);
  const options = useStore($allOptions);
  let matches = options;
  // prevent searching when value is empty
  // to preserve original items order
  if (search.trim().length > 0) {
    for (const word of search.trim().split(/\s+/)) {
      matches = matchSorter(matches, word, {
        keys: ["terms"],
      });
    }
  }
  const matchGroups = mapGroupBy(matches, (match) => match.type);
  return (
    <>
      <CommandInput
        value={search}
        onValueChange={(value) => $commandSearch.set(value)}
      />
      <Flex direction="column" css={{ maxHeight: 300 }}>
        <ScrollArea>
          <CommandList>
            {Array.from(matchGroups).map(([groupType, matches]) => {
              if (groupType === "component") {
                return (
                  <groups.component
                    key={groupType}
                    options={matches as ComponentOption[]}
                  />
                );
              }
              if (groupType === "tag") {
                return (
                  <groups.tag
                    key={groupType}
                    options={matches as TagOption[]}
                  />
                );
              }
              if (groupType === "breakpoint") {
                return (
                  <groups.breakpoint
                    key={groupType}
                    options={matches as BreakpointOption[]}
                  />
                );
              }
              if (groupType === "page") {
                return (
                  <groups.page
                    key={groupType}
                    options={matches as PageOption[]}
                  />
                );
              }
              if (groupType === "command") {
                return (
                  <groups.command
                    key={groupType}
                    options={matches as CommandOption[]}
                  />
                );
              }
              if (groupType === "token") {
                return (
                  <groups.token
                    key={groupType}
                    options={matches as TokenOption[]}
                  />
                );
              }
              groupType satisfies never;
            })}
          </CommandList>
        </ScrollArea>
      </Flex>
      <CommandFooter />
    </>
  );
};

export const CommandPanel = () => {
  const isOpen = useStore($isCommandPanelOpen);
  const commandContent = useStore($commandContent);
  const isDeleteDialogOpen = useStore($isDeleteUnusedTokensDialogOpen);

  return (
    <>
      <CommandDialog
        open={isOpen}
        onOpenChange={() => closeCommandPanel({ restoreFocus: true })}
      >
        <Command shouldFilter={false}>
          {commandContent ?? <CommandDialogContent />}
        </Command>
      </CommandDialog>
      <DeleteUnusedTokensDialog
        open={isDeleteDialogOpen}
        onClose={() => $isDeleteUnusedTokensDialogOpen.set(false)}
        onConfirm={() => {
          const deletedCount = deleteUnusedTokens();
          if (deletedCount === 0) {
            toast.info("No unused tokens to delete");
          } else {
            toast.success(
              `Deleted ${deletedCount} unused ${deletedCount === 1 ? "token" : "tokens"}`
            );
          }
        }}
      />
    </>
  );
};
