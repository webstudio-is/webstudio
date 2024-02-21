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
import type { Category, MarketplaceProduct } from "./types";
import {
  getProductsByCategory,
  categories,
  useActiveProduct,
  products,
} from "./utils";
import { MetaIcon } from "~/builder/shared/meta-icon";

const productsByCategory = new Map<Category, Array<MarketplaceProduct>>(
  getProductsByCategory(products)
);

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
      <MetaIcon icon={product.icon} size={rawTheme.spacing[11]} />
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
                {products.map((product: MarketplaceProduct) => {
                  return (
                    <ListItem
                      asChild
                      key={product.id}
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
