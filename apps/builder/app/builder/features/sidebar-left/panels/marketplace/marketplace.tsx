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
import type { MarketplaceProduct } from "./types";
import { categories, useActiveProduct, products } from "./utils";

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

const productsByCategory = new Map<
  MarketplaceProduct["category"],
  Array<MarketplaceProduct>
>(getProductsByCategory(products));

const focusOutline = focusRingStyle();

const Product = ({ product, ...props }: { product: MarketplaceProduct }) => {
  return (
    <Flex
      {...props}
      gap="2"
      css={{
        position: "relative",
        height: theme.spacing[13],
        px: theme.spacing[9],
        outline: "none",
        "&:focus-visible": focusOutline,
        "&:hover": focusOutline,
      }}
      align="center"
    >
      <img
        src={`${new URL(product.url).origin}/favicon.ico`}
        style={{ width: rawTheme.spacing[11], height: rawTheme.spacing[11] }}
        aria-disabled
      />
      <Text variant="labelsSentenceCase">{product.label}</Text>
    </Flex>
  );
};

export const Marketplace = () => {
  const [, setActiveProduct] = useActiveProduct();

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
                        setActiveProduct(product.id);
                      }}
                    >
                      <Product product={product} />
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
