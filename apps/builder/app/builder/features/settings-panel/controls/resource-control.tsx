import { computed } from "nanostores";
import { useId } from "react";
import { useStore } from "@nanostores/react";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { GearIcon } from "@webstudio-is/icons";
import {
  Button,
  Flex,
  InputField,
  Select,
  SmallIconButton,
  Text,
} from "@webstudio-is/design-system";
import {
  isLiteralExpression,
  parseStringLiteralExpression,
} from "@webstudio-is/expression";
import type { DataSource } from "@webstudio-is/sdk";
import {
  computeExpression,
  createResourceFieldsFromResource,
  findAvailableVariables,
  validatePrimitiveValue,
} from "@webstudio-is/project-build/runtime";
import { BindableExpressionControl } from "~/builder/shared/bindable-expression";
import {
  $selectedInstanceKeyWithRoot,
  $selectedPage,
  $variableValuesByInstanceSelector,
} from "~/shared/nano-states";
import { useAsyncValue } from "~/shared/use-async-value";
import {
  $dataSources,
  $instances,
  $resources,
} from "~/shared/sync/data-stores";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { getResourceScopeForInstance } from "../resource-panel";
import { VariablePopoverTrigger } from "../variable-popover";
import { useDraftValue } from "~/builder/shared/use-draft-value";
import { type ControlProps, VerticalLayout } from "../shared";
import { PropertyLabel } from "../property-label";

const $selectedInstanceResourceScope = computed(
  [
    $selectedPage,
    $selectedInstanceKeyWithRoot,
    $variableValuesByInstanceSelector,
    $dataSources,
  ],
  (page, instanceKey, variableValuesByInstanceSelector, dataSources) =>
    getResourceScopeForInstance({
      page,
      instanceKey,
      dataSources,
      variableValuesByInstanceSelector,
    })
);

export const ResourceControl = ({
  instanceId,
  propName,
  prop,
  onChange,
}: ControlProps<"resource">) => {
  const resources = useStore($resources);
  const dataSources = useStore($dataSources);
  const instances = useStore($instances);
  const { variableValues, scope, aliases } = useStore(
    $selectedInstanceResourceScope
  );
  const availableVariables = findAvailableVariables({
    startingInstanceId: instanceId,
    instances,
    dataSources,
  });
  const resourceVariables = Array.from(availableVariables.values()).filter(
    (variable): variable is Extract<DataSource, { type: "resource" }> =>
      variable.type === "resource" &&
      resources.has(variable.resourceId) &&
      resources.get(variable.resourceId)?.control !== "system"
  );
  const resource =
    prop?.type === "resource" ? resources.get(prop.value) : undefined;
  const variable = Array.from(dataSources.values()).find(
    (variable) =>
      variable.type === "resource" && variable.resourceId === resource?.id
  );
  const urlExpression =
    resource?.url ??
    (prop?.type === "expression"
      ? prop.value
      : JSON.stringify(prop?.type === "string" ? prop.value : ""));
  const evaluatedUrl = useAsyncValue(
    async () =>
      prop?.type === "resource"
        ? ""
        : computeExpression(urlExpression, variableValues),
    [urlExpression, variableValues, prop?.type],
    undefined
  );
  const bound = isLiteralExpression(urlExpression) === false;
  const localValue = useDraftValue(String(evaluatedUrl ?? ""), (value) => {
    if (prop?.type !== "resource" && !bound) {
      onChange({ type: "string", value });
    }
  });
  const id = useId();
  const updateUrl = (expression: string) => {
    const literalUrl = parseStringLiteralExpression(expression);
    onChange(
      literalUrl === undefined
        ? { type: "expression", value: expression }
        : { type: "string", value: literalUrl }
    );
  };
  const options = new Map([
    ["url", "URL"],
    ...resourceVariables.map(
      (variable) => [`resource:${variable.resourceId}`, variable.name] as const
    ),
  ]);
  // Keep legacy or out-of-scope references visible until the user replaces them.
  if (
    prop?.type === "resource" &&
    options.has(`resource:${prop.value}`) === false
  ) {
    options.set(
      `resource:${prop.value}`,
      variable?.name ?? resource?.name ?? "Missing Resource"
    );
  }

  return (
    <VerticalLayout
      label={
        <PropertyLabel
          name={propName}
          readOnly={prop?.type !== "resource" && bound}
        />
      }
    >
      {(isFeatureEnabled("resourceProp") || prop?.type === "resource") && (
        <Flex gap="1" css={{ width: "100%" }}>
          <Select
            aria-label="Action source"
            value={prop?.type === "resource" ? `resource:${prop.value}` : "url"}
            options={Array.from(options.keys())}
            getLabel={(value) => options.get(value)}
            onChange={(value) => {
              if (value === "url") {
                updateUrl(urlExpression);
              } else {
                onChange({
                  type: "resource",
                  value: value.slice("resource:".length),
                });
              }
            }}
          />
          {variable && (
            <VariablePopoverTrigger key={variable.id} variable={variable}>
              <SmallIconButton
                aria-label="Edit Resource variable"
                icon={<GearIcon />}
              />
            </VariablePopoverTrigger>
          )}
        </Flex>
      )}
      {prop?.type === "resource" ? (
        resource &&
        variable === undefined && (
          <Button
            color="neutral"
            onClick={() => {
              const names = new Set(
                Array.from(
                  availableVariables.values(),
                  (variable) => variable.name
                )
              );
              const baseName = resource.name || "Action";
              let name = baseName;
              for (let suffix = 2; names.has(name); suffix += 1) {
                name = `${baseName} ${suffix}`;
              }
              executeRuntimeMutation({
                id: "resources.upsert",
                input: {
                  resourceId: resource.id,
                  resource: createResourceFieldsFromResource({
                    ...resource,
                    name,
                  }),
                  scopeInstanceId: instanceId,
                  dataSourceName: name,
                },
              });
            }}
          >
            Make Resource variable
          </Button>
        )
      ) : (
        <BindableExpressionControl
          expression={urlExpression}
          value={localValue.value}
          bound={bound}
          scope={scope}
          aliases={aliases}
          validate={(value) => validatePrimitiveValue(value, "URL")}
          onChangeValue={(value) => onChange({ type: "string", value })}
          onChangeExpression={updateUrl}
          onRemove={(value) =>
            onChange({ type: "string", value: String(value ?? "") })
          }
          renderControl={({ readOnly }) => (
            <InputField
              id={id}
              aria-label="Action URL"
              disabled={readOnly}
              value={localValue.value}
              onChange={(event) => localValue.set(event.target.value)}
              onBlur={localValue.save}
              onSubmit={localValue.save}
            />
          )}
        />
      )}
      {isFeatureEnabled("resourceProp") &&
        resourceVariables.length === 0 &&
        prop?.type !== "resource" && (
          <Text color="subtle">
            Create a Resource variable in Variables to use it here.
          </Text>
        )}
    </VerticalLayout>
  );
};
