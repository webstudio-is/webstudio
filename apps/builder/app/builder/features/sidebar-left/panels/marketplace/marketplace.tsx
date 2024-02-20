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
import { usePress } from "@react-aria/interactions";
import type { Category, MarketplaceProduct } from "./types";
import { getItemsByCategory, categories, useActiveItem, items } from "./utils";

const itemsByCategory = new Map<Category, Array<MarketplaceProduct>>(
  getItemsByCategory(items)
);

export const Marketplace = () => {
  const [, setActiveItem] = useActiveItem();
  const { pressProps } = usePress({
    onPress(event) {
      const target = event.target as HTMLElement;
      setActiveItem(target.dataset.id);
    },
  });

  return (
    <ScrollArea>
      {categories.map(({ category, label }) => (
        <CollapsibleSection label={label} key={category} fullWidth>
          <List asChild>
            <Flex direction="column">
              {(itemsByCategory.get(category) ?? []).map(
                (meta: MarketplaceProduct, index) => {
                  return (
                    <ListItem asChild key={meta.id}>
                      <Flex
                        {...pressProps}
                        tabIndex={index === 0 ? 0 : -1}
                        gap="1"
                        data-id={meta.id}
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
                    </ListItem>
                  );
                }
              )}
            </Flex>
          </List>
        </CollapsibleSection>
      ))}
    </ScrollArea>
  );
};
