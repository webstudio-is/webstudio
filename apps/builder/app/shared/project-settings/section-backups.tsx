import { useStore } from "@nanostores/react";
import { useEffect, useState } from "react";
import {
  Grid,
  Text,
  Button,
  Select,
  Dialog,
  DialogTitle,
  DialogTrigger,
  DialogContent,
  DialogClose,
  Flex,
  theme,
  toast,
  PanelBanner,
  Link,
  rawTheme,
} from "@webstudio-is/design-system";
import { UpgradeIcon } from "@webstudio-is/icons";
import { nativeClient, trpcClient } from "~/shared/trpc/trpc-client";
import { $project } from "~/shared/sync/data-stores";
import { $userPlanFeatures } from "~/shared/nano-states";
import { sectionSpacing } from "./utils";
import cmsUpgradeBanner from "../cms-upgrade-banner.svg?url";

const formatPublishDate = (date: string) => {
  try {
    const formatter = new Intl.DateTimeFormat("en", {
      dateStyle: "long",
      timeStyle: "short",
    });
    return formatter.format(new Date(date));
  } catch {
    return date;
  }
};

export const SectionBackups = ({
  projectId: projectIdProp,
}: {
  projectId?: string;
}) => {
  const userPlanFeatures = useStore($userPlanFeatures);
  const hasPaidPlan = userPlanFeatures.purchases.length > 0;
  const { data, load } = trpcClient.project.publishedBuilds.useQuery();
  const project = useStore($project);
  const projectId = projectIdProp ?? project?.id ?? "";

  useEffect(() => {
    load({ projectId });
  }, [load, projectId]);
  const options = data?.success ? data.data : [];
  const [backupBuild = options.at(0), setBackupBuild] = useState<
    undefined | (typeof options)[number]
  >();
  const restore = async () => {
    if (!backupBuild?.buildId) {
      return;
    }
    const result = await nativeClient.project.restoreDevelopmentBuild.mutate({
      projectId,
      fromBuildId: backupBuild.buildId,
    });
    if (result.success) {
      location.reload();
      return;
    }
    toast.error(result.error);
  };

  return (
    <Grid gap={2} css={sectionSpacing}>
      <Text variant="titles">Backups</Text>
      <Select
        placeholder="No backups"
        options={options}
        getValue={(option) => option.buildId ?? ""}
        getLabel={(option) => {
          if (!option.createdAt) {
            return;
          }
          let label = formatPublishDate(option.createdAt);
          if (option.domains) {
            label += ` (${option.domains})`;
          }
          return label;
        }}
        value={backupBuild}
        onChange={setBackupBuild}
      />
      <Dialog>
        <DialogTrigger asChild>
          <Button
            css={{ justifySelf: "start" }}
            disabled={!hasPaidPlan || options.length === 0}
          >
            Restore
          </Button>
        </DialogTrigger>
        <DialogContent width={320}>
          <DialogTitle>Restore published version</DialogTitle>
          <Flex
            direction="column"
            css={{ padding: theme.panel.padding }}
            gap={2}
          >
            <Text>
              Are you sure you want to restore the project to its published
              version?
            </Text>
            {backupBuild?.createdAt && (
              <Text color="destructive">
                All changes made after{" "}
                {formatPublishDate(backupBuild.createdAt)} will be lost.
              </Text>
            )}
            <Flex gap="2" justify="end">
              <DialogClose>
                <Button color="ghost">Cancel</Button>
              </DialogClose>
              <DialogClose>
                <Button color="destructive" onClick={restore}>
                  Restore
                </Button>
              </DialogClose>
            </Flex>
          </Flex>
        </DialogContent>
      </Dialog>
      {!hasPaidPlan && (
        <PanelBanner>
          <img
            src={cmsUpgradeBanner}
            alt="Upgrade for backups"
            width={rawTheme.spacing[28]}
            style={{ aspectRatio: "4.1" }}
          />
          <Text variant="regularBold">Upgrade to restore from backups</Text>
          <Flex align="center" gap={1}>
            <UpgradeIcon />
            <Link
              color="inherit"
              target="_blank"
              href="https://webstudio.is/pricing"
            >
              Upgrade to Pro
            </Link>
          </Flex>
        </PanelBanner>
      )}
    </Grid>
  );
};
