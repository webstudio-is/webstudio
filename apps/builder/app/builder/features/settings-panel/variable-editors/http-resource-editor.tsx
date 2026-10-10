import { VariableEditorBody } from "./shared/editor-body";
import { useResourcePreviewController } from "./shared/use-resource-preview-controller";
import type { VariableEditorProps } from "./shared/editor-types";
import { ResourceVariablePreview } from "./shared/resource-variable-preview";
import {
  forwardRef,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useStore } from "@nanostores/react";
import {
  isFormSubmission,
  type DataSource,
  type Resource,
} from "@webstudio-is/sdk";
import { Grid, Label, Select, Text } from "@webstudio-is/design-system";
import { $selectedInstance } from "~/shared/nano-states";
import { $instances, $props, $resources } from "~/shared/sync/data-stores";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { createResourceFieldsFromFormData } from "@webstudio-is/project-build/runtime";
import {
  BodyField,
  CacheMaxAge,
  Headers,
  MethodField,
  SearchParams,
  UrlField,
  isCacheControl,
  isContentType,
  parseHeaders,
} from "./shared/resource-fields";
import { useResourceScope } from "../resource-scope";
import { Row } from "../shared";
import type { PanelApi } from "./shared/variable-panel-api";

export const ResourceForm = forwardRef<
  undefined | PanelApi,
  { variable?: DataSource; onChange?: () => void }
