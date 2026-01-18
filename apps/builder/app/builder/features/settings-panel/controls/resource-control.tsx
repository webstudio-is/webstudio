import { nanoid } from "nanoid";
import { computed } from "nanostores";
import {
  forwardRef,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { useStore } from "@nanostores/react";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { GearIcon } from "@webstudio-is/icons";
import {
  EnhancedTooltip,
  Flex,
  FloatingPanel,
  InputField,
  NestedInputButton,
  theme,
} from "@webstudio-is/design-system";
import { isLiteralExpression, Resource, type Prop } from "@webstudio-is/sdk";
import {
  BindingControl,
  BindingPopover,
  validatePrimitiveValue,
  type BindingVariant,
} from "~/builder/shared/binding-popover";
import {
  $dataSources,
  $props,
  $resources,
  $variableValuesByInstanceSelector,
} from "~/shared/nano-states";
import { computeExpression } from "~/shared/data-variables";
import { updateWebstudioData } from "~/shared/instance-utils";
import {
  $selectedInstance,
  $selectedInstanceKeyWithRoot,
  $selectedPage,
} from "~/shared/awareness";
import {
  UrlField,
  MethodField,
  Headers,
  parseResource,
  getResourceScopeForInstance,
} from "../resource-panel";
import { type ControlProps, useLocalValue, VerticalLayout } from "../shared";
import { PropertyLabel } from "../property-label";

// dirty, dirty hack
const areAllFormErrorsVisible = (form: null | HTMLFormElement) => {
  if (form === null) {
    return false;
  }
  // check all errors in form fields are visible
  for (const element of form.elements) {
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    ) {
      // field is invalid and the error is not visible
      if (
        element.validity.valid === false &&
        // rely on data-color=error convention in webstudio design system
        element.getAttribute("data-color") !== "error"
      ) {
        return false;
      }
    }
  }
  return true;
};

const ResourceButton = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof NestedInputButton>
>((props, ref) => {
  return (
    <EnhancedTooltip content="Edit Resource">
      <NestedInputButton {...props} ref={ref} aria-label="Edit Resource">
        <GearIcon />
      </NestedInputButton>
    </EnhancedTooltip>
  );
});
ResourceButton.displayName = "ResourceButton";

const $selectedInstanceResourceScope = computed(
  [
    $selectedPage,
    $selectedInstanceKeyWithRoot,
    $variableValuesByInstanceSelector,
    $dataSources,
  ],
  (page, instanceKey, variableValuesByInstanceSelector, dataSources) => {
    return getResourceScopeForInstance({
      page,
      instanceKey,
      dataSources,
      variableValuesByInstanceSelector,
    });
  }
);

const ResourceForm = ({ resource }: { resource: Resource }) => {
  const { scope, aliases } = useStore($selectedInstanceResourceScope);
  const [url, setUrl] = useState(resource.url);
  const [method, setMethod] = useState<Resource["method"]>(resource.method);
  const [headers, setHeaders] = useState<Resource["headers"]>(resource.headers);
  return (
    <Flex
      direction="column"
      css={{
        width: theme.spacing[30],
        overflow: "hidden",
        gap: theme.spacing[9],
        p: theme.spacing[9],
      }}
    >
      <UrlField
        scope={scope}
        aliases={aliases}
        value={url}
        onChange={setUrl}
        onCurlPaste={(curl) => {
          // update all feilds when curl is paste into url field
          setUrl(JSON.stringify(curl.url));
          setMethod(curl.method);
          setHeaders(
            curl.headers.map((header) => ({
              name: header.name,
              value: JSON.stringify(header.value),
            }))
          );
        }}
      />
      <MethodField value={method} onChange={setMethod} />
      <Headers
        scope={scope}
        aliases={aliases}
        headers={headers}
        onChange={setHeaders}
      />
    </Flex>
  );
};

