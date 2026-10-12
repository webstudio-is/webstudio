import {
  getFormEmailStringifyOptions,
  createFormEmailDataProxy,
  parseEmailMailboxes,
  parseEmailSender,
  resolveEmailResourceSettings,
  resolveVisitorConfirmationCopy,
  type EmailResourceSettings,
  type DataSource,
  type DataSources,
  type Instances,
  type ProjectMeta,
  type Props,
} from "@webstudio-is/sdk";
import { emailResourceSettings, findTreeInstanceIds } from "@webstudio-is/sdk";
import { encodeDataVariableId } from "@webstudio-is/sdk";
import {
  $livePreviewFormValues,
  $livePreviewBrowserInfo,
  getFormOccurrenceKey,
  isPreviewFileMetadata,
  toPublicPreviewValue,
} from "~/shared/preview-form-values";
import { $selectedInstanceSelector } from "~/shared/nano-states";
import {
  $instances,
  $dataSources,
  $props,
  $projectSettings,
} from "~/shared/sync/data-stores";
import {
  getBrowserInfoPreview,
  getFormDataPreview,
} from "../form-context-preview";
import { createJsonStringifyProxy } from "@webstudio-is/sdk/to-string";
import { computeExpressionWithinScope } from "@webstudio-is/project-build/runtime";
import {
  internalFormFieldNames,
  formDataParameterName,
  browserInfoParameterName,
  type ManagedFormBrowserInfo,
} from "@webstudio-is/sdk/runtime";

type FileMetadata = { name: string; type: string; size: number };

/** Gather current editor inputs and local Form values without sending Email. */
export const buildEmailRequestPreviewFromEditor = async ({
  form,
  variable,
  scope,
  aliases,
}: {
  form: HTMLFormElement;
  variable?: DataSource;
  scope: Record<string, unknown>;
  aliases: ReadonlyMap<string, string>;
}) => {
  const rawSettings = new FormData(form).get("email-settings");
  let settings: unknown;
  try {
    settings = JSON.parse(String(rawSettings ?? "{}"));
  } catch {
    return;
  }
  const parsedSettings = emailResourceSettings.safeParse(settings);
  if (!parsedSettings.success) {
    return;
  }
  const instances = $instances.get();
  const props = $props.get();
  const selected = $selectedInstanceSelector.get();
  const formId =
    selected?.find(
      (instanceId) => instances.get(instanceId)?.component === "Form"
    ) ??
    Array.from(instances.values()).find(
      (instance) =>
        instance.component === "Form" &&
        variable?.scopeInstanceId !== undefined &&
        findTreeInstanceIds(instances, instance.id).has(
          variable.scopeInstanceId
        )
    )?.id;
  const formData =
    formId === undefined
      ? undefined
      : ($livePreviewFormValues
          .get()
          .get(getFormOccurrenceKey(selected, formId) ?? "") ??
        getFormDataPreview(formId));
  const browserInfo =
    formId === undefined
      ? undefined
      : getBrowserInfoPreview($livePreviewBrowserInfo.get().get(formId));
  return buildEmailRequestPreview({
    settings: parsedSettings.data,
    projectMeta: $projectSettings.get()?.meta,
    scope,
    aliases,
    dataSources: $dataSources.get(),
    formId,
    formData,
    browserInfo,
    instances,
    props,
  });
};

const getFileMetadata = (value: unknown): FileMetadata[] => {
  if (Array.isArray(value)) {
    return value.flatMap(getFileMetadata);
  }
  if (typeof File !== "undefined" && value instanceof File) {
    if (value.name === "" && value.size === 0) {
      return [];
    }
    return [{ name: value.name, type: value.type, size: value.size }];
  }
  if (isPreviewFileMetadata(value)) {
    if (value.name === "" && value.size === 0) {
      return [];
    }
    return [{ name: value.name, type: value.type, size: value.size }];
  }
  return [];
};

// Preview only transports file metadata. Rebuild a metadata-only File so Email
// expressions format it the same way as a submitted File, without loading bytes.
const toEmailPreviewValue = (value: unknown): unknown => {
  if (isPreviewFileMetadata(value)) {
    const file = new File([], value.name, { type: value.type });
    Object.defineProperty(file, "size", { value: value.size });
    return file;
  }
  if (Array.isArray(value)) {
    return value.map(toEmailPreviewValue);
  }
  if (
    typeof value === "object" &&
    value !== null &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  ) {
    return Object.fromEntries(
      Object.entries(value).map(([name, entry]) => [
        name,
        toEmailPreviewValue(entry),
      ])
    );
  }
  return toPublicPreviewValue(value);
};

