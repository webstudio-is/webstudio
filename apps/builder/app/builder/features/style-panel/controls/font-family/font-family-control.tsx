import {
  Combobox,
  EnhancedTooltip,
  Flex,
  NestedInputButton,
} from "@webstudio-is/design-system";
import { FontsManager } from "~/builder/shared/fonts-manager";
import type { ControlProps } from "../types";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { forwardRef, useMemo, useState, type ComponentProps } from "react";
import { toValue } from "@webstudio-is/css-engine";
import { matchSorter } from "match-sorter";
import { useAssets } from "~/builder/shared/assets";
import { toItems } from "~/builder/shared/fonts-manager/item-utils";
import { ChevronLeftIcon } from "@webstudio-is/icons";

type Item = { value: string; label?: string };

const matchOrSuggestToCreate = (
  search: string,
  items: Array<Item>,
  itemToString: (item: Item) => string
): Array<Item> => {
  const matched = matchSorter(items, search, {
    keys: [itemToString],
  });

  if (
    search.trim() !== "" &&
    itemToString(matched[0]).toLocaleLowerCase() !==
      search.toLocaleLowerCase().trim()
  ) {
    matched.unshift({
      value: search.trim(),
      label: `Custom: "${search.trim()}"`,
    });
  }
  return matched;
};

const itemToString = (item?: Item | null) => item?.label ?? item?.value ?? "";

export const FontFamilyControl = ({
  property,
  currentStyle,
  setProperty,
}: ControlProps) => {
  const value = currentStyle[property]?.value;
  const setValue = setProperty(property);
  const [intermediateValue, setIntermediateValue] = useState<
    string | undefined
  >();
  const { assetContainers } = useAssets("font");
  const items = useMemo(
    () => toItems(assetContainers).map(({ label }) => ({ value: label })),
    [assetContainers]
  );

  const itemValue = useMemo(() => {
    // Replacing the quotes just to make it look cleaner in the UI
    return toValue(value, (value) => value).replace(/"/g, "");
  }, [value]);

  return (
    <Flex>
      <Combobox<Item>
        suffix={
          <FloatingPanel
            title="Fonts"
            content={
              <FontsManager
                value={toValue(value)}
                onChange={(newValue) => {
                  setValue({ type: "fontFamily", value: [newValue] });
                }}
              />
            }
          >
            <FontsManagerButton />
          </FloatingPanel>
        }
        defaultHighlightedIndex={0}
        items={items}
        itemToString={itemToString}
        onItemHighlight={(item) => {
          const value = item === null ? itemValue : itemToString(item);
          setValue(
            { type: "fontFamily", value: [value] },
            { isEphemeral: true }
          );
        }}
        onItemSelect={(item) => {
          const value = itemToString(item);
          setValue({ type: "fontFamily", value: [value] });
          setIntermediateValue(undefined);
        }}
        value={{ value: intermediateValue ?? itemValue }}
        onInputChange={(value) => {
          setIntermediateValue(value);
        }}
        match={matchOrSuggestToCreate}
      />
    </Flex>
  );
};

const FontsManagerButton = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof NestedInputButton>
>((props, ref) => {
  return (
    <Flex>
      <EnhancedTooltip content="Open Font Manager">
        <NestedInputButton {...props} ref={ref} tabIndex={-1}>
          <ChevronLeftIcon />
        </NestedInputButton>
      </EnhancedTooltip>
    </Flex>
  );
});
FontsManagerButton.displayName = "FontsManagerButton";
