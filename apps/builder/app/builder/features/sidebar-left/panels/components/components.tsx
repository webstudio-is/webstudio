import {
  type ComponentName,
  getComponentMeta,
  getComponentNames,
  WsComponentMeta,
  componentCategories,
} from "@webstudio-is/react-sdk";
import {
  theme,
  Flex,
  ComponentCard,
  Tooltip,
} from "@webstudio-is/design-system";
import { PlusIcon } from "@webstudio-is/icons";
import type { Publish } from "~/shared/pubsub";
import type { TabName } from "../../types";
import { Header, CloseButton } from "../../header";
import { ArrowFocus } from "@webstudio-is/design-system";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";
import { useDraggable } from "./use-draggable";

const metasByComponentName: Map<ComponentName, WsComponentMeta> = new Map();
const metasByCategory: Map<
  WsComponentMeta["category"],
  Array<WsComponentMeta>
> = new Map();
const componentNamesByMeta: Map<WsComponentMeta, ComponentName> = new Map();

for (const name of getComponentNames()) {
  const meta = getComponentMeta(name);
  if (meta?.category === undefined) {
    continue;
  }
  let categoryMetas = metasByCategory.get(meta.category);
  if (categoryMetas === undefined) {
    categoryMetas = [];
    metasByCategory.set(meta.category, categoryMetas);
  }
  categoryMetas.push(meta);
  metasByComponentName.set(name, meta);
  componentNamesByMeta.set(meta, name);
}

type TabContentProps = {
  onSetActiveTab: (tabName: TabName) => void;
  publish: Publish;
};

export const TabContent = ({ publish, onSetActiveTab }: TabContentProps) => {
  const { dragCard, handleInsert, draggableContainerRef } = useDraggable({
    publish,
    metasByComponentName,
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
                  {(metasByCategory.get(category) ?? []).map(
                    (meta: WsComponentMeta, index) => {
                      const component = componentNamesByMeta.get(meta);
                      if (component === undefined) {
                        return null;
                      }
                      return (
                        <Tooltip content={meta.label}>
                          <ComponentCard
                            onClick={() => {
                              onSetActiveTab("none");
                              handleInsert(component);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                onSetActiveTab("none");
                                handleInsert(component);
                              }
                            }}
                            data-drag-component={component}
                            label={meta.label}
                            icon={<meta.Icon />}
                            key={component}
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
