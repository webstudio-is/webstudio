import type { Instance, Instances } from "../schema/instances";
import type { Props } from "../schema/props";
import type { Resources } from "../schema/resources";

/** @deprecated Used only when migrating saved Webhook Form methods. */
const getMethod = (value: string | undefined) => {
  switch (value?.toLowerCase()) {
    case "get":
      return "get";
    case "delete":
      return "delete";
    case "put":
      return "put";
    default:
      return "post";
  }
};

/** @deprecated Convert saved Webhook Form action props to Resource actions. */
export const migrateLegacyWebhookFormActions = ({
  props,
  instances,
  resources,
}: {
  props: Props;
  instances: Instances;
  resources: Resources;
}) => {
  const formProps = new Map<
    Instance["id"],
    { method?: string; action?: string }
  >();
  for (const prop of props.values()) {
    if (
      prop.name === "method" &&
      prop.type === "string" &&
      instances.get(prop.instanceId)?.component === "WebhookForm"
    ) {
      let data = formProps.get(prop.instanceId);
      if (data === undefined) {
        data = {};
        formProps.set(prop.instanceId, data);
      }
      data.method = prop.value;
      props.delete(prop.id);
    }
    if (
      prop.name === "action" &&
      prop.type === "string" &&
      prop.value &&
      instances.get(prop.instanceId)?.component === "WebhookForm"
    ) {
      let data = formProps.get(prop.instanceId);
      if (data === undefined) {
        data = {};
        formProps.set(prop.instanceId, data);
      }
      data.action = prop.value;
      props.set(prop.id, {
        id: prop.id,
        instanceId: prop.instanceId,
        name: prop.name,
        type: "resource",
        value: prop.instanceId,
      });
    }
  }
  for (const [instanceId, { action, method }] of formProps) {
    if (action) {
      resources.set(instanceId, {
        id: instanceId,
        name: "action",
        method: getMethod(method),
        url: JSON.stringify(action),
        headers: [
          { name: "Content-Type", value: JSON.stringify("application/json") },
        ],
      });
    }
  }
};
