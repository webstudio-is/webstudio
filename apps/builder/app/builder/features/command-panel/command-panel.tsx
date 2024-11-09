import { atom, computed } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  collectionComponent,
  componentCategories,
  WsComponentMeta,
} from "@webstudio-is/react-sdk";
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
} from "~/shared/nano-states";
import { getInstanceLabel } from "~/shared/instance-utils";
import { humanizeString } from "~/shared/string-utils";
import { setCanvasWidth } from "~/builder/features/breakpoints";
import { insert as insertComponent } from "~/builder/features/components/insert";
import { $selectedPage, selectPage } from "~/shared/awareness";

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

const $visibleMetas = computed(
  [$registeredComponentMetas, $selectedPage],
  (metas, selectedPage) => {
    const entries = Array.from(metas)
      .sort(
        ([_leftComponent, leftMeta], [_rightComponent, rightMeta]) =>
          getMetaScore(leftMeta) - getMetaScore(rightMeta)
      )
      .filter(([component, meta]) => {
        const category = meta.category ?? "hidden";
        if (category === "hidden" || category === "internal") {
          return false;
        }
        // show only xml category and collection component in xml documents
        if (selectedPage?.meta.documentType === "xml") {
          return category === "xml" || component === collectionComponent;
        }
        // show everything except xml category in html documents
        return category !== "xml";
      });
    return new Map(entries);
  }
);

const ComponentsGroup = () => {
  const metas = useStore($visibleMetas);
  return (
    <CommandGroup
      heading={<CommandGroupHeading>Components</CommandGroupHeading>}
    >
      {Array.from(metas).map(([component, meta]) => {
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
                ({humanizeString(meta.category ?? "")})
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
                closeCommandPanel({ restoreFocus: true });
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
  const selectedPage = useStore($selectedPage);
  if (pagesData === undefined) {
    return;
  }
  const pages = [pagesData.homePage, ...pagesData.pages];
  return (
    <CommandGroup heading={<CommandGroupHeading>Pages</CommandGroupHeading>}>
      {pages.map(
        (page) =>
          page.id !== selectedPage?.id && (
            <CommandItem
              key={page.id}
              keywords={["pages"]}
              onSelect={() => {
                closeCommandPanel();
                selectPage(page.id);
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
