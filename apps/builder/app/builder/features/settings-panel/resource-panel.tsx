import { nanoid } from "nanoid";
import { useId, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import type { DataSource, Resource } from "@webstudio-is/sdk";
import {
  Box,
  Button,
  Flex,
  Grid,
  InputField,
  Label,
  Select,
  SmallIconButton,
  theme,
} from "@webstudio-is/design-system";
import { DeleteIcon, PlusIcon } from "@webstudio-is/icons";
import { humanizeString } from "~/shared/string-utils";
import { serverSyncStore } from "~/shared/sync";
import {
  $dataSources,
  $resources,
  $selectedInstanceSelector,
  $selectedPage,
  $variableValuesByInstanceSelector,
} from "~/shared/nano-states";
import { ExpressionEditor } from "~/builder/shared/expression-editor";
import { encodeDataSourceVariable } from "@webstudio-is/react-sdk";
import { computed } from "nanostores";

const HeaderPair = (props: {
  editorAliases: Map<string, string>;
  editorScope: Record<string, unknown>;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  onDelete: () => void;
}) => {
  const nameId = useId();

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
      <InputField
        css={{ gridArea: "name-input" }}
        id={nameId}
        value={props.name}
        onChange={(event) => {
          props.onChange(event.target.value, props.value);
        }}
      />
      <Label css={{ gridArea: "value" }}>Value (Expression)</Label>
      <Box css={{ gridArea: "value-input" }}>
        <ExpressionEditor
          scope={props.editorScope}
          aliases={props.editorAliases}
          value={props.value}
          onChange={(newValue) => props.onChange(props.name, newValue)}
        />
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
          onClick={props.onDelete}
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
          const newHeaders = [...headers, { name: "", value: "" }];
          onChange(newHeaders);
        }}
      >
        Add another header pair
      </Button>
    </Grid>
  );
};

const $selectedInstanceVariableValues = computed(
  [$selectedInstanceSelector, $variableValuesByInstanceSelector],
  (instanceSelector, variableValuesByInstanceSelector) => {
    const key = JSON.stringify(instanceSelector);
    return variableValuesByInstanceSelector.get(key) ?? new Map();
  }
);

const $selectedInstanceVariables = computed(
  [$selectedInstanceSelector, $dataSources, $selectedPage],
  (instanceSelector, dataSources, page) => {
    const matchedVariables: DataSource[] = [];
    if (instanceSelector === undefined) {
      return matchedVariables;
    }
    for (const dataSource of dataSources.values()) {
      if (
        dataSource.scopeInstanceId === undefined ||
        instanceSelector.includes(dataSource.scopeInstanceId) === false
      ) {
        continue;
      }
      // support only value variables and page page params parameter
      if (
        dataSource.type === "parameter" &&
        dataSource.id === page?.pathVariableId
      ) {
        matchedVariables.push(dataSource);
      }
      if (dataSource.type === "variable") {
        matchedVariables.push(dataSource);
      }
    }
    return matchedVariables;
  }
);

export const ResourcePanel = ({
  variable,
  onCancel,
}: {
  variable?: DataSource;
  onCancel: () => void;
}) => {
  const resources = useStore($resources);
  const resource =
    variable?.type === "resource"
      ? resources.get(variable.resourceId)
      : undefined;

  const nameId = useId();
  const [name, setName] = useState(variable?.name ?? "");
  const [url, setUrl] = useState(resource?.url ?? "");
  const [method, setMethod] = useState<Resource["method"]>(
    resource?.method ?? "get"
  );
  const [headers, setHeaders] = useState<Resource["headers"]>(
    resource?.headers ?? []
  );
  const [body, setBody] = useState(resource?.body ?? "");

  const matchedVariables = useStore($selectedInstanceVariables);
  const variableValues = useStore($selectedInstanceVariableValues);
  const currentVariableId = variable?.id;
  const editorScope = useMemo(() => {
    const scope: Record<string, unknown> = {};
    for (const [variableId, variableValue] of variableValues) {
      // prevent showing currently edited variable in suggestions
      // to avoid cirular dependeny
      if (currentVariableId === variableId) {
        continue;
      }
      scope[encodeDataSourceVariable(variableId)] = variableValue;
    }
    return scope;
  }, [variableValues, currentVariableId]);
  const editorAliases = useMemo(() => {
    const aliases = new Map<string, string>();
    for (const variable of matchedVariables) {
      aliases.set(encodeDataSourceVariable(variable.id), variable.name);
    }
    return aliases;
  }, [matchedVariables]);

  return (
    <Flex
      direction="column"
      css={{
        overflow: "hidden",
        gap: theme.spacing[9],
        px: theme.spacing[9],
        pb: theme.spacing[9],
      }}
    >
      <Flex direction="column" css={{ gap: theme.spacing[3] }}>
        <Label htmlFor={nameId}>Name</Label>
        <InputField
          id={nameId}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Flex>
      <Flex direction="column" css={{ gap: theme.spacing[3] }}>
        <Label>URL (Expression)</Label>
        <ExpressionEditor
          scope={editorScope}
          aliases={editorAliases}
          value={url}
          onChange={setUrl}
        />
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
          editorScope={editorScope}
          editorAliases={editorAliases}
          headers={headers}
          onChange={setHeaders}
        />
      </Flex>
      {method !== "get" && (
        <Flex direction="column" css={{ gap: theme.spacing[3] }}>
          <Label>Body (Expression)</Label>
          <ExpressionEditor
            scope={editorScope}
            aliases={editorAliases}
            value={body}
            onChange={setBody}
          />
        </Flex>
      )}

      <Flex justify="end" css={{ gap: theme.spacing[5] }}>
        <Button color="neutral" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            const instanceSelector = $selectedInstanceSelector.get();
            if (instanceSelector === undefined) {
              return;
            }
            const [instanceId] = instanceSelector;
            const newResource: Resource = {
              id: resource?.id ?? nanoid(),
              name,
              url,
              method,
              headers,
              body,
            };
            const newVariable: DataSource = {
              id: variable?.id ?? nanoid(),
              // preserve existing instance scope when edit
              scopeInstanceId: variable?.scopeInstanceId ?? instanceId,
              name,
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
            onCancel();
          }}
        >
          Save
        </Button>
      </Flex>
    </Flex>
  );
};
