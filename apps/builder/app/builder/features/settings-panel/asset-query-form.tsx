import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  assetResourceParameterName,
  assetResourceContentOptions,
  assetResourceLimits,
  assetResourceIndexStatus,
  assetResourceQueryResponse,
  builderAssetFieldCatalog,
  isLiteralExpression,
  type AssetResourceContentOptions,
  type AssetResourceIndexStatus,
  type BuilderAssetFieldCatalog,
  type Resource,
} from "@webstudio-is/sdk";
import {
  Button,
  Flex,
  Grid,
  InputField,
  Label,
  Select,
  SmallIconButton,
  Switch,
  Text,
} from "@webstudio-is/design-system";
import { PlusIcon, TrashIcon } from "@webstudio-is/icons";
import { getAssetResourceReferencedFieldPaths } from "@webstudio-is/asset-resource";
import { $assets } from "~/shared/sync/data-stores";
import {
  BindingControl,
  BindingPopover,
  evaluateExpressionWithinScope,
} from "~/builder/shared/binding-popover";
import { ExpressionEditor } from "~/builder/shared/expression-editor";
import { CodeEditor } from "~/shared/code-editor";
import type { EditorApi } from "~/shared/code-editor-base";
import {
  loadBuilderAssetFieldCatalog,
  loadBuilderAssetIndexStatus,
  previewBuilderAssetQuery,
} from "~/shared/asset-resource-api.client";
import {
  createAssetQueryResourceBody,
  getAssetFileTypeGroqPredicate,
  getAssetIndexStatusLabel,
  getAssetQueryConfigurationError,
  isEmptyAssetQueryResult,
  parseAssetQueryResourceBody,
  type AssetQueryParameterBinding,
} from "./asset-query-form-utils";

const AssetQueryParameters = ({
  scope,
  aliases,
  parameters,
  onChange,
}: {
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
  parameters: AssetQueryParameterBinding[];
  onChange: (parameters: AssetQueryParameterBinding[]) => void;
}) => (
  <Grid gap={1}>
    <Flex justify="between" align="center">
      <Label>Runtime parameters</Label>
      <SmallIconButton
        aria-label="Add runtime parameter"
        icon={<PlusIcon />}
        disabled={parameters.length >= assetResourceLimits.parameterCount}
        onClick={() => onChange([...parameters, { name: "", value: '""' }])}
      />
    </Flex>
    <Grid gap={2}>
      {parameters.map((parameter, index) => (
        <Grid
          key={index}
          gap={2}
          align="center"
          css={{ gridTemplateColumns: `100px 1fr min-content` }}
        >
          <InputField
            autoFocus={parameter.name === ""}
            aria-label="Runtime parameter name"
            placeholder="slug"
            pattern="[A-Za-z_][A-Za-z0-9_]*"
            value={parameter.name}
            onChange={(event) => {
              const next = [...parameters];
              next[index] = { ...parameter, name: event.target.value };
              onChange(next);
            }}
          />
          <BindingControl>
            <div>
              <ExpressionEditor
                value={parameter.value}
                onChange={(value) => {
                  const next = [...parameters];
                  next[index] = { ...parameter, value };
                  onChange(next);
                }}
                onChangeComplete={(value) => {
                  const next = [...parameters];
                  next[index] = { ...parameter, value };
                  onChange(next);
                }}
              />
            </div>
            <BindingPopover
              scope={scope}
              aliases={aliases}
              variant={
                isLiteralExpression(parameter.value) ? "default" : "bound"
              }
              value={parameter.value}
              onChange={(value) => {
                const next = [...parameters];
                next[index] = { ...parameter, value };
                onChange(next);
              }}
              onRemove={(value) => {
                const next = [...parameters];
                next[index] = { ...parameter, value: JSON.stringify(value) };
                onChange(next);
              }}
            />
          </BindingControl>
          <SmallIconButton
            aria-label="Delete runtime parameter"
            variant="destructive"
            icon={<TrashIcon />}
            onClick={() =>
              onChange(parameters.filter((_, item) => item !== index))
            }
          />
        </Grid>
      ))}
      {parameters.length === 0 && (
        <Text color="subtle" align="center">
          No runtime parameters
        </Text>
      )}
    </Grid>
  </Grid>
);

