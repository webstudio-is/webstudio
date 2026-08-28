import { useStore } from "@nanostores/react";
import type {
  PropMeta,
  Instance,
  Prop,
  Props,
  WsComponentMeta,
} from "@webstudio-is/sdk";
import {
  blockComponent,
  contentBlockSourceProp,
  descendantComponent,
} from "@webstudio-is/sdk";
import {
  canHaveTextContent,
  createStartingPropValueFromMeta,
  getDefaultPropMetaForType,
  getContentModeCapabilities,
  isRichText,
  isRichTextTree,
  showAttributeMeta,
  type ContentModeCapabilities,
} from "@webstudio-is/project-build/runtime";
import {
  reactPropsToStandardAttributes,
  showAttribute,
  standardAttributesToReactProps,
  textContentAttribute,
} from "@webstudio-is/react-sdk";
import {
  $isContentMode,
  $registeredComponentMetas,
} from "~/shared/nano-states";
import { $instances } from "~/shared/sync/data-stores";
import { $props } from "~/shared/sync/data-stores";
import { $styleSources } from "~/shared/sync/data-stores";
import { $selectedInstancePath } from "~/shared/nano-states";
import {
  $selectedInstanceInitialPropNames,
  $selectedInstancePropsMetas,
  type PropValue,
} from "../shared";
import { getEditableTextTarget } from "@webstudio-is/project-build/runtime";

type PropOrName = { prop?: Prop; propName: string };

export type PropAndMeta = {
  prop?: Prop;
  propName: string;
  meta: PropMeta;
  instanceId?: Instance["id"];
  instanceSelector?: Instance["id"][];
};

const isPropVisibleInContentMode = ({
  component,
  propName,
  props,
  propsMetas,
  selectedInstanceSelector,
  capabilities,
}: {
  component: Instance["component"];
  propName: string;
  props: Prop[];
  propsMetas: Map<string, PropMeta>;
  selectedInstanceSelector: undefined | Instance["id"][];
  capabilities: ContentModeCapabilities;
}) => {
  if (selectedInstanceSelector === undefined) {
    return false;
  }
  if (component === blockComponent && propName === contentBlockSourceProp) {
    return props.some(
      (prop) =>
        prop.name === contentBlockSourceProp &&
        (prop.type === "asset" || prop.type === "expression")
    );
  }
  const instanceId = selectedInstanceSelector[0];
  if (capabilities.editableInstanceIds.has(instanceId) === false) {
    if (propName === textContentAttribute) {
      return (
        capabilities.frontmatterBoundTextInstanceIds?.has(instanceId) === true
      );
    }
    return props.some(
      (prop) =>
        prop.name === propName &&
        capabilities.frontmatterBoundPropIds?.has(prop.id) === true
    );
  }
  if (propName === textContentAttribute) {
    return true;
  }
  const propMeta = propsMetas.get(propName);
  if (propMeta?.contentMode === false) {
    return false;
  }
  if (
    props.some(
      (prop) =>
        prop.name === propName && capabilities.editablePropIds.has(prop.id)
    )
  ) {
    return true;
  }
  if (propMeta?.type === "string" && propMeta.control === "file") {
    return true;
  }
  return propMeta?.contentMode === true;
};

type UsePropsLogicInput = {
  instance: Instance;
  props: Prop[];
  updateProp: (
    update: PropValue & {
      instanceId: Instance["id"];
      name: Prop["name"];
      required?: boolean;
    }
  ) => void;
};

const getAndDelete = <Value>(map: Map<string, Value>, key: string) => {
  const value = map.get(key);
  map.delete(key);
  return value;
};

const canShowTextContent = ({
  instance,
  instanceSelector,
  instances,
  props,
  metas,
  isContentMode,
}: {
  instance: Instance;
  instanceSelector: Instance["id"][] | undefined;
  instances: Map<Instance["id"], Instance>;
  props: Props;
  metas: Map<string, WsComponentMeta>;
  isContentMode: boolean;
}) => {
  const target = getEditableTextTarget(instance);
  if (
    instanceSelector === undefined ||
    (instance.children.length > 0 && target === undefined)
  ) {
    return false;
  }
  const input = {
    instanceId: instanceSelector[0],
    instances,
    props,
    metas,
  };
  if (
    (isContentMode
      ? isRichTextTree(input)
      : isRichText({ ...input, instanceSelector })) === true
  ) {
    return true;
  }
  return canHaveTextContent(input);
};

export const __testing__ = {
  isPropVisibleInContentMode,
  getAndDelete,
  canShowTextContent,
};

