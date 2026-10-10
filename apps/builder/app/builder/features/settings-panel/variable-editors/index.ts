import type {
  ForwardRefExoticComponent,
  PropsWithoutRef,
  RefAttributes,
} from "react";
import type { PanelApi } from "./shared/variable-panel-api";
import type { VariableType } from "./shared/variable-types";
import type { VariableEditorProps } from "./shared/editor-types";
import { StringEditor, prepareStringValue } from "./string-editor";
import { NumberEditor, prepareNumberValue } from "./number-editor";
import { BooleanEditor, prepareBooleanValue } from "./boolean-editor";
import { JsonEditor, prepareJsonValue } from "./json-editor";
import { ParameterEditor } from "./parameter-editor";
import { HttpResourceEditor } from "./http-resource-editor";
import { GraphqlResourceEditor } from "./graphql-resource-editor";
import { EmailResourceEditor } from "./email-resource-editor";
import { AssetsResourceEditor } from "./assets-resource-editor";
import { SystemResourceEditor } from "./system-resource-editor";

export const variableEditors: Record<
  VariableType,
  ForwardRefExoticComponent<
    PropsWithoutRef<VariableEditorProps> & RefAttributes<PanelApi | undefined>
  >
> = {
  parameter: ParameterEditor,
  string: StringEditor,
  number: NumberEditor,
  boolean: BooleanEditor,
  json: JsonEditor,
  resource: HttpResourceEditor,
  "graphql-resource": GraphqlResourceEditor,
  "email-resource": EmailResourceEditor,
  "assets-resource": AssetsResourceEditor,
  "sitemap-resource": SystemResourceEditor,
  "current-date-resource": SystemResourceEditor,
};

export const prepareVariableEditorValue: Record<
  VariableType,
  (previous: unknown) => unknown
> = {
  parameter: (previous) => previous,
  string: prepareStringValue,
  number: prepareNumberValue,
  boolean: prepareBooleanValue,
  json: prepareJsonValue,
  resource: () => undefined,
  "graphql-resource": () => undefined,
  "email-resource": () => undefined,
  "assets-resource": () => undefined,
  "sitemap-resource": () => undefined,
  "current-date-resource": () => undefined,
};
