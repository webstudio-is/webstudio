import { Fragment, useState, type KeyboardEvent } from "react";
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
  DropdownMenuTrigger,
  Flex,
  InputField,
  ScrollArea,
  Text,
  theme,
} from "@webstudio-is/design-system";
import { CheckMarkIcon, ChevronDownIcon, DotIcon } from "@webstudio-is/icons";
import { validateSelector } from "@webstudio-is/css-data";
import {
  $registeredComponentMetas,
  $selectedInstance,
  $selectedInstanceStatesByStyleSourceId,
  $selectedOrLastStyleSourceSelector,
  $selectedStyleState,
} from "~/shared/nano-states";
import { $styleSourceSelections, $styles } from "~/shared/sync/data-stores";
import { $instanceTags } from "./shared/model";
import {
  filterStyleConditions,
  getApplicableStyleConditions,
  getDefaultStyleConditions,
  getStyledSelectors,
  styleConditionGroups,
  type StyleCondition,
} from "./style-condition";

const $styleConditions = computed(
  [
    $selectedInstance,
    $registeredComponentMetas,
    $instanceTags,
    $styles,
    $styleSourceSelections,
    $selectedStyleState,
  ],
  (instance, metas, instanceTags, styles, styleSourceSelections, state) => {
    if (instance === undefined) {
      return { defaultConditions: [], applicableConditions: [] };
    }
    const componentStates = metas.get(instance.component)?.states ?? [];
    return {
      defaultConditions: getDefaultStyleConditions({
        styledSelectors: getStyledSelectors({
          instanceStyleSourceIds: new Set(
            styleSourceSelections.get(instance.id)?.values
          ),
          styles: styles.values(),
        }),
        selectedState: state,
        componentStates,
      }),
      applicableConditions: getApplicableStyleConditions({
        tag: instanceTags.get(instance.id),
        componentStates,
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

// arrows, Tab and Escape still move through and close the menu
const keepTypingInSearch = (event: KeyboardEvent) => {
  if (["ArrowDown", "ArrowUp", "Escape", "Tab"].includes(event.key) === false) {
    event.stopPropagation();
  }
};

/**
 * Always visible in the Style panel and independent of Local and tokens:
 * the condition decides when declarations apply, the style source decides
 * where they are saved.
 */
export const StyleConditionSelect = () => {
  const { defaultConditions, applicableConditions } =
    useStore($styleConditions);
  const selectedState = useStore($selectedStyleState);
  const selectedSource = useStore($selectedOrLastStyleSourceSelector);
  const statesBySource = useStore($selectedInstanceStatesByStyleSourceId);
  const [open, setOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [query, setQuery] = useState("");
  const styledStates = new Set(
    statesBySource.get(selectedSource?.styleSourceId ?? "") ?? []
  );
  const isActive = selectedState !== undefined && selectedState.trim() !== "";

  const select = (selector: undefined | string) => {
    $selectedStyleState.set(selector);
    setOpen(false);
  };

  const results = filterStyleConditions(applicableConditions, query);
  const customSelector = query.trim();
  const canUseCustomSelector =
    customSelector !== "" &&
    results.some((condition) => condition.selector === customSelector) ===
      false &&
    validateSelector(customSelector).success;

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
          setIsSearching(false);
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
        <DropdownMenuContent
          onCloseAutoFocus={(event) => event.preventDefault()}
          css={{ width: theme.spacing[30] }}
        >
          {isSearching ? (
            <>
              <Flex css={{ padding: theme.spacing[3] }}>
                <InputField
                  autoFocus
                  css={{ flexGrow: 1 }}
                  placeholder=":hover, [data-state], ::before"
                  aria-label="Search conditions"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    keepTypingInSearch(event);
                    if (event.key === "Enter") {
                      const match = results[0]?.selector;
                      if (canUseCustomSelector) {
                        select(customSelector);
                      } else if (match !== undefined) {
                        select(match);
                      }
                    }
                  }}
                />
              </Flex>
              <ScrollArea css={{ maxHeight: theme.spacing[34] }}>
                {canUseCustomSelector && (
                  <>
                    <DropdownMenuLabel>Custom selector</DropdownMenuLabel>
                    {renderItem({ type: "custom", selector: customSelector })}
                  </>
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
              </ScrollArea>
            </>
          ) : (
            <>
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
              <DropdownMenuItem
                withIndicator={true}
                onSelect={(event) => {
                  // stay open and switch to search
                  event.preventDefault();
                  setIsSearching(true);
                }}
              >
                More…
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </Flex>
  );
};
