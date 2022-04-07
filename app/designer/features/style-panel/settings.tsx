import { useState } from "react";
import hyphenate from "hyphenate-style-name";
import { categories, type Category, type Style } from "@webstudio-is/sdk";
import { Box, Flex, Collapsible, Button } from "~/shared/design-system";
import { TriangleRightIcon, TriangleDownIcon } from "~/shared/icons";
import { styleConfigs, type StyleConfig } from "~/shared/style-panel-configs";
import { CollapsibleSection } from "~/designer/shared/inspector";
import { renderProperty } from "./render-property";
import { dependencies } from "./dependencies";
import { type InheritedStyle } from "./get-inherited-style";
import { type SetProperty } from "./use-style-data";
import { type SelectedInstanceData } from "~/shared/component";

// Finds a property/value by using any available form: property, label, value
const filterProperties = (properties: Array<string>, search: string) => {
  const includes = (property: string) => {
    if (property.toLowerCase().includes(search)) return true;
    if (hyphenate(property).includes(search)) return true;
    return false;
  };
  return properties.filter((property) => {
    for (const styleConfig of styleConfigs) {
      if (styleConfig.property !== property) continue;
      if (includes(styleConfig.property)) return true;
      if (includes(styleConfig.label)) return true;
      for (const item of styleConfig.items) {
        if (
          item.name.includes(search) ||
          item.label.toLowerCase().includes(search)
        ) {
          return true;
        }
      }
    }
    return false;
  });
};

const appliesTo = (styleConfig: StyleConfig, currentStyle: Style): boolean => {
  const { appliesTo } = styleConfig;
  if (appliesTo in dependencies) {
    const dependency = dependencies[appliesTo];
    if (dependency === undefined) return false;
    const currentValue = currentStyle[dependency.property]?.value;
    if (currentValue === undefined) return false;
    if (Array.isArray(dependency.values))
      return dependency.values.includes(String(currentValue));
    if (Array.isArray(dependency.notValues))
      return dependency.notValues.includes(String(currentValue)) === false;
  }

  return true;
};

const didRender = (category: Category, { property }: StyleConfig): boolean => {
  // We only want to render the first thing in spacing since the widget will be the way to set all margin and padding
  if (category === "spacing" && property !== categories.spacing.properties[0]) {
    return true;
  }
  return false;
};

const ShowMore = ({ styleConfigs }: { styleConfigs: Array<JSX.Element> }) => {
  const [isOpen, setIsOpen] = useState(false);
  if (styleConfigs.length === 0) return null;
  return (
    <Collapsible.Root asChild onOpenChange={setIsOpen}>
      <Flex direction="column" gap="3">
        <Collapsible.Trigger asChild>
          <Button css={{ width: "100%", gap: "$1" }}>
            {isOpen ? <TriangleDownIcon /> : <TriangleRightIcon />}Show more
          </Button>
        </Collapsible.Trigger>
        <Collapsible.Content asChild>
          <Flex direction="column" gap="3">
            {styleConfigs}
          </Flex>
        </Collapsible.Content>
      </Flex>
    </Collapsible.Root>
  );
};

type VisualSettingsProps = {
  currentStyle: Style;
  inheritedStyle: InheritedStyle;
  setProperty: SetProperty;
  selectedInstanceData: SelectedInstanceData;
  search: string;
};

export const VisualSettings = ({
  currentStyle,
  search,
  ...rest
}: VisualSettingsProps) => {
  const all = [];
  let category: Category;
  for (category in categories) {
    // @todo seems like properties are the exact strings and styleConfig.property is not?
    const categoryProperties = filterProperties(
      categories[category].properties as unknown as Array<string>,
      search
    );
    const { moreFrom } = categories[category];
    const styleConfigsByCategory: Array<JSX.Element> = [];
    const moreStyleConfigsByCategory: Array<JSX.Element> = [];

    for (const styleConfig of styleConfigs) {
      const isInCategory = categoryProperties.includes(styleConfig.property);
      // We don't want to filter out inapplicable styles if user wants to apply them anyway
      const isApplicable =
        search.length === 0 ? appliesTo(styleConfig, currentStyle) : true;
      const isRendered = didRender(category, styleConfig);

      if (isInCategory && isApplicable && isRendered === false) {
        const element = renderProperty({
          ...rest,
          currentStyle,
          styleConfig,
          category,
        });

        // We are making a separate array of properties which come after the "moreFrom"
        // so we can make them collapsable
        if (
          styleConfig.property === moreFrom ||
          moreStyleConfigsByCategory.length !== 0
        ) {
          moreStyleConfigsByCategory.push(element);
          continue;
        }

        styleConfigsByCategory.push(element);
      }
    }

    if (styleConfigsByCategory.length === 0) continue;

    all.push(
      <CollapsibleSection
        isOpen={search.length === 0 ? undefined : true}
        label={categories[category].label}
        key={category}
      >
        <>
          {styleConfigsByCategory}
          <ShowMore styleConfigs={moreStyleConfigsByCategory} />
        </>
      </CollapsibleSection>
    );
  }
  return <Box css={{ overflow: "auto" }}>{all}</Box>;
};
