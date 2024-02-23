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
import { CollapsibleSection } from "~/builder/shared/collapsible-section";
import type { TabContentProps } from "../../types";
import { Header, CloseButton } from "../../header";
import {
  dragItemAttribute,
  elementToComponentName,
  useDraggable,
} from "./use-draggable";
import { MetaIcon } from "~/builder/shared/meta-icon";
import { $registeredComponentMetas } from "~/shared/nano-states";
import { getMetaMaps } from "./get-meta-maps";
import { getInstanceLabel } from "~/shared/instance-utils";

export const TabContent = ({ publish, onSetActiveTab }: TabContentProps) => {
  const metaByComponentName = useStore($registeredComponentMetas);
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
        title="Components"
        suffix={<CloseButton onClick={() => onSetActiveTab("none")} />}
      />
      <ScrollArea>
        {componentCategories
          .filter((category) => category !== "hidden")
          .map((category) => (
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
                          return;
                        }
                        return (
                          <Tooltip
                            content={meta.description ?? meta.label}
                            key={component}
                            css={{ maxWidth: theme.spacing[28] }}
                          >
                            <ComponentCard
                              {...pressProps}
                              {...{ [dragItemAttribute]: component }}
                              label={getInstanceLabel({ component }, meta)}
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
