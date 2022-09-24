import { Asset } from "@webstudio-is/asset-uploader";
import {
  Flex,
  Box,
  Combobox,
  ComboboxListboxItem,
  TextField,
} from "@webstudio-is/design-system";
import { AssetUpload, PreviewAsset, useAssets } from "~/designer/shared/assets";
import { SYSTEM_FONTS } from "@webstudio-is/fonts";

const getItems = (assets: Array<Asset | PreviewAsset>) => {
  const system = SYSTEM_FONTS.map((item) => ({ label: item.family }));
  // We can have 2+ assets with the same family name, so we use a map to dedupe.
  const uploaded = new Map();
  for (const asset of assets) {
    if ("meta" in asset && "family" in asset.meta) {
      uploaded.set(asset.meta.family, { label: asset.meta.family });
    }
  }
  return [...system, ...uploaded.values()];
};

type FontsManagerProps = {
  value: string;
  onChange: (value: string) => void;
};

export const FontsManager = ({ value, onChange }: FontsManagerProps) => {
  const { assets, onSubmitAssets, onActionData } = useAssets("font");
  const items = getItems(assets);

  return (
    <Flex
      gap="3"
      direction="column"
      css={{ padding: "$1", paddingTop: "$2", height: 460, overflow: "hidden" }}
    >
      <Box css={{ padding: "$2" }}>
        <AssetUpload
          onSubmit={onSubmitAssets}
          onActionData={onActionData}
          type="font"
        />
      </Box>

      <Combobox
        open
        name="prop"
        items={items}
        selectedItem={{ label: value }}
        onItemSelect={(value) => {
          onChange(value.label);
        }}
        renderTextField={({ inputProps: { value, ...inputProps } }) => (
          <TextField {...inputProps} placeholder="Search" />
        )}
        renderPopperContent={(props) => <>{props.children}</>}
        // @ts-expect-error need help
        renderItem={(props) => <ComboboxListboxItem {...props} />}
      />
    </Flex>
  );
};