const contentModeLabels: Record<AssetResourceContentOptions["mode"], string> = {
  none: "No content",
  full: "Complete text",
  range: "Byte range",
  "markdown-body": "Markdown body",
};

const AssetQueryOptions = ({
  resultLimit,
  content,
  onResultLimitChange,
  onContentChange,
}: {
  resultLimit: number;
  content: AssetResourceContentOptions;
  onResultLimitChange: (value: number) => void;
  onContentChange: (value: AssetResourceContentOptions) => void;
}) => (
  <Grid gap={3}>
    <Grid gap={1}>
      <Label>Result limit</Label>
      <InputField
        aria-label="Result limit"
        type="number"
        min={1}
        max={assetResourceLimits.resultCount}
        value={resultLimit}
        onChange={(event) => {
          if (Number.isNaN(event.target.valueAsNumber) === false) {
            onResultLimitChange(event.target.valueAsNumber);
          }
        }}
      />
    </Grid>
    <Grid gap={1}>
      <Label>Selected-file content</Label>
      <Select<AssetResourceContentOptions["mode"]>
        aria-label="Selected-file content"
        options={["none", "full", "range", "markdown-body"]}
        getLabel={(mode: AssetResourceContentOptions["mode"]) =>
          contentModeLabels[mode]
        }
        value={content.mode}
        onChange={(mode) =>
          onContentChange(
            mode === "range" ? { mode, offset: 0, length: 16 * 1024 } : { mode }
          )
        }
      />
    </Grid>
    {(content.mode === "full" || content.mode === "markdown-body") && (
      <Grid gap={1}>
        <Label>Maximum content bytes</Label>
        <InputField
          aria-label="Maximum content bytes"
          type="number"
          min={1}
          max={assetResourceLimits.hydratedFileBytes}
          value={content.maxBytes ?? assetResourceLimits.hydratedFileBytes}
          onChange={(event) => {
            if (Number.isNaN(event.target.valueAsNumber) === false) {
              onContentChange({
                mode: content.mode,
                maxBytes: event.target.valueAsNumber,
              });
            }
          }}
        />
      </Grid>
    )}
    {content.mode === "range" && (
      <Grid gap={2} css={{ gridTemplateColumns: "1fr 1fr" }}>
        <Grid gap={1}>
          <Label>Byte offset</Label>
          <InputField
            aria-label="Byte offset"
            type="number"
            min={0}
            value={content.offset}
            onChange={(event) => {
              if (Number.isNaN(event.target.valueAsNumber) === false) {
                onContentChange({
                  ...content,
                  offset: event.target.valueAsNumber,
                });
              }
            }}
          />
        </Grid>
        <Grid gap={1}>
          <Label>Byte length</Label>
          <InputField
            aria-label="Byte length"
            type="number"
            min={1}
            max={assetResourceLimits.hydratedRangeBytes}
            value={content.length}
            onChange={(event) => {
              if (Number.isNaN(event.target.valueAsNumber) === false) {
                onContentChange({
                  ...content,
                  length: event.target.valueAsNumber,
                });
              }
            }}
          />
        </Grid>
      </Grid>
    )}
  </Grid>
);

