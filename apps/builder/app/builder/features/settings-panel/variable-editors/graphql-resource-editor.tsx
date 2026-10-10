import { VariableEditorLayout } from "./dialog/layout";
import { useResourcePreviewController } from "./shared/use-resource-preview-controller";
import type { VariableEditorProps } from "./shared/editor-types";
import { FormResourcePreview } from "./form-resource-preview";
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useStore } from "@nanostores/react";
import { z } from "zod";
import {
  generateObjectExpression,
  isLiteralExpression,
  parseExpressionObject,
  parseStringLiteralExpression,
} from "@webstudio-is/expression";
import type { DataSource } from "@webstudio-is/sdk";
import {
  Grid,
  InputErrorsTooltip,
  Label,
  TextArea,
} from "@webstudio-is/design-system";
import { $selectedInstance } from "~/shared/nano-states";
import { $resources } from "~/shared/sync/data-stores";
import { evaluateExpressionWithinScope } from "~/builder/shared/binding-popover";
import { BindableExpressionControl } from "~/builder/shared/bindable-expression";
import { ExpressionEditor } from "~/builder/shared/expression-editor";
import {
  EditorDialog,
  EditorDialogButton,
  EditorDialogControl,
} from "~/shared/code-editor-base";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { useAsyncValue } from "~/shared/use-async-value";
import { createResourceFieldsFromFormData } from "@webstudio-is/project-build/runtime";
import {
  CacheMaxAge,
  Headers,
  UrlField,
  isCacheControl,
  isContentType,
  parseHeaders,
} from "./shared/resource-fields";
import { useResourceScope } from "../resource-scope";
import { Row } from "../shared";
import type { PanelApi } from "./shared/variable-panel-api";

const zGraphqlBody = z.object({
  query: z.string(),
  variables: z.optional(z.record(z.string(), z.unknown())),
});

export const GraphqlResourceForm = forwardRef<
  undefined | PanelApi,
  { variable?: DataSource; onChange?: () => void }
