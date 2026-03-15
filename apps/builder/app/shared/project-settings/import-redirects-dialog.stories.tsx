import { ImportRedirectsDialog } from "./import-redirects-dialog";

export default {
  title: "Builder/Project Settings/Import Redirects Dialog",
  component: ImportRedirectsDialog,
};

export const ImportRedirectsDialog = () => (
  <ImportRedirectsDialog
    isOpen={true}
    onOpenChange={() => {}}
    existingRedirects={[
      { old: "/old-page", new: "/new-page", status: "301" },
      { old: "/blog/2023", new: "/blog/archive", status: "302" },
    ]}
    onImport={() => {}}
  />
);
