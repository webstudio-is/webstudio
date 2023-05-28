import { useMemo } from "react";
import { useStore } from "@nanostores/react";
import { usePress } from "@react-aria/interactions";
import {
  type WsComponentMeta,
  componentCategories,
} from "@webstudio-is/react-sdk";
import {
  theme,
  Flex,
  ComponentCard,
  Tooltip,
  ArrowFocus,
  ScrollArea,
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
import { MetaIcon } from "~/builder/shared/meta-icon";
import { registeredComponentMetasStore } from "~/shared/nano-states";
import { getMetaMaps } from "./get-meta-maps";

type TabContentProps = {
  onSetActiveTab: (tabName: TabName) => void;
  publish: Publish;
};

export const TabContent = ({ publish, onSetActiveTab }: TabContentProps) => {
  const metaByComponentName = useStore(registeredComponentMetasStore);
  const { metaByCategory, componentNamesByMeta } = useMemo(
    () => getMetaMaps(metaByComponentName),
    [metaByComponentName]
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
    <Flex
      css={{ height: "100%", flexDirection: "column" }}
      ref={draggableContainerRef}
    >
      <Header
        title="Add"
        suffix={<CloseButton onClick={() => onSetActiveTab("none")} />}
      />
      <ScrollArea>
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
                            icon={<MetaIcon size="auto" icon={meta.icon} />}
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
      </ScrollArea>
    </Flex>
  );
};

export const icon = <PlusIcon />;
