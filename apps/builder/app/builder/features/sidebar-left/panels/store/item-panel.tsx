import { Button, Flex, theme } from "@webstudio-is/design-system";
import { Iframe } from "./iframe";
import type { StoreItem } from "./types";
import {
  ArrowLeftIcon,
  ChevronBigLeftIcon,
  ChevronLeftIcon,
} from "@webstudio-is/icons";

export const ItemPanel = ({
  item,
  onOpenChange,
}: {
  item: StoreItem;
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
