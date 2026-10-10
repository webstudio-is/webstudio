import { useEffect, useId, useRef, useState } from "react";
import { type Resource } from "@webstudio-is/sdk";
import {
  isLiteralExpression,
  parseStringLiteralExpression,
  parseJsonExpression,
} from "@webstudio-is/expression";
import {
  serializeValue,
  getResourceBodyFormatError,
} from "@webstudio-is/sdk/runtime";
import {
  Box,
  Combobox,
  Flex,
  Grid,
  InputErrorsTooltip,
  InputField,
  Label,
  Select,
  SmallIconButton,
  Text,
  TextArea,
  Tooltip,
  theme,
  cssVar,
} from "@webstudio-is/design-system";
import { MinusIcon, InfoCircleIcon, PlusIcon } from "@webstudio-is/icons";
import { humanizeString } from "~/shared/string-utils";
import { evaluateExpressionWithinScope } from "~/builder/shared/binding-popover";
import { BindableExpressionControl } from "~/builder/shared/bindable-expression";
import { ExpressionEditor } from "~/builder/shared/expression-editor";
import { useAsyncValue } from "~/shared/use-async-value";
import {
  validateResourceBodyExpression,
  validateResourceUrlExpression,
  type ResourceBodyInputType,
} from "@webstudio-is/project-build/runtime";
import { parseCurl, type CurlRequest } from "./curl";
import {
  getRequestHeaderValueSuggestions,
  requestHeaderNames,
} from "./request-header-suggestions";

export const UrlField = ({
  scope,
  aliases,
  value,
  onChange,
  onCurlPaste,
  autoFocus,
  inputRef,
}: {
  aliases: Map<string, string>;
  scope: Record<string, unknown>;
  value: string;
  onChange: (
    urlExpression: string,
    searchParams?: Resource["searchParams"]
  ) => void;
  onCurlPaste: (curl: CurlRequest) => void;
  autoFocus?: boolean;
  inputRef?: { current: HTMLTextAreaElement | null };
}) => {
  const urlId = useId();
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const [error, setError] = useState("");
  const touched = useRef(false);
  const change = (
    expression: string,
    searchParams?: Resource["searchParams"]
  ) => {
    touched.current = true;
    onChange(expression, searchParams);
  };
  // revalidate and hide error message
  // until validity is checks again
  useEffect(() => {
    void validateResourceUrlExpression(value, scope).then((error) => {
      ref.current?.setCustomValidity(error);
    });
    setError("");
  }, [value, scope]);
  const evaluatedValue = useAsyncValue(
    () => evaluateExpressionWithinScope(value, scope),
    [scope, value],
    undefined
  );
  return (
    <Grid gap={1}>
      <Label
        htmlFor={urlId}
        css={{ display: "flex", alignItems: "center", gap: theme.spacing[3] }}
      >
        URL
        <Tooltip
          content="You can paste a URL or cURL. cURL is a format that can be executed directly in your terminal because it contains the entire Resource configuration."
          variant="wrapped"
          disableHoverableContent={true}
        >
          <InfoCircleIcon
            color={cssVar("--foreground-secondary")}
            tabIndex={0}
          />
        </Tooltip>
      </Label>
      <input type="hidden" readOnly={true} name="url" value={value} />
      <BindableExpressionControl
        expression={value}
        value={String(evaluatedValue ?? "")}
        bound={isLiteralExpression(value) === false}
        scope={scope}
        aliases={aliases}
        onChangeValue={(value) => change(JSON.stringify(value))}
        onChangeExpression={change}
        onRemove={(value) => change(JSON.stringify(value))}
        renderControl={({ value, readOnly, onChangeValue }) => (
          <InputErrorsTooltip errors={error ? [error] : undefined}>
            <TextArea
              ref={(element) => {
                ref.current = element;
                if (inputRef) {
                  inputRef.current = element;
                }
              }}
              autoFocus={autoFocus}
              name="url-validator"
              id={urlId}
              rows={1}
              grow={true}
              disabled={readOnly}
              color={error ? "error" : undefined}
              value={value}
              onChange={(value) => {
                const curl = parseCurl(value);
                if (curl) {
                  onCurlPaste(curl);
                  return;
                }
                try {
                  const url = new URL(value);
                  if (url.searchParams.size > 0) {
                    const searchParams: Resource["searchParams"] = [];
                    for (const [name, value] of url.searchParams) {
                      searchParams.push({ name, value: JSON.stringify(value) });
                    }
                    // remove all search params from url
                    url.search = "";
                    // update text value as string literal
                    change(JSON.stringify(url.href), searchParams);
                    return;
                  }
                } catch {
                  // serialize without changes when url is invalid
                }
                onChangeValue(value);
              }}
              onBlur={(event) => {
                if (touched.current) {
                  event.currentTarget.checkValidity();
                }
              }}
              onInvalid={(event) =>
                setError(event.currentTarget.validationMessage)
              }
            />
          </InputErrorsTooltip>
        )}
      />
    </Grid>
  );
};

