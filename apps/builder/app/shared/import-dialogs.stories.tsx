import { useEffect } from "react";
import {
  DesignTokenImportDialog,
  showDesignTokenImportDialog,
} from "./design-token-import-dialog";
import {
  TokenConflictDialog,
  showTokenConflictDialog,
} from "./token-conflict-dialog";
import {
  RootStyleConflictDialog,
  showRootStyleConflictDialog,
} from "./root-style-conflict-dialog";

export default { title: "Import dialogs" };

export const ImportTokens = () => {
  useEffect(() => {
    showDesignTokenImportDialog();
  }, []);
  return <DesignTokenImportDialog />;
};

export const TokenConflict = () => {
  useEffect(() => {
    showTokenConflictDialog([
      { tokenName: "Primary" },
      { tokenName: "Heading" },
    ]);
  }, []);
  return <TokenConflictDialog />;
};

export const GlobalStyleConflict = () => {
  useEffect(() => {
    showRootStyleConflictDialog([
      {
        existingStyle: {
          styleSourceId: "existing",
          breakpointId: "base",
          property: "color",
          value: { type: "keyword", value: "blue" },
        },
        incomingStyle: {
          styleSourceId: "incoming",
          breakpointId: "base",
          property: "color",
          value: { type: "keyword", value: "red" },
        },
        breakpointLabel: "Base",
      },
    ]);
  }, []);
  return <RootStyleConflictDialog />;
};
