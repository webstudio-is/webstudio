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
} from "@webstudio-is/project-build/contracts";
import { $permissions } from "~/shared/nano-states";
import { $projectSettings } from "~/shared/sync/data-stores";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { sectionSpacing } from "./utils";

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

  const save = (key: "contactEmail" | "emailSender", value: string) => {
    setMeta((previous) => ({ ...previous, [key]: value }));
    const error =
      key === "contactEmail"
        ? validateContactEmail(value, maxContactEmailsPerProject)
        : validateEmailSender(value);
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
  const replyToError = validateEmailSender(meta.emailSender ?? "");
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
            content="These addresses are used by email resources. Leave empty to send to the account holder."
          />
        </Flex>
        <InputErrorsTooltip errors={contactError ? [contactError] : undefined}>
          <TextArea
            id="project-contact-email"
            rows={1}
            autoGrow
            value={meta.contactEmail ?? ""}
            color={contactError ? "error" : undefined}
            placeholder="John <john@example.com>, pete@example.com"
            onChange={(value) => save("contactEmail", value)}
          />
        </InputErrorsTooltip>
      </Grid>
      <Grid gap={1} css={sectionSpacing}>
        <Flex gap={1} align="center">
          <Label htmlFor="project-emailSender">Reply to</Label>
          <InfoTooltip
            label="Reply to"
            content="This is the default Reply to address for email resources. Its display name is used in generated default visitor confirmation subjects and messages when the resource has no Reply to value. Custom subjects and messages stay unchanged. If no display name is set, “Site Owner” is used."
          />
        </Flex>
        <InputErrorsTooltip errors={replyToError ? [replyToError] : undefined}>
          <TextArea
            id="project-emailSender"
            rows={1}
            autoGrow
            value={meta.emailSender ?? ""}
            color={replyToError ? "error" : undefined}
            placeholder="John <john@example.com>"
            onChange={(value) => save("emailSender", value)}
          />
        </InputErrorsTooltip>
      </Grid>
    </Grid>
  );
};
