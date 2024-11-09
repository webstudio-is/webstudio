import { atom, computed } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  collectionComponent,
  componentCategories,
  WsComponentMeta,
} from "@webstudio-is/react-sdk";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandGroupHeading,
  CommandItem,
  CommandIcon,
  ScrollArea,
  Flex,
  Kbd,
  Text,
} from "@webstudio-is/design-system";
import { compareMedia } from "@webstudio-is/css-engine";
import type { Breakpoint, Page } from "@webstudio-is/sdk";
import {
  $breakpoints,
  $pages,
  $registeredComponentMetas,
  $selectedBreakpoint,
  $selectedBreakpointId,
} from "~/shared/nano-states";
import { getInstanceLabel } from "~/shared/instance-utils";
import { humanizeString } from "~/shared/string-utils";
import { setCanvasWidth } from "~/builder/features/breakpoints";
import { insert as insertComponent } from "~/builder/features/components/insert";
import { $selectedPage, selectPage } from "~/shared/awareness";
import { useState } from "react";
import { matchSorter } from "match-sorter";
import { mapGroupBy } from "~/shared/shim";

const $commandPanel = atom<
  | undefined
  | {
      lastFocusedElement: null | HTMLElement;
    }
>();

export const openCommandPanel = () => {
  if (isFeatureEnabled("command") === false) {
    return;
  }
  const activeElement =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  // store last focused element
  $commandPanel.set({
    lastFocusedElement: activeElement,
  });
};

const closeCommandPanel = ({
  restoreFocus = false,
}: { restoreFocus?: boolean } = {}) => {
  const commandPanel = $commandPanel.get();
  $commandPanel.set(undefined);
  // restore focus in the next frame
  if (restoreFocus && commandPanel?.lastFocusedElement) {
    requestAnimationFrame(() => {
      commandPanel.lastFocusedElement?.focus();
    });
  }
};

const getMetaScore = (meta: WsComponentMeta) => {
  const categoryScore = componentCategories.indexOf(meta.category ?? "hidden");
  const componentScore = meta.order ?? Number.MAX_SAFE_INTEGER;
  // shift category
  return categoryScore * 1000 + componentScore;
};

type ComponentOption = {
  tokens: string[];
  type: "component";
  component: string;
  label: string;
  meta: WsComponentMeta;
};

const $componentOptions = computed(
  [$registeredComponentMetas, $selectedPage],
  (metas, selectedPage) => {
    const componentOptions: ComponentOption[] = [];
    for (const [component, meta] of metas) {
      const category = meta.category ?? "hidden";
      if (category === "hidden" || category === "internal") {
        continue;
      }
      // show only xml category and collection component in xml documents
      if (selectedPage?.meta.documentType === "xml") {
        if (category !== "xml" && component !== collectionComponent) {
          continue;
        }
      } else {
        // show everything except xml category in html documents
        if (category === "xml") {
          continue;
        }
      }
      const label = getInstanceLabel({ component }, meta);
      componentOptions.push({
        tokens: ["components", label, category],
        type: "component",
        component,
        label,
        meta,
      });
    }
    componentOptions.sort(
      ({ meta: leftMeta }, { meta: rightMeta }) =>
        getMetaScore(leftMeta) - getMetaScore(rightMeta)
    );
    return componentOptions;
  }
);

const ComponentsGroup = ({ options }: { options: ComponentOption[] }) => {
  return (
    <CommandGroup
      heading={<CommandGroupHeading>Components</CommandGroupHeading>}
    >
      {options.map(({ component, label, meta }) => {
        return (
          <CommandItem
            key={component}
            keywords={["Components"]}
            onSelect={() => {
              closeCommandPanel();
              insertComponent(component);
            }}
          >
            <CommandIcon
              dangerouslySetInnerHTML={{ __html: meta.icon }}
            ></CommandIcon>
            <Text variant="labelsTitleCase">
              {label}{" "}
              <Text as="span" color="moreSubtle">
                {humanizeString(meta.category ?? "")}
              </Text>
            </Text>
          </CommandItem>
        );
      })}
    </CommandGroup>
  );
};

type BreakpointOption = {
  tokens: string[];
  type: "breakpoint";
  breakpoint: Breakpoint;
  shortcut: string;
};

