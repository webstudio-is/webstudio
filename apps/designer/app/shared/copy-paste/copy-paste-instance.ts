import store from "immerhin";
import { z } from "zod";
import { useEffect } from "react";
import {
  Instance,
  Props,
  Styles,
  StyleSources,
  StyleSourceSelections,
} from "@webstudio-is/project-build";
import { utils } from "@webstudio-is/project";
import { findInsertLocation } from "~/canvas/shared/instance";
import {
  rootInstanceContainer,
  propsStore,
  stylesStore,
  selectedInstanceIdStore,
  styleSourceSelectionsStore,
  styleSourcesStore,
} from "../nano-states";
import {
  cloneInstance,
  cloneProps,
  cloneStyles,
  cloneStyleSources,
  cloneStyleSourceSelections,
  findSubtree,
  findSubtreeLocalStyleSources,
} from "../tree-utils";
import { deleteInstance } from "../instance-utils";
import { startCopyPaste } from "./copy-paste";

const InstanceData = z.object({
  instance: Instance,
  props: Props,
  styleSourceSelections: StyleSourceSelections,
  styleSources: StyleSources,
  styles: Styles,
});

type InstanceData = z.infer<typeof InstanceData>;

const copyInstanceData = (targetInstanceId: string) => {
  const rootInstance = rootInstanceContainer.get();
  if (rootInstance === undefined) {
    return;
  }
  // @todo tell user they can't copy or cut root
  if (targetInstanceId === rootInstance.id) {
    return;
  }

  const { targetInstance, subtreeIds } = findSubtree(
    rootInstance,
    targetInstanceId
  );
  const styleSources = styleSourcesStore.get();
  const styleSourceSelections = styleSourceSelectionsStore.get();
  const subtreeLocalStyleSourceIds = findSubtreeLocalStyleSources(
    subtreeIds,
    styleSources,
    styleSourceSelections
  );
  if (targetInstance === undefined) {
    return;
  }

  // clone all instance related data and link it with new ids
  const { clonedInstance, clonedInstanceIds } = cloneInstance(targetInstance);
  const clonedProps = cloneProps(propsStore.get(), clonedInstanceIds);
  const { clonedStyleSources, clonedStyleSourceIds } = cloneStyleSources(
    styleSources,
    subtreeLocalStyleSourceIds
  );
  const clonedStyleSourceSelections = cloneStyleSourceSelections(
    styleSourceSelections,
    clonedInstanceIds,
    clonedStyleSourceIds
  );
  // @todo migrate to style source variant
  const clonedStyles = cloneStyles(stylesStore.get(), clonedInstanceIds);

  return {
    instance: clonedInstance,
    props: clonedProps,
    styleSourceSelections: clonedStyleSourceSelections,
    styleSources: clonedStyleSources,
    styles: clonedStyles,
  };
};

const pasteInstance = (data: InstanceData) => {
  const selectedInstanceId = selectedInstanceIdStore.get();
  store.createTransaction(
    [
      rootInstanceContainer,
      propsStore,
      styleSourceSelectionsStore,
      styleSourcesStore,
      stylesStore,
    ],
    (rootInstance, props, styleSourceSelections, styleSources, styles) => {
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
      // append without checking existing
      // because all data already cloned with new ids
      props.push(...data.props);
      styleSourceSelections.push(...data.styleSourceSelections);
      styleSources.push(...data.styleSources);
      styles.push(...data.styles);
    }
  );
  selectedInstanceIdStore.set(data.instance.id);
};

const startCopyPasteInstance = () => {
  return startCopyPaste({
    version: "@webstudio/instance/v0.1",
    type: InstanceData,
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

export const useCopyPasteInstance = () => {
  useEffect(() => {
    return startCopyPasteInstance();
  }, []);
};