export const MethodField = ({
  value,
  onChange,
  formDestination = false,
}: {
  value: Resource["method"];
  onChange: (value: Resource["method"]) => void;
  formDestination?: boolean;
}) => {
  return (
    <Grid gap={1}>
      <Label>Method</Label>
      <Select<Resource["method"]>
        fullWidth
        options={["get", "post", "put", "delete"]}
        getLabel={humanizeString}
        getDescription={(method) => (
          <Box css={{ width: "100%" }}>
            {[
              {
                get: "Read data from a server.",
                post: "Send data to create or process something.",
                put: "Replace data on a server.",
                delete: "Delete data from a server.",
              }[method],
              formDestination && method === "post"
                ? "Form submissions use POST. This method applies elsewhere."
                : undefined,
            ]
              .filter(Boolean)
              .join(" ")}
          </Box>
        )}
        name="method"
        value={value}
        onChange={onChange}
      />
    </Grid>
  );
};

type ExpressionPair = Resource["headers"][number];

const ExpressionNameValuePair = ({
  aliases,
  scope,
  nameFieldName,
  valueFieldName,
  valueValidatorName,
  deleteLabel,
  nameSuggestions = [],
  valueSuggestions = [],
  name,
  value,
  onChange,
  onDelete,
  autoFocusName,
}: {
  aliases: Map<string, string>;
  scope: Record<string, unknown>;
  nameFieldName: string;
  valueFieldName: string;
  valueValidatorName: string;
  deleteLabel: string;
  nameSuggestions?: readonly string[];
  valueSuggestions?: readonly string[];
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  onDelete: () => void;
  autoFocusName: boolean;
}) => {
  const evaluatedValue = useAsyncValue(
    () => evaluateExpressionWithinScope(value, scope),
    [scope, value],
    undefined
  );
  const isValueString = typeof evaluatedValue === "string";
  return (
    <Grid
      gap={2}
      align="center"
      css={{ gridTemplateColumns: `120px 1fr min-content` }}
    >
      {nameSuggestions.length > 0 ? (
        <Combobox<string>
          modal={false}
          autoFocus={autoFocusName}
          placeholder="Name"
          name={nameFieldName}
          value={name}
          getItems={() => [...nameSuggestions]}
          itemToString={(item) => item ?? ""}
          onItemSelect={(selected) => onChange(selected, value)}
          onChange={(nextName) => {
            if (nextName !== undefined) {
              onChange(nextName, value);
            }
          }}
        />
      ) : (
        <InputField
          // autofocus only new fields
          autoFocus={autoFocusName}
          placeholder="Name"
          name={nameFieldName}
          value={name}
          onChange={(event) => onChange(event.target.value, value)}
        />
      )}
      <input
        type="hidden"
        readOnly={true}
        name={valueFieldName}
        value={value}
      />
      <BindableExpressionControl
        expression={value}
        value={serializeValue(evaluatedValue) ?? ""}
        bound={isLiteralExpression(value) === false}
        scope={scope}
        aliases={aliases}
        onChangeValue={(value) => onChange(name, JSON.stringify(value))}
        onChangeExpression={(value) => onChange(name, value)}
        onRemove={(value) => onChange(name, JSON.stringify(value))}
        renderControl={({ value, readOnly, onChangeValue }) =>
          valueSuggestions.length > 0 ? (
            <Combobox<string>
              modal={false}
              placeholder="Value"
              name={valueValidatorName}
              disabled={readOnly || !isValueString}
              value={value}
              getItems={() => [...valueSuggestions]}
              itemToString={(item) => item ?? ""}
              onItemSelect={onChangeValue}
              onChange={(nextValue) => {
                if (nextValue !== undefined) {
                  onChangeValue(nextValue);
                }
              }}
            />
          ) : (
            <InputField
              placeholder="Value"
              name={valueValidatorName}
              disabled={readOnly || !isValueString}
              value={value}
              onChange={(event) => onChangeValue(event.target.value)}
            />
          )
        }
      />
      <SmallIconButton
        aria-label={`Delete ${deleteLabel}`}
        variant="destructive"
        icon={<MinusIcon />}
        onClick={onDelete}
      />
    </Grid>
  );
};

