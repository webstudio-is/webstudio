import { atom, computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { useState } from "react";
import { matchSorter } from "match-sorter";
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
  useSelectedAction,
  ScrollArea,
  Flex,
  Kbd,
  Text,
  CommandFooter,
  Separator,
} from "@webstudio-is/design-system";
import { compareMedia } from "@webstudio-is/css-engine";
import { componentCategories, collectionComponent } from "@webstudio-is/sdk";
import type { Breakpoint, Page } from "@webstudio-is/sdk";
import type { TemplateMeta } from "@webstudio-is/template";
import {
  $breakpoints,
  $editingPageId,
  $pages,
  $registeredComponentMetas,
  $registeredTemplates,
  $selectedBreakpoint,
  $selectedBreakpointId,
} from "~/shared/nano-states";
import {
  findClosestInsertable,
  getComponentTemplateData,
  getInstanceLabel,
  insertWebstudioFragmentAt,
} from "~/shared/instance-utils";
import { humanizeString } from "~/shared/string-utils";
import { setCanvasWidth } from "~/builder/features/breakpoints";
import { $selectedPage, selectPage } from "~/shared/awareness";
import { mapGroupBy } from "~/shared/shim";
import { setActiveSidebarPanel } from "~/builder/shared/nano-states";
import { $commandMetas } from "~/shared/commands-emitter";
import { emitCommand } from "~/builder/shared/commands";

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

type ComponentOption = {
  tokens: string[];
  type: "component";
  component: string;
  label: string;
  category: TemplateMeta["category"];
  icon: string;
  order: undefined | number;
};

const getComponentScore = (meta: ComponentOption) => {
  const categoryScore = componentCategories.indexOf(meta.category ?? "hidden");
  const componentScore = meta.order ?? Number.MAX_SAFE_INTEGER;
  // shift category
  return categoryScore * 1000 + componentScore;
};

const $componentOptions = computed(
  [$registeredComponentMetas, $registeredTemplates, $selectedPage],
  (metas, templates, selectedPage) => {
    const componentOptions: ComponentOption[] = [];
    for (const [name, meta] of metas) {
      const category = meta.category ?? "hidden";
      if (category === "hidden" || category === "internal") {
        continue;
      }
      // show only xml category and collection component in xml documents
      if (selectedPage?.meta.documentType === "xml") {
        if (category !== "xml" && name !== collectionComponent) {
          continue;
        }
      } else {
        // show everything except xml category in html documents
        if (category === "xml") {
          continue;
        }
      }
      const label = getInstanceLabel({ component: name }, meta);
      componentOptions.push({
        tokens: ["components", label, category],
        type: "component",
        component: name,
        label,
        category,
        icon: meta.icon,
        order: meta.order,
      });
    }
    for (const [name, meta] of templates) {
      if (meta.category === "hidden" || meta.category === "internal") {
        continue;
      }
      const componentMeta = metas.get(name);
      const label =
        meta.label ??
        componentMeta?.label ??
        getInstanceLabel({ component: name }, meta);
      componentOptions.push({
        tokens: ["components", label, meta.category],
        type: "component",
        component: name,
        label,
        category: meta.category,
        icon: meta.icon ?? componentMeta?.icon ?? "",
        order: meta.order,
      });
    }
    componentOptions.sort(
      (leftOption, rightOption) =>
        getComponentScore(leftOption) - getComponentScore(rightOption)
    );
    return componentOptions;
  }
);

