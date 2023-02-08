import store from "immerhin";
import { z } from "zod";
import { useEffect } from "react";
import {
  Instance,
  Prop,
  Styles,
  StyleSource,
  StyleSourceSelections,
} from "@webstudio-is/project-build";
import { utils } from "@webstudio-is/project";
import {
  rootInstanceContainer,
  propsStore,
  stylesStore,
  selectedInstanceIdStore,
  styleSourceSelectionsStore,
  styleSourcesStore,
  instancesIndexStore,
} from "../nano-states";
import {
  cloneInstance,
  cloneProps,
  cloneStyles,
  cloneStyleSources,
  cloneStyleSourceSelections,
  findClosestDroppableTarget,
  findSubtree,
  findSubtreeLocalStyleSources,
} from "../tree-utils";
import { deleteInstance } from "../instance-utils";
import { startCopyPaste } from "./copy-paste";

const InstanceData = z.object({
  instance: Instance,
  props: z.array(Prop),
  styleSourceSelections: StyleSourceSelections,
  styleSources: z.array(StyleSource),
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
  const clonedStyles = cloneStyles(stylesStore.get(), clonedStyleSourceIds);

  return {
    instance: clonedInstance,
    props: clonedProps,
    styleSourceSelections: clonedStyleSourceSelections,
    styleSources: clonedStyleSources,
    styles: clonedStyles,
  };
};

const pasteInstance = (data: InstanceData) => {
  const dropTarget = findClosestDroppableTarget(
    instancesIndexStore.get(),
    selectedInstanceIdStore.get()
  );
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
      utils.tree.insertInstanceMutable(rootInstance, data.instance, dropTarget);
      // append without checking existing
      // because all data already cloned with new ids
      for (const prop of data.props) {
        props.set(prop.id, prop);
      }
      styleSourceSelections.push(...data.styleSourceSelections);
      for (const styleSource of data.styleSources) {
        styleSources.set(styleSource.id, styleSource);
      }
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
