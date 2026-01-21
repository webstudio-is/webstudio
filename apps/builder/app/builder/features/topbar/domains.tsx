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
  toast,
} from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";
import { AlertIcon, CheckCircleIcon, CopyIcon } from "@webstudio-is/icons";
import { CollapsibleDomainSection } from "./collapsible-domain-section";
import {
  Fragment,
  startTransition,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Entri } from "./entri";
import { nativeClient } from "~/shared/trpc/trpc-client";
import { useStore } from "@nanostores/react";
import { $publisherHost } from "~/shared/sync/data-stores";
import { extractCname } from "./cname";
import { useEffectEvent } from "~/shared/hook-utils/effect-event";
import { DomainCheckbox } from "./domain-checkbox";
import { CopyToClipboard } from "~/shared/copy-to-clipboard";
import { RelativeTime } from "~/builder/shared/relative-time";

export type Domain = Project["domainsVirtual"][number];

type DomainStatus = Domain["status"];

const InputEllipsis = styled(InputField, {
  "&>input": {
    textOverflow: "ellipsis",
  },
});

export const getStatus = (projectDomain: Domain) =>
  projectDomain.verified
    ? (`VERIFIED_${projectDomain.status}` as const)
    : `UNVERIFIED`;

export const PENDING_TIMEOUT =
  process.env.NODE_ENV === "production" ? 60 * 3 * 1000 : 35000;

export const getPublishStatusAndText = ({
  createdAt,
  publishStatus,
}: Pick<
  NonNullable<Domain["latestBuildVirtual"]>,
  "createdAt" | "publishStatus"
>) => {
  let status = publishStatus;

  const delta = Date.now() - new Date(createdAt).getTime();
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

  const statusText = (
    <>
      {textStart} <RelativeTime time={new Date(createdAt)} />
    </>
  );

  return { statusText, status };
};

