import { useEffect, useId, useMemo, useState } from "react";
import { nanoid } from "nanoid";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import {
  Button,
  CssValueListArrowFocus,
  CssValueListItem,
  Flex,
  FloatingPanelPopoverTitle,
  InputErrorsTooltip,
  InputField,
  Label,
  ScrollArea,
  SmallIconButton,
  Text,
  Tooltip,
  theme,
} from "@webstudio-is/design-system";
import { MenuIcon, MinusIcon, PlusIcon } from "@webstudio-is/icons";
import type { DataSource } from "@webstudio-is/sdk";
import { validateExpression } from "@webstudio-is/react-sdk";
import {
  dataSourcesStore,
  selectedInstanceSelectorStore,
} from "~/shared/nano-states";
import { serverSyncStore } from "~/shared/sync";
import { CodeEditor } from "./code-editor";

type VariableDataSource = Extract<DataSource, { type: "variable" }>;

/**
 * convert value expression to js value
 * validating out accessing any identifier
 */
const parseVariableValue = (code: string) => {
  const result: { value?: unknown; error?: string } = {};
  const ids = new Set<string>();
  try {
    validateExpression(code, {
      transformIdentifier: (id) => {
        ids.add(id);
        return id;
      },
    });
  } catch (error) {
    result.error = (error as Error).message;
    return result;
  }
  if (ids.size === 0) {
    try {
      result.value = eval(code);
    } catch (error) {
      result.error = `Parse Error: ${(error as Error).message}`;
    }
  } else {
    const idsList = Array.from(ids).join(", ");
    result.error = `Cannot use variables ${idsList} as variable value`;
  }
  return result;
};

const saveVariable = (
  dataSourceId: string = nanoid(),
  name: string,
  valueString: string
): undefined | { error?: string } => {
  const { value, error } = parseVariableValue(valueString);
  if (error !== undefined) {
    return { error };
  }

  const instanceSelector = selectedInstanceSelectorStore.get();
  if (instanceSelector === undefined) {
    return;
  }
  const [instanceId] = instanceSelector;
  serverSyncStore.createTransaction([dataSourcesStore], (dataSources) => {
    let variableValue: VariableDataSource["value"] = {
      type: "string",
      value: "",
    };
    if (typeof value === "string") {
      variableValue = { type: "string", value };
    }
    if (typeof value === "number") {
      variableValue = { type: "number", value };
    }
    if (typeof value === "boolean") {
      variableValue = { type: "boolean", value };
    }
    dataSources.set(dataSourceId, {
      id: dataSourceId,
      // preserve existing instance scope when edit
      scopeInstanceId:
        dataSources.get(dataSourceId)?.scopeInstanceId ?? instanceId,
      name,
      type: "variable",
      value: variableValue,
    });
  });
};

const VariablePanel = ({
  variable,
  onBack,
}: {
  variable?: VariableDataSource;
  onBack: () => void;
}) => {
  // variable value cannot have an access to other variables
  const variables = useMemo(() => new Map(), []);
  const nameId = useId();
  const [name, setName] = useState(variable?.name ?? "");
  const [nameErrors, setNameErrors] = useState<undefined | string[]>();
  const [value, setValue] = useState(
    JSON.stringify(variable?.value.value ?? "")
  );
  const [valueErrors, setValueErrors] = useState<undefined | string[]>();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // prevent closing popover
        event.preventDefault();
        onBack();
      }
    };
    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [onBack]);

  return (
    <ScrollArea
      css={{
        display: "flex",
        flexDirection: "column",
        width: theme.spacing[30],
      }}
    >
      <Flex
        direction="column"
        css={{
          overflow: "hidden",
          p: theme.spacing[9],
          gap: theme.spacing[5],
        }}
      >
        <Flex direction="column" css={{ gap: theme.spacing[3] }}>
          <Label htmlFor={nameId}>Name</Label>
          <InputErrorsTooltip errors={nameErrors}>
            <InputField
              id={nameId}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </InputErrorsTooltip>
        </Flex>
        <Flex direction="column" css={{ gap: theme.spacing[3] }}>
          <Label>Value</Label>
          <InputErrorsTooltip errors={valueErrors}>
            <div>
              <CodeEditor
                variables={variables}
                defaultValue={value}
                onChange={setValue}
              />
            </div>
          </InputErrorsTooltip>
        </Flex>
        <Flex justify="end" css={{ gap: theme.spacing[5] }}>
          <Button color="neutral" onClick={onBack}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (name.length === 0) {
                setNameErrors([`Variable name is required`]);
                return;
              }
              const result = saveVariable(variable?.id, name, value);
              if (result?.error !== undefined) {
                setValueErrors([result.error]);
                return;
              }
              onBack();
            }}
          >
            Save
          </Button>
        </Flex>
      </Flex>
    </ScrollArea>
  );
};

