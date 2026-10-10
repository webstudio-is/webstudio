import { useStore } from "@nanostores/react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { AlertIcon } from "@webstudio-is/icons";
import {
  Combobox,
  cssVar,
  Flex,
  Grid,
  InputErrorsTooltip,
  Label,
  ProChip,
  Select,
  Tooltip,
} from "@webstudio-is/design-system";
import { type DataSource } from "@webstudio-is/sdk";
import {
  findAvailableVariables,
  findUnsetVariableNames,
} from "@webstudio-is/project-build/runtime";
import { validateDataVariableName } from "~/builder/shared/data-variable-utils";
import { $permissions, $selectedInstance } from "~/shared/nano-states";
import {
  $dataSources,
  $instances,
  $props,
  $resources,
} from "~/shared/sync/data-stores";
import type { VariableType } from "./variable-types";

export const NameField = ({
  variable,
  defaultValue,
  value: controlledValue,
  onChange: onControlledChange,
}: {
  variable: undefined | DataSource;
  defaultValue: string;
  value?: string;
  onChange?: (value: string) => void;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const nameId = useId();
  const scopeInstanceId =
    variable?.scopeInstanceId ?? $selectedInstance.get()?.id;
  const validateName = useCallback(
    (value: string) => {
      const error = validateDataVariableName(
        value,
        variable?.id,
        scopeInstanceId
      );
      return error?.message ?? "";
    },
    [variable, scopeInstanceId]
  );
  const [localValue, setLocalValue] = useState(defaultValue);
  const value = controlledValue ?? localValue;
  const setValue = (newValue: string) => {
    setLocalValue(newValue);
    onControlledChange?.(newValue);
  };
  const instances = useStore($instances);
  const dataSources = useStore($dataSources);
  const shadowed = scopeInstanceId
    ? [
        ...findAvailableVariables({
          startingInstanceId: scopeInstanceId,
          instances,
          dataSources: new Map(
            [...dataSources].filter(
              ([, source]) => source.scopeInstanceId !== scopeInstanceId
            )
          ),
        }).values(),
      ].find(
        (source) =>
          source.scopeInstanceId !== scopeInstanceId && source.name === value
      )
    : undefined;
  useEffect(() => {
    ref.current?.setCustomValidity(validateName(value));
  }, [value, validateName]);
  return (
    <Grid gap={1}>
      <Flex gap="1" align="center">
        <Label htmlFor={nameId}>Name</Label>
        {shadowed && (
          <Tooltip
            content={`This name shadows a variable from ${instances.get(shadowed.scopeInstanceId ?? "")?.label ?? instances.get(shadowed.scopeInstanceId ?? "")?.component ?? "an ancestor"}. Both variables are allowed.`}
          >
            <AlertIcon color={cssVar("--foreground-warning")} />
          </Tooltip>
        )}
      </Flex>
      <InputErrorsTooltip errors={error ? [error] : undefined}>
        <Combobox<string>
          inputRef={ref}
          name="name"
          id={nameId}
          color={error ? "error" : undefined}
          itemToString={(item) => item ?? ""}
          getDescription={() => (
            <>
              Enter a new variable or select
              <br />
              a variable that has been used
              <br />
              in expressions but not yet created
            </>
          )}
          getItems={() => {
            // find unset variables for variable instance
            // and fallback to selected instance for new variables
            const scopeInstanceId =
              variable?.scopeInstanceId ?? $selectedInstance.get()?.id;
            if (scopeInstanceId === undefined) {
              return [];
            }
            return findUnsetVariableNames({
              startingInstanceId: scopeInstanceId,
              instances: $instances.get(),
              props: $props.get(),
              dataSources: $dataSources.get(),
              resources: $resources.get(),
            });
          }}
          value={value}
          onItemSelect={(newValue) => {
            ref.current?.setCustomValidity(validateName(newValue));
            setValue(newValue);
            setError("");
          }}
          onChange={(newValue = "") => {
            ref.current?.setCustomValidity(validateName(newValue));
            setValue(newValue);
            setError("");
          }}
          onBlur={() => ref.current?.checkValidity()}
          onInvalid={(event) => setError(event.currentTarget.validationMessage)}
        />
      </InputErrorsTooltip>
    </Grid>
  );
};

export const TypeField = ({
  value,
  onChange,
}: {
  value: VariableType;
  onChange: (value: VariableType) => void;
}) => {
  const { allowDynamicData } = useStore($permissions);
  const getResourceTypeLabel = (label: string) => (
    <Flex direction="row" gap="2" align="center">
      {label}
      {allowDynamicData === false && <ProChip>Pro</ProChip>}
    </Flex>
  );
  const optionsList: Array<{
    value: VariableType;
    disabled?: boolean;
    label: ReactNode;
    description: string;
  }> = [
    {
      value: "string",
      label: "String",
      description: "Any alphanumeric text.",
    },
    {
      value: "number",
      label: "Number",
      description: "Any number, can be used in math expressions.",
    },
    {
      value: "boolean",
      label: "Boolean",
      description: "A boolean is a true/false switch.",
    },
    {
      value: "json",
      label: "JSON",
      description: "Any JSON value",
    },
    {
      value: "resource",
      label: getResourceTypeLabel("Resource"),
      description:
        "A REST resource is a configuration for secure data fetching. You can safely use secrets in any field.",
    },
    {
      value: "graphql-resource",
      label: getResourceTypeLabel("GraphQL"),
      description:
        "A GraphQL resource is a configuration for secure data fetching with GraphQL. You can safely use secrets in any field.",
    },
    {
      value: "sitemap-resource",
      label: getResourceTypeLabel("Sitemap"),
      description: "Resource that loads the sitemap data of the current site.",
    },
    {
      value: "current-date-resource",
      label: getResourceTypeLabel("Current date"),
      description:
        "Provides current date information (year, month, day) normalized to midnight UTC. Time components are set to 00:00:00 to prevent React hydration errors.",
    },
    {
      value: "assets-resource",
      label: getResourceTypeLabel("Assets"),
      description:
        "Loads all project assets by default, with optional filters, sorting, pagination, and file content.",
    },
    {
      value: "email-resource",
      label: getResourceTypeLabel("Email"),
      description:
        "Send a plain-text email through Webstudio Cloud when a Form is submitted.",
    },
  ];
  const options = new Map(optionsList.map((option) => [option.value, option]));

  return (
    <Grid gap="1">
      <Label>Type</Label>
      <Select
        options={Array.from(options.keys())}
        getLabel={(option: VariableType) => options.get(option)?.label}
        getItemProps={(option) => ({
          disabled: options.get(option)?.disabled,
        })}
        getDescription={(option) => options.get(option)?.description}
        value={value}
        name="type"
        onChange={onChange}
      />
    </Grid>
  );
};
