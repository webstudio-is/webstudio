import { useStore } from "@nanostores/react";
import { type FormEventHandler, type RefObject, useState, useRef } from "react";
import { RefreshIcon } from "@webstudio-is/icons";
import {
  Button,
  DialogClose,
  DialogMaximize,
  DialogTitleActions,
  Tooltip,
} from "@webstudio-is/design-system";
import {
  type DataSource,
  SYSTEM_VARIABLE_ID,
  hasAssetsResourceUrl,
} from "@webstudio-is/sdk";
import {
  browserInfoParameterName,
  formDataParameterName,
  currentDateResourceUrl,
} from "@webstudio-is/sdk/runtime";
import { formatValue } from "~/builder/shared/expression-editor";
import { $resources, $instances } from "~/shared/sync/data-stores";
import { Row } from "../../shared";
import { canDeleteVariable, VariableMenu } from "../../variable-menu";
import type { PanelApi } from "./variable-panel-api";
import type { VariableType } from "./variable-types";
import { prepareVariableEditorValue, variableEditors } from "../index";
import { NameField, TypeField } from "./editor-fields";

export const VariableEditorDialog = ({
  formRef,
  variable,
  onClose,
  onSave,
}: {
  formRef: RefObject<HTMLFormElement>;
  variable?: DataSource;
  isOpen: boolean;
  onClose: () => void;
  onSave: (saved: boolean) => void;
}) => {
  const panelRef = useRef<undefined | PanelApi>(undefined);
  const isSystemVariable =
    variable?.id === SYSTEM_VARIABLE_ID ||
    (variable?.type === "parameter" &&
      (variable.name === formDataParameterName ||
        variable.name === browserInfoParameterName) &&
      $instances.get().get(variable.scopeInstanceId ?? "")?.component ===
        "NativeForm");
  const [value, setValue] = useState<unknown>(() => {
    if (variable?.type === "variable") {
      if (variable.value.type === "json") {
        return formatValue(variable.value.value);
      }
      return variable.value.value;
    }
  });
  const [name, setName] = useState(variable?.name ?? "");

  const resources = useStore($resources);
  const [variableType, setVariableType] = useState<VariableType>(() => {
    if (variable?.type === "resource") {
      const resource = resources.get(variable.resourceId);
      if (resource?.control === "system") {
        if (resource.url === JSON.stringify(currentDateResourceUrl)) {
          return "current-date-resource";
        }
        if (hasAssetsResourceUrl(resource)) {
          return "assets-resource";
        }
        return "sitemap-resource";
      }
      if (resource?.control === "graphql") {
        return "graphql-resource";
      }
      if (resource?.control === "email") {
        return "email-resource";
      }
      return "resource";
    }
    if (variable?.type === "parameter") {
      return variable.type;
    }
    if (variable?.type === "variable") {
      const type = variable.value.type;
      if (type === "string" || type === "number" || type === "boolean") {
        return type;
      }
      return "json";
    }
    return "string";
  });

  const updateVariableType = (variableType: VariableType) => {
    setVariableType(variableType);
    setValue((previous: unknown) =>
      prepareVariableEditorValue[variableType](previous)
    );
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (isSystemVariable) {
      return;
    }
    const nameElement = event.currentTarget.elements.namedItem("name");
    // make sure only name is valid and allow to save everything else
    // to avoid loosing complex configuration when closed accidentally
    if (
      nameElement instanceof HTMLInputElement &&
      nameElement.checkValidity()
    ) {
      const formData = new FormData(event.currentTarget);
      const saved = panelRef.current?.save(formData);
      onSave(saved !== false);
      // close popover whenever new variable is created
      // to prevent creating duplicated variable
      if (variable === undefined && saved !== false) {
        onClose();
      }
    }
  };

  const Editor = variableEditors[variableType];
  const commonFields = (
    <>
      <Row>
        <NameField
          variable={variable}
          defaultValue={variable?.name ?? ""}
          value={name}
          onChange={setName}
        />
      </Row>
      {variableType !== "parameter" && (
        <Row>
          <TypeField value={variableType} onChange={updateVariableType} />
        </Row>
      )}
    </>
  );
  const titleActions = ({
    onRefresh,
    refreshPending = false,
  }: {
    onRefresh?: () => void;
    refreshPending?: boolean;
  } = {}) => (
    <DialogTitleActions>
      {variable && (
        <VariableMenu
          variable={variable}
          size="header"
          includePaste={false}
          canDelete={!isSystemVariable && canDeleteVariable(variable)}
          onDelete={onClose}
          onRefresh={onRefresh}
        />
      )}
      {onRefresh && (
        <Tooltip content="Refresh resource data" side="bottom">
          <Button
            type="button"
            aria-label="Refresh resource data"
            prefix={<RefreshIcon />}
            color="ghost"
            disabled={refreshPending}
            onClick={onRefresh}
          />
        </Tooltip>
      )}
      <DialogMaximize />
      <DialogClose />
    </DialogTitleActions>
  );

  return (
    <>
      <Editor
        key={variableType}
        variable={variable}
        formRef={formRef}
        onSubmit={handleSubmit}
        disabled={isSystemVariable}
        commonFields={commonFields}
        title={variable ? "Edit variable" : "New variable"}
        titleActions={titleActions}
        panelRef={panelRef}
        value={value}
        onValueChange={setValue}
        previewProps={{
          variable,
          variableType,
          variableValue: value,
        }}
      />
    </>
  );
};

export const __testing__ = {
  NameField,
  TypeField,
};
