import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  Grid,
  InputErrorsTooltip,
  Label,
  ProChip,
  Text,
  TextArea,
} from "@webstudio-is/design-system";
import type { ProjectMeta } from "@webstudio-is/sdk";
import {
  validateContactEmail,
  validateEmailSender,
  validateEmailText,
} from "@webstudio-is/project-build/contracts";
import { $permissions } from "~/shared/nano-states";
import { $projectSettings } from "~/shared/sync/data-stores";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { sectionSpacing } from "./utils";

const fields = [
  {
    key: "emailSender",
    label: "Sender",
    placeholder: "Olegs Isonen <oleg008@gmail.com>",
    help: "Emails are sent through Webstudio. Replies go to this address.",
  },
  {
    key: "emailSubject",
    label: "Owner subject",
    placeholder: "New form submission",
  },
  {
    key: "emailBody",
    label: "Owner plain-text body",
    placeholder: "Write the complete owner message",
    help: "Leave empty for the default message. Form-scoped Email Resources include submitted fields and browser information by default. Edit an Email Resource body expression to use bindings in a custom message.",
  },
  {
    key: "emailConfirmationSubject",
    label: "Visitor email subject",
    placeholder: "We received your submission",
  },
] as const;

export const SectionEmails = () => {
  const projectSettings = useStore($projectSettings);
  const { maxContactEmailsPerProject } = useStore($permissions);
  const [meta, setMeta] = useState<ProjectMeta>(projectSettings?.meta ?? {});
  useEffect(() => {
    setMeta(projectSettings?.meta ?? {});
  }, [projectSettings?.meta]);

  const save = (key: keyof ProjectMeta, value: string) => {
    setMeta((previous) => ({ ...previous, [key]: value }));
    const error =
      key === "contactEmail"
        ? validateContactEmail(value, maxContactEmailsPerProject)
        : key === "emailSender"
          ? validateEmailSender(value)
          : validateEmailText(value, String(key), key === "emailBody");
    if (error === undefined) {
      executeRuntimeMutation({
        id: "projectSettings.update",
        input: { meta: { [key]: value } },
      });
    }
  };

  const contactError = validateContactEmail(
    meta.contactEmail ?? "",
    maxContactEmailsPerProject
  );
  return (
    <Grid gap={2}>
      <Text variant="titles" css={sectionSpacing}>
        Emails
      </Text>
      <Grid gap={1} css={sectionSpacing}>
        <Label htmlFor="project-contact-email">
          Recipients{" "}
          {maxContactEmailsPerProject === 0 && <ProChip>Pro</ProChip>}
        </Label>
        <Text color="subtle">
          Existing Contact email recipients are also used by legacy forms. Leave
          empty to send new Email Resources to the project owner.
        </Text>
        <InputErrorsTooltip errors={contactError ? [contactError] : undefined}>
          <TextArea
            id="project-contact-email"
            rows={1}
            autoGrow
            value={meta.contactEmail ?? ""}
            color={contactError ? "error" : undefined}
            placeholder="Olegs Isonen <oleg008@gmail.com>, team@example.com"
            onChange={(value) => save("contactEmail", value)}
          />
        </InputErrorsTooltip>
      </Grid>
      {fields.map(({ key, label, placeholder, ...rest }) => {
        const error =
          key === "emailSender"
            ? validateEmailSender(meta[key] ?? "")
            : validateEmailText(meta[key] ?? "", label, key === "emailBody");
        return (
          <Grid key={key} gap={1} css={sectionSpacing}>
            <Label htmlFor={`project-${key}`}>{label}</Label>
            {"help" in rest && <Text color="subtle">{rest.help}</Text>}
            <InputErrorsTooltip errors={error ? [error] : undefined}>
              <TextArea
                id={`project-${key}`}
                rows={key.endsWith("Body") ? 4 : 1}
                autoGrow
                value={meta[key] ?? ""}
                color={error ? "error" : undefined}
                placeholder={placeholder}
                onChange={(value) => save(key, value)}
              />
            </InputErrorsTooltip>
          </Grid>
        );
      })}
    </Grid>
  );
};
