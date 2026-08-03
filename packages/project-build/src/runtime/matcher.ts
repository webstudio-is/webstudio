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

export const getFragmentPlacementContentModelWarnings = ({
  children,
  instances,
  props,
  metas,
  parentSelector = [],
}: {
  children: WebstudioFragment["children"];
  instances: Instances;
  props: Props;
  metas: Map<string, WsComponentMeta>;
  parentSelector?: Instance["id"][];
}): FragmentContentModelWarning[] => {
  const warnings = new Map<string, FragmentContentModelWarning>();
  for (const child of children) {
    if (child.type !== "id") {
      continue;
    }
    isTreeSatisfyingContentModel({
      instances,
      props,
      metas,
      instanceSelector: [child.value, ...parentSelector],
      onError: (message, instanceSelector) => {
        const warning = { message, instanceId: instanceSelector[0] };
        warnings.set(getWarningKey(warning), warning);
      },
    });
  }
  return Array.from(warnings.values());
};

export const getNewFragmentContentModelWarnings = ({
  warnings,
  allowedWarnings,
}: {
  warnings: FragmentContentModelWarning[];
  allowedWarnings: FragmentContentModelWarning[];
}) => {
  const allowedWarningKeys = new Set(allowedWarnings.map(getWarningKey));
  return warnings.filter(
    (warning) => allowedWarningKeys.has(getWarningKey(warning)) === false
  );
};

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
  return getFragmentPlacementContentModelWarnings({
    children: fragment.children,
    instances,
    props,
    metas,
  });
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
  const allowedWarnings = allowFragmentContentModelWarnings
    ? getFragmentContentModelWarnings({ fragment, metas })
    : [];
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
    const warnings = getFragmentPlacementContentModelWarnings({
      children: fragment.children,
      instances: mergedInstances,
      props: mergedProps,
      metas,
      parentSelector: instanceSelector.slice(index),
    });
    firstError ||= warnings[0]?.message ?? "";
    const newWarnings = getNewFragmentContentModelWarnings({
      warnings,
      allowedWarnings,
    });
    if (newWarnings.length === 0) {
      return index;
    }
  }
  onError?.(firstError);
  return -1;
};