const selectedInstanceVariables = computed(
  [selectedInstanceSelectorStore, dataSourcesStore],
  (instanceSelector, dataSources) => {
    const matchedVariables: VariableDataSource[] = [];
    if (instanceSelector === undefined) {
      return matchedVariables;
    }
    for (const dataSource of dataSources.values()) {
      if (
        dataSource.type === "variable" &&
        dataSource.scopeInstanceId !== undefined &&
        instanceSelector.includes(dataSource.scopeInstanceId)
      ) {
        matchedVariables.push(dataSource);
      }
    }
    return matchedVariables;
  }
);

const EmptyList = ({ onAdd }: { onAdd: () => void }) => {
  return (
    <Flex direction="column" css={{ gap: theme.spacing[5] }}>
      <Flex justify="center" align="center" css={{ height: theme.spacing[13] }}>
        <Text variant="labelsSentenceCase">No variables yet</Text>
      </Flex>
      <Flex justify="center" align="center" css={{ height: theme.spacing[13] }}>
        <Button prefix={<PlusIcon />} onClick={onAdd}>
          Create variable
        </Button>
      </Flex>
    </Flex>
  );
};

const deleteVariable = (variable: VariableDataSource) => {
  // @todo prevent delete when variable is used
  serverSyncStore.createTransaction([dataSourcesStore], (dataSources) => {
    dataSources.delete(variable.id);
  });
};

const ListItem = ({
  index,
  selectedId,
  variable,
  onSelect,
  onEdit,
}: {
  index: number;
  selectedId: undefined | string;
  variable: VariableDataSource;
  onSelect: (variableId: DataSource["id"]) => void;
  onEdit: (variable: VariableDataSource) => void;
}) => {
  return (
    <CssValueListItem
      label={
        <Label truncate>
          {variable.name}: {JSON.stringify(variable.value.value)}
        </Label>
      }
      id={variable.id}
      index={index}
      active={selectedId === variable.id}
      buttons={
        <>
          <Tooltip content="Edit variable" side="bottom">
            <SmallIconButton
              tabIndex={-1}
              aria-label="Edit variable"
              icon={<MenuIcon />}
              onClick={() => onEdit(variable)}
            />
          </Tooltip>
          <Tooltip content="Delete variable" side="bottom">
            <SmallIconButton
              tabIndex={-1}
              aria-label="Delete variable"
              variant="destructive"
              icon={<MinusIcon />}
              onClick={() => deleteVariable(variable)}
            />
          </Tooltip>
        </>
      }
      onClick={() => onSelect(variable.id)}
    />
  );
};

const ListPanel = ({
  onAdd,
  onEdit,
}: {
  onAdd: () => void;
  onEdit: (variable: VariableDataSource) => void;
}) => {
  const matchedVariables = useStore(selectedInstanceVariables);
  const [selectedId, setSelectedId] = useState<undefined | string>(undefined);
  return (
    <ScrollArea
      css={{
        display: "flex",
        flexDirection: "column",
        width: theme.spacing[30],
        padding: `${theme.spacing[5]} 0 ${theme.spacing[9]}`,
      }}
    >
      {matchedVariables.length === 0 ? (
        <EmptyList onAdd={onAdd} />
      ) : (
        <CssValueListArrowFocus>
          {matchedVariables.map((variable, index) => (
            <ListItem
              key={variable.id}
              index={index}
              variable={variable}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onEdit={onEdit}
            />
          ))}
        </CssValueListArrowFocus>
      )}
    </ScrollArea>
  );
};

export const VariablesPanel = () => {
  const [view, setView] = useState<
    | { name: "list" }
    | { name: "add" }
    | { name: "edit"; variable: VariableDataSource }
  >({ name: "list" });
  if (view.name === "add") {
    return (
      <>
        <VariablePanel onBack={() => setView({ name: "list" })} />
        {/* put after content to avoid auto focusing "Close" button */}
        <FloatingPanelPopoverTitle>New Variable</FloatingPanelPopoverTitle>
      </>
    );
  }
  if (view.name === "edit") {
    return (
      <>
        <VariablePanel
          variable={view.variable}
          onBack={() => setView({ name: "list" })}
        />
        {/* put after content to avoid auto focusing "Close" button */}
        <FloatingPanelPopoverTitle>Edit Variable</FloatingPanelPopoverTitle>
      </>
    );
  }
  return (
    <>
      <ListPanel
        onAdd={() => setView({ name: "add" })}
        onEdit={(variable) => setView({ name: "edit", variable })}
      />
      {/* put after content to avoid auto focusing "New variable" button */}
      <FloatingPanelPopoverTitle
        actions={
          <Tooltip content="New variable" side="bottom">
            <Button
              aria-label="New variable"
              prefix={<PlusIcon />}
              color="ghost"
              onClick={() => setView({ name: "add" })}
            />
          </Tooltip>
        }
      >
        Variables
      </FloatingPanelPopoverTitle>
    </>
  );
};
