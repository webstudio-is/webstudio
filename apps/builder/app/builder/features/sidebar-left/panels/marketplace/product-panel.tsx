import { Button, Flex, theme } from "@webstudio-is/design-system";
import { Iframe } from "./iframe";
import type { MarketplaceStore } from "./types";
import { ChevronLeftIcon } from "@webstudio-is/icons";

export const ProductPanel = ({
  item,
  onOpenChange,
}: {
  item: MarketplaceStore;
  onOpenChange: (isOpen: boolean) => void;
}) => {
  return (
    <Flex direction="column" css={{ height: "100%" }}>
      <Flex css={{ py: theme.spacing[7], px: theme.spacing[5] }}>
        <Button
          prefix={<ChevronLeftIcon />}
          onClick={() => {
            onOpenChange(false);
          }}
          color="neutral"
        >
          Back to Overview
        </Button>
      </Flex>
      <Iframe src={item.url} />
    </Flex>
  );
};