/** usePropsLogic expects that key={instanceId} is used on the ancestor component */
export const usePropsLogic = ({
  instance,
  props,
  updateProp,
}: UsePropsLogicInput) => {
  const isContentMode = useStore($isContentMode);
  const propsMetas = useStore($selectedInstancePropsMetas);
  const instances = useStore($instances);
  const allProps = useStore($props);
  const styleSources = useStore($styleSources);
  const metas = useStore($registeredComponentMetas);
  const selectedInstancePath = useStore($selectedInstancePath);
  const contentModeCapabilities = isContentMode
    ? getContentModeCapabilities({
        instances,
        metas,
        props: allProps,
        styleSources,
      })
    : undefined;

  /**
   * In content edit mode we show only props marked with contentMode: true
   * In the future I hope the only thing we will show will be Components
   */
  const isPropVisible = (propName: string) => {
    if (!isContentMode) {
      return true;
    }
    if (contentModeCapabilities === undefined) {
      return false;
    }
    return isPropVisibleInContentMode({
      component: instance.component,
      propName,
      props,
      propsMetas,
      selectedInstanceSelector: selectedInstancePath?.[0].instanceSelector,
      capabilities: contentModeCapabilities,
    });
  };

  const savedProps = props;

  // we will delete items from these maps as we categorize the props
  const unprocessedSaved = new Map(savedProps.map((prop) => [prop.name, prop]));

  const initialPropNames = useStore($selectedInstanceInitialPropNames);

  const systemProps: PropAndMeta[] = [];
  // descendant component is not actually rendered
  // but affects styling of nested elements
  // hiding descendant does not hide nested elements and confuse users
  if (instance.component !== descendantComponent) {
    systemProps.push({
      propName: showAttribute,
      prop: getAndDelete(unprocessedSaved, showAttribute),
      meta: showAttributeMeta,
    });
  }

  const getTextContentTarget = () => {
    if (
      canShowTextContent({
        instance,
        instanceSelector: selectedInstancePath?.[0].instanceSelector,
        instances,
        props: allProps,
        metas,
        isContentMode,
      })
    ) {
      return {
        instanceId: instance.id,
        instanceSelector: selectedInstancePath?.[0].instanceSelector,
      };
    }

    if (isContentMode && instance.component === "Link") {
      const [child] = instance.children;
      if (child?.type === "id") {
        const childInstance = instances.get(child.value);
        if (
          childInstance?.component === "Text" &&
          (childInstance.children.length === 0 ||
            getEditableTextTarget(childInstance) !== undefined)
        ) {
          return {
            instanceId: childInstance.id,
            instanceSelector:
              selectedInstancePath === undefined
                ? undefined
                : [
                    childInstance.id,
                    ...selectedInstancePath[0].instanceSelector,
                  ],
          };
        }
      }
    }
  };

  const textContentTarget = getTextContentTarget();

  if (textContentTarget) {
    systemProps.push({
      propName: textContentAttribute,
      instanceId: textContentTarget.instanceId,
      instanceSelector: textContentTarget.instanceSelector,
      meta: metas.get(instance.component)?.textContent ?? {
        required: false,
        control: "textContent",
        type: "string",
      },
    });
  }

  const initialProps: PropAndMeta[] = [];
  for (const name of initialPropNames) {
    const propMeta = propsMetas.get(name);
    if (propMeta === undefined) {
      continue;
    }

    let prop =
      getAndDelete<Prop>(unprocessedSaved, name) ??
      // support legacy html props stored with react names
      getAndDelete<Prop>(
        unprocessedSaved,
        standardAttributesToReactProps[name]
      );
    if (prop) {
      prop = { ...prop, name };
    }

    // For initial props, if prop is not saved, we want to show default value if available.
    //
    // Important to not infer starting value if default is not available
    // because user may have this experience:
    //   - they open props panel of an Image
    //   - they see 0 in the control for "width"
    //   - where 0 is a fallback when no default is available
    //   - they think that width is set to 0, but it's actually not set at all
    //
    initialProps.push({
      prop,
      propName: name,
      meta: propMeta,
    });
  }

  const addedProps: PropAndMeta[] = [];
  for (let prop of Array.from(unprocessedSaved.values()).reverse()) {
    // ignore parameter props
    if (prop.type === "parameter") {
      continue;
    }
    let name = prop.name;
    let propMeta = propsMetas.get(name);
    // support legacy html props stored with react names
    if (propsMetas.has(reactPropsToStandardAttributes[name])) {
      name = reactPropsToStandardAttributes[name];
      propMeta = propsMetas.get(name);
    }
    prop = { ...prop, name };
    propMeta ??= getDefaultPropMetaForType(
      prop.type === "asset" ? "asset" : "string"
    );

    addedProps.push({
      prop,
      propName: prop.name,
      meta: propMeta,
    });
  }

  const handleAdd = (propName: string) => {
    // In case of custom property/attribute we get a string.
    const propMeta =
      propsMetas.get(propName) ?? getDefaultPropMetaForType("string");
    const value = createStartingPropValueFromMeta(propMeta, true);
    if (value) {
      updateProp({
        instanceId: instance.id,
        name: propName,
        ...value,
      });
    }
  };

  const handleChange = ({ prop, propName }: PropOrName, value: PropValue) => {
    updateProp({
      instanceId: instance.id,
      name: propName,
      required: prop?.required,
      ...value,
    });
  };

  const handleChangeByPropName = (propName: string, value: PropValue) => {
    const prop = props.find((prop) => prop.name === propName);

    updateProp({
      instanceId: instance.id,
      name: propName,
      required: prop?.required,
      ...value,
    });
  };

  return {
    handleAdd,
    handleChange,
    handleChangeByPropName,
    /** Similar to Initial, but displayed as a separate group in UI etc.
     * Currently used only for the ID prop. */
    systemProps: systemProps.filter(({ propName }) => isPropVisible(propName)),
    /** Initial (not deletable) props */
    initialProps: initialProps.filter(({ propName }) =>
      isPropVisible(propName)
    ),
    /** Optional props that were added by user */
    addedProps: addedProps.filter(({ propName }) => isPropVisible(propName)),
  };
};