const AssetQueryPreview = ({
  resourceId,
  resourceRevision,
  query,
  parameters,
  scope,
  resultLimit,
  content,
  indexStatus,
  onIndexStatusChange,
}: {
  resourceId?: string;
  resourceRevision?: string;
  query: string;
  parameters: AssetQueryParameterBinding[];
  scope: Record<string, unknown>;
  resultLimit: number;
  content: AssetResourceContentOptions;
  indexStatus?: AssetResourceIndexStatus;
  onIndexStatusChange: (status: AssetResourceIndexStatus | undefined) => void;
}) => {
  const [previewState, setPreviewState] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "success"; result: unknown }
  >({ type: "idle" });

  useEffect(() => {
    if (resourceId === undefined) {
      onIndexStatusChange(undefined);
      return;
    }
    let ignore = false;
    let pollTimeout: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const response = await loadBuilderAssetIndexStatus(resourceId);
        if (ignore) {
          return;
        }
        const data = response.data as { status?: unknown };
        const parsed = assetResourceIndexStatus.safeParse(data.status);
        const status = parsed.success ? parsed.data : undefined;
        onIndexStatusChange(status);
        if (status?.state === "indexing") {
          pollTimeout = setTimeout(load, 1000);
        }
      } catch {
        if (ignore === false) {
          onIndexStatusChange(undefined);
        }
      }
    };
    void load();
    return () => {
      ignore = true;
      if (pollTimeout !== undefined) {
        clearTimeout(pollTimeout);
      }
    };
  }, [onIndexStatusChange, resourceId, resourceRevision]);

  const preview = async () => {
    setPreviewState({ type: "loading" });
    try {
      const response = await previewBuilderAssetQuery({
        query,
        parameters: Object.fromEntries(
          parameters
            .filter(({ name }) => name.trim().length > 0)
            .map(({ name, value }) => [
              name,
              evaluateExpressionWithinScope(value, scope),
            ])
        ),
        resultLimit,
        content,
      });
      const parsed = assetResourceQueryResponse.safeParse(response.data);
      if (parsed.success === false) {
        setPreviewState({
          type: "error",
          message: "The preview response was invalid.",
        });
        return;
      }
      if (parsed.data.ok === false) {
        setPreviewState({ type: "error", message: parsed.data.error.message });
        return;
      }
      setPreviewState({ type: "success", result: parsed.data.result });
    } catch {
      setPreviewState({ type: "error", message: "The query preview failed." });
    }
  };
  const isEmpty =
    previewState.type === "success" &&
    isEmptyAssetQueryResult(previewState.result);

  return (
    <Grid gap={2}>
      <Flex justify="between" align="center">
        <Label>Preview</Label>
        <Button
          type="button"
          color="neutral"
          disabled={previewState.type === "loading"}
          onClick={preview}
        >
          {previewState.type === "loading" ? "Loading…" : "Run preview"}
        </Button>
      </Flex>
      <Text color={indexStatus?.state === "failed" ? "destructive" : "subtle"}>
        {getAssetIndexStatusLabel(indexStatus)}
      </Text>
      {previewState.type === "error" && (
        <Text color="destructive">{previewState.message}</Text>
      )}
      {isEmpty && <Text color="subtle">The query returned no results.</Text>}
      {previewState.type === "success" && isEmpty === false && (
        <CodeEditor
          lang="json"
          title="Query preview"
          size="small"
          readOnly={true}
          value={JSON.stringify(previewState.result, null, 2)}
          onChange={() => {}}
          onChangeComplete={() => {}}
        />
      )}
    </Grid>
  );
};

