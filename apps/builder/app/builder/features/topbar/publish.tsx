import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  useId,
  Tooltip,
  FloatingPanelPopover,
  FloatingPanelAnchor,
  FloatingPanelPopoverTrigger,
  FloatingPanelPopoverContent,
  FloatingPanelPopoverTitle,
  IconButton,
  Grid,
  Flex,
  Label,
  Text,
  InputField,
  Separator,
  ScrollArea,
  Box,
} from "@webstudio-is/design-system";
import { useIsPublishDialogOpen } from "../../shared/nano-states";
import { validateProjectDomain, type Project } from "@webstudio-is/project";
import { getPublishedUrl } from "~/shared/router-utils";
import { theme } from "@webstudio-is/design-system";
import { useAuthPermit } from "~/shared/nano-states";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import {
  Domains,
  getPublishStatusAndText,
  getStatus,
  type Domain,
} from "./domains";
import { CollapsibleDomainSection } from "./collapsible-domain-section";
import {
  CheckCircleIcon,
  ExternalLinkIcon,
  AlertIcon,
} from "@webstudio-is/icons";
import { createTrpcFetchProxy } from "~/shared/remix/trpc-remix-proxy";
import { builderDomainsPath } from "~/shared/router-utils";
import type { DomainRouter } from "@webstudio-is/domain/index.server";
import { AddDomain } from "./add-domain";

const trpc = createTrpcFetchProxy<DomainRouter>(builderDomainsPath);

type ProjectData =
  | {
      success: true;
      project: Project;
    }
  | {
      success: false;
      error: string;
    };

type ChangeProjectDomainProps = {
  project: Project;
  projectState: "idle" | "submitting";
  publishIsInProgress: boolean;
  projectLoad: (
    props: { projectId: Project["id"] },
    callback: (projectData: ProjectData) => void
  ) => void;
};

type TimeoutId = undefined | ReturnType<typeof setTimeout>;

const ChangeProjectDomain = ({
  project,
  projectLoad,
  projectState,
  publishIsInProgress,
}: ChangeProjectDomainProps) => {
  const id = useId();

  const {
    send: updateProjectDomain,
    state: updateProjectDomainState,
    error: updateProjectSystemError,
  } = trpc.updateProjectDomain.useMutation();

  const [domain, setDomain] = useState(project.domain);
  const [error, setError] = useState<string>();

  const refreshProject = useCallback(
    () =>
      projectLoad({ projectId: project.id }, (projectData) => {
        if (projectData?.success === false) {
          setError(projectData.error);
          return;
        }

        setDomain(projectData.project.domain);
      }),
    [projectLoad, project.id]
  );

  useEffect(() => {
    refreshProject();
  }, [refreshProject]);

  const publishedUrl = new URL(getPublishedUrl(project.domain));

  const handleUpdateProjectDomain = () => {
    const validationResult = validateProjectDomain(domain);

    if (validationResult.success === false) {
      setError(validationResult.error);
      return;
    }

    if (updateProjectDomainState !== "idle") {
      return;
    }
    if (domain === project.domain) {
      return;
    }

    updateProjectDomain({ domain, projectId: project.id }, (data) => {
      if (data?.success === false) {
        setError(data.error);
        return;
      }

      refreshProject();
    });
  };

  const { statusText, status } =
    project.latestBuild != null
      ? getPublishStatusAndText(project.latestBuild)
      : {
          statusText: "Not published",
          status: "PENDING",
        };

  return (
    <CollapsibleDomainSection
      title={publishedUrl.host}
      suffix={
        <Grid flow="column">
          <Tooltip content={error !== undefined ? error : statusText}>
            <Flex
              align={"center"}
              justify={"center"}
              css={{
                cursor: "pointer",
                width: theme.spacing[12],
                height: theme.spacing[12],
                color:
                  error !== undefined || status === "FAILED"
                    ? theme.colors.foregroundDestructive
                    : theme.colors.foregroundSuccessText,
              }}
            >
              {error !== undefined || status === "FAILED" ? (
                <AlertIcon />
              ) : (
                <CheckCircleIcon />
              )}
            </Flex>
          </Tooltip>

          <Tooltip content={`Proceed to ${publishedUrl.href}`}>
            <IconButton
              tabIndex={-1}
              onClick={(event) => {
                window.open(publishedUrl.href, "_blank");
                event.preventDefault();
              }}
            >
              <ExternalLinkIcon />
            </IconButton>
          </Tooltip>
        </Grid>
      }
    >
      <Grid gap={3}>
        <Grid gap={1}>
          <Label htmlFor={id}>Domain:</Label>
          <InputField
            id={id}
            placeholder="Domain"
            value={domain}
            disabled={
              publishIsInProgress ||
              updateProjectDomainState !== "idle" ||
              projectState !== "idle"
            }
            onChange={(event) => {
              setError(undefined);
              setDomain(event.target.value);
            }}
            onBlur={handleUpdateProjectDomain}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleUpdateProjectDomain();
              }

              if (event.key === "Escape") {
                if (project.domain !== domain) {
                  setDomain(project.domain);
                  event.preventDefault();
                }
              }
            }}
            color={
              error !== undefined || updateProjectSystemError !== undefined
                ? "error"
                : undefined
            }
          />
          {error !== undefined && <Text color="destructive">{error}</Text>}
          {updateProjectSystemError !== undefined && (
            <Text color="destructive">{updateProjectSystemError}</Text>
          )}
        </Grid>
      </Grid>
    </CollapsibleDomainSection>
  );
};

