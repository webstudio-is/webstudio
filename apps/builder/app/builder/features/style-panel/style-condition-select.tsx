import { Fragment, useRef, useState, type KeyboardEvent } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  Button,
  cssVar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Flex,
  InputField,
  ScrollArea,
  Text,
  theme,
} from "@webstudio-is/design-system";
import { CheckMarkIcon, ChevronDownIcon, DotIcon } from "@webstudio-is/icons";
import {
  $registeredComponentMetas,
  $selectedInstance,
  $selectedInstanceStatesByStyleSourceId,
  $selectedOrLastStyleSourceSelector,
  $selectedStyleState,
} from "~/shared/nano-states";
import { $instanceTags } from "./shared/model";
import {
  filterStyleConditions,
  getDefaultStyleConditions,
  getSearchableStyleConditions,
  getStyledSelectors,
  styleConditionGroups,
  type StyleCondition,
} from "./style-condition";

const $componentStates = computed(
  [$selectedInstance, $registeredComponentMetas],
  (instance, metas) =>
    instance === undefined ? [] : (metas.get(instance.component)?.states ?? [])
);

// reuses the selected element's states-by-source index
// instead of scanning project styles again
const $styledSelectors = computed(
  $selectedInstanceStatesByStyleSourceId,
  getStyledSelectors
);

const $styleConditions = computed(
  [
    $selectedInstance,
    $instanceTags,
    $componentStates,
    $styledSelectors,
    $selectedStyleState,
  ],
  (instance, instanceTags, componentStates, styledSelectors, state) => {
    const defaultConditions = getDefaultStyleConditions({
      styledSelectors,
      selectedState: state,
      componentStates,
    });
    return {
      defaultConditions,
      searchableConditions: getSearchableStyleConditions({
        tag: instance && instanceTags.get(instance.id),
        componentStates,
        defaultConditions,
      }),
    };
  }
);

const ConditionLabel = ({
  condition,
  isStyled,
}: {
  condition: StyleCondition;
  isStyled: boolean;
}) => (
  <Flex justify="between" align="center" grow gap="2">
    <Flex gap="2" align="center" css={{ minWidth: 0 }}>
      <Text variant="labels" truncate>
        {condition.selector}
      </Text>
      {condition.description !== undefined && (
        <Text color="subtle" truncate>
          {condition.description}
        </Text>
      )}
    </Flex>
    {isStyled && <DotIcon size="12" color={cssVar("--foreground-accent")} />}
  </Flex>
);