export const AssetQueryForm = ({
  resource,
  scope,
  aliases,
  enabled,
  enabledId,
  onEnabledChange,
}: {
  resource?: Resource;
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
  enabled: boolean;
  enabledId: string;
  onEnabledChange: (enabled: boolean) => void;
}) => {
  const assets = useStore($assets);
  const parsedBody = useMemo(
    () => parseAssetQueryResourceBody(resource?.body),
    [resource?.body]
  );
  const initialQuery = evaluateExpressionWithinScope(
    parsedBody.queryExpression ?? "",
    {}
  );
  const [query, setQuery] = useState(
    typeof initialQuery === "string"
      ? initialQuery
      : '*[_type == "asset.file"] | order(_id asc) [0...20]'
  );
  const [parameters, setParameters] = useState(parsedBody.parameters);
  const parsedResultLimit = evaluateExpressionWithinScope(
    parsedBody.resultLimitExpression ?? "",
    {}
  );
  const [resultLimit, setResultLimit] = useState(
    typeof parsedResultLimit === "number" ? parsedResultLimit : 100
  );
  const parsedContent = assetResourceContentOptions.safeParse(
    evaluateExpressionWithinScope(parsedBody.contentExpression ?? "", {})
  );
  const [content, setContent] = useState<AssetResourceContentOptions>(
    parsedContent.success ? parsedContent.data : { mode: "none" }
  );
  const [fieldCatalog, setFieldCatalog] = useState<BuilderAssetFieldCatalog>();
  const [indexStatus, setIndexStatus] = useState<AssetResourceIndexStatus>();
  const configurationError = getAssetQueryConfigurationError({
    query,
    parameters,
    resultLimit,
    content,
  });

  useEffect(() => {
    if (enabled === false) {
      return;
    }
    let ignore = false;
    loadBuilderAssetFieldCatalog()
      .then((response) => {
        if (ignore) {
          return;
        }
        const parsed = builderAssetFieldCatalog.safeParse(response.data);
        setFieldCatalog(parsed.success ? parsed.data : undefined);
      })
      .catch(() => {
        if (ignore === false) {
          setFieldCatalog(undefined);
        }
      });
    return () => {
      ignore = true;
    };
  }, [assets, enabled]);

  const editorApiRef = useRef<EditorApi>();
  const groqCompletion = useMemo(() => {
    let resourceFieldPaths: Set<string> | undefined;
    if (indexStatus?.activeRevision !== undefined) {
      try {
        resourceFieldPaths = new Set(
          getAssetResourceReferencedFieldPaths(query)
        );
      } catch {
        // Keep project catalog completions while the query is temporarily invalid.
      }
    }
    return {
      catalog: fieldCatalog,
      parameterNames: Array.from(
        new Set(
          parameters
            .map(({ name }) => name)
            .filter(
              (name) => assetResourceParameterName.safeParse(name).success
            )
        )
      ),
      resourceFieldPaths,
    };
  }, [fieldCatalog, indexStatus?.activeRevision, parameters, query]);

  return (
    <>
      <Flex align="center" gap={2}>
        <Switch
          id={enabledId}
          checked={enabled}
          onCheckedChange={onEnabledChange}
        />
        <Label htmlFor={enabledId}>Configure query</Label>
      </Flex>
      {enabled && (
        <>
          <input
            type="hidden"
            name="asset-query-valid"
            value={configurationError === undefined ? "true" : "false"}
          />
          <input type="hidden" name="header-name" value="Content-Type" />
          <input type="hidden" name="header-value" value='"application/json"' />
          <input
            type="hidden"
            name="body"
            value={createAssetQueryResourceBody({
              query,
              parameters,
              resultLimit,
              contentExpression: JSON.stringify(content),
            })}
          />
          <Grid gap={1}>
            <Flex justify="between" align="center">
              <Label>GROQ query</Label>
              <Button
                type="button"
                color="neutral"
                onClick={() => {
                  editorApiRef.current?.replaceSelection(
                    getAssetFileTypeGroqPredicate("md")
                  );
                  editorApiRef.current?.focus();
                }}
              >
                Insert Markdown filter
              </Button>
            </Flex>
            <CodeEditor
              editorApiRef={editorApiRef}
              lang="groq"
              groqCompletion={groqCompletion}
              title="GROQ query"
              value={query}
              onChange={setQuery}
              onChangeComplete={setQuery}
            />
          </Grid>
          <AssetQueryParameters
            scope={scope}
            aliases={aliases}
            parameters={parameters}
            onChange={setParameters}
          />
          <AssetQueryOptions
            resultLimit={resultLimit}
            content={content}
            onResultLimitChange={setResultLimit}
            onContentChange={setContent}
          />
          {configurationError !== undefined && (
            <Text color="destructive">{configurationError}</Text>
          )}
          <AssetQueryPreview
            resourceId={resource?.id}
            resourceRevision={resource?.body}
            query={query}
            parameters={parameters}
            scope={scope}
            resultLimit={resultLimit}
            content={content}
            indexStatus={indexStatus}
            onIndexStatusChange={setIndexStatus}
          />
        </>
      )}
    </>
  );
};