const ComponentOptionsGroup = ({ options }: { options: ComponentOption[] }) => {
  return (
    <CommandGroup
      name="component"
      heading={<CommandGroupHeading>Components</CommandGroupHeading>}
      actions={["add"]}
    >
      {options.map(({ component, label, category, icon }) => {
        return (
          <CommandItem
            key={component}
            // preserve selected state when rerender
            value={component}
            onSelect={() => {
              closeCommandPanel();
              const fragment = getComponentTemplateData(component);
              if (fragment) {
                const insertable = findClosestInsertable(fragment);
                if (insertable) {
                  insertWebstudioFragmentAt(fragment, insertable);
                }
              }
            }}
          >
            <Flex gap={2}>
              <CommandIcon
                dangerouslySetInnerHTML={{ __html: icon }}
              ></CommandIcon>
              <Text variant="labelsTitleCase">
                {label}{" "}
                <Text as="span" color="moreSubtle">
                  {humanizeString(category)}
                </Text>
              </Text>
            </Flex>
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

const BreakpointOptionsGroup = ({
  options,
}: {
  options: BreakpointOption[];
}) => {
  return (
    <CommandGroup
      name="breakpoint"
      heading={<CommandGroupHeading>Breakpoints</CommandGroupHeading>}
      actions={["select"]}
    >
      {options.map(({ breakpoint, shortcut }) => (
        <CommandItem
          key={breakpoint.id}
          // preserve selected state when rerender
          value={breakpoint.id}
          onSelect={() => {
            closeCommandPanel({ restoreFocus: true });
            $selectedBreakpointId.set(breakpoint.id);
            setCanvasWidth(breakpoint.id);
          }}
        >
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

const PageOptionsGroup = ({ options }: { options: PageOption[] }) => {
  const action = useSelectedAction();
  return (
    <CommandGroup
      name="page"
      heading={<CommandGroupHeading>Pages</CommandGroupHeading>}
      actions={["select", "settings"]}
    >
      {options.map(({ page }) => (
        <CommandItem
          key={page.id}
          // preserve selected state when rerender
          value={page.id}
          onSelect={() => {
            closeCommandPanel();
            if (action === "select") {
              selectPage(page.id);
              setActiveSidebarPanel("auto");
              $editingPageId.set(undefined);
            }
            if (action === "settings") {
              selectPage(page.id);
              setActiveSidebarPanel("pages");
              $editingPageId.set(page.id);
            }
          }}
        >
          <Text variant="labelsTitleCase">{page.name}</Text>
        </CommandItem>
      ))}
    </CommandGroup>
  );
};

type ShortcutOption = {
  tokens: string[];
  type: "shortcut";
  name: string;
  label: string;
  keys?: string[];
};

const $shortcutOptions = computed([$commandMetas], (commandMetas) => {
  const shortcutOptions: ShortcutOption[] = [];
  for (const [name, meta] of commandMetas) {
    if (!meta.hidden) {
      const label = humanizeString(name);
      const keys = meta.defaultHotkeys?.[0]
        ?.split("+")
        .map((key) => (key === "meta" ? "cmd" : key));
      shortcutOptions.push({
        tokens: ["shortcuts", "commands", label],
        type: "shortcut",
        name,
        label,
        keys,
      });
    }
  }
  shortcutOptions.sort(
    (left, right) => (left.keys ? 0 : 1) - (right.keys ? 0 : 1)
  );
  return shortcutOptions;
});

const ShortcutOptionsGroup = ({ options }: { options: ShortcutOption[] }) => {
  return (
    <CommandGroup
      name="shortcut"
      heading={<CommandGroupHeading>Shortcuts</CommandGroupHeading>}
      actions={["execute"]}
    >
      {options.map(({ name, label, keys }) => (
        <CommandItem
          key={name}
          // preserve selected state when rerender
          value={name}
          onSelect={() => {
            closeCommandPanel();
            emitCommand(name as never);
          }}
        >
          <Text variant="labelsTitleCase">{label}</Text>
          {keys && <Kbd value={keys} />}
        </CommandItem>
      ))}
    </CommandGroup>
  );
};

const $options = computed(
  [$componentOptions, $breakpointOptions, $pageOptions, $shortcutOptions],
  (componentOptions, breakpointOptions, pageOptions, commandOptions) => [
    ...componentOptions,
    ...breakpointOptions,
    ...pageOptions,
    ...commandOptions,
  ]
);

const CommandDialogContent = () => {
  const [search, setSearch] = useState("");
  const options = useStore($options);
  let matches = options;
  // prevent searching when value is empty
  // to preserve original items order
  if (search.trim().length > 0) {
    for (const word of search.trim().split(/\s+/)) {
      matches = matchSorter(matches, word, {
        keys: ["tokens"],
      });
    }
  }
  const groups = mapGroupBy(matches, (match) => match.type);
  return (
    <>
      <CommandInput value={search} onValueChange={setSearch} />
      <Flex direction="column" css={{ maxHeight: 300 }}>
        <ScrollArea>
          <CommandList>
            {Array.from(groups).map(([group, matches]) => {
              if (group === "component") {
                return (
                  <ComponentOptionsGroup
                    key={group}
                    options={matches as ComponentOption[]}
                  />
                );
              }
              if (group === "breakpoint") {
                return (
                  <BreakpointOptionsGroup
                    key={group}
                    options={matches as BreakpointOption[]}
                  />
                );
              }
              if (group === "page") {
                return (
                  <PageOptionsGroup
                    key={group}
                    options={matches as PageOption[]}
                  />
                );
              }
              if (group === "shortcut") {
                return (
                  <ShortcutOptionsGroup
                    key={group}
                    options={matches as ShortcutOption[]}
                  />
                );
              }
              group satisfies never;
            })}
          </CommandList>
        </ScrollArea>
      </Flex>
      <Separator />
      <CommandFooter />
    </>
  );
};

export const CommandPanel = () => {
  const isOpen = useStore($commandPanel) !== undefined;
  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={() => closeCommandPanel({ restoreFocus: true })}
    >
      <Command shouldFilter={false}>
        <CommandDialogContent />
      </Command>
    </CommandDialog>
  );
};
