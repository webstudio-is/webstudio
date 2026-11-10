import type { Project } from "@webstudio-is/project";
import { useEffect, useState, type ComponentProps } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { $authPermit, $builderMode, $planFeatures } from "~/shared/nano-states";
import { $project, $projectSettings } from "~/shared/sync/data-stores";
import { RequestFixture } from "../storybook/request-fixture";
import type { SectionName } from "~/shared/nano-states/project-settings";
import { ProjectSettingsDialog } from "./project-settings";

export default {
  title: "Project settings/States",
  component: ProjectSettingsDialog,
};

type Props = {
  section: SectionName;
  readOnly?: boolean;
  invalid?: boolean;
  pro?: boolean;
  backups?: "loaded" | "pending" | "error";
  status?: ComponentProps<typeof ProjectSettingsDialog>["status"];
};
const Settings = ({
  section,
  readOnly = false,
  invalid = false,
  pro = false,
  status,
}: Props) => {
  const [currentSection, setCurrentSection] = useState(section);
  useEffect(() => {
    const previous = [
      $authPermit.get(),
      $builderMode.get(),
      $projectSettings.get(),
      $project.get(),
      $planFeatures.get(),
    ] as const;
    $project.set({
      id: "storybook-project",
      title: "My Project",
      marketplaceApprovalStatus: "UNLISTED",
    } as Project);
    $authPermit.set("own");
    $planFeatures.set({ ...$planFeatures.get(), canRestoreBackups: pro });
    $builderMode.set(readOnly ? "content" : "design");
    $projectSettings.set({
      meta: invalid
        ? { contactEmail: "invalid", emailSender: "invalid", auth: "invalid" }
        : {},
      compiler: {},
    });
    return () => {
      $authPermit.set(previous[0]);
      $builderMode.set(previous[1]);
      $projectSettings.set(previous[2]);
      $project.set(previous[3]);
      $planFeatures.set(previous[4]);
    };
  }, [readOnly, invalid, pro]);
  return (
    <ProjectSettingsDialog
      currentSection={currentSection}
      onSectionChange={setCurrentSection}
      status={status}
      projectId="storybook-project"
    />
  );
};
const backupResponses = {
  loaded: () =>
    Response.json([
      {
        result: {
          data: {
            success: true,
            data: [
              {
                buildId: "example-build",
                createdAt: "2026-11-01T12:00:00Z",
                domains: "example.com",
              },
            ],
          },
        },
      },
    ]),
  pending: () => new Promise<Response>(() => {}),
  error: () =>
    Response.json(
      [
        {
          error: {
            message: "Example request failed",
            code: -32603,
            data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
          },
        },
      ],
      { status: 500 }
    ),
  empty: () =>
    Response.json([{ result: { data: { success: true, data: [] } } }]),
};
const SettingsStory = (props: Props) => {
  const [router] = useState(() =>
    createBrowserRouter([
      { path: "*", loader: () => null, element: <Settings {...props} /> },
    ])
  );
  const [request] = useState(
    () => (request: Request) =>
      new URL(request.url).pathname === "/trpc/project.publishedBuilds"
        ? backupResponses[props.backups ?? "empty"]()
        : undefined
  );
  return (
    <RequestFixture request={request}>
      <RouterProvider router={router} />
    </RequestFixture>
  );
};
export const Emails = () => <SettingsStory section="emails" />;
export const EmailErrors = () => <SettingsStory section="emails" invalid />;
export const Agents = () => <SettingsStory section="agents" />;
export const Publishing = () => <SettingsStory section="publish" />;
export const Marketplace = () => <SettingsStory section="marketplace" />;
export const Authentication = () => <SettingsStory section="auth" />;
export const AuthenticationError = () => (
  <SettingsStory section="auth" invalid />
);
export const Backups = () => <SettingsStory section="backups" />;
export const Loading = () => (
  <SettingsStory section="general" status="loading" />
);
export const ReadOnly = () => <SettingsStory section="general" readOnly />;

export const BackupsAvailable = () => (
  <SettingsStory section="backups" backups="loaded" pro />
);
export const BackupsUpgrade = () => (
  <SettingsStory section="backups" backups="loaded" />
);
export const BackupsPending = () => (
  <SettingsStory section="backups" backups="pending" pro />
);
export const BackupsError = () => (
  <SettingsStory section="backups" backups="error" pro />
);
