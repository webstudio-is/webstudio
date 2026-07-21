import type {
  Instance,
  Instances,
  Props,
  WebstudioFragment,
  WsComponentMeta,
} from "@webstudio-is/sdk";
import { isTreeSatisfyingContentModel } from "./content-model";

export type FragmentContentModelWarning = {
  instanceId: Instance["id"];
  message: string;
};

const getWarningKey = ({ instanceId, message }: FragmentContentModelWarning) =>
  `${instanceId}\0${message}`;

export const getFragmentContentModelWarnings = ({
  fragment,
  metas,
}: {
  fragment: Pick<WebstudioFragment, "children" | "instances" | "props">;
  metas: Map<string, WsComponentMeta>;
}): FragmentContentModelWarning[] => {
  const instances: Instances = new Map(
    fragment.instances.map((instance) => [instance.id, instance])
  );
  const props: Props = new Map(fragment.props.map((prop) => [prop.id, prop]));
  const warnings = new Map<string, FragmentContentModelWarning>();
  for (const child of fragment.children) {
    if (child.type !== "id") {
      continue;
    }
    isTreeSatisfyingContentModel({
      instances,
      props,
      metas,
      instanceSelector: [child.value],
      onError: (message, instanceSelector) => {
        const warning = { message, instanceId: instanceSelector[0] };
        warnings.set(getWarningKey(warning), warning);
      },
    });
  }
  return Array.from(warnings.values());
};

export const findClosestInstanceMatchingFragment = ({
  instances,
  props,
  metas,
  instanceSelector,
  fragment,
  onError,
  allowFragmentContentModelWarnings = false,
}: {
  instances: Instances;
  props: Props;
  metas: Map<string, WsComponentMeta>;
  instanceSelector: Instance["id"][];
  fragment: Pick<WebstudioFragment, "children" | "instances" | "props">;
  onError?: (message: string) => void;
  allowFragmentContentModelWarnings?: boolean;
}) => {
  const mergedInstances = new Map(instances);
  for (const instance of fragment.instances) {
    mergedInstances.set(instance.id, instance);
  }
  const mergedProps = new Map(props);
  for (const prop of fragment.props) {
    mergedProps.set(prop.id, prop);
  }
  const allowedWarningKeys = new Set(
    allowFragmentContentModelWarnings
      ? getFragmentContentModelWarnings({ fragment, metas }).map(getWarningKey)
      : []
  );
  let firstError = "";
  for (let index = 0; index < instanceSelector.length; index += 1) {
    const instanceId = instanceSelector[index];
    const instance = instances.get(instanceId);
    if (instance === undefined) {
      continue;
    }
    const meta = metas.get(instance.component);
    if (meta === undefined) {
      continue;
    }
    let matches = true;
    for (const child of fragment.children) {
      if (child.type !== "id") {
        continue;
      }
      let hasNewViolation = false;
      const isValid = isTreeSatisfyingContentModel({
        instances: mergedInstances,
        props: mergedProps,
        metas,
        instanceSelector: [child.value, ...instanceSelector.slice(index)],
        onError: (message, errorSelector) => {
          if (firstError === "") {
            firstError = message;
          }
          if (
            allowedWarningKeys.has(
              getWarningKey({ instanceId: errorSelector[0], message })
            ) === false
          ) {
            hasNewViolation = true;
          }
        },
      });
      matches &&= isValid || hasNewViolation === false;
    }
    if (matches) {
      return index;
    }
  }
  onError?.(firstError);
  return -1;
};
