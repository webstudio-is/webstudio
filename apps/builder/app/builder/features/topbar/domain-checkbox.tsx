import { useStore } from "@nanostores/react";
import {
  Flex,
  Tooltip,
  Text,
  theme,
  Link,
  buttonStyle,
  Checkbox,
} from "@webstudio-is/design-system";

import { $project } from "~/shared/sync/data-stores";
import { $userPlanFeatures } from "~/shared/nano-states";

export const domainToPublishName = "domainToPublish[]";

interface DomainCheckboxProps {
  defaultChecked?: boolean;
  domain: string;
  buildId: string | undefined;
  disabled?: boolean;
}

export const DomainCheckbox = (props: DomainCheckboxProps) => {
  const { allowStagingPublish } = useStore($userPlanFeatures);
  const project = useStore($project);

  if (project === undefined) {
    return;
  }

  const tooltipContentForFreeUsers = allowStagingPublish ? undefined : (
    <Flex direction="column" gap="2" css={{ maxWidth: theme.spacing[28] }}>
      <Text variant="titles">Publish to Staging</Text>
      <Text>
        <Flex direction="column">
          Staging allows you to preview a production version of your site
          without potentially breaking what production site visitors will see.
          <>
            <br />
            <br />
            Upgrade to Pro account to publish to each domain individually.
            <br /> <br />
            <Link
              className={buttonStyle({ color: "gradient" })}
              color="contrast"
              underline="none"
              href="https://webstudio.is/pricing"
              target="_blank"
            >
              Upgrade
            </Link>
          </>
        </Flex>
      </Text>
    </Flex>
  );

  const defaultChecked = allowStagingPublish ? props.defaultChecked : true;
  const disabled = allowStagingPublish ? props.disabled : true;

  const hideDomainCheckbox =
    project.domainsVirtual.filter(
      (domain) => domain.status === "ACTIVE" && domain.verified
    ).length === 0 && allowStagingPublish;

  return (
    <div style={{ display: hideDomainCheckbox ? "none" : "contents" }}>
      <Tooltip content={tooltipContentForFreeUsers} variant="wrapped">
        <Checkbox
          disabled={disabled}
          key={props.buildId ?? "-"}
          defaultChecked={hideDomainCheckbox || defaultChecked}
          css={{ pointerEvents: "all" }}
          name={domainToPublishName}
          value={props.domain}
        />
      </Tooltip>
    </div>
  );
};
