import {
  Button,
  theme,
  Text,
  Tooltip,
  IconButton,
  Grid,
  InputField,
  styled,
  Flex,
  NestedInputButton,
  Separator,
} from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";
import {
  AlertIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  CopyIcon,
} from "@webstudio-is/icons";
import type { DomainStatus } from "@webstudio-is/prisma-client";
import { CollapsibleDomainSection } from "./collapsible-domain-section";
import { useCallback, useEffect, useState } from "react";
import type { PublishStatus } from "@webstudio-is/prisma-client";
import { formatDistance } from "date-fns/formatDistance";
import { Entri } from "./entri";
import { trpcClient } from "~/shared/trpc/trpc-client";
import { useStore } from "@nanostores/react";
import { $publisherHost } from "~/shared/nano-states";

export type Domain = {
  projectId: Project["id"];
  domain: {
    domain: string;
    error: string | null;
    status: DomainStatus;
    updatedAt: string;
  };
  txtRecord: string;
  cname: string;
  verified: boolean;
  latestBuid: null | {
    projectId: string;
    buildId: string;
    isLatestBuild: boolean;
    publishStatus: PublishStatus;
    updatedAt: string;
    domainId: string;
  };
};

const InputEllipsis = styled(InputField, {
  "&>input": {
    textOverflow: "ellipsis",
  },
});

const CopyToClipboard = (props: { text: string }) => {
  return (
    <Tooltip content={"Copy to clipboard"}>
      <NestedInputButton
        onClick={() => {
          navigator.clipboard.writeText(props.text);
        }}
      >
        <CopyIcon />
      </NestedInputButton>
    </Tooltip>
  );
};

const getCname = (domain: string) => {
  const domainArray = domain.split(".");
  const cnameArray = domainArray.slice(0, -2);
  if (cnameArray.length === 0) {
    return "@";
  }
  return cnameArray.join(".");
};

export const getStatus = (projectDomain: Domain) =>
  projectDomain.verified
    ? (`VERIFIED_${projectDomain.domain.status}` as const)
    : `UNVERIFIED`;

export const PENDING_TIMEOUT = 60 * 3 * 1000;

export const getPublishStatusAndText = ({
  updatedAt,
  publishStatus,
}: Pick<NonNullable<Domain["latestBuid"]>, "updatedAt" | "publishStatus">) => {
  let status = publishStatus;

  const delta = Date.now() - new Date(updatedAt).getTime();
  // Assume build failed after 3 minutes

  if (publishStatus === "PENDING" && delta > PENDING_TIMEOUT) {
    status = "FAILED";
  }

  const textStart =
    status === "PUBLISHED"
      ? "Published"
      : status === "FAILED"
      ? "Publish failed"
      : "Publishing started";

  const statusText = `${textStart} ${formatDistance(
    new Date(updatedAt),
    new Date(),
    {
      addSuffix: true,
    }
  )}`;

  return { statusText, status };
};

const getStatusText = (props: {
  projectDomain: Domain;
  isLoading: boolean;
}) => {
  const status = getStatus(props.projectDomain);

  let isVerifiedActive = false;
  let text = "Something went wrong";

  switch (status) {
    case "UNVERIFIED":
      text = "Status: Not verified";
      break;

    case "VERIFIED_INITIALIZING":
      text = "Status: Initializing CNAME";
      break;
    case "VERIFIED_PENDING":
      text = "Status: Waiting for CNAME propagation";
      break;
    case "VERIFIED_ACTIVE":
      isVerifiedActive = true;
      text = "Status: Active, not published";

      if (props.projectDomain.latestBuid !== null) {
        const publishText = getPublishStatusAndText(
          props.projectDomain.latestBuid
        );

        text = publishText.statusText;
        isVerifiedActive = publishText.status !== "FAILED";
      }
      break;
    case "VERIFIED_ERROR":
      text = props.projectDomain.domain.error ?? text;
      break;

    default:
      ((value: never) => {
        /* exhaustive check */
      })(status);
      break;
  }

  return {
    isVerifiedActive,
    text: props.isLoading ? "Loading status..." : text,
  };
};

