import type { FormEventHandler, ReactNode, Ref, RefObject } from "react";
import type { DataSource } from "@webstudio-is/sdk";
import type { PanelApi } from "./variable-panel-api";
import type { VariablePreviewProps } from "./variable-types";

export type VariableEditorProps = {
  variable?: DataSource;
  formRef: RefObject<HTMLFormElement>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  disabled: boolean;
  commonFields: ReactNode;
  title: string;
  titleActions: (options?: {
    onRefresh?: () => void;
    refreshPending?: boolean;
  }) => ReactNode;
  panelRef: Ref<PanelApi | undefined>;
  value: unknown;
  onValueChange: (value: unknown) => void;
  previewProps: VariablePreviewProps;
};