>(({ variable, onChange }, ref) => {
  const { scope, aliases } = useResourceScope({ variable });

  const resources = useStore($resources);
  const resource =
    variable?.type === "resource"
      ? resources.get(variable.resourceId)
      : undefined;

  const [url, setUrl] = useState(resource?.url ?? `""`);
  const parsedHeaders = parseHeaders(resource?.headers ?? []);
  const [maxAge, setMaxAge] = useState(parsedHeaders.maxAge);
  const [headers, setHeaders] = useState(parsedHeaders.headers);

  const [bodyExpressions] = useState(
    () => parseExpressionObject(resource?.body ?? "") ?? new Map()
  );
  const queryId = useId();
  const [query, setQuery] = useState(
    () => parseStringLiteralExpression(bodyExpressions.get("query") ?? "") ?? ""
  );
  const [variables, setVariables] = useState(
    () => bodyExpressions.get("variables") ?? "{}"
  );
  const [isVariablesLiteral, setIsVariablesLiteral] = useState(() =>
    isLiteralExpression(variables)
  );
  const [variablesError, setVariablesError] = useState("");
  const variablesRef = useRef<HTMLInputElement>(null);
  const evaluatedVariables = useAsyncValue(
    () => evaluateExpressionWithinScope(variables, scope),
    [scope, variables],
    undefined
  );
  useEffect(() => {
    variablesRef.current?.setCustomValidity(
      typeof evaluatedVariables === "object" && evaluatedVariables !== null
        ? ""
        : "Expected valid JSON object in GraphQL variables"
    );
    setVariablesError("");
  }, [evaluatedVariables]);

  useImperativeHandle(ref, () => ({
    save: (formData) => {
      // preserve existing instance scope when edit
      const scopeInstanceId =
        variable?.scopeInstanceId ?? $selectedInstance.get()?.id;
      if (scopeInstanceId === undefined) {
        return;
      }
      const resourceFields = createResourceFieldsFromFormData({
        control: "graphql",
        formData,
      });
      return executeRuntimeMutation({
        id: "resources.upsert",
        input: {
          resourceId: resource?.id,
          resource: resourceFields,
          dataSourceId: variable?.id,
          scopeInstanceId,
          dataSourceName: resourceFields.name,
        },
      })?.result;
    },
  }));

  return (
    <>
      <input type="hidden" name="method" value="post" />
      {!headers.some(({ name }) => isContentType(name)) && (
        <>
          <input type="hidden" name="header-name" value="Content-Type" />
          <input
            type="hidden"
            name="header-value"
            value={`"application/json"`}
          />
        </>
      )}
      <input
        type="hidden"
        name="body"
        value={generateObjectExpression(
          new Map([
            ["query", JSON.stringify(query)],
            ["variables", variables],
          ])
        )}
      />

      <Row>
        <UrlField
          scope={scope}
          aliases={aliases}
          value={url}
          onChange={(value) => {
            onChange?.();
            setUrl(value);
          }}
          onCurlPaste={(curl) => {
            onChange?.();
            // update all feilds when curl is paste into url field
            setUrl(JSON.stringify(curl.url));
            const parsedHeaders = parseHeaders(
              curl.headers.map((header) => ({
                name: header.name,
                value: JSON.stringify(header.value),
              }))
            );
            setMaxAge(parsedHeaders.maxAge);
            setHeaders(parsedHeaders.headers);
            const body = zGraphqlBody.safeParse(curl.body);
            if (body.success) {
              setQuery(body.data.query);
              setVariables(JSON.stringify(body.data.variables, null, 2));
            }
          }}
        />
      </Row>

      <Row>
        <Grid gap={1}>
          <Label htmlFor={queryId}>Query</Label>
          <EditorDialogControl>
            <TextArea
              name="query"
              id={queryId}
              rows={3}
              maxRows={10}
              autoGrow={true}
              value={query}
              onChange={(value) => {
                onChange?.();
                setQuery(value);
              }}
            />
            <EditorDialog
              title="GraphQL query"
              content={
                <TextArea
                  grow={true}
                  value={query}
                  onChange={(value) => {
                    onChange?.();
                    setQuery(value);
                  }}
                />
              }
            >
              <EditorDialogButton />
            </EditorDialog>
          </EditorDialogControl>
        </Grid>
      </Row>

      <Row>
        <Grid gap={1}>
          <Label>GraphQL variables</Label>
          {/* use invisible text input to reflect expression editor in form
            type=hidden does not emit invalid event */}
          <input
            ref={variablesRef}
            style={{ display: "none" }}
            type="text"
            name="variables"
            data-color={variablesError ? "error" : undefined}
            value={variables}
            onChange={() => {}}
            onInvalid={(event) =>
              setVariablesError(event.currentTarget.validationMessage)
            }
          />
          <BindableExpressionControl
            expression={variables}
            value={
              isVariablesLiteral
                ? variables
                : JSON.stringify(evaluatedVariables, null, 2) ?? ""
            }
            bound={isVariablesLiteral === false}
            scope={scope}
            aliases={aliases}
            onChangeValue={(value) => {
              onChange?.();
              setVariables(value);
            }}
            onChangeExpression={(value) => {
              onChange?.();
              setVariables(value);
              setIsVariablesLiteral(isLiteralExpression(value));
            }}
            onRemove={(value) => {
              onChange?.();
              setVariables(JSON.stringify(value));
              setIsVariablesLiteral(true);
            }}
            renderControl={({ value, readOnly, onChangeValue }) => (
              <InputErrorsTooltip
                errors={variablesError ? [variablesError] : undefined}
              >
                {/* wrap with div to position error tooltip */}
                <div>
                  <ExpressionEditor
                    color={variablesError ? "error" : undefined}
                    readOnly={readOnly}
                    value={value}
                    onChange={onChangeValue}
                    onChangeComplete={() =>
                      variablesRef.current?.checkValidity()
                    }
                  />
                </div>
              </InputErrorsTooltip>
            )}
          />
        </Grid>
      </Row>

      <Row>
        <CacheMaxAge
          value={maxAge}
          onChange={(newMaxAge) => {
            onChange?.();
            setMaxAge(newMaxAge);
            setHeaders((headers) =>
              headers.filter(({ name }) => !isCacheControl(name))
            );
          }}
        />
      </Row>

      <Row>
        <Headers
          scope={scope}
          aliases={aliases}
          headers={headers}
          onChange={(newHeaders) => {
            onChange?.();
            // reset dedicated fields
            if (newHeaders.some(({ name }) => isCacheControl(name))) {
              setMaxAge(undefined);
            }
            setHeaders(newHeaders);
          }}
        />
      </Row>
    </>
  );
});
GraphqlResourceForm.displayName = "GraphqlResourceForm";

export const GraphqlResourceEditor = forwardRef<
  PanelApi | undefined,
  VariableEditorProps
>((props, ref) => {
  const preview = useResourcePreviewController({
    variable: props.variable,
    formRef: props.formRef,
  });
  return (
    <VariableEditorLayout
      {...props}
      titleActions={props.titleActions({
        onRefresh: () => void preview.reload(),
        refreshStatus: preview.pending ? "refreshing" : "idle",
      })}
      fields={
        <GraphqlResourceForm
          ref={ref}
          variable={props.variable}
          onChange={preview.onChange}
        />
      }
      preview={
        <FormResourcePreview
          variable={props.variable}
          showEmptyLoadButton
          inspectSubmission
          alwaysShowRequestTab
          variableValue={preview.request}
          showSavedResourceRequest={preview.showSavedRequest}
          isComputingRequest={preview.pending}
          onLoadData={preview.reload}
        />
      }
    />
  );
});
