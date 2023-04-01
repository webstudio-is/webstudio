import { useMemo } from "react";
import { usePress } from "@react-aria/interactions";
import {
  type ComponentName,
  type WsComponentMeta,
  getComponentMeta,
  getComponentNames,
  componentCategories,
} from "@webstudio-is/react-sdk";
import {
  theme,
  Flex,
  ComponentCard,
  Tooltip,
  ArrowFocus,
} from "@webstudio-is/design-system";
import { PlusIcon } from "@webstudio-is/icons";
import type { Publish } from "~/shared/pubsub";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";
import type { TabName } from "../../types";
import { Header, CloseButton } from "../../header";
import {
  dragItemAttribute,
  elementToComponentName,
  useDraggable,
} from "./use-draggable";

const getMetaMaps = () => {
  const metaByComponentName: Map<ComponentName, WsComponentMeta> = new Map();
  const metaByCategory: Map<
    WsComponentMeta["category"],
    Array<WsComponentMeta>
  > = new Map();
  const componentNamesByMeta: Map<WsComponentMeta, ComponentName> = new Map();

  for (const name of getComponentNames()) {
    const meta = getComponentMeta(name);
    if (meta?.category === undefined) {
      continue;
    }
    let categoryMetas = metaByCategory.get(meta.category);
    if (categoryMetas === undefined) {
      categoryMetas = [];
      metaByCategory.set(meta.category, categoryMetas);
    }
    categoryMetas.push(meta);
    metaByComponentName.set(name, meta);
    componentNamesByMeta.set(meta, name);
  }
  return { metaByComponentName, metaByCategory, componentNamesByMeta };
};

type TabContentProps = {
  onSetActiveTab: (tabName: TabName) => void;
  publish: Publish;
};

export const TabContent = ({ publish, onSetActiveTab }: TabContentProps) => {
  const { metaByComponentName, metaByCategory, componentNamesByMeta } = useMemo(
    getMetaMaps,
    []
  );
  const { dragCard, handleInsert, draggableContainerRef } = useDraggable({
    publish,
    metaByComponentName,
  });
  const { pressProps } = usePress({
    onPress(event) {
      const component = elementToComponentName(
        event.target,
        metaByComponentName
      );
      if (component) {
        onSetActiveTab("none");
        handleInsert(component);
      }
    },
  });

  return (
    <Flex css={{ height: "100%", flexDirection: "column" }}>
      <Header
        title="Add"
        suffix={<CloseButton onClick={() => onSetActiveTab("none")} />}
      />
      <div ref={draggableContainerRef}>
        {Array.from(componentCategories).map((category) => (
          <CollapsibleSection label={category} key={category} fullWidth>
            <ArrowFocus
              render={({ handleKeyDown }) => (
                <Flex
                  onKeyDown={handleKeyDown}
                  gap="2"
                  wrap="wrap"
                  css={{ px: theme.spacing[9], overflow: "auto" }}
                >
                  {(metaByCategory.get(category) ?? []).map(
                    (meta: WsComponentMeta, index) => {
                      const component = componentNamesByMeta.get(meta);
                      if (component === undefined) {
                        return null;
                      }
                      return (
                        <Tooltip content={meta.label} key={component}>
                          <ComponentCard
                            {...pressProps}
                            {...{ [dragItemAttribute]: component }}
                            label={meta.label}
                            icon={<meta.Icon />}
                            tabIndex={index === 0 ? 0 : -1}
                          />
                        </Tooltip>
                      );
                    }
                  )}
                  {dragCard}
                </Flex>
              )}
            />
          </CollapsibleSection>
        ))}
      </div>
    </Flex>
  );
};

export const icon = <PlusIcon />;
