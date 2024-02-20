import { Button, Flex, theme } from "@webstudio-is/design-system";
import { Iframe } from "./iframe";
import type { MarketplaceProduct } from "./types";
import { ChevronLeftIcon } from "@webstudio-is/icons";

export const ProductPanel = ({
  product,
  onOpenChange,
}: {
  product: MarketplaceProduct;
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
          {product.label}
        </Button>
      </Flex>
      <Iframe src={product.url} />
    </Flex>
  );
};
