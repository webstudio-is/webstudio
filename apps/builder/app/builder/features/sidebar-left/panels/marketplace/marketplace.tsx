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
import { getItemsByCategory, categories, useActiveItem, items } from "./utils";

const itemsByCategory = new Map<Category, Array<MarketplaceProduct>>(
  getItemsByCategory(items)
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
      <BoxIcon />
      <Text>{meta.label}</Text>
    </Flex>
  );
};

export const Marketplace = () => {
  const [, setActiveItem] = useActiveItem();

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
                {items.map((meta: MarketplaceProduct) => {
                  return (
                    <ListItem
                      asChild
                      key={meta.id}
                      onSelect={() => {
                        setActiveItem(meta.id);
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