const ResourceControlPanel = ({
  resource,
  propName,
  onChange,
}: {
  resource: Resource;
  propName: string;
  onChange: (resource: Resource) => void;
}) => {
  const [isResourceOpen, setIsResourceOpen] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  return (
    <FloatingPanel
      title="Edit Resource"
      open={isResourceOpen}
      onOpenChange={(isOpen) => {
        if (isOpen) {
          setIsResourceOpen(true);
          return;
        }
        // attempt to save form on close
        if (areAllFormErrorsVisible(form.current)) {
          form.current?.requestSubmit();
          setIsResourceOpen(false);
        } else {
          form.current?.checkValidity();
          // prevent closing when not all errors are shown to user
        }
      }}
      content={
        <form
          ref={form}
          // ref={formRef}
          noValidate={true}
          // exclude from the flow
          style={{ display: "contents" }}
          onSubmit={(event) => {
            event.preventDefault();
            if (event.currentTarget.checkValidity()) {
              const formData = new FormData(event.currentTarget);
              const newResource = parseResource({
                id: resource?.id ?? nanoid(),
                name: resource?.name ?? propName,
                formData,
              });
              onChange(newResource);
            }
          }}
        >
          {/* submit is not triggered when press enter on input without submit button */}
          <button hidden></button>
          <ResourceForm resource={resource} />
        </form>
      }
    >
      <ResourceButton />
    </FloatingPanel>
  );
};

const $methodPropValue = computed(
  [$selectedInstance, $props],
  (instance, props): Resource["method"] => {
    for (const prop of props.values()) {
      if (
        prop.instanceId === instance?.id &&
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
          return value;
        }
        break;
      }
    }
    return "post";
  }
);

export const ResourceControl = ({
  instanceId,
  propName,
  prop,
}: ControlProps<"resource">) => {
  const resources = useStore($resources);
  const { variableValues, scope, aliases } = useStore(
    $selectedInstanceResourceScope
  );
  const methodPropValue = useStore($methodPropValue);
  let resource: undefined | Resource;
  let urlExpression: string = JSON.stringify("");
  if (prop?.type === "string") {
    urlExpression = JSON.stringify(prop.value);
  }
  if (prop?.type === "expression") {
    urlExpression = prop.value;
  }
  if (prop?.type === "resource") {
    resource = resources.get(prop.value);
    if (resource) {
      urlExpression = resource.url;
    }
  }
  // create temporary resource
  const resourceId = useMemo(() => resource?.id ?? nanoid(), [resource]);
  resource ??= {
    id: resourceId,
    name: propName,
    url: urlExpression,
    method: methodPropValue,
    headers: [{ name: "Content-Type", value: `"application/json"` }],
  };

  const updateResource = (newResource: Resource) => {
    updateWebstudioData((data) => {
      if (prop?.type === "resource") {
        data.resources.set(newResource.id, newResource);
      } else {
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

  const id = useId();
  let variant: BindingVariant = "bound";
  let readOnly = true;
  if (isLiteralExpression(urlExpression)) {
    variant = "default";
    readOnly = false;
  }
  const localValue = useLocalValue(
    String(computeExpression(resource.url, variableValues) ?? ""),
    (value) => updateResource({ ...resource, url: JSON.stringify(value) })
  );

  return (
    <VerticalLayout
      label={<PropertyLabel name={propName} readOnly={readOnly} />}
    >
      <BindingControl>
        <InputField
          id={id}
          disabled={readOnly}
          value={localValue.value}
          onChange={(event) => localValue.set(event.target.value)}
          onBlur={localValue.save}
          onSubmit={localValue.save}
          suffix={
            isFeatureEnabled("resourceProp") && (
              <ResourceControlPanel
                resource={resource}
                propName={propName}
                onChange={updateResource}
              />
            )
          }
        />
        <BindingPopover
          scope={scope}
          aliases={aliases}
          validate={(value) => validatePrimitiveValue(value, "URL")}
          variant={variant}
          value={urlExpression}
          onChange={(newExpression) =>
            updateResource({ ...resource, url: newExpression })
          }
          onRemove={(evaluatedValue) =>
            updateResource({
              ...resource,
              url: JSON.stringify(String(evaluatedValue)),
            })
          }
        />
      </BindingControl>
    </VerticalLayout>
  );
};
