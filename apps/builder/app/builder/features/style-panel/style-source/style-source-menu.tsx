import { Fragment } from "react";
import {
  Box,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Flex,
  InputErrorsTooltip,
  InputField,
  rawTheme,
  Text,
  theme,
} from "@webstudio-is/design-system";
import { CheckMarkIcon, DotIcon } from "@webstudio-is/icons";
import { validateSelector } from "@webstudio-is/css-data";
import type { ItemSource, ItemSelector } from "./style-source-control";

export type SelectorConfig = {
  type: "state" | "pseudoElement";
  selector: string;
  label: string;
  source?: "native" | "component" | "custom";
};

type IntermediateItem = {
  id: string;
  label: string;
  disabled: boolean;
  source: ItemSource;
  isAdded?: boolean;
  states: string[];
};

const categories = [
  "state",
  "pseudoElement",
] satisfies SelectorConfig["type"][];

const categoryLabels: Record<SelectorConfig["type"], string> = {
  state: "States",
  pseudoElement: "Pseudo elements",
};

type StyleSourceMenuProps = {
  selectedItemSelector: undefined | ItemSelector;
  item: IntermediateItem;
  hasStyles: boolean;
  states: SelectorConfig[];
  selectorInputValue: string;
  selectorValidation: ReturnType<typeof validateSelector>;
  onSelectorInputChange: (value: string) => void;
  onSelectorInputKeyDown: (
    event: React.KeyboardEvent,
    itemId: IntermediateItem["id"]
  ) => void;
  onSelect?: (itemSelector: ItemSelector) => void;
  onEdit?: (itemId: IntermediateItem["id"]) => void;
  onDuplicate?: (itemId: IntermediateItem["id"]) => void;
  onConvertToToken?: (itemId: IntermediateItem["id"]) => void;
  onDisable?: (itemId: IntermediateItem["id"]) => void;
  onEnable?: (itemId: IntermediateItem["id"]) => void;
  onDetach?: (itemId: IntermediateItem["id"]) => void;
  onDelete?: (itemId: IntermediateItem["id"]) => void;
  onClearStyles?: (itemId: IntermediateItem["id"]) => void;
};

export const StyleSourceMenu = (props: StyleSourceMenuProps) => {
  return (
    <>
      <DropdownMenuLabel>
        <Flex gap="1" justify="between" align="center">
          <Text css={{ fontWeight: "bold" }} truncate>
            {props.item.label}
          </Text>
          {props.hasStyles && (
            <DotIcon size="12" color={rawTheme.colors.foregroundPrimary} />
          )}
        </Flex>
      </DropdownMenuLabel>
      {props.item.source !== "local" && (
        <DropdownMenuItem onSelect={() => props.onEdit?.(props.item.id)}>
          Rename
        </DropdownMenuItem>
      )}
      {props.item.source !== "local" && (
        <DropdownMenuItem onSelect={() => props.onDuplicate?.(props.item.id)}>
          Duplicate
        </DropdownMenuItem>
      )}
      {props.item.source === "local" && (
        <DropdownMenuItem
          onSelect={() => props.onConvertToToken?.(props.item.id)}
        >
          Convert to token
        </DropdownMenuItem>
      )}
      {props.item.source === "local" && (
        <DropdownMenuItem
          destructive={true}
          onSelect={() => props.onClearStyles?.(props.item.id)}
        >
          Clear styles
        </DropdownMenuItem>
      )}
      {props.item.source !== "local" && (
        <DropdownMenuItem onSelect={() => props.onDetach?.(props.item.id)}>
          Detach
        </DropdownMenuItem>
      )}
      {props.item.source !== "local" && (
        <DropdownMenuItem
          destructive={true}
          onSelect={() => props.onDelete?.(props.item.id)}
        >
          Delete
        </DropdownMenuItem>
      )}
      {categories.map((currentCategory) => {
        const categoryStates = props.states.filter(
          ({ type }) => type === currentCategory
        );
        if (categoryStates.length === 0) {
          return;
        }
        return (
          <Fragment key={currentCategory}>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>
              {categoryLabels[currentCategory]}
            </DropdownMenuLabel>
            {categoryStates.map(({ label, selector, source }, index) => {
              const previousItem = categoryStates[index - 1];
              const showSeparator =
                index > 0 &&
                source === "component" &&
                previousItem?.source !== "component";

              return (
                <Fragment key={selector}>
                  {showSeparator && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    withIndicator={true}
                    icon={
                      props.item.id ===
                        props.selectedItemSelector?.styleSourceId &&
                      selector === props.selectedItemSelector.state && (
                        <CheckMarkIcon
                          color={
                            props.item.states.includes(selector)
                              ? rawTheme.colors.foregroundPrimary
                              : rawTheme.colors.foregroundIconMain
                          }
                          size={12}
                        />
                      )
                    }
                    onSelect={() =>
                      props.onSelect?.({
                        styleSourceId: props.item.id,
                        state:
                          props.selectedItemSelector?.state === selector
                            ? undefined
                            : selector,
                      })
                    }
                  >
                    <Flex justify="between" align="center" grow>
                      {label}
                      {props.item.states.includes(selector) && (
                        <DotIcon
                          size="12"
                          color={rawTheme.colors.foregroundPrimary}
                        />
                      )}
                    </Flex>
                  </DropdownMenuItem>
                </Fragment>
              );
            })}
          </Fragment>
        );
      })}
      <DropdownMenuSeparator />
      <DropdownMenuLabel>Custom</DropdownMenuLabel>
      <Box css={{ padding: theme.spacing[4] }}>
        <InputErrorsTooltip
          variant="wrapped"
          errors={
            props.selectorValidation.success === false
              ? [props.selectorValidation.error]
              : undefined
          }
          side="bottom"
        >
          <InputField
            value={props.selectorInputValue}
            onChange={(event) =>
              props.onSelectorInputChange(event.target.value)
            }
            onKeyDown={(event) => {
              event.stopPropagation();
              props.onSelectorInputKeyDown(event, props.item.id);
            }}
            placeholder="::before"
            autoFocus={false}
            color={
              props.selectorValidation.success === false ? "error" : undefined
            }
            css={{
              width: "100%",
              fontFamily: theme.fonts.mono,
            }}
          />
        </InputErrorsTooltip>
      </Box>
      <DropdownMenuSeparator />
      {props.item.source === "local" && (
        <DropdownMenuItem hint>
          Style instances without creating a token or override a token locally.
        </DropdownMenuItem>
      )}
      {props.item.source === "token" && (
        <DropdownMenuItem hint>
          Reuse styles across multiple instances by creating a token.
        </DropdownMenuItem>
      )}
    </>
  );
};
