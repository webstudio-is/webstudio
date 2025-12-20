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
} from "@webstudio-is/design-system";
import { mapGroupBy } from "~/shared/shim";
import {
  $commandContent,
  $isCommandPanelOpen,
  $commandSearch,
  $commandContentKey,
  closeCommandPanel,
} from "./command-state";
import { $allOptions, groups, type Option } from "./groups";
import { useAutoSelectFirstItem } from "./shared/auto-select";

const renderGroup = (type: Option["type"], matches: Option[]): JSX.Element => {
  const Group = groups[type];
  // Type assertion is safe here because matches are filtered by type before calling renderGroup
  return <Group key={type} options={matches as never} />;
};

const CommandDialogContent = () => {
  const search = useStore($commandSearch);
  const options = useStore($allOptions);
  const listRef = useAutoSelectFirstItem(search);

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
  const matchGroups = mapGroupBy<Option, Option["type"]>(
    matches,
    (match) => match.type
  );

  return (
    <>
      <CommandInput
        value={search}
        onValueChange={(value) => $commandSearch.set(value)}
      />
      <Flex direction="column" css={{ maxHeight: 300 }}>
        <ScrollArea>
          <CommandList ref={listRef}>
            {Array.from(matchGroups).map(([type, matches]) =>
              renderGroup(type, matches)
            )}
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
  const contentKey = useStore($commandContentKey);

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={() => closeCommandPanel({ restoreFocus: true })}
    >
      <Command key={contentKey} shouldFilter={false}>
        {commandContent ?? <CommandDialogContent />}
      </Command>
    </CommandDialog>
  );
};
