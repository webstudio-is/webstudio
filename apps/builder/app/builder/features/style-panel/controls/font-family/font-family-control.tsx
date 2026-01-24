import { matchSorter } from "match-sorter";
import { forwardRef, useMemo, useState, type ComponentProps } from "react";
import {
  Combobox,
  EnhancedTooltip,
  Flex,
  NestedInputButton,
  FloatingPanel,
} from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import { UploadIcon } from "@webstudio-is/icons";
import { keywordValues, parseCssValue } from "@webstudio-is/css-data";
import { FontsManager } from "~/builder/shared/fonts-manager";
import { useAssets, AssetUpload } from "~/builder/shared/assets";
import { toItems } from "~/builder/shared/fonts-manager";
import { useComputedStyleDecl } from "../../shared/model";
import { setProperty } from "../../shared/use-style-data";

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
      label: `Custom Font: "${search.trim()}"`,
    });
  }
  return matched;
};

export const FontFamilyControl = () => {
  const fontFamily = useComputedStyleDecl("font-family");
  const value = fontFamily.cascadedValue;
  const setValue = setProperty("font-family");
  const [intermediateValue, setIntermediateValue] = useState<
    string | undefined
  >();
  const { assetContainers } = useAssets("font");
  const items = useMemo(() => {
    const fallbacks = keywordValues["font-family"];
    return [
      ...toItems(assetContainers).map(({ label }) => ({ value: label })),
      ...fallbacks.map((value) => ({ value })),
    ];
  }, [assetContainers]);
  const [isFontManagerOpen, setIsFontMangerOpen] = useState(false);

  const itemValue = useMemo(() => {
    // Replacing the quotes just to make it look cleaner in the UI
    return toValue(value, (value) => value).replace(/"/g, "");
  }, [value]);

  return (
    <Flex>
      <Combobox<Item>
        suffix={
          <FloatingPanel
            placement="left-start"
            title="Fonts"
            titleSuffix={<AssetUpload type="font" />}
            onOpenChange={setIsFontMangerOpen}
            content={
              <FontsManager
                value={value.type === "fontFamily" ? value : undefined}
                onChange={(newValue = itemValue) => {
                  setValue({ type: "fontFamily", value: [newValue] });
                }}
              />
            }
          >
            <FontsManagerButton />
          </FloatingPanel>
        }
        getItems={() => items}
        itemToString={(item) => item?.label ?? item?.value ?? ""}
        onItemHighlight={(item) => {
          if (item === null) {
            setValue(parseCssValue("font-family", itemValue), {
              isEphemeral: true,
            });
            return;
          }
          setValue(
            { type: "fontFamily", value: [item.value] },
            { isEphemeral: true }
          );
        }}
        onItemSelect={(item) => {
          setValue(parseCssValue("font-family", item.value));
          setIntermediateValue(undefined);
        }}
        value={{ value: intermediateValue ?? itemValue }}
        onChange={(value) => {
          setIntermediateValue(value);
        }}
        onBlur={() => {
          if (isFontManagerOpen) {
            return;
          }
          setValue(parseCssValue("font-family", itemValue));
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
    <EnhancedTooltip content="Open Font Manager">
      <NestedInputButton {...props} ref={ref} tabIndex={-1}>
        <UploadIcon />
      </NestedInputButton>
    </EnhancedTooltip>
  );
});
FontsManagerButton.displayName = "FontsManagerButton";
