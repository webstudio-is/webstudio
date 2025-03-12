import { useId } from "react";
import { useStore } from "@nanostores/react";
import { InputField } from "@webstudio-is/design-system";
import { isLiteralExpression, Resource, type Prop } from "@webstudio-is/sdk";
import {
  BindingControl,
  BindingPopover,
  type BindingVariant,
} from "~/builder/shared/binding-popover";
import {
  type ControlProps,
  useLocalValue,
  ResponsiveLayout,
  Label,
  humanizeAttribute,
} from "../shared";
import { $resources } from "~/shared/nano-states";
import { $selectedInstanceResourceScope } from "../resource-panel";
import { computeExpression } from "~/shared/data-variables";
import { updateWebstudioData } from "~/shared/instance-utils";
import { nanoid } from "nanoid";

export const ResourceControl = ({
  meta,
  prop,
  propName,
  instanceId,
  deletable,
}: ControlProps<"resource">) => {
  const resources = useStore($resources);
  const { variableValues, scope, aliases } = useStore(
    $selectedInstanceResourceScope
  );

  let computedValue: unknown;
  let expression: string = JSON.stringify("");
  if (prop?.type === "string") {
    expression = JSON.stringify(prop.value);
    computedValue = prop.value;
  }
  if (prop?.type === "expression") {
    expression = prop.value;
    computedValue = computeExpression(prop.value, variableValues);
  }
  if (prop?.type === "resource") {
    const resource = resources.get(prop.value);
    if (resource) {
      expression = resource.url;
      computedValue = computeExpression(resource.url, variableValues);
    }
  }

  const updateResourceUrl = (urlExpression: string) => {
    updateWebstudioData((data) => {
      if (prop?.type === "resource") {
        const resource = data.resources.get(prop.value);
        if (resource) {
          resource.url = urlExpression;
        }
      } else {
        let method: Resource["method"] = "post";
        for (const prop of data.props.values()) {
          if (
            prop.instanceId === instanceId &&
            prop.type === "string" &&
            prop.name === "method"
          ) {
            const value = prop.value.toLowerCase();
            if (
              value === "get" ||
              value === "post" ||
              value === "put" ||
              value === "delete"
            ) {
              method = value;
            }
            break;
          }
        }

        const newResource: Resource = {
          id: nanoid(),
          name: propName,
          url: urlExpression,
          method,
          headers: [{ name: "Content-Type", value: `"application/json"` }],
        };
        const newProp: Prop = {
          id: prop?.id ?? nanoid(),
          instanceId,
          name: propName,
          type: "resource",
          value: newResource.id,
        };
        data.props.set(newProp.id, newProp);
        data.resources.set(newResource.id, newResource);
      }
    });
  };

  const deletePropAndResource = () => {
    updateWebstudioData((data) => {
      if (prop?.type === "resource") {
        data.resources.delete(prop.value);
      }
      if (prop) {
        data.props.delete(prop.id);
      }
    });
  };

  const id = useId();
  const label = humanizeAttribute(meta.label || propName);
  let variant: BindingVariant = "bound";
  let readOnly = true;
  if (isLiteralExpression(expression)) {
    variant = "default";
    readOnly = false;
  }
  const localValue = useLocalValue(String(computedValue ?? ""), (value) =>
    updateResourceUrl(JSON.stringify(value))
  );

  return (
    <ResponsiveLayout
      label={
        <Label htmlFor={id} description={meta.description} readOnly={readOnly}>
          {label}
        </Label>
      }
      deletable={deletable}
      onDelete={deletePropAndResource}
    >
      <BindingControl>
        <InputField
          id={id}
          disabled={readOnly}
          value={localValue.value}
          onChange={(event) => localValue.set(event.target.value)}
          onBlur={localValue.save}
          onSubmit={localValue.save}
        />
        <BindingPopover
          scope={scope}
          aliases={aliases}
          validate={(value) => {
            if (value !== undefined && typeof value !== "string") {
              return `${label} expects a string value`;
            }
          }}
          variant={variant}
          value={expression}
          onChange={(newExpression) => updateResourceUrl(newExpression)}
          onRemove={(evaluatedValue) =>
            updateResourceUrl(JSON.stringify(String(evaluatedValue)))
          }
        />
      </BindingControl>
    </ResponsiveLayout>
  );
};
