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
} from "@webstudio-is/design-system";
import type { DomainRouter } from "@webstudio-is/domain/index.server";
import type { Project } from "@webstudio-is/project";
import { createTrpcFetchProxy } from "~/shared/remix/trpc-remix-proxy";
import { builderDomainsPath } from "~/shared/router-utils";
import {
  AlertIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  CopyIcon,
} from "@webstudio-is/icons";
import type { DomainStatus } from "@webstudio-is/prisma-client";
import { CollapsibleDomainSection } from "./collapsible-domain-section";
import env from "~/shared/env";

const trpc = createTrpcFetchProxy<DomainRouter>(builderDomainsPath);

type Domain = {
  projectId: Project["id"];
  domain: {
    domain: string;
    error: string | null;
    status: DomainStatus;
  };
  txtRecord: string;
  cname: string;
  verified: boolean;
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

const getStatusText = (props: { projectDomain: Domain }) => {
  const status = props.projectDomain.verified
    ? (`VERIFIED_${props.projectDomain.domain.status}` as `VERIFIED_${DomainStatus}`)
    : `UNVERIFIED`;

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
      text = "Status: Active";
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

  return { isVerifiedActive, text };
};

const StatusIcon = (props: { projectDomain: Domain }) => {
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
          color: isVerifiedActive
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
  domainLoadingState: "idle" | "submitting";
}) => {
  const {
    send: verify,
    state: verifyState,
    data: verifyData,
    error: verifySystemError,
  } = trpc.verify.useMutation();

  const {
    send: remove,
    state: removeState,
    data: removeData,
    error: removeSystemError,
  } = trpc.remove.useMutation();

  const {
    send: updateStatus,
    state: updateStatusState,
    data: updateStatusData,
    error: updateStatusError,
  } = trpc.updateStatus.useMutation();

  const isRemoveInProgress =
    removeState !== "idle" || props.domainLoadingState !== "idle";

  const isCheckStateInProgress =
    verifyState !== "idle" ||
    updateStatusState !== "idle" ||
    props.domainLoadingState !== "idle";

  const status = props.projectDomain.verified
    ? (`VERIFIED_${props.projectDomain.domain.status}` as `VERIFIED_${DomainStatus}`)
    : `UNVERIFIED`;

  const cnameEntryName = getCname(props.projectDomain.domain.domain);
  const cnameEntryValue = `${props.projectDomain.cname}.customers.${
    env.PUBLISHER_HOST ?? "wstd.work"
  }`;

  const txtEntryName =
    cnameEntryName === "@"
      ? "__webstudio_is"
      : `__webstudio_is.${cnameEntryName}`;

  const { isVerifiedActive, text } = getStatusText({
    projectDomain: props.projectDomain,
  });

  return (
    <CollapsibleDomainSection
      initiallyOpen={props.initiallyOpen}
      title={props.projectDomain.domain.domain}
      suffix={
        <Grid flow="column">
          <StatusIcon projectDomain={props.projectDomain} />

          <Tooltip content={`Proceed to ${props.projectDomain.domain.domain}`}>
            <IconButton
              tabIndex={-1}
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
            disabled={isCheckStateInProgress}
            color="primary"
            css={{ width: "100%", flexShrink: 0, mt: theme.spacing[3] }}
            onClick={() => {
              verify(
                {
                  domain: props.projectDomain.domain.domain,
                  projectId: props.projectDomain.projectId,
                },
                (verifyResponse) => {
                  if (verifyResponse.success) {
                    props.refreshDomainResult({
                      projectId: props.projectDomain.projectId,
                    });
                  }
                }
              );
            }}
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
            disabled={isCheckStateInProgress}
            color="primary"
            css={{ width: "100%", flexShrink: 0, mt: theme.spacing[3] }}
            onClick={() => {
              updateStatus(
                {
                  domain: props.projectDomain.domain.domain,
                  projectId: props.projectDomain.projectId,
                },
                (data) => {
                  if (data.success) {
                    if (
                      props.projectDomain.domain.status !==
                        data.domain.status ||
                      props.projectDomain.domain.error !== data.domain.error
                    ) {
                      props.refreshDomainResult({
                        projectId: props.projectDomain.projectId,
                      });
                    }
                  }
                }
              );
            }}
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
        disabled={isRemoveInProgress}
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
          gap={1}
          css={{
            gridTemplateColumns: `${theme.spacing[18]} ${theme.spacing[18]} 1fr`,
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
            value={cnameEntryName}
            suffix={<CopyToClipboard text={cnameEntryName} />}
          />
          <InputEllipsis
            readOnly
            value={cnameEntryValue}
            suffix={<CopyToClipboard text={cnameEntryValue} />}
          />

          <InputEllipsis readOnly value="TXT" />
          <InputEllipsis
            readOnly
            value={txtEntryName}
            suffix={<CopyToClipboard text={txtEntryName} />}
          />
          <InputEllipsis
            readOnly
            value={props.projectDomain.txtRecord}
            suffix={<CopyToClipboard text={props.projectDomain.txtRecord} />}
          />
        </Grid>
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
  domainLoadingState: "idle" | "submitting";
};

export const Domains = ({
  newDomains,
  domains,
  refreshDomainResult,
  domainLoadingState,
}: DomainsProps) => {
  return (
    <>
      {domains.map((projectDomain) => (
        <DomainItem
          key={projectDomain.domain.domain}
          projectDomain={projectDomain}
          initiallyOpen={newDomains.has(projectDomain.domain.domain)}
          refreshDomainResult={refreshDomainResult}
          domainLoadingState={domainLoadingState}
        />
      ))}
    </>
  );
};