/** Show the known Email payload without creating a request or sending a message. */
export const buildEmailRequestPreview = async ({
  settings,
  projectMeta,
  scope,
  aliases,
  dataSources,
  formId,
  formData,
  browserInfo,
  instances,
  props,
}: {
  settings: EmailResourceSettings;
  projectMeta?: ProjectMeta;
  scope: Record<string, unknown>;
  aliases: ReadonlyMap<string, string>;
  dataSources: DataSources;
  formId?: string;
  formData?: Record<string, unknown>;
  browserInfo?: ManagedFormBrowserInfo;
  instances: Instances;
  props: Props;
}) => {
  const resolved = resolveEmailResourceSettings({ settings, projectMeta });
  const formDataOptions =
    formId === undefined
      ? undefined
      : getFormEmailStringifyOptions(instances, props, formId);
  // Dynamic field names or types prevent us from identifying password fields.
  // In that case the runtime omits default Form text, so the local expression
  // preview must not expose individual field values either.
  const visibleFormDataWithFileTags =
    formData === undefined
      ? undefined
      : formDataOptions?.stringifyAs !== undefined
        ? {}
        : Object.fromEntries(
            Object.entries(formData).filter(
              ([name]) =>
                !internalFormFieldNames.has(name) &&
                !formDataOptions?.excludeKeys?.includes(name)
            )
          );
  const visibleFormData =
    visibleFormDataWithFileTags === undefined
      ? undefined
      : Object.fromEntries(
          Object.entries(visibleFormDataWithFileTags).map(([name, value]) => [
            name,
            toEmailPreviewValue(value),
          ])
        );
  const evaluationScope = { ...scope };
  for (const source of dataSources.values()) {
    if (source.type !== "parameter" || source.scopeInstanceId !== formId) {
      continue;
    }
    const identifier = encodeDataVariableId(source.id);
    if (aliases.has(identifier) === false) {
      continue;
    }
    if (source.name === formDataParameterName) {
      evaluationScope[identifier] = createFormEmailDataProxy(
        visibleFormData ?? {},
        formDataOptions
      );
    }
    if (source.name === browserInfoParameterName && browserInfo !== undefined) {
      evaluationScope[identifier] = createJsonStringifyProxy(browserInfo, {
        space: 2,
      });
    }
  }
  const evaluateText = async (expression: string) => {
    const value = await computeExpressionWithinScope(
      expression,
      evaluationScope
    );
    return typeof value === "string" ? value : undefined;
  };
  const recipientValue =
    settings.recipientsExpression === undefined
      ? resolved.recipients
      : parseEmailMailboxes(
          (await evaluateText(settings.recipientsExpression)) ?? ""
        );
  const visitorAddress =
    resolved.visitorEmailField === undefined
      ? undefined
      : visibleFormData?.[resolved.visitorEmailField];
  const recipients =
    resolved.recipientMode === "visitor"
      ? typeof visitorAddress === "string" &&
        parseEmailSender(visitorAddress)?.address === visitorAddress
        ? [{ address: visitorAddress }]
        : []
      : recipientValue;
  const sender =
    settings.senderExpression === undefined
      ? resolved.sender
      : parseEmailSender((await evaluateText(settings.senderExpression)) ?? "");
  const evaluatedSubject = await evaluateText(resolved.subject);
  const evaluatedBody =
    settings.body !== undefined || resolved.recipientMode === "visitor"
      ? await evaluateText(resolved.body)
      : visibleFormData === undefined
        ? await evaluateText(resolved.body)
        : `Form data:\n${String(
            createFormEmailDataProxy(visibleFormData, formDataOptions)
          )}` +
          (browserInfo === undefined
            ? ""
            : `\n\nBrowser info:\n${String(
                createJsonStringifyProxy(browserInfo, { space: 2 })
              )}`);
  const copy =
    resolved.recipientMode === "visitor" &&
    evaluatedSubject !== undefined &&
    evaluatedBody !== undefined
      ? resolveVisitorConfirmationCopy({
          subject: evaluatedSubject,
          body: evaluatedBody,
          fromName: sender?.name ?? resolved.fromName,
          confirmationSubject: resolved.confirmationSubject,
          confirmationBody: resolved.confirmationBody,
        })
      : undefined;
  const subject = copy?.subject ?? evaluatedSubject;
  const body = copy?.body ?? evaluatedBody;
  const attachments =
    resolved.includeAttachments && visibleFormDataWithFileTags !== undefined
      ? Object.values(visibleFormDataWithFileTags).flatMap(getFileMetadata)
      : [];

  return {
    preview: {
      ...(recipients === undefined ? {} : { to: recipients }),
      ...(subject === undefined ? {} : { subject }),
      ...(body === undefined ? {} : { text: body }),
      ...(sender === undefined ? {} : { replyTo: sender }),
      fromName: sender?.name ?? resolved.fromName,
      ...(attachments.length === 0 ? {} : { attachments }),
    },
  };
};
