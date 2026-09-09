import { micromark } from "micromark";
import { useMemo, type ReactNode } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  cssVar,
  Flex,
  ResettableLabel,
  Text,
} from "@webstudio-is/design-system";
import { AlertIcon } from "@webstudio-is/icons";
import type { Prop } from "@webstudio-is/sdk";
import { showAttribute } from "@webstudio-is/react-sdk";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import {
  $authPermit,
  $isContentMode,
  $selectedInstance,
} from "~/shared/nano-states";
import { getPropIdsToDelete } from "@webstudio-is/project-build/runtime";
import { $props } from "~/shared/sync/data-stores";
import {
  $selectedInstanceInitialPropNames,
  $selectedInstancePropsMetas,
  humanizeAttribute,
} from "./shared";

export const useIsBindingResetForbidden = () => {
  const isContentMode = useStore($isContentMode);
  const authPermit = useStore($authPermit);
  return isContentMode || authPermit === "edit";
};

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

export const __testing__ = {
  getPropIdsToDelete,
};

const deleteProp = (name: string) => {
  const instance = $selectedInstance.get();
  if (instance === undefined) {
    return;
  }
  executeRuntimeMutation({
    id: "instances.deleteProps",
    input: {
      deletions: [{ instanceId: instance.id, name }],
    },
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
  deletable = true,
  onDelete,
}: {
  name: string;
  readOnly?: boolean;
  deletable?: boolean;
  onDelete?: () => void;
}) => {
  const propMeta = usePropMeta(name);
  const prop = useProp(name);
  const label = propMeta?.label ?? humanizeAttribute(name);
  // not existing properties cannot be deleted
  const isDeletable = prop !== undefined;
  const isResettable = useIsResettable(name);
  const isBindingResetForbidden = useIsBindingResetForbidden();
  const canDelete =
    deletable &&
    isDeletable &&
    !(prop?.type === "expression" && isBindingResetForbidden);
  const handleDelete = () => {
    if (onDelete === undefined) {
      deleteProp(name);
      return;
    }
    onDelete();
  };
  return (
    <ResettableLabel
      color={prop ? "local" : "default"}
      onReset={canDelete ? handleDelete : undefined}
      resetLabel={isResettable ? "Reset value" : "Delete property"}
      content={
        <>
          <Text variant="titles">{label}</Text>
          {propMeta?.description && <Text>{propMeta.description}</Text>}
          {readOnly && (
            <Flex gap="1">
              <AlertIcon
                color={cssVar("--foreground-warning")}
                style={{ flexShrink: 0 }}
              />
              <Text>
                The value is controlled by an expression and cannot be changed.
              </Text>
            </Flex>
          )}
        </>
      }
    >
      {label}
    </ResettableLabel>
  );
};

export const FieldLabel = ({
  description,
  resettable = false,
  resetDisabled = false,
  onReset,
  children,
}: {
  description?: string | ReactNode;
  resettable?: boolean;
  resetDisabled?: boolean;
  onReset?: () => void;
  children: string;
}) => (
  <ResettableLabel
    color={resettable ? "local" : "default"}
    onReset={resettable ? onReset : undefined}
    resetDisabled={resetDisabled}
    description={
      typeof description === "string" ? (
        <Text
          css={{ "> *": { marginTop: 0 } }}
          dangerouslySetInnerHTML={{ __html: micromark(description) }}
        />
      ) : (
        description
      )
    }
  >
    {children}
  </ResettableLabel>
);
