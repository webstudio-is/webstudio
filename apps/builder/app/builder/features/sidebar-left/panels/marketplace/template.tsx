import {
  Button,
  Flex,
  List,
  ListItem,
  ScrollArea,
  Separator,
  Text,
  theme,
  focusRingStyle,
} from "@webstudio-is/design-system";
import type { MarketplaceProduct } from "./types";
import { ChevronLeftIcon } from "@webstudio-is/icons";
import { useStore } from "@nanostores/react";
import { $activeProductData } from "./utils";
import { computeExpression } from "~/shared/nano-states";
import { $pageRootScope } from "../pages/page-utils";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";
import type { Page } from "@webstudio-is/sdk";

const focusOutline = focusRingStyle();

const Template = ({ page, ...listItemProps }: { page: Page }) => {
  // @todo use variables from the template project
  const { variableValues } = useStore($pageRootScope);
  let socialImageUrl;

  if (page.meta.socialImageUrl) {
    socialImageUrl = String(
      computeExpression(page.meta.socialImageUrl, variableValues)
    );
  }

  //const socialImageAsset = page.meta.socialImageAssetId
  //  ? activeProductData.assets.get(page.meta.socialImageAssetId)
  //  : undefined;

  const title = String(computeExpression(page.title, variableValues));
  return (
    <Flex
      {...listItemProps}
      direction="column"
      css={{
        px: theme.spacing[5],
        py: theme.spacing[5],
        position: "relative",
        outline: "none",
        "&:hover": focusOutline,
        "&:focus-visible": focusOutline,
      }}
      gap="1"
    >
      <img src={socialImageUrl} />
      <Text truncate>{title}</Text>
    </Flex>
  );
};

export const Templates = ({
  product,
  onOpenChange,
}: {
  product: MarketplaceProduct;
  onOpenChange: (isOpen: boolean) => void;
}) => {
  const activeProductData = useStore($activeProductData);
  if (activeProductData === undefined) {
    return;
  }
  return (
    <Flex direction="column" css={{ height: "100%" }}>
      <Flex align="center" css={{ py: theme.spacing[5], px: theme.spacing[5] }}>
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
      <Separator />
      <ScrollArea>
        <CollapsibleSection label={"Test"} key={"Test"} fullWidth>
          <List asChild>
            <Flex direction="column">
              {activeProductData.pages.pages.map((page, index) => {
                return (
                  <ListItem
                    asChild
                    key={page.id}
                    index={index}
                    onSelect={() => {
                      //setActiveProduct(product.id);
                    }}
                  >
                    <Template page={page} />
                  </ListItem>
                );
              })}
            </Flex>
          </List>
        </CollapsibleSection>
      </ScrollArea>
    </Flex>
  );
};
