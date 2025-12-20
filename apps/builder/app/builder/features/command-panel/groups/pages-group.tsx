import {
  CommandGroup,
  CommandGroupHeading,
  CommandItem,
  Text,
  useSelectedAction,
} from "@webstudio-is/design-system";
import { computed } from "nanostores";
import type { Page } from "@webstudio-is/sdk";
import { $pages } from "~/shared/sync/data-stores";
import { $editingPageId } from "~/shared/nano-states";
import { $selectedPage, selectPage } from "~/shared/awareness";
import { setActiveSidebarPanel } from "~/builder/shared/nano-states";
import { closeCommandPanel, $isCommandPanelOpen } from "../command-state";
import type { BaseOption } from "../shared/types";

export type PageOption = BaseOption & {
  type: "page";
  page: Page;
};

export const $pageOptions = computed(
  [$isCommandPanelOpen, $pages, $selectedPage],
  (isOpen, pages, selectedPage) => {
    if (!isOpen) {
      return [];
    }
    const pageOptions: PageOption[] = [];
    if (pages) {
      for (const page of [pages.homePage, ...pages.pages]) {
        if (page.id === selectedPage?.id) {
          continue;
        }
        pageOptions.push({
          terms: ["pages", page.name],
          type: "page",
          page,
        });
      }
    }
    return pageOptions;
  }
);

export const PagesGroup = ({ options }: { options: PageOption[] }) => {
  const action = useSelectedAction();
  return (
    <CommandGroup
      name="page"
      heading={
        <CommandGroupHeading>Pages ({options.length})</CommandGroupHeading>
      }
      actions={[
        { name: "select", label: "Select" },
        { name: "settings", label: "Settings" },
      ]}
    >
      {options.map(({ page }) => (
        <CommandItem
          key={page.id}
          // preserve selected state when rerender
          value={page.id}
          onSelect={() => {
            closeCommandPanel();
            if (action?.name === "select") {
              selectPage(page.id);
              setActiveSidebarPanel("auto");
              $editingPageId.set(undefined);
            }
            if (action?.name === "settings") {
              selectPage(page.id);
              setActiveSidebarPanel("pages");
              $editingPageId.set(page.id);
            }
          }}
        >
          <Text>{page.name}</Text>
        </CommandItem>
      ))}
    </CommandGroup>
  );
};