const ExpressionPairs = ({
  scope,
  aliases,
  label,
  itemLabel,
  description,
  nameFieldName,
  valueFieldName,
  valueValidatorName,
  nameSuggestions,
  getValueSuggestions,
  shouldAutoFocusName,
  values,
  onChange,
}: {
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
  label: string;
  itemLabel: string;
  description: string;
  nameFieldName: string;
  valueFieldName: string;
  valueValidatorName: string;
  nameSuggestions?: readonly string[];
  getValueSuggestions?: (name: string) => readonly string[];
  shouldAutoFocusName: (item: ExpressionPair) => boolean;
  values: ExpressionPair[];
  onChange: (values: ExpressionPair[]) => void;
}) => {
  return (
    <Grid gap={1}>
      <Flex justify="between" align="center">
        <Flex align="center" gap={1}>
          <Label>{label}</Label>
          <Tooltip content={description}>
            <InfoCircleIcon
              color={cssVar("--foreground-secondary")}
              aria-label={`About ${label.toLowerCase()}`}
              tabIndex={0}
            />
          </Tooltip>
        </Flex>
        <SmallIconButton
          aria-label={`Add another ${itemLabel}`}
          icon={<PlusIcon />}
          // Use an empty string expression as the default value.
          onClick={() => onChange([...values, { name: "", value: `""` }])}
        />
      </Flex>
      <Grid gap={2}>
        {values.map((item, index) => (
          <ExpressionNameValuePair
            key={index}
            scope={scope}
            aliases={aliases}
            nameFieldName={nameFieldName}
            valueFieldName={valueFieldName}
            valueValidatorName={valueValidatorName}
            deleteLabel={itemLabel}
            nameSuggestions={nameSuggestions}
            valueSuggestions={getValueSuggestions?.(item.name)}
            autoFocusName={shouldAutoFocusName(item)}
            name={item.name}
            value={item.value}
            onChange={(name, value) => {
              const next = [...values];
              next[index] = { name, value };
              onChange(next);
            }}
            onDelete={() =>
              onChange(values.filter((_, position) => position !== index))
            }
          />
        ))}
        {values.length === 0 && (
          <Text color="subtle" align="center">
            No {label.toLowerCase()}
          </Text>
        )}
      </Grid>
    </Grid>
  );
};

export const SearchParams = ({
  searchParams,
  ...props
}: {
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
  searchParams: NonNullable<Resource["searchParams"]>;
  onChange: (searchParams: NonNullable<Resource["searchParams"]>) => void;
}) => (
  <ExpressionPairs
    {...props}
    label="Search params"
    itemLabel="search param"
    description="Search params are name-value pairs added to the URL after ?. Use them to send filters, search terms, or other request options."
    nameFieldName="search-param-name"
    valueFieldName="search-param-value"
    valueValidatorName="search-param-value-literal"
    shouldAutoFocusName={(item) => item.name === ""}
    values={searchParams}
  />
);