const StatusIcon = (props: { projectDomain: Domain; isLoading: boolean }) => {
  const { isVerifiedActive, text } = getStatusText(props);

  const Icon = isVerifiedActive ? CheckCircleIcon : AlertIcon;

  return (
    <Tooltip content={text}>
      <Flex
        align={"center"}
        justify={"center"}
        css={{
          cursor: "pointer",
          width: theme.spacing[12],
          height: theme.spacing[12],
          color: props.isLoading
            ? theme.colors.foregroundDisabled
            : isVerifiedActive
            ? theme.colors.foregroundSuccessText
            : theme.colors.foregroundDestructive,
        }}
      >
        <Icon />
      </Flex>
    </Tooltip>
  );
};

const DomainItem = (props: {
  initiallyOpen: boolean;
  projectDomain: Domain;
  refreshDomainResult: (
    input: { projectId: Project["id"] },
    onSuccess?: () => void
  ) => void;
  domainState: "idle" | "submitting";
  isPublishing: boolean;
}) => {
  const {
    send: verify,
    state: verifyState,
    data: verifyData,
    error: verifySystemError,
  } = trpcClient.domain.verify.useMutation();

  const {
    send: remove,
    state: removeState,
    data: removeData,
    error: removeSystemError,
  } = trpcClient.domain.remove.useMutation();

  const {
    send: updateStatus,
    state: updateStatusState,
    data: updateStatusData,
    error: updateStatusError,
  } = trpcClient.domain.updateStatus.useMutation();

  const [isStatusLoading, setIsStatusLoading] = useState(true);

  const isRemoveInProgress =
    removeState !== "idle" || props.domainState !== "idle";

  const isCheckStateInProgress =
    verifyState !== "idle" ||
    updateStatusState !== "idle" ||
    props.domainState !== "idle";

  const status = props.projectDomain.verified
    ? (`VERIFIED_${props.projectDomain.domain.status}` as `VERIFIED_${DomainStatus}`)
    : `UNVERIFIED`;

  const { initiallyOpen } = props;

  const domain = props.projectDomain.domain.domain;
  const domainStatus = props.projectDomain.domain.status;
  const domainError = props.projectDomain.domain.error;
  const domainUpdatedAt = props.projectDomain.domain.updatedAt;

  const projectId = props.projectDomain.projectId;
  // const domain

  const refreshDomainResult = props.refreshDomainResult;

  // @todo this should gone https://github.com/webstudio-is/webstudio/issues/1723
  const handleVerify = useCallback(() => {
    verify(
      {
        domain,
        projectId,
      },
      (verifyResponse) => {
        setIsStatusLoading(false);

        if (verifyResponse.success) {
          refreshDomainResult({
            projectId,
          });
        }
      }
    );
  }, [domain, projectId, refreshDomainResult, verify]);

  // @todo this should gone https://github.com/webstudio-is/webstudio/issues/1723
  const handleUpdateStatus = useCallback(() => {
    updateStatus(
      {
        domain,
        projectId,
      },
      (data) => {
        setIsStatusLoading(false);

        if (data.success) {
          if (
            domainStatus !== data.domain.status ||
            domainError !== data.domain.error
          ) {
            refreshDomainResult({
              projectId,
            });
          }
        }
      }
    );
  }, [
    domain,
    domainError,
    domainStatus,
    projectId,
    refreshDomainResult,
    updateStatus,
  ]);

  // @todo this should gone https://github.com/webstudio-is/webstudio/issues/1723
  useEffect(() => {
    if (initiallyOpen) {
      setIsStatusLoading(false);
      return;
    }

    if (status === "VERIFIED_ACTIVE") {
      setIsStatusLoading(false);
      return;
    }

    const timeSinceLastUpdateMs =
      Date.now() - new Date(domainUpdatedAt).getTime();

    const DAY_IN_MS = 24 * 60 * 60 * 1000;
    // Do not check status if it updated more than one day ago
    if (timeSinceLastUpdateMs > DAY_IN_MS) {
      setIsStatusLoading(false);
      return;
    }

    if (status === "UNVERIFIED") {
      handleVerify();
      return;
    }

    handleUpdateStatus();

    // Update status automatically
  }, [
    status,
    initiallyOpen,
    handleVerify,
    handleUpdateStatus,
    domainUpdatedAt,
  ]);

  const publisherHost = useStore($publisherHost);
  const cnameEntryName = getCname(props.projectDomain.domain.domain);
  const cnameEntryValue = `${props.projectDomain.cname}.customers.${publisherHost}`;

  const txtEntryName =
    cnameEntryName === "@"
      ? "__webstudio_is"
      : `__webstudio_is.${cnameEntryName}`;

  const { isVerifiedActive, text } = getStatusText({
    projectDomain: props.projectDomain,
    isLoading: false,
  });

  const cnameRecord = {
    type: "CNAME",
    host: cnameEntryName,
    value: cnameEntryValue,
    ttl: 300,
  } as const;

  const txtRecord = {
    type: "TXT",
    host: txtEntryName,
    value: props.projectDomain.txtRecord,
    ttl: 300,
  } as const;

  const dnsRecords = [cnameRecord, txtRecord];

  return (
    <CollapsibleDomainSection
      initiallyOpen={props.initiallyOpen}
      title={props.projectDomain.domain.domain}
      suffix={
        <Grid flow="column">
          <StatusIcon
            isLoading={isStatusLoading}
            projectDomain={props.projectDomain}
          />

          <Tooltip content={`Proceed to ${props.projectDomain.domain.domain}`}>
            <IconButton
              tabIndex={-1}
              disabled={status !== "VERIFIED_ACTIVE"}
              onClick={(event) => {
                const url = new URL(
                  `https://${props.projectDomain.domain.domain}`
                );
                window.open(url.href, "_blank");
                event.preventDefault();
              }}
            >
              <ExternalLinkIcon />
            </IconButton>
          </Tooltip>
        </Grid>
      }
    >
      {status === "UNVERIFIED" && (
        <>
          {verifySystemError !== undefined && (
            <Text color="destructive">{verifySystemError}</Text>
          )}
          <Button
            disabled={props.isPublishing || isCheckStateInProgress}
            color="primary"
            css={{ width: "100%", flexShrink: 0, mt: theme.spacing[3] }}
            onClick={handleVerify}
          >
            Check status
          </Button>
        </>
      )}

      {status !== "UNVERIFIED" && (
        <>
          {updateStatusData?.success === false && (
            <Text color="destructive">{updateStatusData.error}</Text>
          )}
          {updateStatusError !== undefined && (
            <Text color="destructive">{updateStatusError}</Text>
          )}
          <Button
            disabled={props.isPublishing || isCheckStateInProgress}
            color="primary"
            css={{ width: "100%", flexShrink: 0, mt: theme.spacing[3] }}
            onClick={handleUpdateStatus}
          >
            Check status
          </Button>
        </>
      )}

      {removeData?.success === false && (
        <Text color="destructive">{removeData.error}</Text>
      )}

      {removeSystemError !== undefined && (
        <Text color="destructive">{removeSystemError}</Text>
      )}

      <Button
        disabled={props.isPublishing || isRemoveInProgress}
        color="neutral"
        css={{ width: "100%", flexShrink: 0 }}
        onClick={() => {
          remove(
            {
              domain: props.projectDomain.domain.domain,
              projectId: props.projectDomain.projectId,
            },
            () => {
              props.refreshDomainResult({
                projectId: props.projectDomain.projectId,
              });
            }
          );
        }}
      >
        Remove domain
      </Button>

      <Grid gap={2} css={{ mt: theme.spacing[5] }}>
        <Grid gap={1}>
          {status === "UNVERIFIED" && (
            <>
              {verifyData?.success === false ? (
                <Text color="destructive">
                  Status: Failed to verify
                  <br />
                  {verifyData.error}
                </Text>
              ) : (
                <>
                  <Text color="destructive">Status: Not verified</Text>
                  <Text color="subtle">
                    Verification may take up to 24 hours but usually takes only
                    a few minutes.
                  </Text>
                </>
              )}
            </>
          )}

          {status !== "UNVERIFIED" && (
            <>
              <Text color={isVerifiedActive ? "success" : "destructive"}>
                {text}
              </Text>
            </>
          )}
        </Grid>

        <Text color="subtle">
          <strong>To verify your domain:</strong>
          <br />
          Visit the admin console of your domain registrar (the website you
          purchased your domain from) and create one <strong>CNAME</strong>{" "}
          record and one <strong>TXT</strong> record with the values shown
          below:
        </Text>

        <Grid
          gap={2}
          css={{
            gridTemplateColumns: `${theme.spacing[18]} 1fr 1fr`,
          }}
        >
          <Text color="subtle" variant={"titles"}>
            TYPE
          </Text>
          <Text color="subtle" variant={"titles"}>
            NAME
          </Text>
          <Text color="subtle" variant={"titles"}>
            VALUE
          </Text>

          <InputEllipsis readOnly value="CNAME" />
          <InputEllipsis
            readOnly
            value={cnameRecord.host}
            suffix={<CopyToClipboard text={cnameRecord.host} />}
          />
          <InputEllipsis
            readOnly
            value={cnameRecord.value}
            suffix={<CopyToClipboard text={cnameRecord.value} />}
          />

          <InputEllipsis readOnly value="TXT" />
          <InputEllipsis
            readOnly
            value={txtRecord.host}
            suffix={<CopyToClipboard text={txtRecord.host} />}
          />
          <InputEllipsis
            readOnly
            value={txtRecord.value}
            suffix={<CopyToClipboard text={txtRecord.value} />}
          />
        </Grid>

        <Grid
          gap={2}
          align={"center"}
          css={{
            gridTemplateColumns: `1fr auto 1fr`,
          }}
        >
          <Separator css={{ alignSelf: "unset" }} />
          <Text color="main">OR</Text>
          <Separator css={{ alignSelf: "unset" }} />
        </Grid>

        <Entri
          dnsRecords={dnsRecords}
          domain={props.projectDomain.domain.domain}
          onClose={() => {
            // Sometimes Entri modal dialog hangs even if it's successful,
            // until they fix that, we'll just refresh the status here on every onClose event
            if (status === "UNVERIFIED") {
              handleVerify();
              return;
            }

            handleUpdateStatus();
          }}
          isPublishing={props.isPublishing}
        />
      </Grid>
    </CollapsibleDomainSection>
  );
};

type DomainsProps = {
  newDomains: Set<string>;
  domains: Domain[];
  refreshDomainResult: (
    input: { projectId: Project["id"] },
    onSuccess?: () => void
  ) => void;
  domainState: "idle" | "submitting";
  isPublishing: boolean;
};

export const Domains = ({
  newDomains,
  domains,
  refreshDomainResult,
  domainState,
  isPublishing,
}: DomainsProps) => {
  return (
    <>
      {domains.map((projectDomain) => (
        <DomainItem
          key={projectDomain.domain.domain}
          projectDomain={projectDomain}
          initiallyOpen={newDomains.has(projectDomain.domain.domain)}
          refreshDomainResult={refreshDomainResult}
          domainState={domainState}
          isPublishing={isPublishing}
        />
      ))}
    </>
  );
};
