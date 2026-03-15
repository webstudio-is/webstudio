import { Flex } from "@webstudio-is/design-system";
import {
  DeletePageConfirmationDialog,
  DeleteFolderConfirmationDialog,
} from "./confirmation-dialogs";

export default {
  title: "Builder/Pages/Confirmation Dialogs",
};

export const ConfirmationDialogs = () => (
  <Flex direction="column" gap="5">
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
  </Flex>
);
