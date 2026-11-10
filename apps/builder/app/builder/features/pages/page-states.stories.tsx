import { useEffect, useState } from "react";
import type { Project } from "@webstudio-is/project";
import { createDefaultPages } from "@webstudio-is/project-build";
import { Dialog, DialogContent } from "@webstudio-is/design-system";
import { $pages, $project } from "~/shared/sync/data-stores";
import {
  $authPermit,
  $builderMode,
  $selectedPageId,
} from "~/shared/nano-states";
import { FolderSettings, NewFolderSettings } from "./folder-settings";
import {
  TemplateSettings,
  NewTemplateSettings,
  CreatePageFromTemplateSettings,
} from "./template-settings";
import { PageSettings, NewPageSettings } from "./page-settings/page-settings";
import { PagesPanel } from "./pages";

export default { title: "Pages/States", component: PagesPanel };

type State =
  | "tree"
  | "folder"
  | "newFolder"
  | "template"
  | "newTemplate"
  | "fromTemplate"
  | "newPage"
  | "home"
  | "draft"
  | "text"
  | "redirect"
  | "marketplace"
  | "bound";
const PageStory = ({
  state,
  contentMode = false,
}: {
  state: State;
  contentMode?: boolean;
}) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const previous = [
      $pages.get(),
      $project.get(),
      $authPermit.get(),
      $builderMode.get(),
      $selectedPageId.get(),
    ] as const;
    const pages = createDefaultPages({ rootInstanceId: "page-root" });
    const page = {
      id: "example-page",
      name: "Example page",
      title: '"Example page"',
      path: "/example",
      rootInstanceId: "page-root",
      meta: {},
      isDraft: state === "draft",
    };
    pages.pages.set(page.id, {
      ...page,
      meta:
        state === "text"
          ? { documentType: "text", content: '"User-agent: *\\nAllow: /"' }
          : state === "bound"
            ? { description: "page.description", language: "page.language" }
            : {},
    });
    pages.folders.set("example-folder", {
      id: "example-folder",
      name: "Blog",
      slug: "blog",
      children: [page.id],
    });
    pages.folders.get(pages.rootFolderId)?.children.push("example-folder");
    pages.pageTemplates = new Map([
      [
        "example-template",
        {
          id: "example-template",
          name: "Article",
          title: '"Article"',
          rootInstanceId: "template-root",
          meta: { description: '"Article description"' },
        },
      ],
    ]);
    if (state === "redirect") {
      pages.redirects = [{ old: "/blog/example", new: "/", status: "301" }];
    }
    $pages.set(pages);
    $project.set({
      id: "storybook-project",
      title: "My Project",
      marketplaceApprovalStatus:
        state === "marketplace" ? "APPROVED" : "UNLISTED",
    } as Project);
    $authPermit.set("own");
    $builderMode.set(contentMode ? "content" : "design");
    $selectedPageId.set(state === "home" ? pages.homePageId : page.id);
    setReady(true);
    return () => {
      setReady(false);
      $pages.set(previous[0]);
      $project.set(previous[1]);
      $authPermit.set(previous[2]);
      $builderMode.set(previous[3]);
      $selectedPageId.set(previous[4]);
    };
  }, [state, contentMode]);
  if (!ready) {
    return;
  }
  if (state === "tree") {
    return (
      <div style={{ width: 280, height: 780 }}>
        <PagesPanel onClose={() => {}} />
      </div>
    );
  }
  const content =
    state === "folder" ? (
      <FolderSettings
        folderId="example-folder"
        onClose={() => {}}
        onRequestDelete={() => {}}
        onDuplicate={() => {}}
      />
    ) : state === "newFolder" ? (
      <NewFolderSettings onClose={() => {}} onSuccess={() => {}} />
    ) : state === "template" ? (
      <TemplateSettings
        templateId="example-template"
        onClose={() => {}}
        onDuplicate={() => {}}
        onDelete={() => {}}
      />
    ) : state === "newTemplate" ? (
      <NewTemplateSettings onSuccess={() => {}} />
    ) : state === "fromTemplate" ? (
      <CreatePageFromTemplateSettings
        templateId="example-template"
        onSuccess={() => {}}
      />
    ) : state === "newPage" ? (
      <NewPageSettings onSuccess={() => {}} />
    ) : (
      <PageSettings
        pageId={$selectedPageId.get()!}
        onClose={() => {}}
        onDelete={() => {}}
        onDuplicate={() => {}}
      />
    );
  return (
    <Dialog open>
      <DialogContent css={{ width: 320, height: 800 }}>{content}</DialogContent>
    </Dialog>
  );
};
export const Tree = () => <PageStory state="tree" />;
export const ContentTree = () => <PageStory state="tree" contentMode />;
export const Folder = () => <PageStory state="folder" />;
export const NewFolder = () => <PageStory state="newFolder" />;
export const Template = () => <PageStory state="template" />;
export const TemplateReadOnly = () => (
  <PageStory state="template" contentMode />
);
export const NewTemplate = () => <PageStory state="newTemplate" />;
export const FromTemplate = () => <PageStory state="fromTemplate" />;
export const FromTemplateContentMode = () => (
  <PageStory state="fromTemplate" contentMode />
);
export const NewPage = () => <PageStory state="newPage" />;
export const Home = () => <PageStory state="home" />;
export const Draft = () => <PageStory state="draft" />;
export const TextDocument = () => <PageStory state="text" />;
export const RedirectConflict = () => <PageStory state="redirect" />;
export const Marketplace = () => <PageStory state="marketplace" />;
export const BoundContent = () => <PageStory state="bound" contentMode />;
