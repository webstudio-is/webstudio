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
import {
  AlertIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  CopyIcon,
} from "@webstudio-is/icons";
import { CollapsibleDomainSection } from "./collapsible-domain-section";
import {
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
import { $publisherHost } from "~/shared/nano-states";
import { extractCname } from "./cname";
import { useEffectEvent } from "~/shared/hook-utils/effect-event";
import DomainCheckbox from "./domain-checkbox";
import { CopyToClipboard } from "~/builder/shared/copy-to-clipboard";
import { RelativeTime } from "~/builder/shared/relative-time";

export type Domain = Project["domainsVirtual"][number];
type DomainStatus = Project["domainsVirtual"][number]["status"];

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
      {textStart}
      <RelativeTime time={new Date(createdAt)} />
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

const DomainItem = (props: {
  initiallyOpen: boolean;
  projectDomain: Domain;
  refresh: () => Promise<void>;
  project: Project;
}) => {
  const timeSinceLastUpdateMs =
    Date.now() - new Date(props.projectDomain.updatedAt).getTime();

  const DAY_IN_MS = 24 * 60 * 60 * 1000;

  const status = props.projectDomain.verified
    ? (`VERIFIED_${props.projectDomain.status}` as `VERIFIED_${DomainStatus}`)
    : `UNVERIFIED`;

  const [isStatusLoading, setIsStatusLoading] = useState(
    props.initiallyOpen ||
      status === "VERIFIED_ACTIVE" ||
      timeSinceLastUpdateMs > DAY_IN_MS
      ? false
      : true
  );

  const [isCheckStateInProgress, setIsCheckStateInProgress] =
    useOptimistic(false);

  const [isRemoveInProgress, setIsRemoveInProgress] = useOptimistic(false);

  const handleRemoveDomain = async () => {
    setIsRemoveInProgress(true);
    const result = await nativeClient.domain.remove.mutate({
      projectId: props.projectDomain.projectId,
      domainId: props.projectDomain.domainId,
    });

    if (result.success === false) {
      toast.error(result.error);
      return;
    }

    await props.refresh();
  };

  const [verifyError, setVerifyError] = useState<string | undefined>(undefined);

  const handleVerify = useEffectEvent(async () => {
    setVerifyError(undefined);
    setIsCheckStateInProgress(true);

    const verifyResult = await nativeClient.domain.verify.mutate({
      projectId: props.projectDomain.projectId,
      domainId: props.projectDomain.domainId,
    });

    if (verifyResult.success === false) {
      setVerifyError(verifyResult.error);
      return;
    }

    await props.refresh();
  });

  const [updateStatusError, setUpdateStatusError] = useState<
    string | undefined
  >(undefined);

  const handleUpdateStatus = useEffectEvent(async () => {
    setUpdateStatusError(undefined);
    setIsCheckStateInProgress(true);

    const updateStatusResult = await nativeClient.domain.updateStatus.mutate({
      projectId: props.projectDomain.projectId,
      domain: props.projectDomain.domain,
    });

    setIsStatusLoading(false);

    if (updateStatusResult.success === false) {
      setUpdateStatusError(updateStatusResult.error);
      return;
    }

    await props.refresh();
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

  const publisherHost = useStore($publisherHost);
  const cnameEntryName = extractCname(props.projectDomain.domain);
  const cnameEntryValue = `${props.projectDomain.cname}.customers.${publisherHost}`;

  const txtEntryName =
    cnameEntryName === "@"
      ? "_webstudio_is"
      : `_webstudio_is.${cnameEntryName}`;

  const domainStatus = getStatus(props.projectDomain);

  const cnameRecord = {
    type: "CNAME",
    host: cnameEntryName,
    value: cnameEntryValue,
    ttl: 300,
  } as const;

  const txtRecord = {
    type: "TXT",
    host: txtEntryName,
    value: props.projectDomain.expectedTxtRecord,
    ttl: 300,
  } as const;

  const dnsRecords = [cnameRecord, txtRecord];

  const { isVerifiedActive, text } = getStatusText({
    projectDomain: props.projectDomain,
    isLoading: false,
  });

  return (
    <CollapsibleDomainSection
      prefix={
        <DomainCheckbox
          buildId={props.projectDomain.latestBuildVirtual?.buildId}
          defaultChecked={
            props.projectDomain.latestBuildVirtual?.buildId != null &&
            props.projectDomain.latestBuildVirtual?.buildId ===
              props.project.latestBuildVirtual?.buildId
          }
          domain={props.projectDomain.domain}
          disabled={domainStatus !== "VERIFIED_ACTIVE"}
        />
      }
      initiallyOpen={props.initiallyOpen}
      title={props.projectDomain.domain}
      suffix={
        <Grid flow="column">
          <StatusIcon
            isLoading={isStatusLoading}
            projectDomain={props.projectDomain}
          />

          <Tooltip content={`Proceed to ${props.projectDomain.domain}`}>
            <IconButton
              tabIndex={-1}
              disabled={status !== "VERIFIED_ACTIVE"}
              onClick={(event) => {
                const url = new URL(`https://${props.projectDomain.domain}`);
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
          <Button
            formAction={handleVerify}
            state={isCheckStateInProgress ? "pending" : undefined}
            color="primary"
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
            color="primary"
            css={{ width: "100%", flexShrink: 0, mt: theme.spacing[3] }}
          >
            Check status
          </Button>
        </>
      )}

      <Button
        formAction={handleRemoveDomain}
        state={isRemoveInProgress ? "pending" : undefined}
        color="neutral"
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
            suffix={
              <CopyToClipboard text={cnameRecord.host}>
                <NestedInputButton type="button">
                  <CopyIcon />
                </NestedInputButton>
              </CopyToClipboard>
            }
          />
          <InputEllipsis
            readOnly
            value={cnameRecord.value}
            suffix={
              <CopyToClipboard text={cnameRecord.value}>
                <NestedInputButton type="button">
                  <CopyIcon />
                </NestedInputButton>
              </CopyToClipboard>
            }
          />

          <InputEllipsis readOnly value="TXT" />
          <InputEllipsis
            readOnly
            value={txtRecord.host}
            suffix={
              <CopyToClipboard text={txtRecord.host}>
                <NestedInputButton type="button">
                  <CopyIcon />
                </NestedInputButton>
              </CopyToClipboard>
            }
          />
          <InputEllipsis
            readOnly
            value={txtRecord.value}
            suffix={
              <CopyToClipboard text={txtRecord.value}>
                <NestedInputButton type="button">
                  <CopyIcon />
                </NestedInputButton>
              </CopyToClipboard>
            }
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
          domain={props.projectDomain.domain}
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