const $breakpointOptions = computed(
  [$breakpoints, $selectedBreakpoint],
  (breakpoints, selectedBreakpoint) => {
    const sortedBreakpoints = Array.from(breakpoints.values()).sort(
      compareMedia
    );
    const breakpointOptions: BreakpointOption[] = [];
    for (let index = 0; index < sortedBreakpoints.length; index += 1) {
      const breakpoint = sortedBreakpoints[index];
      if (breakpoint.id === selectedBreakpoint?.id) {
        continue;
      }
      const width =
        (breakpoint.minWidth ?? breakpoint.maxWidth)?.toString() ?? "";
      breakpointOptions.push({
        tokens: ["breakpoints", breakpoint.label, width],
        type: "breakpoint",
        breakpoint,
        shortcut: (index + 1).toString(),
      });
    }
    return breakpointOptions;
  }
);

const getBreakpointLabel = (breakpoint: Breakpoint) => {
  let label = "All Sizes";
  if (breakpoint.minWidth !== undefined) {
    label = `≥ ${breakpoint.minWidth} PX`;
  }
  if (breakpoint.maxWidth !== undefined) {
    label = `≤ ${breakpoint.maxWidth} PX`;
  }
  return `${breakpoint.label}: ${label}`;
};

const BreakpointsGroup = ({ options }: { options: BreakpointOption[] }) => {
  return (
    <CommandGroup
      heading={<CommandGroupHeading>Breakpoints</CommandGroupHeading>}
    >
      {options.map(({ breakpoint, shortcut }) => (
        <CommandItem
          key={breakpoint.id}
          onSelect={() => {
            closeCommandPanel({ restoreFocus: true });
            $selectedBreakpointId.set(breakpoint.id);
            setCanvasWidth(breakpoint.id);
          }}
        >
          <CommandIcon></CommandIcon>
          <Text variant="labelsTitleCase">
            {getBreakpointLabel(breakpoint)}
          </Text>
          <Kbd value={[shortcut]} />
        </CommandItem>
      ))}
    </CommandGroup>
  );
};

type PageOption = {
  tokens: string[];
  type: "page";
  page: Page;
};

const $pageOptions = computed(
  [$pages, $selectedPage],
  (pages, selectedPage) => {
    const pageOptions: PageOption[] = [];
    if (pages) {
      for (const page of [pages.homePage, ...pages.pages]) {
        if (page.id === selectedPage?.id) {
          continue;
        }
        pageOptions.push({
          tokens: ["pages", page.name],
          type: "page",
          page,
        });
      }
    }
    return pageOptions;
  }
);

const PagesGroup = ({ options }: { options: PageOption[] }) => {
  return (
    <CommandGroup heading={<CommandGroupHeading>Pages</CommandGroupHeading>}>
      {options.map(({ page }) => (
        <CommandItem
          key={page.id}
          onSelect={() => {
            closeCommandPanel();
            selectPage(page.id);
          }}
        >
          <CommandIcon></CommandIcon>
          <Text variant="labelsTitleCase">{page.name}</Text>
        </CommandItem>
      ))}
    </CommandGroup>
  );
};

const $options = computed(
  [$componentOptions, $breakpointOptions, $pageOptions],
  (componentOptions, breakpointOptions, pageOptions) => [
    ...componentOptions,
    ...breakpointOptions,
    ...pageOptions,
  ]
);

const CommandDialogContent = () => {
  const [search, setSearch] = useState("");
  const options = useStore($options);
  let matches = options;
  for (const word of search.trim().split(/\s+/)) {
    matches = matchSorter(matches, word, {
      keys: ["tokens"],
    });
  }
  const groups = mapGroupBy(matches, (match) => match.type);
  return (
    <Command shouldFilter={false}>
      <CommandInput value={search} onValueChange={setSearch} />
      <Flex direction="column" css={{ maxHeight: 300 }}>
        <ScrollArea>
          <CommandList>
            {Array.from(groups).map(([group, matches]) => {
              if (group === "component") {
                return (
                  <ComponentsGroup
                    key={group}
                    options={matches as ComponentOption[]}
                  />
                );
              }
              if (group === "breakpoint") {
                return (
                  <BreakpointsGroup
                    key={group}
                    options={matches as BreakpointOption[]}
                  />
                );
              }
              if (group === "page") {
                return (
                  <PagesGroup key={group} options={matches as PageOption[]} />
                );
              }
            })}
          </CommandList>
        </ScrollArea>
      </Flex>
    </Command>
  );
};

export const CommandPanel = () => {
  const isOpen = useStore($commandPanel) !== undefined;
  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={() => closeCommandPanel({ restoreFocus: true })}
    >
      <CommandDialogContent />
    </CommandDialog>
  );
};
