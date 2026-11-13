import { useState } from "react";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { WebstudioData } from "@webstudio-is/sdk";
import type { MarketplaceOverviewItem } from "~/shared/marketplace/types";
import { Overview } from "./overview";
import { Templates } from "./templates";
export default { title: "Builder/Marketplace/Gallery", component: Overview };
const items: MarketplaceOverviewItem[] = [
  {
    projectId: "section",
    category: "sectionTemplates",
    name: "Sections",
    author: "Webstudio team",
    thumbnailAssetId: "",
    email: "team@example.com",
    description: "Section templates",
  },
  {
    projectId: "pages",
    category: "pageTemplates",
    name: "Pages",
    author: "Webstudio team",
    thumbnailAssetId: "",
    email: "team@example.com",
    description: "Page templates",
  },
];
const GalleryStory = ({
  loading = false,
  selected = false,
  empty = false,
}: {
  loading?: boolean;
  selected?: boolean;
  empty?: boolean;
}) => {
  const [active, setActive] = useState<string | undefined>(
    loading ? "section" : undefined
  );
  const [about, setAbout] = useState<string | undefined>(
    selected ? "section" : undefined
  );
  return (
    <div style={{ width: 320, height: 700 }}>
      <Overview
        items={empty ? [] : items}
        activeProjectId={active}
        openAbout={about}
        onOpenAbout={setAbout}
        onSelect={(item) => setActive(item.projectId)}
      />
    </div>
  );
};
export const Default = () => <GalleryStory />;
export const Loading = () => <GalleryStory loading />;
export const Selected = () => <GalleryStory selected />;
export const Empty = () => <GalleryStory empty />;
const pages = createDefaultPages({ rootInstanceId: "body" });
pages.pages.get(pages.homePageId)!.marketplace = {
  include: true,
  category: "Sections",
};
const data: WebstudioData = {
  pages,
  assets: new Map(),
  breakpoints: new Map(),
  dataSources: new Map(),
  instances: new Map([
    ["body", { id: "body", type: "instance", component: "Body", children: [] }],
  ]),
  props: new Map(),
  resources: new Map(),
  styles: new Map(),
  styleSources: new Map(),
  styleSourceSelections: new Map(),
};
const TemplatesStory = ({ authorized = false }: { authorized?: boolean }) => (
  <div style={{ width: 320, height: 700 }}>
    <Templates
      name="Sections"
      projectId="example-project"
      productCategory="sectionTemplates"
      authorizationToken={authorized ? "storybook-example" : undefined}
      data={data}
      onOpenChange={() => {}}
    />
  </div>
);
export const TemplatesAvailable = () => <TemplatesStory authorized />;
export const TemplatesWithoutShareLink = () => <TemplatesStory />;
