import { useStore } from "@nanostores/react";
import { type RefObject, useState, useRef } from "react";
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
import { currentDateResourceUrl } from "@webstudio-is/sdk/runtime";
import { isManagedFormParameter } from "@webstudio-is/project-build/runtime";
import { formatValue } from "~/builder/shared/expression-editor";
import { $resources, $instances } from "~/shared/sync/data-stores";
import { Row } from "../../shared";
import { canDeleteVariable, VariableMenu } from "../../variable-menu";
import type { PanelApi } from "../shared/variable-panel-api";
import type { VariableType } from "../shared/variable-types";
import type { RefreshStatus } from "../shared/editor-types";
import { prepareVariableEditorValue, variableEditors } from "../index";
import { NameField, TypeField } from "./fields";

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
  const editorRef = useRef<undefined | PanelApi>(undefined);
  const isSystemVariable =
    variable?.id === SYSTEM_VARIABLE_ID ||
    isManagedFormParameter(variable, $instances.get());
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

  const handleSubmit = (formData: FormData) => {
    if (isSystemVariable) {
      return;
    }
    const nameElement = formRef.current?.elements.namedItem("name");
    // make sure only name is valid and allow to save everything else
    // to avoid loosing complex configuration when closed accidentally
    if (
      nameElement instanceof HTMLInputElement &&
      nameElement.checkValidity()
    ) {
      const saved = editorRef.current?.save(formData);
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
    refreshStatus = "idle",
  }: {
    onRefresh?: () => void;
    refreshStatus?: RefreshStatus;
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
            disabled={refreshStatus === "refreshing"}
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
        ref={editorRef}
        variable={variable}
        formRef={formRef}
        onSubmit={handleSubmit}
        disabled={isSystemVariable}
        commonFields={commonFields}
        title={variable ? "Edit variable" : "New variable"}
        titleActions={titleActions}
        value={value}
        onValueChange={setValue}
        variableType={variableType}
      />
    </>
  );
};

export const __testing__ = {
  NameField,
  TypeField,
};