export const Headers = ({
  headers,
  ...props
}: {
  aliases: Map<string, string>;
  scope: Record<string, unknown>;
  headers: Resource["headers"];
  onChange: (headers: Resource["headers"]) => void;
  suggestHeaders?: boolean;
}) => {
  const hasMounted = useRef(false);
  useEffect(() => {
    hasMounted.current = true;
  }, []);
  return (
    <ExpressionPairs
      {...props}
      label="Headers"
      itemLabel="header"
      description="Headers are name-value pairs sent with the request. Use them to tell the server how to interpret the request or who is making it."
      nameFieldName="header-name"
      valueFieldName="header-value"
      valueValidatorName="header-value-validator"
      nameSuggestions={props.suggestHeaders ? [...requestHeaderNames] : []}
      getValueSuggestions={
        props.suggestHeaders ? getRequestHeaderValueSuggestions : undefined
      }
      shouldAutoFocusName={(item) =>
        item.name === "" && (!props.suggestHeaders || hasMounted.current)
      }
      values={headers}
    />
  );
};

export const CacheMaxAge = ({
  value,
  onChange,
}: {
  value: undefined | string;
  onChange: (newValue: string) => void;
}) => {
  return (
    <Grid gap={1}>
      <Flex align="center" css={{ gap: theme.spacing[3] }}>
        <Label htmlFor="resource-panel-max-age">Cache max age</Label>
        <Tooltip
          content="How long to cache the response, in seconds."
          variant="wrapped"
          disableHoverableContent={true}
        >
          <InfoCircleIcon
            aria-label="About Cache max age"
            color={cssVar("--foreground-secondary")}
            tabIndex={0}
          />
        </Tooltip>
      </Flex>
      <InputField
        id="resource-panel-max-age"
        suffix={
          <Text variant="small" color="subtle" css={{ paddingInline: "2px" }}>
            S
          </Text>
        }
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <>
          <input type="hidden" name="header-name" value="Cache-Control" />
          <input
            type="hidden"
            name="header-value"
            value={`"max-age=${value}"`}
          />
        </>
      )}
    </Grid>
  );
};

type BodyType = ResourceBodyInputType;

const toMime = (bodyType: BodyType) => {
  if (bodyType === "json") {
    return "application/json";
  }
  if (bodyType === "text") {
    return "text/plain";
  }
};

const getBodyType = (value: unknown): BodyType => {
  if (typeof value === "string") {
    return "text";
  }
  if (
    value === null ||
    typeof value === "object" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return "json";
  }
};

