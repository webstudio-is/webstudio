import { useMemo } from "react";
import {
  Flex,
  List,
  ListItem,
  ScrollArea,
  Text,
  focusRingStyle,
  rawTheme,
  theme,
} from "@webstudio-is/design-system";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";
import { categories } from "./utils";
import { LoadingDotsIcon } from "@webstudio-is/icons";
import env from "~/shared/env";
import { Image, createImageLoader } from "@webstudio-is/image";
import type { MarketplaceOverviewItem } from "~/shared/marketplace/types";
import type { Project } from "@webstudio-is/project";

const getItemsByCategory = (items: Array<MarketplaceOverviewItem> = []) => {
  const itemsByCategory = new Map<
    MarketplaceOverviewItem["category"],
    Array<MarketplaceOverviewItem>
  >();

  for (const product of items) {
    if (
      categories.some((category) => category.category === product.category) ===
      false
    ) {
      throw new Error(`Unknown category: ${product.category}`);
    }
    let categoryItems = itemsByCategory.get(product.category);
    if (categoryItems === undefined) {
      categoryItems = [];
      itemsByCategory.set(product.category, categoryItems);
    }
    categoryItems.push(product);
  }
  return itemsByCategory;
};

const focusOutline = focusRingStyle();

const imageLoader = createImageLoader({
  imageBaseUrl: env.IMAGE_BASE_URL,
});

const Product = ({
  item,
  isLoading,
  ...props
}: {
  item: MarketplaceOverviewItem;
  isLoading: boolean;
}) => {
  return (
    <Flex
      {...props}
      css={{
        position: "relative",
        height: theme.spacing[13],
        px: theme.spacing[9],
        outline: "none",
        "&:focus-visible": focusOutline,
        "&:hover": focusOutline,
      }}
      align="center"
      justify="between"
    >
      <Flex align="center" gap="2">
        <Image
          src={item.thumbnailAssetName}
          loader={imageLoader}
          width={rawTheme.spacing[11]}
          height={rawTheme.spacing[11]}
          aria-disabled
        />
        <Text variant="labelsSentenceCase" truncate>
          {item.name}
        </Text>
      </Flex>
      {isLoading && <LoadingDotsIcon style={{ flexShrink: 0 }} />}
    </Flex>
  );
};

export const Marketplace = ({
  activeProjectId,
  items,
  onSelect,
}: {
  activeProjectId?: Project["id"];
  items?: Array<MarketplaceOverviewItem>;
  onSelect: (item: MarketplaceOverviewItem) => void;
}) => {
  const itemsByCategory = useMemo(() => getItemsByCategory(items), [items]);

  return (
    <ScrollArea>
      {categories.map(({ category, label }) => {
        const items = itemsByCategory.get(category);
        if (items === undefined || items.length === 0) {
          return;
        }
        return (
          <CollapsibleSection label={label} key={category} fullWidth>
            <List asChild>
              <Flex direction="column">
                {items.map((item, index) => {
                  return (
                    <ListItem
                      asChild
                      key={item.projectId}
                      index={index}
                      onSelect={() => {
                        onSelect(item);
                      }}
                    >
                      <Product
                        item={item}
                        isLoading={item.projectId === activeProjectId}
                      />
                    </ListItem>
                  );
                })}
              </Flex>
            </List>
          </CollapsibleSection>
        );
      })}
    </ScrollArea>
  );
};
