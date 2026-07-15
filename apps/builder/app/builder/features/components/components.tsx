import { insertWebstudioComponentAt } from "~/shared/instance-utils/insert";
import { useState } from "react";
import { matchSorter } from "match-sorter";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import {
  type BuilderComponentPanelItem,
  listBuilderComponentPanelItems,
  listComponentCatalogAvailableComponents,
} from "@webstudio-is/project-build/runtime";
import {
  theme,
  Flex,
  ComponentCard,
  ScrollArea,
  List,
  ListItem,
  SearchField,
  Separator,
  useSearchFieldKeys,
  findNextListItemIndex,
  Text,
  Box,
  PanelTitle,
} from "@webstudio-is/design-system";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";
import { dragItemAttribute, useDraggable } from "./use-draggable";
import {
  $registeredComponentMetas,
  $registeredTemplates,
} from "~/shared/nano-states";
import type { Publish } from "~/shared/pubsub";
import { $selectedPage } from "~/shared/nano-states";
import {
  getInstanceLabel,
  InstanceIcon,
} from "~/builder/shared/instance-label";
import { titleCase } from "title-case";

type Meta = BuilderComponentPanelItem;

const $metas = computed(
  [$registeredComponentMetas, $registeredTemplates, $selectedPage],
  (componentMetas, templates, selectedPage) => {
    const metasByCategory = listBuilderComponentPanelItems({
      metas: componentMetas,
      templates,
      documentType: selectedPage?.meta.documentType ?? "html",
      showInternal: isFeatureEnabled("internalComponents"),
      getFallbackLabel: (component) => getInstanceLabel({ component }),
      getMetaLabel: (component) => getInstanceLabel({ component }),
      getTemplateIcon: (_component, template) => template.icon,
    });
    const availableComponents = listComponentCatalogAvailableComponents({
      metas: componentMetas,
      templates,
    });
    return { metasByCategory, availableComponents };
  }
);

type Groups = Array<{
  category: string;
  metas: Array<Meta>;
}>;

const filterAndGroupComponents = ({
  metasByCategory,
  search,
}: {
  metasByCategory: Map<string, Array<Meta>>;
  search: string;
}): Groups => {
  let groups: Groups = Array.from(metasByCategory, ([category, metas]) => ({
    category,
    metas,
  }));

  if (search.length > 0) {
    const metas = groups.map((group) => group.metas).flat();
    const matched = matchSorter(metas, search, {
      keys: ["label"],
    });
    groups = [{ category: "found", metas: matched }];
  }

  groups = groups.filter((group) => group.metas.length > 0);

  return groups;
};

const findComponentIndex = (groups: Groups, selectedComponent?: string) => {
  if (selectedComponent === undefined) {
    return { index: -1, metas: groups[0].metas };
  }

  for (const { metas } of groups) {
    const index = metas.findIndex((meta) => meta.name === selectedComponent);
    if (index === -1) {
      continue;
    }
    return { index, metas };
  }

  return { index: -1, metas: [] };
};

export const ComponentsPanel = ({
  publish,
  onClose,
}: {
  publish: Publish;
  onClose: () => void;
}) => {
  const [selectedComponent, setSelectedComponent] = useState<string>();

  const handleInsert = async (component: string) => {
    await insertWebstudioComponentAt(component);
    onClose();
  };

  const resetSelectedComponent = () => {
    setSelectedComponent(undefined);
  };

  const getSelectedComponent = () => {
    // When user didn't select a component but they have search input,
    // we want to always have the first component selected, so that user can just hit enter.
    if (selectedComponent === undefined && searchFieldProps.value) {
      return groups[0].metas[0].name;
    }
    return selectedComponent;
  };

  const searchFieldProps = useSearchFieldKeys({
    onChange: resetSelectedComponent,
    onAbort: resetSelectedComponent,
    onMove({ direction }) {
      if (direction === "current") {
        const component = getSelectedComponent();
        if (component !== undefined) {
          handleInsert(component);
        }
        return;
      }

      const { index, metas } = findComponentIndex(groups, selectedComponent);

      const nextIndex = findNextListItemIndex(index, metas.length, direction);
      const nextComponent = metas[nextIndex]?.name;
      if (nextComponent) {
        setSelectedComponent(nextComponent);
      }
    },
  });

  const { metasByCategory, availableComponents } = useStore($metas);

  const { dragCard, draggableContainerRef, isDragging } = useDraggable({
    publish,
    availableComponents,
  });

  const groups = filterAndGroupComponents({
    metasByCategory,
    search: searchFieldProps.value,
  });

  return (
    <>
      <PanelTitle>Components</PanelTitle>
      <Separator />

      <Box css={{ padding: theme.panel.padding }}>
        <SearchField
          {...searchFieldProps}
          autoFocus
          placeholder="Find components"
        />
      </Box>
      <Separator />

      <ScrollArea ref={draggableContainerRef}>
        {groups.map((group) => (
          <CollapsibleSection
            label={titleCase(group.category)}
            key={group.category}
            fullWidth
          >
            <List asChild>
              <Flex
                gap="1"
                wrap="wrap"
                css={{
                  paddingInline: theme.panel.paddingInline,
                  overflow: "auto",
                }}
              >
                {group.metas.map((meta, index) => (
                  <ListItem
                    asChild
                    state={
                      meta.name === getSelectedComponent()
                        ? "selected"
                        : undefined
                    }
                    index={index}
                    key={meta.name}
                    onSelect={() => handleInsert(meta.name)}
                    onFocus={() => setSelectedComponent(meta.name)}
                  >
                    <ComponentCard
                      {...{ [dragItemAttribute]: meta.name }}
                      // Too hard to calculate, goal was to have 3 cards in one row on the smallest width and to fill it at the same ime
                      css={{ width: 69 }}
                      label={meta.label}
                      description={meta.description}
                      disableTooltip={isDragging}
                      icon={
                        <InstanceIcon
                          size="auto"
                          instance={meta.firstInstance}
                          // for cases like Sheet template
                          icon={meta.icon}
                        />
                      }
                    />
                  </ListItem>
                ))}
                {dragCard}
                {group.metas.length === 0 && (
                  <Flex grow justify="center" css={{ py: theme.spacing[10] }}>
                    <Text>No matching component</Text>
                  </Flex>
                )}
              </Flex>
            </List>
          </CollapsibleSection>
        ))}
      </ScrollArea>
    </>
  );
};
