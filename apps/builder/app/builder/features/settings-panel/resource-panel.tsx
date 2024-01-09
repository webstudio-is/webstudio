import { computed } from "nanostores";
import { nanoid } from "nanoid";
import {
  forwardRef,
  useId,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { useStore } from "@nanostores/react";
import type { DataSource, Resource } from "@webstudio-is/sdk";
import { encodeDataSourceVariable } from "@webstudio-is/react-sdk";
import {
  Box,
  Button,
  Flex,
  Grid,
  InputErrorsTooltip,
  InputField,
  Label,
  Select,
  SmallIconButton,
  TextArea,
  theme,
} from "@webstudio-is/design-system";
import { DeleteIcon, PlusIcon } from "@webstudio-is/icons";
import { humanizeString } from "~/shared/string-utils";
import { serverSyncStore } from "~/shared/sync";
import {
  $dataSources,
  $resources,
  $selectedInstanceSelector,
  $variableValuesByInstanceSelector,
} from "~/shared/nano-states";
import {
  BindingControl,
  BindingPopover,
  evaluateExpressionWithinScope,
  isLiteralExpression,
} from "~/builder/shared/binding-popover";
import {
  type Field,
  type ComposedFields,
  useField,
  composeFields,
} from "~/shared/form-utils";

const validateHeaderName = (value: string) =>
  value.trim().length === 0 ? "Header name is required" : undefined;

const validateHeaderValue = (value: string, scope: Record<string, unknown>) => {
  const evaluatedValue = evaluateExpressionWithinScope(value, scope);
  if (typeof evaluatedValue !== "string") {
    return "Header value expects a string";
  }
  if (evaluatedValue.length === 0) {
    return "Header value is required";
  }
};

const HeaderPair = ({
  editorAliases,
  editorScope,
  name,
  value,
  onChange,
  onDelete,
}: {
  editorAliases: Map<string, string>;
  editorScope: Record<string, unknown>;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  onDelete: () => void;
}) => {
  const nameId = useId();
  const valueId = useId();

  // temporary fields to validate name and value only onBlur
  // invalid headers will be removed on save
  const nameField = useField({
    initialValue: name,
    validate: validateHeaderName,
  });
  const valueField = useField({
    initialValue: value,
    validate: (value) => validateHeaderValue(value, editorScope),
  });

  return (
    <Grid
      gap={2}
      align={"center"}
      css={{
        gridTemplateColumns: `${theme.spacing[18]} 1fr 19px`,
        gridTemplateAreas: `
         "name name-input button"
         "value  value-input  button"
        `,
      }}
    >
      <Label htmlFor={nameId} css={{ gridArea: "name" }}>
        Name
      </Label>
      <InputErrorsTooltip
        errors={nameField.error ? [nameField.error] : undefined}
      >
        <InputField
          css={{ gridArea: "name-input" }}
          id={nameId}
          color={nameField.error ? "error" : undefined}
          value={name}
          onChange={(event) => {
            nameField.onChange(event.target.value);
            onChange(event.target.value, value);
          }}
          onBlur={nameField.onBlur}
        />
      </InputErrorsTooltip>
      <Label htmlFor={valueId} css={{ gridArea: "value" }}>
        Value
      </Label>
      <Box css={{ gridArea: "value-input", position: "relative" }}>
        <BindingControl>
          <BindingPopover
            scope={editorScope}
            aliases={editorAliases}
            value={value}
            onChange={(newValue) => {
              valueField.onChange(newValue);
              valueField.onBlur();
              onChange(name, newValue);
            }}
            onRemove={(evaluatedValue) => {
              valueField.onChange(JSON.stringify(evaluatedValue));
              valueField.onBlur();
              onChange(name, JSON.stringify(evaluatedValue));
            }}
          />
          <InputErrorsTooltip
            errors={valueField.error ? [valueField.error] : undefined}
          >
            <InputField
              id={valueId}
              // expressions with variables cannot be edited
              disabled={isLiteralExpression(value) === false}
              color={valueField.error ? "error" : undefined}
              value={String(evaluateExpressionWithinScope(value, editorScope))}
              // update text value as string literal
              onChange={(event) => {
                valueField.onChange(JSON.stringify(event.target.value));
                onChange(name, JSON.stringify(event.target.value));
              }}
              onBlur={valueField.onBlur}
            />
          </InputErrorsTooltip>
        </BindingControl>
      </Box>

      <Grid
        css={{
          gridArea: "button",
          justifyItems: "center",
          gap: "2px",
          color: theme.colors.foregroundIconSecondary,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="19"
          height="11"
          viewBox="0 0 19 11"
          fill="currentColor"
        >
          <path d="M10 10.05V6.05005C10 2.73634 7.31371 0.0500488 4 0.0500488H0V1.05005H4C6.76142 1.05005 9 3.28863 9 6.05005V10.05H10Z" />
        </svg>
        <SmallIconButton
          variant="destructive"
          icon={<DeleteIcon />}
          onClick={onDelete}
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="19"
          height="11"
          viewBox="0 0 19 11"
          fill="currentColor"
        >
          <path d="M-4.37114e-07 10.05L4 10.05C7.31371 10.05 10 7.36376 10 4.05005L10 0.0500488L9 0.0500488L9 4.05005C9 6.81147 6.76142 9.05005 4 9.05005L-3.93402e-07 9.05005L-4.37114e-07 10.05Z" />
        </svg>
      </Grid>
    </Grid>
  );
};

const Headers = ({
  editorScope,
  editorAliases,
  headers,
  onChange,
}: {
  editorAliases: Map<string, string>;
  editorScope: Record<string, unknown>;
  headers: Resource["headers"];
  onChange: (headers: Resource["headers"]) => void;
}) => {
  return (
    <Grid gap={3}>
      {headers.map((header, index) => (
        <HeaderPair
          key={index}
          editorScope={editorScope}
          editorAliases={editorAliases}
          name={header.name}
          value={header.value}
          onChange={(name, value) => {
            const newHeaders = [...headers];
            newHeaders[index] = { name, value };
            onChange(newHeaders);
          }}
          onDelete={() => {
            const newHeaders = [...headers];
            newHeaders.splice(index, 1);
            onChange(newHeaders);
          }}
        />
      ))}
      <Button
        type="button"
        color="neutral"
        css={{ justifySelf: "center" }}
        prefix={<PlusIcon />}
        onClick={() => {
          // use empty string expression as default
          const newHeaders = [...headers, { name: "", value: `""` }];
          onChange(newHeaders);
        }}
      >
        Add another header pair
      </Button>
    </Grid>
  );
};

const $selectedInstanceScope = computed(
  [$selectedInstanceSelector, $variableValuesByInstanceSelector, $dataSources],
  (instanceSelector, variableValuesByInstanceSelector, dataSources) => {
    const scope: Record<string, unknown> = {};
    const aliases = new Map<string, string>();
    if (instanceSelector === undefined) {
      return { scope, aliases };
    }
    const values = variableValuesByInstanceSelector.get(
      JSON.stringify(instanceSelector)
    );
    if (values) {
      for (const [dataSourceId, value] of values) {
        const dataSource = dataSources.get(dataSourceId);
        // prevent resources using data of other resources
        if (dataSource === undefined || dataSource.type === "resource") {
          continue;
        }
        const name = encodeDataSourceVariable(dataSourceId);
        scope[name] = value;
        aliases.set(name, dataSource.name);
      }
    }
    return { scope, aliases };
  }
);

type PanelApi = ComposedFields & {
  save: () => void;
};

export const ResourceForm = forwardRef<
  undefined | PanelApi,
  { variable?: DataSource; nameField: Field<string> }
>(({ variable, nameField }, ref) => {
  const { scope: scopeWithCurrentVariable, aliases } = useStore(
    $selectedInstanceScope
  );
  const currentVariableId = variable?.id;
  // prevent showing currently edited variable in suggestions
  // to avoid cirular dependeny
  const scope = useMemo(() => {
    if (currentVariableId === undefined) {
      return scopeWithCurrentVariable;
    }
    const newScope: Record<string, unknown> = { ...scopeWithCurrentVariable };
    delete newScope[encodeDataSourceVariable(currentVariableId)];
    return newScope;
  }, [scopeWithCurrentVariable, currentVariableId]);

  const resources = useStore($resources);
  const resource =
    variable?.type === "resource"
      ? resources.get(variable.resourceId)
      : undefined;

  const urlField = useField<string>({
    initialValue: resource?.url ?? `""`,
    validate: (value) => {
      const evaluatedValue = evaluateExpressionWithinScope(value, scope);
      if (typeof evaluatedValue !== "string") {
        return "URL expects a string";
      }
      if (evaluatedValue.length === 0) {
        return "URL is required";
      }
    },
  });
  const [method, setMethod] = useState<Resource["method"]>(
    resource?.method ?? "get"
  );
  const headersField = useField<Resource["headers"]>({
    initialValue: resource?.headers ?? [],
    validate: (_value) => undefined,
  });
  const bodyField = useField<string>({
    initialValue: resource?.body ?? `""`,
    validate: (value) => {
      const evaluatedValue = evaluateExpressionWithinScope(value, scope);
      if (typeof evaluatedValue !== "string") {
        return "Body expects a string";
      }
    },
  });

  const form = composeFields(nameField, urlField, headersField, bodyField);
  useImperativeHandle(ref, () => ({
    ...form,
    save: () => {
      const instanceSelector = $selectedInstanceSelector.get();
      if (instanceSelector === undefined) {
        return;
      }
      const [instanceId] = instanceSelector;
      const newHeaders = headersField.value.flatMap((header) => {
        // exclude invalid headers
        if (
          validateHeaderName(header.name) !== undefined ||
          validateHeaderValue(header.value, scope) !== undefined
        ) {
          return [];
        }
        return [header];
      });
      // clear invalid headers on save
      headersField.onChange(newHeaders);
      const newResource: Resource = {
        id: resource?.id ?? nanoid(),
        name: nameField.value,
        url: urlField.value,
        method,
        headers: newHeaders,
        body: bodyField.value,
      };
      const newVariable: DataSource = {
        id: variable?.id ?? nanoid(),
        // preserve existing instance scope when edit
        scopeInstanceId: variable?.scopeInstanceId ?? instanceId,
        name: nameField.value,
        type: "resource",
        resourceId: newResource.id,
      };
      serverSyncStore.createTransaction(
        [$dataSources, $resources],
        (dataSources, resources) => {
          dataSources.set(newVariable.id, newVariable);
          resources.set(newResource.id, newResource);
        }
      );
    },
  }));

  const urlId = useId();

  return (
    <>
      <Flex direction="column" css={{ gap: theme.spacing[3] }}>
        <Label htmlFor={urlId}>URL</Label>
        <BindingControl>
          <BindingPopover
            scope={scope}
            aliases={aliases}
            value={urlField.value}
            onChange={(value) => {
              urlField.onChange(value);
              urlField.onBlur();
            }}
            onRemove={(evaluatedValue) => {
              urlField.onChange(JSON.stringify(evaluatedValue));
              urlField.onBlur();
            }}
          />
          <InputErrorsTooltip
            errors={urlField.error ? [urlField.error] : undefined}
          >
            <InputField
              id={urlId}
              // expressions with variables cannot be edited
              disabled={isLiteralExpression(urlField.value) === false}
              color={urlField.error ? "error" : undefined}
              value={String(
                evaluateExpressionWithinScope(urlField.value, scope)
              )}
              // update text value as string literal
              onChange={(event) =>
                urlField.onChange(JSON.stringify(event.target.value))
              }
              onBlur={urlField.onBlur}
            />
          </InputErrorsTooltip>
        </BindingControl>
      </Flex>
      <Flex direction="column" css={{ gap: theme.spacing[3] }}>
        <Label>Method</Label>
        <Select<Resource["method"]>
          options={["get", "post", "put", "delete"]}
          getLabel={humanizeString}
          value={method}
          onChange={(newValue) => setMethod(newValue)}
        />
      </Flex>
      <Flex direction="column" css={{ gap: theme.spacing[3] }}>
        <Label>Headers</Label>
        <Headers
          editorScope={scope}
          editorAliases={aliases}
          headers={headersField.value}
          onChange={headersField.onChange}
        />
      </Flex>
      {method !== "get" && (
        <Flex direction="column" css={{ gap: theme.spacing[3] }}>
          <Label>Body</Label>
          <BindingControl>
            <BindingPopover
              scope={scope}
              aliases={aliases}
              value={bodyField.value}
              onChange={(value) => {
                bodyField.onChange(value);
                bodyField.onBlur();
              }}
              onRemove={(evaluatedValue) => {
                bodyField.onChange(JSON.stringify(evaluatedValue));
                bodyField.onBlur();
              }}
            />
            <InputErrorsTooltip
              errors={bodyField.error ? [bodyField.error] : undefined}
            >
              <TextArea
                autoGrow={true}
                maxRows={10}
                // expressions with variables cannot be edited
                disabled={isLiteralExpression(bodyField.value) === false}
                state={bodyField.error ? "invalid" : undefined}
                value={String(
                  evaluateExpressionWithinScope(bodyField.value, scope)
                )}
                // update text value as string literal
                onChange={(newValue) =>
                  bodyField.onChange(JSON.stringify(newValue))
                }
                onBlur={bodyField.onBlur}
              />
            </InputErrorsTooltip>
          </BindingControl>
        </Flex>
      )}
    </>
  );
});
ResourceForm.displayName = "ResourceForm";
