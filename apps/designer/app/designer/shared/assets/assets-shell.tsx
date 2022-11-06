import { type ComponentProps } from "react";
import type { AssetType } from "@webstudio-is/asset-uploader";
import {
  Flex,
  SearchField,
  ToggleGroupItem,
  ToggleGroupRoot,
} from "@webstudio-is/design-system";
import { AssetUpload } from "./asset-upload";
import { NotFound } from "./not-found";
import { Separator } from "./separator";
import { ImageIcon, TextIcon } from "@webstudio-is/icons";

const AssetTypeToggleGroup = ({
  onValueChange,
}: {
  onValueChange?: (value: AssetType) => void;
}) => {
  return (
    <ToggleGroupRoot type="single" onValueChange={onValueChange}>
      <ToggleGroupItem value="all">All assets</ToggleGroupItem>
      <ToggleGroupItem value="image">
        <ImageIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="font">
        <TextIcon />
      </ToggleGroupItem>
    </ToggleGroupRoot>
  );
};

type AssetsShellProps = {
  searchProps: ComponentProps<typeof SearchField>;
  children: JSX.Element;
  type: AssetType;
  isEmpty: boolean;
  onChangeType?: (type: AssetType) => void;
};

export const AssetsShell = ({
  searchProps,
  isEmpty,
  children,
  type,
  onChangeType,
}: AssetsShellProps) => {
  return (
    <Flex
      direction="column"
      css={{ overflow: "hidden", paddingTop: "$1", paddingBottom: "$3" }}
    >
      <Flex css={{ py: "$2", px: "$3" }} gap="2" direction="column">
        <AssetUpload type={type} />
        <SearchField {...searchProps} autoFocus placeholder="Search" />
        <AssetTypeToggleGroup onValueChange={onChangeType} />
      </Flex>
      <Separator />
      {isEmpty && <NotFound />}
      <Flex
        css={{
          flexDirection: "column",
          px: "$3",
        }}
      >
        {children}
      </Flex>
    </Flex>
  );
};
