import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  Grid,
  Flex,
  InputErrorsTooltip,
  Label,
  ProChip,
  ResettableLabel,
  Text,
  TextArea,
  cssVar,
} from "@webstudio-is/design-system";
import { InfoCircleIcon } from "@webstudio-is/icons";
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
    placeholder: "Acme <acme@example.com>",
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

const InfoTooltip = ({
  label,
  content,
}: {
  label: string;
  content: string;
}) => (
  <ResettableLabel
    aria-label={label}
    color="inactive"
    css={{ padding: 0 }}
    content={<Text>{content}</Text>}
  >
    <InfoCircleIcon color={cssVar("--foreground-secondary")} aria-hidden />
  </ResettableLabel>
);

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
        <Flex gap={1} align="center">
          <Label htmlFor="project-contact-email">
            Recipients{" "}
            {maxContactEmailsPerProject === 0 && <ProChip>Pro</ProChip>}
          </Label>
          <InfoTooltip
            label="Recipients"
            content="Existing Contact email recipients are also used by legacy forms. Leave empty to send new Email Resources to the project owner."
          />
        </Flex>
        <InputErrorsTooltip errors={contactError ? [contactError] : undefined}>
          <TextArea
            id="project-contact-email"
            rows={1}
            autoGrow
            value={meta.contactEmail ?? ""}
            color={contactError ? "error" : undefined}
            placeholder="Acme <acme@example.com>, team@example.com"
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
            <Flex gap={1} align="center">
              <Label htmlFor={`project-${key}`}>{label}</Label>
              {"help" in rest && (
                <InfoTooltip label={label} content={rest.help} />
              )}
            </Flex>
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
