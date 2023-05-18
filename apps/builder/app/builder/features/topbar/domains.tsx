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
      <IconButton
        onClick={() => {
          navigator.clipboard.writeText(props.text);
        }}
      >
        <CopyIcon />
      </IconButton>
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
        align="center"
        justify="center"
        css={{
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
    send: refresh,
    state: refreshState,
    data: refreshData,
    error: refreshSystemError,
  } = trpc.refresh.useMutation();

  const isRemovePending =
    removeState !== "idle" || props.domainLoadingState !== "idle";

  const isCheckStatePending =
    verifyState !== "idle" ||
    refreshState !== "idle" ||
    props.domainLoadingState !== "idle";

  const status = props.projectDomain.verified
    ? (`VERIFIED_${props.projectDomain.domain.status}` as `VERIFIED_${DomainStatus}`)
    : `UNVERIFIED`;

  const cnameName = getCname(props.projectDomain.domain.domain);
  const cnameValue = `${props.projectDomain.cname}.customers.${
    env.PUBLISHER_HOST ?? "wstd.work"
  }`;

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
              css={{
                "&:hover": {
                  // backgroundColor: "transparent",
                },
              }}
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
            state={isCheckStatePending ? "pending" : undefined}
            color="primary"
            css={{ width: "100%", flexShrink: 0, mt: theme.spacing[3] }}
            onClick={() => {
              verify(
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
            Check status
          </Button>
        </>
      )}

      {status !== "UNVERIFIED" && (
        <>
          {refreshData?.success === false && (
            <Text color="destructive">{refreshData.error}</Text>
          )}
          {refreshSystemError !== undefined && (
            <Text color="destructive">{refreshSystemError}</Text>
          )}
          <Button
            state={isCheckStatePending ? "pending" : undefined}
            color="primary"
            css={{ width: "100%", flexShrink: 0, mt: theme.spacing[3] }}
            onClick={() => {
              refresh(
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
        state={isRemovePending ? "pending" : undefined}
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
            value={cnameName}
            suffix={<CopyToClipboard text={cnameName} />}
          />
          <InputEllipsis
            readOnly
            value={cnameValue}
            suffix={<CopyToClipboard text={cnameValue} />}
          />

          <InputEllipsis readOnly value="TXT" />
          <InputEllipsis
            readOnly
            value="__webstudio_is"
            suffix={<CopyToClipboard text="__webstudio_is" />}
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
  projectId: Project["id"];
  newDomainSet: Set<string>;
  domains: Domain[];
  refreshDomainResult: (
    input: { projectId: Project["id"] },
    onSuccess?: () => void
  ) => void;
  domainLoadingState: "idle" | "submitting";
};

export const Domains = ({
  projectId,
  newDomainSet,
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
          initiallyOpen={newDomainSet.has(projectDomain.domain.domain)}
          refreshDomainResult={refreshDomainResult}
          domainLoadingState={domainLoadingState}
        />
      ))}
    </>
  );
};
