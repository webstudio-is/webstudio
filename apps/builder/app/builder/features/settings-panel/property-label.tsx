import { useMemo, useState } from "react";
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
import { InfoCircleIcon } from "@webstudio-is/icons";
import type { Prop } from "@webstudio-is/sdk";
import { showAttribute } from "@webstudio-is/react-sdk";
import { updateWebstudioData } from "~/shared/instance-utils";
import { $selectedInstance } from "~/shared/awareness";
import { $props, $registeredComponentPropsMetas } from "~/shared/nano-states";
import { humanizeAttribute, showAttributeMeta } from "./shared";

const usePropMeta = (name: string) => {
  const store = useMemo(() => {
    return computed(
      [$selectedInstance, $registeredComponentPropsMetas],
      (instance, propsMetas) => {
        if (name === showAttribute) {
          return showAttributeMeta;
        }
        const metas = propsMetas.get(instance?.component ?? "");
        const propMeta = metas?.props[name];
        return propMeta;
      }
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
      [$selectedInstance, $registeredComponentPropsMetas],
      (instance, propsMetas) => {
        if (name === showAttribute) {
          return true;
        }
        const metas = propsMetas.get(instance?.component ?? "");
        return metas?.initialProps?.includes(name);
      }
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
  // 1. not existing properties cannot be deleted
  // 2. required properties cannot be deleted
  // 3. custom attributes like data-* do not have meta and can be deleted
  const isDeletable = prop && !propMeta?.required;
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
      {readOnly && (
        <Tooltip
          content="The value is controlled by an expression and cannot be changed."
          variant="wrapped"
        >
          <InfoCircleIcon
            color={rawTheme.colors.foregroundSubtle}
            tabIndex={0}
          />
        </Tooltip>
      )}
    </Flex>
  );
};
