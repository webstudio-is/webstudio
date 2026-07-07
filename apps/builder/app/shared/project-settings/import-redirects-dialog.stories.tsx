import { StorySection } from "@webstudio-is/design-system";
import { ImportRedirectsDialog as ImportRedirectsDialogComponent } from "./import-redirects-dialog";

export default {
  title: "Builder/Project settings/Import Redirects Dialog",
  component: ImportRedirectsDialogComponent,
};

export const ImportRedirectsDialog = () => (
  <StorySection title="Import Redirects Dialog">
    <ImportRedirectsDialogComponent
      isOpen={true}
      onOpenChange={() => {}}
      existingRedirects={[
        { old: "/old-page", new: "/new-page", status: "301" },
        { old: "/blog/2023", new: "/blog/archive", status: "302" },
      ]}
      onImport={() => {}}
    />
  </StorySection>
);
