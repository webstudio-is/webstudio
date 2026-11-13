import {
  createProtectedResourceFetch,
  type ProtectedResourceFetch,
} from "@webstudio-is/sdk/protected-resource-fetch";
import { createNodeProtectedResourceFetch } from "@webstudio-is/sdk/protected-resource-fetch-node";
import {
  formIdFieldName,
  formBotFieldName,
  managedFormIdFieldName,
  managedFormRequestParamName,
  isFormSubmission,
  type ManagedFormResponse,
} from "@webstudio-is/sdk/form";
import {
  FormSubmissionController,
  getFormDataValue,
  submitManagedForm,
} from "@webstudio-is/sdk/form/browser";
import {
  handleManagedFormSubmission,
  createCloudflareManagedFormEmailSender,
} from "@webstudio-is/sdk/form/server";

const browserFetch: ProtectedResourceFetch = createProtectedResourceFetch({
  transport: async () => ({ response: new Response() }),
  deniedHostnames: [],
});
const nodeFetch: ProtectedResourceFetch = createNodeProtectedResourceFetch();

void browserFetch;
void nodeFetch;
const response: ManagedFormResponse = {
  success: true,
  status: 200,
  results: [],
  errors: [],
};
void response;
void formIdFieldName;
void formBotFieldName;
void managedFormIdFieldName;
void managedFormRequestParamName;
void isFormSubmission;
void FormSubmissionController;
void getFormDataValue;
void submitManagedForm;
void handleManagedFormSubmission;
void createCloudflareManagedFormEmailSender;
