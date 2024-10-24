import { nanoid } from "nanoid";
import { computed } from "nanostores";
import {
  forwardRef,
  useId,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import {
  EnhancedTooltip,
  Flex,
  InputField,
  NestedInputButton,
  theme,
} from "@webstudio-is/design-system";
import { useStore } from "@nanostores/react";
import { encodeDataSourceVariable, Prop, Resource } from "@webstudio-is/sdk";
import { GearIcon } from "@webstudio-is/icons";
import { $resources, $selectedPage } from "~/shared/nano-states";
import { updateWebstudioData } from "~/shared/instance-utils";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import {
  BindingPopoverProvider,
  evaluateExpressionWithinScope,
} from "~/builder/shared/binding-popover";
import {
  humanizeAttribute,
  Label,
  ResponsiveLayout,
  setPropMutable,
  type ControlProps,
} from "../shared";
import {
  $selectedInstanceResourceScope,
  Headers,
  MethodField,
  parseResource,
  UrlField,
} from "../resource-panel";

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

// resource scope has access to system parameter
// which cannot be used in action resource
const $scope = computed(
  [$selectedInstanceResourceScope, $selectedPage],
  ({ scope, aliases }, page) => {
    if (page === undefined) {
      return { scope, aliases };
    }
    const newScope: Record<string, unknown> = { ...scope };
    const newAliases = new Map(aliases);
    const systemIdentifier = encodeDataSourceVariable(page.systemDataSourceId);
    delete newScope[systemIdentifier];
    newAliases.delete(systemIdentifier);
    return { scope: newScope, aliases: newAliases };
  }
);

const ResourceForm = ({ resource }: { resource: undefined | Resource }) => {
  const bindingPopoverContainerRef = useRef<HTMLDivElement>(null);
  // @todo exclude collection item and system
  // basically all parameter variables
  const { scope, aliases } = useStore($scope);
  const [url, setUrl] = useState(resource?.url ?? `""`);
  const [method, setMethod] = useState<Resource["method"]>(
    resource?.method ?? "post"
  );
  const [headers, setHeaders] = useState<Resource["headers"]>(
    resource?.headers ?? []
  );
  return (
    <Flex
      ref={bindingPopoverContainerRef}
      direction="column"
      css={{
        width: theme.spacing[30],
        overflow: "hidden",
        gap: theme.spacing[9],
        p: theme.spacing[9],
      }}
    >
      <BindingPopoverProvider
        value={{ containerRef: bindingPopoverContainerRef }}
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
      </BindingPopoverProvider>
    </Flex>
  );
};

const setResource = ({
  instanceId,
  propId,
  propName,
  resource,
}: {
  instanceId: Prop["instanceId"];
  propId?: Prop["id"];
  propName: Prop["name"];
  resource: Resource;
}) => {
  updateWebstudioData((data) => {
    setPropMutable({
      data,
      update: {
        id: propId ?? nanoid(),
        instanceId,
        name: propName,
        type: "resource",
        value: resource.id,
      },
    });
    data.resources.set(resource.id, resource);
  });
};

const areAllFormErrorsVisible = (form: null | HTMLFormElement) => {
  if (form === null) {
    return true;
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

export const ResourceControl = ({
  meta,
  prop,
  instanceId,
  propName,
  deletable,
  onDelete,
}: ControlProps<"resource">) => {
  const resources = useStore($resources);
  const { scope } = useStore($scope);
  const resourceId = prop?.type === "resource" ? prop.value : undefined;
  const resource = resources.get(resourceId ?? "");
  const urlExpression = resource?.url ?? `""`;
  const url = String(evaluateExpressionWithinScope(urlExpression, scope));
  const id = useId();
  const label = humanizeAttribute(meta.label ?? propName);
  const [isResourceOpen, setIsResourceOpen] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  return (
    <ResponsiveLayout
      label={
        <Label htmlFor={id} description={meta.description}>
          {label}
        </Label>
      }
      deletable={deletable}
      onDelete={onDelete}
    >
      <InputField
        id={id}
        disabled={true}
        suffix={
          <FloatingPanel
            title="Edit Resource"
            isOpen={isResourceOpen}
            onIsOpenChange={(isOpen) => {
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
                    const resource = parseResource({
                      id: resourceId ?? nanoid(),
                      name: propName,
                      formData,
                    });
                    setResource({
                      instanceId,
                      propId: prop?.id,
                      propName: propName,
                      resource,
                    });
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
        }
        value={url}
      />
    </ResponsiveLayout>
  );
};
