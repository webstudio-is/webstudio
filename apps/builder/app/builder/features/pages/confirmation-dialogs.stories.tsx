import { StorySection } from "@webstudio-is/design-system";
import {
  DeletePageConfirmationDialog,
  DeleteFolderConfirmationDialog,
} from "./confirmation-dialogs";

export default {
  title: "Builder/Pages/Confirmation dialogs",
};

export const DeletePage = () => (
  <StorySection title="Delete Page">
    <DeletePageConfirmationDialog
      page={{
        id: "page-1",
        name: "About us",
        path: "/about",
        title: "About Us",
        rootInstanceId: "root-1",
        systemDataSourceId: "ds-1",
        meta: {},
      }}
      onClose={() => {}}
      onConfirm={() => {}}
    />
  </StorySection>
);

export const DeleteFolder = () => (
  <StorySection title="Delete Folder">
    <DeleteFolderConfirmationDialog
      folder={{
        id: "folder-1",
        name: "Marketing",
        slug: "marketing",
        children: [],
      }}
      onClose={() => {}}
      onConfirm={() => {}}
    />
  </StorySection>
);