const getMenuItems = (element: null | HTMLElement) =>
  Array.from(element?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

/**
 * Always visible in the Style panel and independent of Local and tokens:
 * the condition decides when declarations apply, the style source decides
 * where they are saved.
 *
 * It only finds and selects conditions. New states and custom selectors are
 * authored in the style source menu, where they are validated.
 */
export const StyleConditionSelect = () => {
  const { defaultConditions, searchableConditions } =
    useStore($styleConditions);
  const selectedState = useStore($selectedStyleState);
  const selectedSource = useStore($selectedOrLastStyleSourceSelector);
  const statesBySource = useStore($selectedInstanceStatesByStyleSourceId);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const styledStates = new Set(
    statesBySource.get(selectedSource?.styleSourceId ?? "") ?? []
  );
  const isActive = selectedState !== undefined && selectedState.trim() !== "";
  const results = filterStyleConditions(searchableConditions, query);

  const select = (selector: undefined | string) => {
    $selectedStyleState.set(selector);
    setOpen(false);
  };

  const handleSearchKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      // let the menu close
      return;
    }
    // keep typing and cursor keys in the input instead of
    // the menu typeahead and submenu navigation
    event.stopPropagation();
    if (event.key === "ArrowDown" || event.key === "Tab") {
      event.preventDefault();
      getMenuItems(resultsRef.current).at(0)?.focus();
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const match = results.at(0);
      if (match !== undefined) {
        select(match.selector);
      }
    }
  };

  // hovering results moves focus to them, so typing anywhere in the submenu
  // goes to the search instead of the menu typeahead
  const handleSubmenuKeyDown = (event: KeyboardEvent) => {
    if (
      event.target !== searchRef.current &&
      event.key.length === 1 &&
      event.ctrlKey === false &&
      event.metaKey === false &&
      event.altKey === false
    ) {
      event.preventDefault();
      setQuery((query) => query + event.key);
      searchRef.current?.focus();
    }
  };

  const handleResultsKeyDown = (event: KeyboardEvent) => {
    const [first] = getMenuItems(resultsRef.current);
    if (
      (event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey)) &&
      event.target === first
    ) {
      // return from the first result to the search input
      event.preventDefault();
      event.stopPropagation();
      searchRef.current?.focus();
    }
  };

  const renderItem = (condition: StyleCondition) => (
    <DropdownMenuItem
      key={condition.selector}
      withIndicator={true}
      icon={condition.selector === selectedState && <CheckMarkIcon size={12} />}
      onSelect={() => select(condition.selector)}
    >
      <ConditionLabel
        condition={condition}
        isStyled={styledStates.has(condition.selector)}
      />
    </DropdownMenuItem>
  );

  return (
    <Flex align="center" gap="2" css={{ paddingTop: theme.spacing[3] }}>
      <Text variant="labels" css={{ flexShrink: 0 }}>
        Condition
      </Text>
      <DropdownMenu
        modal
        open={open}
        onOpenChange={(open) => {
          setOpen(open);
          setQuery("");
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            color={isActive ? "primary" : "neutral"}
            suffix={<ChevronDownIcon />}
            css={{ flexGrow: 1, justifyContent: "space-between", minWidth: 0 }}
            aria-label="Style condition"
          >
            <Text truncate css={{ color: "inherit" }}>
              {isActive ? selectedState : "None"}
            </Text>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent css={{ width: theme.spacing[30] }}>
          <DropdownMenuItem
            withIndicator={true}
            icon={isActive === false && <CheckMarkIcon size={12} />}
            onSelect={() => select(undefined)}
          >
            None
          </DropdownMenuItem>
          {defaultConditions.length > 0 && <DropdownMenuSeparator />}
          {defaultConditions.map(renderItem)}
          <DropdownMenuSeparator />
          <DropdownMenuSub
            onOpenChange={(isSubOpen) => {
              if (isSubOpen) {
                // after the submenu focuses its own content
                requestAnimationFrame(() => searchRef.current?.focus());
              }
            }}
          >
            <DropdownMenuSubTrigger>More…</DropdownMenuSubTrigger>
            <DropdownMenuSubContent
              css={{ width: theme.spacing[30] }}
              onKeyDown={handleSubmenuKeyDown}
            >
              <Flex css={{ padding: theme.spacing[3] }}>
                <InputField
                  inputRef={searchRef}
                  css={{ flexGrow: 1 }}
                  placeholder="Search conditions"
                  aria-label="Search conditions"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
              </Flex>
              <ScrollArea css={{ maxHeight: theme.spacing[34] }}>
                <div ref={resultsRef} onKeyDown={handleResultsKeyDown}>
                  {results.length === 0 && (
                    <Text color="subtle" css={{ padding: theme.spacing[3] }}>
                      No matching conditions. Add states and custom selectors in
                      the style source menu.
                    </Text>
                  )}
                  {styleConditionGroups.map(({ type, label }) => {
                    const items = results.filter(
                      (condition) => condition.type === type
                    );
                    if (items.length === 0) {
                      return;
                    }
                    return (
                      <Fragment key={type}>
                        <DropdownMenuLabel>{label}</DropdownMenuLabel>
                        {items.map(renderItem)}
                      </Fragment>
                    );
                  })}
                </div>
              </ScrollArea>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </Flex>
  );
};