const Publish = ({
  project,
  domainsToPublish,
  refresh,

  publishIsInProgress,
  setPublishIsInProgress,
}: {
  project: Project;
  domainsToPublish: Domain[];
  refresh: () => void;

  publishIsInProgress: boolean;
  setPublishIsInProgress: (publishIsInProgress: boolean) => void;
}) => {
  const {
    send: publish,
    state: publishState,
    data: publishData,
    error: publishSystemError,
  } = trpc.publish.useMutation();

  useEffect(() => {
    if (publishIsInProgress) {
      let timeoutHandle: TimeoutId;
      let totalCalls = 0;
      // Call refresh
      const execRefresh = () => {
        if (totalCalls < 20) {
          totalCalls += 1;
          clearTimeout(timeoutHandle);
          timeoutHandle = setTimeout(() => {
            refresh();
            execRefresh();
          }, 10000);
        }
      };

      execRefresh();

      return () => {
        clearTimeout(timeoutHandle);
      };
    }
  }, [publishIsInProgress, refresh]);

  return (
    <Flex
      css={{
        paddingLeft: theme.spacing[9],
        paddingRight: theme.spacing[9],
        paddingBottom: theme.spacing[9],
        paddingTop: theme.spacing[5],
      }}
      gap={2}
      shrink={false}
      direction={"column"}
    >
      {publishSystemError !== undefined && (
        <Text color="destructive">{publishSystemError}</Text>
      )}

      {publishData?.success === false && (
        <Text color="destructive">{publishData.error}</Text>
      )}

      <Tooltip
        content={
          publishState !== "idle" || publishIsInProgress
            ? "Publish process in progress"
            : undefined
        }
      >
        <Button
          color="positive"
          disabled={publishState !== "idle" || publishIsInProgress}
          onClick={() => {
            setPublishIsInProgress(true);

            publish(
              {
                projectId: project.id,
                domains: domainsToPublish.map(
                  (projectDomain) => projectDomain.domain.domain
                ),
              },
              () => {
                refresh();
              }
            );
          }}
        >
          Publish
        </Button>
      </Tooltip>
    </Flex>
  );
};

