import ObjectId from "bson-objectid";
import store from "immerhin";
import { z } from "zod";
import { useEffect } from "react";
import { Instance, Props, Styles } from "@webstudio-is/project-build";
import { utils } from "@webstudio-is/project";
import { findInsertLocation } from "~/canvas/shared/instance";
import {
  rootInstanceContainer,
  propsStore,
  stylesStore,
  selectedInstanceIdStore,
} from "../nano-states";
import { cloneInstance, findSubtree } from "../tree-utils";
import { deleteInstance } from "../instance-utils";
import { startCopyPaste } from "./copy-paste";

const InstanceCopyData = z.object({
  instance: Instance,
  props: Props,
  styles: Styles,
});

type InstanceCopyData = z.infer<typeof InstanceCopyData>;

const copyInstanceData = (targetInstanceId: string) => {
  const rootInstance = rootInstanceContainer.get();
  const props = propsStore.get();
  const styles = stylesStore.get();
  if (rootInstance === undefined) {
    return;
  }
  // @todo tell user they can't copy or cut root
  if (targetInstanceId === rootInstance.id) {
    return;
  }

  const { targetInstance } = findSubtree(rootInstance, targetInstanceId);
  if (targetInstance === undefined) {
    return;
  }
  const { clonedInstance, clonedIds } = cloneInstance(targetInstance);

  // clone props with new ids and link to new cloned instances
  const clonedProps: Props = [];
  for (const prop of props) {
    const instanceId = clonedIds.get(prop.instanceId);
    if (instanceId === undefined) {
      continue;
    }
    clonedProps.push({
      ...prop,
      id: ObjectId().toString(),
      instanceId,
    });
  }

  // clone styles and link to new cloned instances
  const clonedStyles: Styles = [];
  for (const styleDecl of styles) {
    const instanceId = clonedIds.get(styleDecl.instanceId);
    if (instanceId === undefined) {
      continue;
    }
    clonedStyles.push({
      ...styleDecl,
      instanceId,
    });
  }

  return {
    instance: clonedInstance,
    props: clonedProps,
    styles: clonedStyles,
  };
};

const pasteInstance = (data: InstanceCopyData) => {
  const selectedInstanceId = selectedInstanceIdStore.get();
  store.createTransaction(
    [rootInstanceContainer, propsStore, stylesStore],
    (rootInstance, props, styles) => {
      if (rootInstance === undefined) {
        return;
      }
      const hasInserted = utils.tree.insertInstanceMutable(
        rootInstance,
        data.instance,
        findInsertLocation(rootInstance, selectedInstanceId)
      );
      if (hasInserted === false) {
        return;
      }
      props.push(...data.props);
      styles.push(...data.styles);
      selectedInstanceIdStore.set(data.instance.id);
    }
  );
};

const startCopyPasteInstance = () => {
  return startCopyPaste({
    version: "@webstudio/instance/v0.1",
    type: InstanceCopyData,
    allowAnyTarget: true,

    onCopy: () => {
      const selectedInstanceId = selectedInstanceIdStore.get();
      if (selectedInstanceId === undefined) {
        return;
      }
      return copyInstanceData(selectedInstanceId);
    },

    onCut: () => {
      const selectedInstanceId = selectedInstanceIdStore.get();
      if (selectedInstanceId === undefined) {
        return;
      }
      const data = copyInstanceData(selectedInstanceId);
      if (data === undefined) {
        return;
      }
      deleteInstance(selectedInstanceId);
      return data;
    },

    onPaste: pasteInstance,
  });
};

export const useCopyPasteInstance = (): void => {
  useEffect(() => {
    return startCopyPasteInstance();
  }, []);
};