>(({ variable, onChange }, ref) => {
  const { scope, aliases } = useResourceScope({ variable });
  const props = useStore($props);
  const instances = useStore($instances);
  const formAction =
    variable !== undefined &&
    Array.from(props.values()).some(
      (prop) =>
        instances.get(prop.instanceId)?.component === "NativeForm" &&
        prop.name === "action" &&
        prop.type === "json" &&
        isFormSubmission(prop.value) &&
        prop.value.some(({ dataSourceId }) => dataSourceId === variable.id)
    );

  const resources = useStore($resources);
  const resource =
    variable?.type === "resource"
      ? resources.get(variable.resourceId)
      : undefined;
  const parsedHeaders = parseHeaders(resource?.headers ?? []);

  const [url, setUrl] = useState(resource?.url ?? `""`);
  const urlValidatorRef = useRef<HTMLTextAreaElement | null>(null);
  const [method, setMethod] = useState<Resource["method"]>(
    resource?.method ?? "get"
  );
  const [searchParams, setSearchParams] = useState(
    resource?.searchParams ?? []
  );
  const [headers, setHeaders] = useState<Resource["headers"]>(
    resource?.bodyFormat === "json" || resource?.bodyFormat === "multipart"
      ? parsedHeaders.headers.filter(({ name }) => !isContentType(name))
      : parsedHeaders.headers
  );
  const [maxAge, setMaxAge] = useState(parsedHeaders.maxAge);
  const [body, setBody] = useState(resource?.body);
  const [bodyFormat, setBodyFormat] = useState<Resource["bodyFormat"]>(
    resource?.bodyFormat ?? "auto"
  );
  const bodyFormatId = useId();

  useImperativeHandle(ref, () => ({
    save: (formData) => {
      if (urlValidatorRef.current?.checkValidity() === false) {
        return false;
      }
      // preserve existing instance scope when edit
      const scopeInstanceId =
        variable?.scopeInstanceId ?? $selectedInstance.get()?.id;
      if (scopeInstanceId === undefined) {
        return;
      }
      const resourceFields = createResourceFieldsFromFormData({ formData });
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
      <Row>
        <MethodField
          value={method}
          formAction={formAction}
          onChange={(value) => {
            onChange?.();
            setMethod(value);
          }}
        />
      </Row>
      <Row>
        <UrlField
          autoFocus
          inputRef={urlValidatorRef}
          scope={scope}
          aliases={aliases}
          value={url}
          onChange={(urlExpression, searchParams) => {
            onChange?.();
            setUrl(urlExpression);
            if (searchParams) {
              setSearchParams((prev) => [...prev, ...searchParams]);
            }
          }}
          onCurlPaste={(curl) => {
            onChange?.();
            // update all feilds when curl is paste into url field
            setMethod(curl.method);
            setUrl(JSON.stringify(curl.url));
            setSearchParams(
              (curl.searchParams ?? []).map((header) => ({
                name: header.name,
                value: JSON.stringify(header.value),
              }))
            );
            const parsedHeaders = parseHeaders(
              curl.headers.map((header) => ({
                name: header.name,
                value: JSON.stringify(header.value),
              }))
            );
            setMaxAge(parsedHeaders.maxAge);
            setHeaders(parsedHeaders.headers);
            setBody(JSON.stringify(curl.body));
            setBodyFormat("auto");
          }}
        />
      </Row>
      <Row>
        <SearchParams
          scope={scope}
          aliases={aliases}
          searchParams={searchParams}
          onChange={(value) => {
            onChange?.();
            setSearchParams(value);
          }}
        />
      </Row>
      <Row>
        <CacheMaxAge
          value={maxAge}
          onChange={(newMaxAge) => {
            onChange?.();
            setMaxAge(newMaxAge);
            // reset header
            setHeaders((headers) =>
              headers.filter(({ name }) => !isCacheControl(name))
            );
          }}
        />
      </Row>
      <Row>
        <Headers
          suggestHeaders
          scope={scope}
          aliases={aliases}
          headers={headers}
          onChange={(newHeaders) => {
            onChange?.();
            if (bodyFormat !== "auto") {
              newHeaders = newHeaders.filter(
                ({ name }) => !isContentType(name)
              );
            }
            // reset dedicated fields
            if (newHeaders.some(({ name }) => isCacheControl(name))) {
              setMaxAge(undefined);
            }
            setHeaders(newHeaders);
          }}
        />
      </Row>
      {(method !== "get" || formAction) && (
        <>
          <Row>
            <Grid gap={1}>
              <Label htmlFor={bodyFormatId}>Format</Label>
              <Select<NonNullable<Resource["bodyFormat"]>>
                id={bodyFormatId}
                value={bodyFormat ?? "auto"}
                options={["auto", "json", "multipart"]}
                getLabel={(value: NonNullable<Resource["bodyFormat"]>) =>
                  ({
                    auto: "auto",
                    json: "application/json",
                    multipart: "multipart/form-data",
                  })[value]
                }
                getDescription={(value: NonNullable<Resource["bodyFormat"]>) =>
                  ({
                    auto: "Uses text/plain for text values, application/json for other values, and multipart/form-data when files are included.",
                    json: "Sends an object or array as JSON.",
                    multipart: "Sends fields as form data, including files.",
                  })[value]
                }
                onChange={(value) => {
                  onChange?.();
                  setBodyFormat(value);
                  if (value !== "auto") {
                    setHeaders((headers) =>
                      headers.filter(({ name }) => !isContentType(name))
                    );
                  }
                }}
              />
              <Text variant="small" color="subtle">
                Choose how to send the body.
              </Text>
              <input type="hidden" name="body-format" value={bodyFormat} />
            </Grid>
          </Row>
          <Row>
            <BodyField
              scope={scope}
              aliases={aliases}
              value={body ?? ""}
              hasContentTypeHeader={headers.some(({ name }) =>
                isContentType(name)
              )}
              bodyFormat={bodyFormat}
              onChangeStart={onChange}
              onChange={setBody}
            />
          </Row>
        </>
      )}
    </>
  );
});
ResourceForm.displayName = "ResourceForm";

export const HttpResourceEditor = (props: VariableEditorProps) => {
  const preview = useResourcePreviewController({
    variable: props.variable,
    formRef: props.formRef,
  });
  return (
    <VariableEditorBody
      {...props}
      titleActions={props.titleActions({
        onRefresh: () => void preview.reload(),
        refreshPending: preview.pending,
      })}
      fields={
        <ResourceForm
          ref={props.panelRef}
          variable={props.variable}
          onChange={preview.onChange}
        />
      }
      preview={
        <ResourceVariablePreview
          {...props.previewProps}
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
};
