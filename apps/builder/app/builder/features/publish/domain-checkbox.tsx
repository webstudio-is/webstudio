import { useStore } from "@nanostores/react";
import { useEffect, useState } from "react";
import {
  Flex,
  Tooltip,
  Text,
  theme,
  LinkButton,
  Checkbox,
} from "@webstudio-is/design-system";

import { $project } from "~/shared/sync/data-stores";
import { $permissions } from "~/shared/nano-states";

export const domainToPublishName = "domainToPublish[]";

/**
 * Pure function: returns true when a custom domain checkbox should be disabled
 * because the user's permissions restrict them to staging-only publishing.
 *
 * Two cases disable custom domains:
 *  - Free plan users (`!allowStagingPublish`): publishing is staging-only by plan.
 *  - Builder role (`canPublishToStagingOnly`): role-based staging restriction.
 *
 * Staging domains are always unrestricted — this function returns false for them.
 */
const isCustomDomainPublishRestricted = ({
  allowStagingPublish,
  canPublishToStagingOnly,
  isCustomDomain,
}: {
  allowStagingPublish: boolean;
  canPublishToStagingOnly: boolean;
  isCustomDomain: boolean | undefined;
}) =>
  (!allowStagingPublish || canPublishToStagingOnly) && isCustomDomain === true;

export const __testing__ = { isCustomDomainPublishRestricted };

interface DomainCheckboxProps {
  defaultChecked?: boolean;
  validatedDomains?: readonly string[];
  domain: string;
  buildId: string | undefined;
  disabled?: boolean;
  isCustomDomain?: boolean;
}

export const DomainCheckbox = (props: DomainCheckboxProps) => {
  const { allowStagingPublish, canPublishToStagingOnly } =
    useStore($permissions);
  const project = useStore($project);
  const [selection, setSelection] = useState<{
    buildId: string | undefined;
    validatedDomains?: readonly string[];
    checked: boolean;
  }>({
    buildId: props.buildId,
    validatedDomains: props.validatedDomains,
    checked:
      props.validatedDomains?.includes(props.domain) ??
      props.defaultChecked ??
      false,
  });
  const restoredChecked =
    props.validatedDomains?.includes(props.domain) ??
    props.defaultChecked ??
    false;
  const hasNewValidation =
    props.validatedDomains !== undefined &&
    selection.validatedDomains !== props.validatedDomains;
  const hasNewBuild = selection.buildId !== props.buildId;

  useEffect(() => {
    if (hasNewValidation || hasNewBuild) {
      setSelection({
        buildId: props.buildId,
        validatedDomains: props.validatedDomains,
        checked: restoredChecked,
      });
    }
  }, [
    hasNewValidation,
    hasNewBuild,
    props.validatedDomains,
    props.buildId,
    restoredChecked,
  ]);

  if (project === undefined) {
    return;
  }

  const tooltipContentForFreeUsers = allowStagingPublish ? undefined : (
    <Flex direction="column" gap="2" css={{ maxWidth: theme.spacing[28] }}>
      <Text variant="titles">Publish to staging</Text>
      <Text>
        <Flex direction="column">
          Staging allows you to preview a production version of your site
          without potentially breaking what production site visitors will see.
          <>
            <br />
            <br />
            Upgrade to Pro account to publish to each domain individually.
            <br /> <br />
            <LinkButton
              color="primary"
              href="https://webstudio.is/pricing"
              target="_blank"
            >
              Upgrade
            </LinkButton>
          </>
        </Flex>
      </Text>
    </Flex>
  );

  const tooltipContentForBuilders =
    canPublishToStagingOnly && props.isCustomDomain ? (
      <Text>
        Builders can only publish to staging. Contact the project owner or an
        admin to publish to custom domains.
      </Text>
    ) : undefined;

  const tooltipContent =
    tooltipContentForBuilders ?? tooltipContentForFreeUsers;

  // On free plan: custom domains are disabled+unchecked (can't publish to them).
  // For builders: custom domains are disabled (staging-only permission).
  // Staging domain behaves normally — user can still check/uncheck it.
  const isRestricted = isCustomDomainPublishRestricted({
    allowStagingPublish,
    canPublishToStagingOnly,
    isCustomDomain: props.isCustomDomain,
  });
  const checked = isRestricted
    ? false
    : hasNewValidation || hasNewBuild
      ? restoredChecked
      : selection.checked;
  const disabled = isRestricted ? true : props.disabled;

  const hideDomainCheckbox =
    project.domainsVirtual.filter(
      (domain) => domain.status === "ACTIVE" && domain.verified
    ).length === 0 && allowStagingPublish;

  return (
    <div style={{ display: hideDomainCheckbox ? "none" : "contents" }}>
      <Tooltip content={tooltipContent} variant="wrapped">
        <Checkbox
          disabled={disabled}
          key={props.buildId ?? "-"}
          checked={hideDomainCheckbox || checked}
          onCheckedChange={(value) =>
            setSelection({
              buildId: props.buildId,
              validatedDomains: props.validatedDomains,
              checked: value === true,
            })
          }
          css={{ pointerEvents: "all" }}
          name={domainToPublishName}
          value={props.domain}
        />
      </Tooltip>
    </div>
  );
};
