import { useMemo } from "react";
import { useStore } from "@nanostores/react";
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
import { $products, categories } from "./utils";
import type { MarketplaceProduct } from "./schema";
import { LoadingDotsIcon } from "@webstudio-is/icons";

const getProductsByCategory = (products: Array<MarketplaceProduct>) => {
  const productsByCategory = new Map<
    MarketplaceProduct["category"],
    Array<MarketplaceProduct>
  >();

  for (const product of products) {
    if (
      categories.some((category) => category.category === product.category) ===
      false
    ) {
      throw new Error(`Unknown category: ${product.category}`);
    }
    let categoryItems = productsByCategory.get(product.category);
    if (categoryItems === undefined) {
      categoryItems = [];
      productsByCategory.set(product.category, categoryItems);
    }
    categoryItems.push(product);
  }
  return productsByCategory;
};

const focusOutline = focusRingStyle();

const Product = ({
  product,
  isLoading,
  ...props
}: {
  product: MarketplaceProduct;
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
        <img
          src={`${new URL(product.publishedUrl).origin}/favicon.ico`}
          style={{ width: rawTheme.spacing[11], height: rawTheme.spacing[11] }}
          aria-disabled
        />
        <Text variant="labelsSentenceCase" truncate>
          {product.label}
        </Text>
      </Flex>
      {isLoading && <LoadingDotsIcon style={{ flexShrink: 0 }} />}
    </Flex>
  );
};

export const Marketplace = ({
  activeProduct,
  onSelect,
}: {
  activeProduct?: MarketplaceProduct;
  onSelect: (product: MarketplaceProduct) => void;
}) => {
  const products = useStore($products);
  const productsByCategory = useMemo(
    () => new Map(getProductsByCategory(products)),
    [products]
  );
  return (
    <ScrollArea>
      {categories.map(({ category, label }) => {
        const products = productsByCategory.get(category);
        if (products === undefined || products.length === 0) {
          return;
        }
        return (
          <CollapsibleSection label={label} key={category} fullWidth>
            <List asChild>
              <Flex direction="column">
                {products.map((product: MarketplaceProduct, index) => {
                  return (
                    <ListItem
                      asChild
                      key={product.id}
                      index={index}
                      onSelect={() => {
                        onSelect(product);
                      }}
                    >
                      <Product
                        product={product}
                        isLoading={product.id === activeProduct?.id}
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
