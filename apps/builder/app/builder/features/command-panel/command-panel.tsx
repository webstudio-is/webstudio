import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import { collectionComponent } from "@webstudio-is/react-sdk";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import {
  Kbd,
  Text,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandGroupHeading,
  CommandItem,
  CommandIcon,
  ScrollArea,
  Flex,
} from "@webstudio-is/design-system";
import { compareMedia } from "@webstudio-is/css-engine";
import type { Breakpoint } from "@webstudio-is/sdk";
import {
  $breakpoints,
  $pages,
  $registeredComponentMetas,
  $selectedBreakpoint,
  $selectedBreakpointId,
  $selectedPage,
  $selectedPageId,
} from "~/shared/nano-states";
import { getInstanceLabel } from "~/shared/instance-utils";
import { switchPage } from "~/shared/pages";
import { humanizeString } from "~/shared/string-utils";
import { setCanvasWidth } from "~/builder/features/breakpoints";
import { insert as insertComponent } from "~/builder/features/components/insert";

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

const ComponentsGroup = () => {
  const selectedPage = useStore($selectedPage);
  const metas = useStore($registeredComponentMetas);
  return (
    <CommandGroup
      heading={<CommandGroupHeading>Components</CommandGroupHeading>}
    >
      {Array.from(metas).map(([component, meta]) => {
        const category = meta.category ?? "hidden";
        if (category === "hidden" || category === "internal") {
          return;
        }
        if (selectedPage?.meta.documentType === "xml") {
          if (category !== "xml" && component !== collectionComponent) {
            return;
          }
        } else if (category === "xml") {
          return;
        }
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
              {getInstanceLabel({ component }, meta)}{" "}
              <Text as="span" color="moreSubtle">
                ({humanizeString(category)})
              </Text>
            </Text>
          </CommandItem>
        );
      })}
    </CommandGroup>
  );
};

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

const BreakpointsGroup = () => {
  const breakpoints = useStore($breakpoints);
  const sortedBreakpoints = Array.from(breakpoints.values()).sort(compareMedia);
  const selectedBreakpoint = useStore($selectedBreakpoint);
  return (
    <CommandGroup
      heading={<CommandGroupHeading>Breakpoints</CommandGroupHeading>}
    >
      {sortedBreakpoints.map(
        (breakpoint, index) =>
          breakpoint.id !== selectedBreakpoint?.id && (
            <CommandItem
              key={breakpoint.id}
              keywords={["Breakpoints"]}
              onSelect={() => {
                closeCommandPanel();
                $selectedBreakpointId.set(breakpoint.id);
                setCanvasWidth(breakpoint.id);
              }}
            >
              <CommandIcon></CommandIcon>
              <Text variant="labelsTitleCase">
                {getBreakpointLabel(breakpoint)}
              </Text>
              <Kbd value={[(index + 1).toString()]} />
            </CommandItem>
          )
      )}
    </CommandGroup>
  );
};

const PagesGroup = () => {
  const pagesData = useStore($pages);
  const selectedPageId = useStore($selectedPageId);
  if (pagesData === undefined) {
    return;
  }
  const pages = [pagesData.homePage, ...pagesData.pages];
  return (
    <CommandGroup heading={<CommandGroupHeading>Pages</CommandGroupHeading>}>
      {pages.map(
        (page) =>
          page.id !== selectedPageId && (
            <CommandItem
              key={page.id}
              keywords={["pages"]}
              onSelect={() => {
                closeCommandPanel();
                switchPage(page.id);
              }}
            >
              <CommandIcon></CommandIcon>
              <Text variant="labelsTitleCase">{page.name}</Text>
            </CommandItem>
          )
      )}
    </CommandGroup>
  );
};

const CommandDialogContent = () => {
  return (
    <>
      <CommandInput />
      <Flex direction="column" css={{ maxHeight: 300 }}>
        <ScrollArea>
          <CommandList>
            <ComponentsGroup />
            <BreakpointsGroup />
            <PagesGroup />
          </CommandList>
        </ScrollArea>
      </Flex>
    </>
  );
};

export const CommandPanel = () => {
  const isOpen = useStore($commandPanel) !== undefined;

  if (isOpen === false) {
    return;
  }
  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={() => closeCommandPanel({ restoreFocus: true })}
    >
      <CommandDialogContent />
    </CommandDialog>
  );
};
