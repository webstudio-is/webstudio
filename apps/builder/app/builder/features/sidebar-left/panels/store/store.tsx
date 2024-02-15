import { BoxIcon } from "@webstudio-is/icons";
import {
  ArrowFocus,
  Flex,
  ScrollArea,
  Text,
  theme,
} from "@webstudio-is/design-system";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";
import { usePress } from "@react-aria/interactions";
import { $activeStoreItemId } from "~/shared/nano-states";
import type { Category, StoreItem } from "./types";
import { items } from "./items";

const categories: Array<{ category: Category; label: string }> = [
  { category: "sectionTemplates", label: "Section Templates" },
];

const itemsByCategory = new Map<Category, Array<StoreItem>>([
  ["sectionTemplates", items],
]);

export const Store = () => {
  const { pressProps } = usePress({
    onPress(event) {
      const target = event.target as HTMLElement;
      $activeStoreItemId.set(target.dataset.id);
    },
  });

  return (
    <ScrollArea>
      {categories.map(({ category, label }) => (
        <CollapsibleSection label={label} key={category} fullWidth>
          <ArrowFocus
            render={({ handleKeyDown }) => (
              <Flex
                onKeyDown={handleKeyDown}
                gap="2"
                wrap="wrap"
                css={{ px: theme.spacing[9], overflow: "auto" }}
              >
                {(itemsByCategory.get(category) ?? []).map(
                  (meta: StoreItem, index) => {
                    return (
                      <Flex
                        {...pressProps}
                        tabIndex={index === 0 ? 0 : -1}
                        gap="1"
                        key={meta.url}
                        data-id={meta.id}
                      >
                        <BoxIcon />
                        <Text>{meta.label}</Text>
                      </Flex>
                    );
                  }
                )}
              </Flex>
            )}
          />
        </CollapsibleSection>
      ))}
    </ScrollArea>
  );
};
