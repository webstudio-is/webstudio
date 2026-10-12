import { VariableEditorLayout } from "./dialog/layout";
import type { VariableEditorProps } from "./shared/editor-types";
import { FormResourcePreview } from "./form-resource-preview";
import {
  forwardRef,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { useStore } from "@nanostores/react";
import {
  decodeDataVariableId,
  defaultEmailBody,
  defaultEmailSubject,
  defaultEmailConfirmationSubject,
  defaultVisitorConfirmationBody,
  findTreeInstanceIds,
  getDefaultFormEmailBodyExpression,
  getFormEmailFieldNames,
  isEmailBindingDataSourceAvailable,
  type DataSource,
  type EmailResourceSettings,
} from "@webstudio-is/sdk";
import {
  getExpressionIdentifiers,
  isLiteralExpression,
} from "@webstudio-is/expression";
import {
  browserInfoParameterName,
  formDataParameterName,
} from "@webstudio-is/sdk/runtime";
import {
  Grid,
  InputErrorsTooltip,
  InputField,
  Label,
  Radio,
  RadioAndLabel,
  RadioGroup,
  Select,
  TextArea,
} from "@webstudio-is/design-system";
import { $selectedInstance } from "~/shared/nano-states";
import {
  $dataSources,
  $instances,
  $props,
  $resources,
} from "~/shared/sync/data-stores";
import { evaluateExpressionWithinScope } from "~/builder/shared/binding-popover";
import { BindableExpressionControl } from "~/builder/shared/bindable-expression";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { useAsyncValue } from "~/shared/use-async-value";
import {
  createResourceFieldsFromFormData,
  getExpressionErrorMessages,
  getResourceExpressionErrors,
} from "@webstudio-is/project-build/runtime";
import {
  validateContactEmail,
  validateEmailSender,
} from "@webstudio-is/project-build/contracts";
import { Row } from "../shared";
import { useResourceScope } from "../resource-scope";
import { buildEmailRequestPreviewFromEditor } from "./email-request-preview";
import type { PanelApi } from "./shared/variable-panel-api";

const EmailExpressionField = ({
  label,
  accessibleName,
  expression,
  placeholder,
  scope,
  aliases,
  error,
  onChange,
  multiline = false,
}: {
  label?: string;
  accessibleName?: string;
  expression: string;
  placeholder: string;
  scope: Record<string, unknown>;
  aliases: Map<string, string>;
  error?: string;
  onChange: (expression: string) => void;
  multiline?: boolean;
}) => {
  const id = useId();
  const evaluatedValue = useAsyncValue(
    () => evaluateExpressionWithinScope(expression, scope),
    [expression, scope],
    ""
  );
  const value = String(evaluatedValue ?? "");
  const onChangeValue = (nextValue: string) =>
    onChange(JSON.stringify(nextValue));

  const control = (
    <BindableExpressionControl
      expression={expression}
      value={value}
      bound={isLiteralExpression(expression) === false}
      scope={scope}
      aliases={aliases}
      onChangeValue={onChangeValue}
      onChangeExpression={onChange}
      onRemove={(evaluatedValue) =>
        onChange(JSON.stringify(String(evaluatedValue ?? "")))
      }
      renderControl={({ value, readOnly, onChangeValue }) => (
        <InputErrorsTooltip errors={error ? [error] : undefined}>
          {multiline ? (
            <TextArea
              id={id}
              aria-label={accessibleName}
              rows={4}
              autoGrow
              disabled={readOnly}
              value={value}
              placeholder={placeholder}
              color={error ? "error" : undefined}
              onChange={onChangeValue}
            />
          ) : (
            <InputField
              id={id}
              aria-label={accessibleName}
              value={value}
              placeholder={placeholder}
              disabled={readOnly}
              color={error ? "error" : undefined}
              onChange={(event) => onChangeValue(event.target.value)}
            />
          )}
        </InputErrorsTooltip>
      )}
    />
  );
  return label ? (
    <Row>
      <Grid gap={1}>
        <Label htmlFor={id}>{label}</Label>
        {control}
      </Grid>
    </Row>
  ) : (
    control
  );
};

export const EmailResourceForm = forwardRef<
  undefined | PanelApi,
  { variable?: DataSource; onChange?: () => void }
>(({ variable, onChange }, ref) => {
  const { scope, aliases } = useResourceScope({ variable });
  const resources = useStore($resources);
  const dataSources = useStore($dataSources);
  const instances = useStore($instances);
  const props = useStore($props);
  const attachmentId = useId();
  const recipientsLabelId = useId();
  const resource =
    variable?.type === "resource"
      ? resources.get(variable.resourceId)
      : undefined;
  const { scope: emailBindingScope, aliases: emailBindingAliases } =
    useMemo(() => {
      const emailBindingScope = { ...scope };
      const emailBindingAliases = new Map(aliases);
      for (const [identifier] of aliases) {
        const dataSourceId = decodeDataVariableId(identifier);
        if (
          dataSourceId &&
          !isEmailBindingDataSourceAvailable(dataSources.get(dataSourceId))
        ) {
          delete emailBindingScope[identifier];
          emailBindingAliases.delete(identifier);
        }
      }
      return { scope: emailBindingScope, aliases: emailBindingAliases };
    }, [aliases, dataSources, scope]);
  const scopeInstanceId =
    variable?.scopeInstanceId ?? $selectedInstance.get()?.id;
  const formId = Array.from(instances.values()).find(
    (instance) =>
      instance.component === "Form" &&
      scopeInstanceId !== undefined &&
      findTreeInstanceIds(instances, instance.id).has(scopeInstanceId)
  )?.id;
  const emailFields =
    formId === undefined
      ? []
      : getFormEmailFieldNames(instances, props, formId);
  const [settings, setSettings] = useState<EmailResourceSettings>(
    resource?.email ?? {}
  );
  const [showCustomRecipientError, setShowCustomRecipientError] = useState(
    resource?.email?.recipientMode === "custom"
  );
  const formDataIdentifier = Array.from(aliases).find(
    ([, alias]) => alias === formDataParameterName
  )?.[0];
  const browserInfoIdentifier = Array.from(aliases).find(
    ([, alias]) => alias === browserInfoParameterName
  )?.[0];
  const defaultBody =
    settings.recipientMode === "visitor"
      ? JSON.stringify(defaultVisitorConfirmationBody)
      : formDataIdentifier
        ? getDefaultFormEmailBodyExpression(
            formDataIdentifier,
            browserInfoIdentifier
          )
        : JSON.stringify(defaultEmailBody);
  const setField = <K extends keyof EmailResourceSettings>(
    key: K,
    value: EmailResourceSettings[K]
  ) => {
    onChange?.();
    setSettings((previous) => {
      const next = { ...previous, [key]: value };
      if (key === "subject") {
        delete next.confirmationSubject;
      }
      if (key === "body") {
        delete next.confirmationBody;
      }
      return next;
    });
  };
  const unavailableFormBinding = (expression: string) =>
    Array.from(getExpressionIdentifiers(expression)).some((identifier) => {
      const id = decodeDataVariableId(identifier);
      const dataSource = id ? dataSources.get(id) : undefined;
      return (
        dataSource?.type === "parameter" &&
        (dataSource.name === formDataParameterName ||
          dataSource.name === browserInfoParameterName) &&
        aliases.has(identifier) === false
      );
    })
      ? "This Form binding is unavailable outside its Form."
      : undefined;
  const unavailableResourceBinding = (expression: string) =>
    Array.from(getExpressionIdentifiers(expression)).some((identifier) => {
      const id = decodeDataVariableId(identifier);
      return (
        id !== undefined &&
        !isEmailBindingDataSourceAvailable(dataSources.get(id))
      );
    })
      ? "Email fields cannot depend on another Resource."
      : undefined;
  const getEmailExpressionError = (
    key: "senderExpression" | "recipientsExpression" | "subject" | "body"
  ) => {
    const expression = settings[key];
    if (expression === undefined) {
      return;
    }
    return (
      unavailableFormBinding(expression) ??
      unavailableResourceBinding(expression) ??
      getResourceExpressionErrors({ email: { [key]: expression } })[0] ??
      getExpressionErrorMessages({
        expression,
        availableVariables: new Set(emailBindingAliases.keys()),
      })[0]
    );
  };
  const senderError =
    settings.senderExpression !== undefined
      ? getEmailExpressionError("senderExpression")
      : settings.sender === undefined || settings.sender === ""
        ? undefined
        : validateEmailSender(settings.sender);
  const recipientValidationError =
    settings.recipientMode === "visitor"
      ? !settings.visitorEmailField ||
        !emailFields.includes(settings.visitorEmailField)
        ? "Select one named email input in this Form."
        : undefined
      : settings.recipientMode !== "custom"
        ? undefined
        : settings.recipientsExpression !== undefined
          ? getEmailExpressionError("recipientsExpression")
          : (validateContactEmail(settings.recipients ?? "") ??
            (settings.recipients
              ? undefined
              : "Enter at least one recipient."));
  const recipientError =
    settings.recipientMode === "custom" && !showCustomRecipientError
      ? undefined
      : recipientValidationError;
  const subjectError = getEmailExpressionError("subject");
  const bodyError = getEmailExpressionError("body");
  const setEmailExpression = (
    expressionKey: "senderExpression" | "recipientsExpression",
    valueKey: "sender" | "recipients",
    expression: string
  ) => {
    let literalValue: string | undefined;
    try {
      const parsed: unknown = JSON.parse(expression);
      if (typeof parsed === "string") {
        literalValue = parsed;
      }
    } catch {
      // Non-literal expressions are stored as bindings and validated at submit.
    }
    if (literalValue === undefined) {
      if (valueKey === "recipients") {
        setShowCustomRecipientError(true);
      }
      setField(expressionKey, expression);
      return;
    }
    if (valueKey === "recipients") {
      setShowCustomRecipientError(true);
    }
    onChange?.();
    setSettings((previous) => {
      const next = { ...previous };
      if (literalValue === "") {
        delete next[valueKey];
      } else {
        next[valueKey] = literalValue;
      }
      delete next[expressionKey];
      return next;
    });
  };
  useImperativeHandle(ref, () => ({
    save: (formData) => {
      if (recipientValidationError) {
        setShowCustomRecipientError(true);
      }
      if (
        senderError ||
        recipientValidationError ||
        subjectError ||
        bodyError
      ) {
        return false;
      }
      const scopeInstanceId =
        variable?.scopeInstanceId ?? $selectedInstance.get()?.id;
      if (scopeInstanceId === undefined) {
        return;
      }
      const parsedSettings = JSON.parse(
        String(formData.get("email-settings") ?? "{}")
      ) as EmailResourceSettings;
      const resourceFields = createResourceFieldsFromFormData({
        control: "email",
        formData,
      });
      return executeRuntimeMutation({
        id: "resources.upsert",
        input: {
          resourceId: resource?.id,
          resource: { ...resourceFields, email: parsedSettings },
          dataSourceId: variable?.id,
          scopeInstanceId,
          dataSourceName: resourceFields.name,
        },
      })?.result;
    },
  }));
  const senderField = (
    <EmailExpressionField
      label="Reply to"
      expression={
        settings.senderExpression ?? JSON.stringify(settings.sender ?? "")
      }
      placeholder="John <john@example.com>"
      scope={emailBindingScope}
      aliases={emailBindingAliases}
      error={senderError}
      onChange={(expression) =>
        setEmailExpression("senderExpression", "sender", expression)
      }
    />
  );
  return (
    <>
      <input type="hidden" name="method" value="post" />
      <input type="hidden" name="url" value={'""'} />
      <input
        type="hidden"
        name="email-settings"
        value={JSON.stringify(settings)}
      />
      <Row>
        <Grid gap={1}>
          <Label id={recipientsLabelId}>Recipients</Label>
          <Select<"project" | "custom" | "visitor">
            aria-labelledby={recipientsLabelId}
            options={
              formId === undefined
                ? ["project", "custom"]
                : ["project", "custom", "visitor"]
            }
            value={settings.recipientMode ?? "project"}
            getLabel={(value: "project" | "custom" | "visitor") =>
              value === "project"
                ? "Project recipients (or owner)"
                : value === "custom"
                  ? "Custom recipients"
                  : "Visitor email field"
            }
            getDescription={(value: "project" | "custom" | "visitor") =>
              value === "project"
                ? "Send to the addresses in project settings, or to the account holder if none are set."
                : value === "custom"
                  ? "Send to the addresses entered below."
                  : "Choose a Form input to use as the recipient’s email address. The confirmation email is sent to that address."
            }
            onChange={(value: "project" | "custom" | "visitor") => {
              setShowCustomRecipientError(false);
              if (value === "project") {
                onChange?.();
                setSettings((previous) => {
                  const next = { ...previous };
                  delete next.recipientMode;
                  delete next.recipients;
                  delete next.recipientsExpression;
                  return next;
                });
              } else if (value === "visitor") {
                onChange?.();
                setSettings((previous) => {
                  const next = { ...previous, recipientMode: value };
                  delete next.recipients;
                  delete next.recipientsExpression;
                  return next;
                });
              } else {
                setField("recipientMode", value);
              }
            }}
          />
          {settings.recipientMode === "custom" && (
            <EmailExpressionField
              accessibleName="Custom recipients"
              expression={
                settings.recipientsExpression ??
                JSON.stringify(settings.recipients ?? "")
              }
              placeholder="John <john@example.com>, pete@example.com"
              scope={emailBindingScope}
              aliases={emailBindingAliases}
              error={recipientError}
              onChange={(expression) =>
                setEmailExpression(
                  "recipientsExpression",
                  "recipients",
                  expression
                )
              }
            />
          )}
        </Grid>
      </Row>
      {settings.recipientMode === "visitor" && (
        <Row>
          <Grid gap={1}>
            <InputErrorsTooltip
              errors={recipientError ? [recipientError] : undefined}
            >
              <Select
                fullWidth
                aria-label="Visitor email field"
                value={settings.visitorEmailField}
                placeholder="Select an email field"
                options={emailFields}
                getLabel={(name) => name}
                onChange={(name) => setField("visitorEmailField", name)}
              />
            </InputErrorsTooltip>
          </Grid>
        </Row>
      )}
      {senderField}
      <EmailExpressionField
        label="Subject"
        expression={
          settings.subject ??
          JSON.stringify(
            settings.recipientMode === "visitor"
              ? defaultEmailConfirmationSubject
              : defaultEmailSubject
          )
        }
        placeholder="New form submission"
        scope={emailBindingScope}
        aliases={emailBindingAliases}
        error={subjectError}
        onChange={(value) => setField("subject", value)}
      />
      <EmailExpressionField
        label="Body"
        expression={settings.body ?? defaultBody}
        placeholder=""
        multiline
        scope={emailBindingScope}
        aliases={emailBindingAliases}
        error={bodyError}
        onChange={(value) => setField("body", value)}
      />
      <Row>
        <Grid gap={1}>
          <Label id={`${attachmentId}-label`}>Attachments</Label>
          <RadioGroup
            aria-labelledby={`${attachmentId}-label`}
            value={
              settings.includeAttachments === false ? "exclude" : "include"
            }
            onValueChange={(value) =>
              setField("includeAttachments", value === "include")
            }
          >
            <RadioAndLabel>
              <Radio value="include" id={`${attachmentId}-include`} />
              <Label htmlFor={`${attachmentId}-include`}>
                Attach submitted files
              </Label>
            </RadioAndLabel>
            <RadioAndLabel>
              <Radio value="exclude" id={`${attachmentId}-exclude`} />
              <Label htmlFor={`${attachmentId}-exclude`}>
                Do not attach files
              </Label>
            </RadioAndLabel>
          </RadioGroup>
        </Grid>
      </Row>
    </>
  );
});
EmailResourceForm.displayName = "EmailResourceForm";

export const EmailResourceEditor = forwardRef<
  PanelApi | undefined,
  VariableEditorProps
>((props, ref) => {
  const { scope, aliases } = useResourceScope({ variable: props.variable });
  const revisionRef = useRef(0);
  const [requestPreview, setRequestPreview] =
    useState<Awaited<ReturnType<typeof buildEmailRequestPreviewFromEditor>>>();
  const [pending, setPending] = useState(false);

  useEffect(
    () => () => {
      revisionRef.current += 1;
    },
    []
  );

  const onChange = () => {
    revisionRef.current += 1;
    setRequestPreview(undefined);
    setPending(false);
  };

  const loadRequest = async () => {
    const revision = ++revisionRef.current;
    setRequestPreview(undefined);
    const form = props.formRef.current;
    if (form === null) {
      return;
    }
    setPending(true);
    try {
      const preview = await buildEmailRequestPreviewFromEditor({
        form,
        variable: props.variable,
        scope,
        aliases,
      });
      if (revision === revisionRef.current) {
        setRequestPreview(preview);
      }
    } catch {
      if (revision === revisionRef.current) {
        console.error("Unable to build Email request preview");
      }
    } finally {
      if (revision === revisionRef.current) {
        setPending(false);
      }
    }
  };

  return (
    <VariableEditorLayout
      {...props}
      titleActions={props.titleActions({
        onRefresh: () => void loadRequest(),
        refreshStatus: pending ? "refreshing" : "idle",
      })}
      fields={
        <EmailResourceForm
          ref={ref}
          variable={props.variable}
          onChange={onChange}
        />
      }
      preview={
        <FormResourcePreview
          variable={props.variable}
          variableValue={undefined}
          showSavedResourceRequest={false}
          isComputingRequest={pending}
          onLoadData={() => void loadRequest()}
          requestSnapshot={requestPreview}
          inspectSubmission
          alwaysShowRequestTab
          emptyPreviewMessage="Submit this Form in Preview to see the email service response."
          suppressPreviewPending
        />
      }
    />
  );
});
