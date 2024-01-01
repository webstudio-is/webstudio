import { nanoid } from "nanoid";
import { forwardRef, useId, useState, type ReactNode } from "react";
import {
  Button,
  Flex,
  FloatingPanelPopover,
  FloatingPanelPopoverContent,
  FloatingPanelPopoverTitle,
  FloatingPanelPopoverTrigger,
  InputErrorsTooltip,
  InputField,
  Label,
  PanelTabs,
  PanelTabsContent,
  PanelTabsList,
  PanelTabsTrigger,
  ScrollArea,
  theme,
} from "@webstudio-is/design-system";
import { validateExpression } from "@webstudio-is/react-sdk";
import type { DataSource } from "@webstudio-is/sdk";
import {
  ExpressionEditor,
  formatValue,
} from "~/builder/shared/expression-editor";
import {
  $dataSources,
  $resources,
  $selectedInstanceSelector,
} from "~/shared/nano-states";
import { serverSyncStore } from "~/shared/sync";
import { ResourcePanel } from "./resource-panel";

/**
 * convert value expression to js value
 * validating out accessing any identifier
 */
const parseVariableValue = (code: string) => {
  const result: { value?: unknown; error?: string } = {};
  const ids = new Set<string>();
  try {
    code = validateExpression(code, {
      optional: true,
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
      // wrap with parentheses to treat {} as object instead of block
      result.value = eval(`(${code})`);
    } catch (error) {
      result.error = `Parse Error: ${(error as Error).message}`;
    }
  } else {
    const idsList = Array.from(ids).join(", ");
    result.error = `Cannot use variables ${idsList} as variable value`;
  }
  return result;
};

const renameVariable = (variable: DataSource, name: string) => {
  serverSyncStore.createTransaction([$dataSources], (dataSources) => {
    dataSources.set(variable.id, { ...variable, name });
  });
};

const saveVariable = (
  dataSource: undefined | DataSource,
  name: string,
  valueString: string
): undefined | { error?: string } => {
  const dataSourceId = dataSource?.id ?? nanoid();
  const { value, error } = parseVariableValue(valueString);
  if (error !== undefined) {
    return { error };
  }
  const instanceSelector = $selectedInstanceSelector.get();
  if (instanceSelector === undefined) {
    return;
  }
  const [instanceId] = instanceSelector;
  let variableValue: Extract<DataSource, { type: "variable" }>["value"] = {
    type: "json",
    value,
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
  serverSyncStore.createTransaction(
    [$dataSources, $resources],
    (dataSources, resources) => {
      // cleanup resource when value variable is set
      if (dataSource?.type === "resource") {
        resources.delete(dataSource.resourceId);
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
    }
  );
};

const VariableValuePanel = ({
  variable,
  onClose,
}: {
  variable?: DataSource;
  onClose: () => void;
}) => {
  // variable value cannot have an access to other variables
  const nameId = useId();
  const [name, setName] = useState(variable?.name ?? "");
  const [nameErrors, setNameErrors] = useState<undefined | string[]>();
  const [value, setValue] = useState(
    formatValue(
      variable?.type === "variable" ? variable?.value.value ?? "" : ""
    )
  );
  const [valueErrors, setValueErrors] = useState<undefined | string[]>();

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
        <InputErrorsTooltip errors={nameErrors}>
          <InputField
            id={nameId}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </InputErrorsTooltip>
      </Flex>
      {/* resource variable can be replaced with value variable
          parameters can change only name */}
      {variable?.type !== "parameter" && (
        <Flex direction="column" css={{ gap: theme.spacing[3] }}>
          <Label>Value</Label>
          <InputErrorsTooltip errors={valueErrors}>
            <div>
              <ExpressionEditor value={value} onChange={setValue} />
            </div>
          </InputErrorsTooltip>
        </Flex>
      )}
      <Flex justify="end" css={{ gap: theme.spacing[5] }}>
        <Button color="neutral" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            if (name.length === 0) {
              setNameErrors([`Variable name is required`]);
              return;
            }
            if (variable?.type === "parameter") {
              renameVariable(variable, name);
              onClose();
            }
            // save value variable and convert from resource variable if necessary
            const result = saveVariable(variable, name, value);
            if (result?.error !== undefined) {
              setValueErrors([result.error]);
              return;
            }
            onClose();
          }}
        >
          Save
        </Button>
      </Flex>
    </Flex>
  );
};

const VariablePanel = ({
  variable,
  onClose,
}: {
  variable?: DataSource;
  onClose: () => void;
}) => {
  const [tab, setTab] = useState(
    variable?.type === "resource" ? "resource" : "value"
  );

  return (
    <PanelTabs value={tab} onValueChange={setTab} asChild>
      <Flex direction="column">
        <ScrollArea
          css={{
            // flex fixes content overflowing artificial scroll area
            display: "flex",
            flexDirection: "column",
            width: theme.spacing[30],
          }}
        >
          {/* user can change only parameter name */}
          {variable?.type !== "parameter" && (
            <PanelTabsList>
              <PanelTabsTrigger value="value">Value</PanelTabsTrigger>
              <PanelTabsTrigger value="resource">Resource</PanelTabsTrigger>
            </PanelTabsList>
          )}
          <PanelTabsContent value="value">
            <VariableValuePanel variable={variable} onClose={onClose} />
          </PanelTabsContent>
          <PanelTabsContent value="resource">
            <ResourcePanel variable={variable} onClose={onClose} />
          </PanelTabsContent>
        </ScrollArea>
      </Flex>
    </PanelTabs>
  );
};

export const VariablePopoverTrigger = forwardRef<
  HTMLButtonElement,
  { variable?: DataSource; children: ReactNode }
>(({ variable, children }, ref) => {
  const [open, setOpen] = useState(false);
  return (
    <FloatingPanelPopover modal open={open} onOpenChange={setOpen}>
      <FloatingPanelPopoverTrigger ref={ref} asChild>
        {children}
      </FloatingPanelPopoverTrigger>
      <FloatingPanelPopoverContent side="left" align="start">
        <VariablePanel variable={variable} onClose={() => setOpen(false)} />
        {/* put after content to avoid auto focusing "Close" button */}
        {variable === undefined ? (
          <FloatingPanelPopoverTitle>New Variable</FloatingPanelPopoverTitle>
        ) : (
          <FloatingPanelPopoverTitle>Edit Variable</FloatingPanelPopoverTitle>
        )}
      </FloatingPanelPopoverContent>
    </FloatingPanelPopover>
  );
});

VariablePopoverTrigger.displayName = "VariablePopoverTrigger";
