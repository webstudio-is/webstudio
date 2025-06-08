import { micromark } from "micromark";
import { useMemo, useState, type ReactNode } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  Button,
  Flex,
  Kbd,
  Label,
  Text,
  Tooltip,
  rawTheme,
  theme,
} from "@webstudio-is/design-system";
import { AlertIcon } from "@webstudio-is/icons";
import type { Prop } from "@webstudio-is/sdk";
import { showAttribute } from "@webstudio-is/react-sdk";
import { updateWebstudioData } from "~/shared/instance-utils";
import { $selectedInstance } from "~/shared/awareness";
import { $props } from "~/shared/nano-states";
import {
  $selectedInstanceInitialPropNames,
  $selectedInstancePropsMetas,
  humanizeAttribute,
} from "./shared";

const usePropMeta = (name: string) => {
  const store = useMemo(() => {
    return computed($selectedInstancePropsMetas, (propsMetas) =>
      propsMetas.get(name)
    );
  }, [name]);
  return useStore(store);
};

const $selectedInstanceProps = computed(
  [$selectedInstance, $props],
  (instance, props) => {
    const instanceProps = new Map<Prop["name"], Prop>();
    for (const prop of props.values()) {
      if (prop.instanceId === instance?.id) {
        instanceProps.set(prop.name, prop);
      }
    }
    return instanceProps;
  }
);

const useProp = (name: string) => {
  const store = useMemo(() => {
    return computed([$selectedInstanceProps], (selectedInstanceProps) =>
      selectedInstanceProps.get(name)
    );
  }, [name]);
  return useStore(store);
};

const deleteProp = (name: string) => {
  const instance = $selectedInstance.get();
  const instanceProps = $selectedInstanceProps.get();
  updateWebstudioData((data) => {
    const prop = instanceProps.get(name);
    if (prop) {
      data.props.delete(prop.id);
    }
    if (prop?.type === "resource") {
      data.resources.delete(prop.value);
    }
    if (instance?.component === "Image" && name === "src") {
      const widthProp = instanceProps.get("width");
      if (widthProp) {
        data.props.delete(widthProp.id);
      }
      const heightProp = instanceProps.get("height");
      if (heightProp) {
        data.props.delete(heightProp.id);
      }
    }
  });
};

const useIsResettable = (name: string) => {
  const store = useMemo(() => {
    return computed(
      [$selectedInstanceInitialPropNames],
      (initialPropNames) => name === showAttribute || initialPropNames.has(name)
    );
  }, [name]);
  return useStore(store);
};

export const PropertyLabel = ({
  name,
  readOnly,
}: {
  name: string;
  readOnly?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const propMeta = usePropMeta(name);
  const prop = useProp(name);
  const label = propMeta?.label ?? humanizeAttribute(name);
  // not existing properties cannot be deleted
  const isDeletable = prop !== undefined;
  const isResettable = useIsResettable(name);
  return (
    <Flex align="center" css={{ gap: theme.spacing[3] }}>
      {/* prevent label growing */}
      <div>
        <Tooltip
          open={isOpen}
          onOpenChange={setIsOpen}
          triggerProps={{
            onClick: (event) => {
              if (event.altKey) {
                event.preventDefault();
                if (isDeletable) {
                  deleteProp(name);
                }
                return;
              }
              setIsOpen(true);
            },
          }}
          content={
            <Flex
              direction="column"
              gap="2"
              css={{ maxWidth: theme.spacing[28] }}
            >
              <Text variant="titles" css={{ textTransform: "none" }}>
                {label}
              </Text>
              {propMeta?.description && <Text>{propMeta.description}</Text>}
              {readOnly && (
                <Flex gap="1">
                  <AlertIcon
                    color={rawTheme.colors.backgroundAlertMain}
                    style={{ flexShrink: 0 }}
                  />
                  <Text>
                    The value is controlled by an expression and cannot be
                    changed.
                  </Text>
                </Flex>
              )}
              {isDeletable && (
                <Button
                  color="dark"
                  // to align button text in the middle
                  prefix={<div></div>}
                  suffix={<Kbd value={["alt", "click"]} color="moreSubtle" />}
                  css={{ gridTemplateColumns: "1fr max-content 1fr" }}
                  onClick={() => {
                    deleteProp(name);
                    setIsOpen(false);
                  }}
                >
                  {isResettable ? "Reset value" : "Delete property"}
                </Button>
              )}
            </Flex>
          }
        >
          <Label truncate color={prop ? "local" : "default"}>
            {label}
          </Label>
        </Tooltip>
      </div>
    </Flex>
  );
};

export const FieldLabel = ({
  description,
  resettable = false,
  onReset,
  children,
}: {
  /**
   * Markdown text to show in tooltip or react element
   */
  description?: string | ReactNode;
  /**
   * when true means field has value and colored true
   */
  resettable?: boolean;
  onReset?: () => void;
  children: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  if (typeof description === "string") {
    description = (
      <Text
        css={{
          "> *": { marginTop: 0 },
        }}
        dangerouslySetInnerHTML={{ __html: micromark(description) }}
      ></Text>
    );
  } else if (description) {
    description = <Text>{description}</Text>;
  }
  return (
    <Flex align="center" css={{ gap: theme.spacing[3] }}>
      {/* prevent label growing */}
      <div>
        <Tooltip
          open={isOpen}
          onOpenChange={setIsOpen}
          triggerProps={{
            onClick: (event) => {
              if (event.altKey) {
                event.preventDefault();
                if (resettable) {
                  onReset?.();
                }
                return;
              }
              setIsOpen(true);
            },
          }}
          content={
            <Flex
              direction="column"
              gap="2"
              css={{ maxWidth: theme.spacing[28] }}
            >
              <Text variant="titles" css={{ textTransform: "none" }}>
                {children}
              </Text>
              {description}
              {resettable && (
                <Button
                  color="dark"
                  // to align button text in the middle
                  prefix={<div></div>}
                  suffix={<Kbd value={["alt", "click"]} color="moreSubtle" />}
                  css={{ gridTemplateColumns: "1fr max-content 1fr" }}
                  onClick={() => {
                    onReset?.();
                    setIsOpen(false);
                  }}
                >
                  Reset value
                </Button>
              )}
            </Flex>
          }
        >
          <Label truncate color={resettable ? "local" : "default"}>
            {children}
          </Label>
        </Tooltip>
      </div>
    </Flex>
  );
};