const getStatusText = (props: {
  projectDomain: Domain;
  isLoading: boolean;
}) => {
  const status = getStatus(props.projectDomain);

  let isVerifiedActive = false;
  let text: ReactNode = "Something went wrong";

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

      if (props.projectDomain.latestBuildVirtual !== null) {
        const publishText = getPublishStatusAndText(
          props.projectDomain.latestBuildVirtual
        );

        text = publishText.statusText;
        isVerifiedActive = publishText.status !== "FAILED";
      }
      break;
    case "VERIFIED_ERROR":
      text = props.projectDomain.error ?? text;
      break;

    default:
      ((_value: never) => {
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
        align="center"
        justify="center"
        css={{
          cursor: "pointer",
          width: theme.sizes.controlHeight,
          height: theme.sizes.controlHeight,
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

const DomainItem = ({
  initiallyOpen,
  projectDomain,
  project,
  refresh,
}: {
  initiallyOpen: boolean;
  projectDomain: Domain;
  project: Project;
  refresh: () => Promise<void>;
}) => {
  const timeSinceLastUpdateMs =
    Date.now() - new Date(projectDomain.updatedAt).getTime();

  const DAY_IN_MS = 24 * 60 * 60 * 1000;

  const status = projectDomain.verified
    ? (`VERIFIED_${projectDomain.status}` as `VERIFIED_${DomainStatus}`)
    : `UNVERIFIED`;

  const [isStatusLoading, setIsStatusLoading] = useState(
    initiallyOpen ||
      status === "VERIFIED_ACTIVE" ||
      timeSinceLastUpdateMs > DAY_IN_MS
      ? false
      : true
  );

  const [isCheckStateInProgress, setIsCheckStateInProgress] =
    useOptimistic(false);

  const [isRemoveInProgress, setIsRemoveInProgress] = useOptimistic(false);

  const [isUnpublishInProgress, setIsUnpublishInProgress] =
    useOptimistic(false);

  const handleUnpublish = async () => {
    setIsUnpublishInProgress(true);
    const result = await nativeClient.domain.unpublish.mutate({
      projectId: projectDomain.projectId,
      domain: projectDomain.domain,
    });

    if (result.success === false) {
      toast.error(result.message);
      return;
    }

    await refresh();
    toast.success(result.message);
  };

  const handleRemoveDomain = async () => {
    setIsRemoveInProgress(true);
    const result = await nativeClient.domain.remove.mutate({
      projectId: projectDomain.projectId,
      domainId: projectDomain.domainId,
    });

    if (result.success === false) {
      toast.error(result.error);
      return;
    }

    await refresh();
  };

  const [verifyError, setVerifyError] = useState<string | undefined>(undefined);

  const handleVerify = useEffectEvent(async () => {
    setVerifyError(undefined);
    setIsCheckStateInProgress(true);

    const verifyResult = await nativeClient.domain.verify.mutate({
      projectId: projectDomain.projectId,
      domainId: projectDomain.domainId,
    });

    if (verifyResult.success === false) {
      setVerifyError(verifyResult.error);
      return;
    }

    await refresh();
  });

  const [updateStatusError, setUpdateStatusError] = useState<
    string | undefined
  >(undefined);

  const handleUpdateStatus = useEffectEvent(async () => {
    setUpdateStatusError(undefined);
    setIsCheckStateInProgress(true);

    const updateStatusResult = await nativeClient.domain.updateStatus.mutate({
      projectId: projectDomain.projectId,
      domain: projectDomain.domain,
    });

    setIsStatusLoading(false);

    if (updateStatusResult.success === false) {
      setUpdateStatusError(updateStatusResult.error);
      return;
    }

    await refresh();
  });

  const onceRef = useRef(false);
  useEffect(() => {
    if (onceRef.current) {
      return;
    }
    onceRef.current = true;

    if (isStatusLoading === false) {
      return;
    }

    if (status === "UNVERIFIED") {
      startTransition(async () => {
        await handleVerify();
        await handleUpdateStatus();
      });
      return;
    }
    startTransition(async () => {
      await handleUpdateStatus();
    });
  }, [status, handleVerify, handleUpdateStatus, isStatusLoading]);

  const domainStatus = getStatus(projectDomain);

  const { isVerifiedActive, text } = getStatusText({
    projectDomain,
    isLoading: false,
  });

  const publisherHost = useStore($publisherHost);
  const cname = extractCname(projectDomain.domain);
  const dnsRecords = [
    {
      type: "CNAME",
      host: cname,
      value: `${projectDomain.cname}.customers.${publisherHost}`,
      ttl: 300,
    } as const,
    {
      type: "TXT",
      host: cname === "@" ? "_webstudio_is" : `_webstudio_is.${cname}`,
      value: projectDomain.expectedTxtRecord,
      ttl: 300,
    } as const,
  ];

  return (
    <CollapsibleDomainSection
      prefix={
        <DomainCheckbox
          buildId={projectDomain.latestBuildVirtual?.buildId}
          defaultChecked={
            projectDomain.latestBuildVirtual?.buildId != null &&
            projectDomain.latestBuildVirtual?.buildId ===
              project.latestBuildVirtual?.buildId
          }
          domain={projectDomain.domain}
          disabled={domainStatus !== "VERIFIED_ACTIVE"}
        />
      }
      initiallyOpen={initiallyOpen}
      title={projectDomain.domain}
      suffix={
        <Grid flow="column">
          <StatusIcon
            isLoading={isStatusLoading}
            projectDomain={projectDomain}
          />

          <CopyToClipboard
            text={`https://${projectDomain.domain}`}
            copyText={`Copy link: https://${projectDomain.domain}`}
          >
            <IconButton type="button" tabIndex={-1}>
              <CopyIcon />
            </IconButton>
          </CopyToClipboard>
        </Grid>
      }
    >
      {status === "UNVERIFIED" && (
        <>
          <Button
            formAction={handleVerify}
            state={isCheckStateInProgress ? "pending" : undefined}
            color="neutral"
            css={{ width: "100%", flexShrink: 0, mt: theme.spacing[3] }}
          >
            Check status
          </Button>
        </>
      )}

      {status !== "UNVERIFIED" && (
        <>
          {updateStatusError && (
            <Text color="destructive">{updateStatusError}</Text>
          )}
          <Button
            formAction={handleUpdateStatus}
            state={isCheckStateInProgress ? "pending" : undefined}
            color="neutral"
            css={{ width: "100%", flexShrink: 0, mt: theme.spacing[3] }}
          >
            Check status
          </Button>
        </>
      )}

      {projectDomain.latestBuildVirtual && (
        <Button
          formAction={handleUnpublish}
          state={isUnpublishInProgress ? "pending" : undefined}
          color="destructive"
          css={{ width: "100%", flexShrink: 0 }}
        >
          Unpublish
        </Button>
      )}

      <Button
        formAction={handleRemoveDomain}
        state={isRemoveInProgress ? "pending" : undefined}
        color="destructive"
        css={{ width: "100%", flexShrink: 0 }}
      >
        Remove domain
      </Button>

      <Grid gap={2} css={{ mt: theme.spacing[5] }}>
        <Grid gap={1}>
          {status === "UNVERIFIED" && (
            <>
              {verifyError ? (
                <Text color="destructive">
                  Status: Failed to verify
                  <br />
                  {verifyError}
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
          css={{ gridTemplateColumns: `${theme.spacing[18]} 1fr 1fr` }}
        >
          <Text color="subtle" variant="titles">
            TYPE
          </Text>
          <Text color="subtle" variant="titles">
            NAME
          </Text>
          <Text color="subtle" variant="titles">
            VALUE
          </Text>

          {dnsRecords.map((record, index) => (
            <Fragment key={index}>
              <InputEllipsis readOnly value={record.type} />
              <InputEllipsis
                readOnly
                value={record.host}
                suffix={
                  <CopyToClipboard text={record.host}>
                    <NestedInputButton type="button">
                      <CopyIcon />
                    </NestedInputButton>
                  </CopyToClipboard>
                }
              />
              <InputEllipsis
                readOnly
                value={record.value}
                suffix={
                  <CopyToClipboard text={record.value}>
                    <NestedInputButton type="button">
                      <CopyIcon />
                    </NestedInputButton>
                  </CopyToClipboard>
                }
              />
            </Fragment>
          ))}
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
          domain={projectDomain.domain}
          onClose={() => {
            // Sometimes Entri modal dialog hangs even if it's successful,
            // until they fix that, we'll just refresh the status here on every onClose event
            if (status === "UNVERIFIED") {
              startTransition(async () => {
                await handleVerify();
                await handleUpdateStatus();
              });
              return;
            }
            startTransition(async () => {
              await handleUpdateStatus();
            });
          }}
        />
      </Grid>
    </CollapsibleDomainSection>
  );
};

type DomainsProps = {
  newDomains: Set<string>;
  domains: Domain[];
  refresh: () => Promise<void>;
  project: Project;
};

export const Domains = ({
  newDomains,
  domains,
  refresh,
  project,
}: DomainsProps) => {
  return (
    <>
      {domains.map((projectDomain) => (
        <DomainItem
          key={projectDomain.domain}
          projectDomain={projectDomain}
          initiallyOpen={newDomains.has(projectDomain.domain)}
          refresh={refresh}
          project={project}
        />
      ))}
    </>
  );
};
