import { BoxIcon } from "@webstudio-is/icons";
import {
  Flex,
  List,
  ListItem,
  ScrollArea,
  Text,
  focusRingStyle,
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

const Product = ({ meta, ...props }: { meta: MarketplaceProduct }) => {
  return (
    <Flex
      {...props}
      gap="1"
      css={{
        position: "relative",
        height: theme.spacing[13],
        px: theme.spacing[9],
        outline: "none",
        "&:focus-visible": focusRingStyle,
        "&:hover": focusRingStyle,
      }}
      align="center"
    >
      <MetaIcon icon={meta.icon} />
      <Text>{meta.label}</Text>
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
                {products.map((meta: MarketplaceProduct) => {
                  return (
                    <ListItem
                      asChild
                      key={meta.id}
                      onSelect={() => {
                        setActiveProduct(meta.id);
                      }}
                    >
                      <Product meta={meta} />
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