const Content = (props: { projectId: Project["id"] }) => {
  const [newDomains, setNewDomains] = useState(new Set<string>());
  const {
    data: domainsResult,
    load: domainRefresh,
    state: domainLoadingState,
    error: domainSystemError,
  } = trpc.findMany.useQuery();

  const {
    load: projectLoad,
    data: projectData,
    state: projectState,
    error: projectSystemError,
  } = trpc.project.useQuery();

  useEffect(() => {
    projectLoad({ projectId: props.projectId });
    domainRefresh({ projectId: props.projectId });
  }, [domainRefresh, props.projectId, projectLoad]);

  const domainsToPublish = useMemo(
    () =>
      domainsResult?.success
        ? domainsResult.data.filter(
            (projectDomain) => getStatus(projectDomain) === "VERIFIED_ACTIVE"
          )
        : [],
    [domainsResult]
  );

  const latestBuilds = useMemo(
    () => [
      projectData?.success ? projectData.project.latestBuild ?? null : null,
      ...domainsToPublish.map((domain) => domain.latestBuid),
    ],
    [domainsToPublish, projectData]
  );

  const hasPendingState = useMemo(
    () =>
      latestBuilds.some((latestBuild) => {
        if (latestBuild === null) {
          return false;
        }
        const { status } = getPublishStatusAndText(latestBuild);
        if (status === "PENDING") {
          return true;
        }
      }),
    [latestBuilds]
  );

  const [publishIsInProgress, setPublishIsInProgress] =
    useState(hasPendingState);

  useEffect(() => {
    setPublishIsInProgress(hasPendingState);
  }, [hasPendingState, setPublishIsInProgress]);

  return (
    <>
      <ScrollArea>
        {projectSystemError !== undefined && (
          <Flex
            css={{
              m: theme.spacing[9],
              overflowWrap: "anywhere",
            }}
            gap={2}
            direction={"column"}
          >
            <Text color="destructive">{projectSystemError}</Text>
            <Text color="subtle">Please try again later</Text>
          </Flex>
        )}

        {projectData?.success && (
          <ChangeProjectDomain
            projectLoad={projectLoad}
            projectState={projectState}
            project={projectData.project}
            publishIsInProgress={publishIsInProgress}
          />
        )}

        {isFeatureEnabled("domains") && (
          <>
            {domainSystemError !== undefined && (
              <Text color="destructive">{domainSystemError}</Text>
            )}

            {domainsResult?.success === true && (
              <Domains
                newDomains={newDomains}
                domains={domainsResult.data}
                refreshDomainResult={domainRefresh}
                domainLoadingState={domainLoadingState}
                publishIsInProgress={publishIsInProgress}
              />
            )}
            {domainsResult?.success === false && (
              <Label
                css={{
                  overflowWrap: "anywhere",
                  color: theme.colors.foregroundDestructive,
                }}
              >
                <div>{domainsResult.error}</div>
              </Label>
            )}
          </>
        )}
      </ScrollArea>

      {isFeatureEnabled("domains") && (
        <>
          <Flex direction="column" justify="end" css={{ height: 0 }}>
            <Separator />
          </Flex>

          <AddDomain
            projectId={props.projectId}
            refreshDomainResult={domainRefresh}
            domainLoadingState={domainLoadingState}
            onCreate={(domain) => {
              setNewDomains((prev) => {
                return new Set([...prev, domain]);
              });
            }}
            publishIsInProgress={publishIsInProgress}
          />
        </>
      )}

      {projectData?.success === true ? (
        <Publish
          project={projectData.project}
          domainsToPublish={domainsToPublish}
          refresh={() => {
            projectLoad({ projectId: props.projectId });
            domainRefresh({ projectId: props.projectId });
          }}
          publishIsInProgress={publishIsInProgress}
          setPublishIsInProgress={setPublishIsInProgress}
        />
      ) : (
        <Box css={{ height: theme.spacing[8] }} />
      )}
    </>
  );
};

type PublishProps = {
  projectId: Project["id"];
};
export const PublishButton = ({ projectId }: PublishProps) => {
  const [isOpen, setIsOpen] = useIsPublishDialogOpen();
  const [authPermit] = useAuthPermit();

  const isPublishDisabled = authPermit !== "own";
  const tooltipContent = isPublishDisabled
    ? "Only owner can publish projects"
    : undefined;

  return (
    <FloatingPanelPopover modal open={isOpen} onOpenChange={setIsOpen}>
      <FloatingPanelAnchor>
        <Tooltip side="bottom" content={tooltipContent}>
          <FloatingPanelPopoverTrigger asChild>
            <Button disabled={isPublishDisabled} color="positive">
              Publish
            </Button>
          </FloatingPanelPopoverTrigger>
        </Tooltip>
      </FloatingPanelAnchor>

      <FloatingPanelPopoverContent
        css={{
          zIndex: theme.zIndices[1],
          width: theme.spacing[33],
          maxWidth: theme.spacing[33],
        }}
      >
        <FloatingPanelPopoverTitle>Publish</FloatingPanelPopoverTitle>
        <Content projectId={projectId} />
      </FloatingPanelPopoverContent>
    </FloatingPanelPopover>
  );
};