export const BodyField = ({
  scope,
  aliases,
  hasContentTypeHeader = false,
  bodyFormat,
  value,
  onChangeStart,
  onChange,
}: {
  aliases: Map<string, string>;
  scope: Record<string, unknown>;
  hasContentTypeHeader?: boolean;
  bodyFormat: Resource["bodyFormat"];
  value: string;
  onChangeStart?: () => void;
  onChange: (value: string) => void;
}) => {
  const [isBodyLiteral, setIsBodyLiteral] = useState(
    () => value === "" || isLiteralExpression(value)
  );
  const [bodyError, setBodyError] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const evaluatedValue = useAsyncValue(
    () => evaluateExpressionWithinScope(value, scope),
    [scope, value],
    parseJsonExpression(value)
  );
  const inferredBodyType = getBodyType(evaluatedValue);
  const [lastBodyType, setLastBodyType] = useState(inferredBodyType);
  useEffect(() => {
    if (inferredBodyType !== undefined || value === "") {
      setLastBodyType(inferredBodyType);
    }
  }, [inferredBodyType, value]);
  // Keep the JSON editor while an in-progress edit is temporarily invalid.
  const bodyType = inferredBodyType ?? lastBodyType;
  const effectiveBodyType = bodyFormat === "auto" ? bodyType : "json";
  useEffect(() => {
    let canceled = false;
    void validateResourceBodyExpression(value, effectiveBodyType, scope).then(
      async (error) => {
        let validationError: string = error;
        if (bodyFormat === "auto" && value !== "") {
          const body = await evaluateExpressionWithinScope(value, scope);
          if (
            body === null ||
            typeof body === "number" ||
            typeof body === "boolean"
          ) {
            validationError = "";
          }
        }
        if (error === "" && value !== "" && bodyFormat !== "auto") {
          const body = await evaluateExpressionWithinScope(value, scope);
          validationError =
            getResourceBodyFormatError({
              name: "",
              method: "post",
              url: "",
              searchParams: [],
              headers: [],
              body,
              bodyFormat,
            }) ?? "";
        }
        if (!canceled) {
          bodyRef.current?.setCustomValidity(validationError);
        }
      }
    );
    setBodyError("");
    return () => {
      canceled = true;
    };
  }, [value, effectiveBodyType, bodyFormat, scope]);
  const updateBody = (newBody: string) => {
    onChangeStart?.();
    onChange(newBody);
  };
  const displayedValue = isBodyLiteral
    ? value
    : effectiveBodyType === "json"
      ? (JSON.stringify(evaluatedValue, null, 2) ?? "")
      : String(evaluatedValue ?? "");

  return (
    <Grid gap={1}>
      <Label>Body</Label>
      {bodyFormat === "auto" && bodyType && !hasContentTypeHeader && (
        <>
          <input type="hidden" name="header-name" value="Content-Type" />
          <input
            type="hidden"
            name="header-value"
            value={
              isLiteralExpression(value)
                ? JSON.stringify(toMime(bodyType))
                : `typeof (${value}) === "string" ? "text/plain" : "application/json"`
            }
          />
        </>
      )}
      <textarea
        ref={bodyRef}
        style={{ display: "none" }}
        name="body"
        data-color={bodyError ? "error" : undefined}
        value={value}
        onChange={() => {}}
        onInvalid={(event) =>
          setBodyError(event.currentTarget.validationMessage)
        }
      />
      <BindableExpressionControl
        expression={value}
        value={displayedValue}
        bound={isBodyLiteral === false}
        scope={scope}
        aliases={aliases}
        onChangeValue={updateBody}
        onChangeExpression={(value) => {
          updateBody(value);
          setIsBodyLiteral(isLiteralExpression(value));
        }}
        onRemove={(value) => {
          updateBody(JSON.stringify(value));
          setIsBodyLiteral(true);
        }}
        renderControl={({ value, readOnly, onChangeValue }) => (
          <InputErrorsTooltip errors={bodyError ? [bodyError] : undefined}>
            <div>
              <ExpressionEditor
                showLineNumbers
                color={bodyError ? "error" : undefined}
                readOnly={readOnly}
                value={value}
                onChange={onChangeValue}
                onChangeComplete={() => bodyRef.current?.checkValidity()}
              />
            </div>
          </InputErrorsTooltip>
        )}
      />
    </Grid>
  );
};

export const isCacheControl = (name: string) =>
  name.toLowerCase() === "cache-control";
export const isContentType = (name: string) =>
  name.toLowerCase() === "content-type";

export const parseHeaders = (headers: Resource["headers"]) => {
  let maxAge: undefined | string;
  const newHeaders = headers.filter((header) => {
    // cast raw expression result to string
    const value = String(
      parseStringLiteralExpression(header.value) ?? ""
    ).toLowerCase();
    if (isCacheControl(header.name)) {
      // move simple header like Cache-Control: max-age=10 to dedicated input
      // preserve more complex cache-control
      const matched = value.match(/^max-age=(\d+)$/);
      if (matched) {
        [, maxAge] = matched;
        return false;
      }
    }
    // store json and text in dedicated input
    // and preserve other types
    if (isContentType(header.name)) {
      if (value === "application/json") {
        return false;
      }
      if (value === "text/plain") {
        return false;
      }
    }
    return true;
  });
  return { headers: newHeaders, maxAge };
};

export const __testing__ = { BodyField };
