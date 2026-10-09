import {
  getFormEmailStringifyOptions,
  parseEmailMailboxes,
  parseEmailSender,
  resolveEmailResourceSettings,
  type EmailResourceSettings,
  type Instances,
  type ProjectMeta,
  type Props,
} from "@webstudio-is/sdk";
import { createJsonStringifyProxy } from "@webstudio-is/sdk/to-string";
import { computeExpressionWithinScope } from "@webstudio-is/project-build/runtime";
import {
  internalFormFieldNames,
  type ManagedFormBrowserInfo,
} from "@webstudio-is/sdk/runtime";

type FileMetadata = { name: string; type: string; size: number };

const getFileMetadata = (value: unknown): FileMetadata[] => {
  if (Array.isArray(value)) {
    return value.flatMap(getFileMetadata);
  }
  if (typeof File !== "undefined" && value instanceof File) {
    return [{ name: value.name, type: value.type, size: value.size }];
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    "type" in value &&
    typeof value.type === "string" &&
    "size" in value &&
    typeof value.size === "number"
  ) {
    return [{ name: value.name, type: value.type, size: value.size }];
  }
  return [];
};

/** Show the known Email payload without creating a request or sending a message. */
export const buildEmailRequestPreview = async ({
  settings,
  projectMeta,
  scope,
  aliases,
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
  const visibleFormData =
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
  const evaluationScope = { ...scope };
  for (const [identifier, name] of aliases) {
    if (name === "formData") {
      evaluationScope[identifier] = createJsonStringifyProxy(
        visibleFormData ?? {},
        formDataOptions
      );
    }
    if (name === "browserInfo" && browserInfo !== undefined) {
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
  const subject = await evaluateText(resolved.subject);
  const body =
    settings.body !== undefined ||
    resolved.recipientMode === "visitor" ||
    projectMeta?.emailBody
      ? await evaluateText(resolved.body)
      : visibleFormData === undefined
        ? await evaluateText(resolved.body)
        : `Form data:\n${String(createJsonStringifyProxy(visibleFormData, formDataOptions))}` +
          (browserInfo === undefined
            ? ""
            : `\n\nBrowser info:\n${String(createJsonStringifyProxy(browserInfo, { space: 2 }))}`);
  const attachments =
    resolved.includeAttachments && visibleFormData !== undefined
      ? Object.values(visibleFormData).flatMap(getFileMetadata)
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
