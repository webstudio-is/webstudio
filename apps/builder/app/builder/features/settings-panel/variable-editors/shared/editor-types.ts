import type { ReactNode, RefObject } from "react";
import type { DataSource } from "@webstudio-is/sdk";
import type { VariableType } from "./variable-types";

export type RefreshStatus = "idle" | "refreshing";

export type VariableEditorProps = {
  variable?: DataSource;
  formRef: RefObject<HTMLFormElement>;
  onSubmit: (formData: FormData) => void;
  disabled: boolean;
  commonFields: ReactNode;
  title: string;
  titleActions: (options?: {
    onRefresh?: () => void;
    refreshStatus?: RefreshStatus;
  }) => ReactNode;
  value: unknown;
  onValueChange: (value: unknown) => void;
  variableType: VariableType;
};
