import { type ComponentProps } from "react";
import type { AssetType } from "@webstudio-is/asset-uploader";
import { Flex, SearchField } from "@webstudio-is/design-system";
import { AssetUpload } from "./asset-upload";
import { NotFound } from "./not-found";
import { Separator } from "./separator";

type AssetsShellProps = {
  searchProps: ComponentProps<typeof SearchField>;
  children: JSX.Element;
  type: AssetType;
  isEmpty: boolean;
};

export const AssetsShell = ({
  searchProps,
  isEmpty,
  children,
  type,
}: AssetsShellProps) => {
  return (
    <Flex
      direction="column"
      css={{ overflow: "hidden", paddingTop: "$1", paddingBottom: "$3" }}
    >
      <Flex css={{ py: "$2", px: "$3" }} gap="2" direction="column">
        <AssetUpload type={type} />
        <SearchField {...searchProps} autoFocus placeholder="Search" />
      </Flex>
      <Separator />
      {isEmpty && <NotFound />}
      <Flex
        css={{
          flexDirection: "column",
          gap: "$3",
          px: "$3",
        }}
      >
        {children}
      </Flex>
    </Flex>
  );
};
