import { useEffect } from "react";
import { StorySection } from "@webstudio-is/design-system";
import type { StyleSource } from "@webstudio-is/sdk";
import {
  $styleSourceSelections,
  $styleSources,
} from "~/shared/sync/data-stores";
import {
  DeleteStyleSourceDialog,
  DeleteUnusedTokensDialog,
  RenameStyleSourceDialog,
  openDeleteUnusedTokensDialog,
} from "./style-source-actions";

export default { title: "Style panel/Style source actions" };

const token = { id: "primary", name: "Primary", type: "token" } as const;
const otherToken = {
  id: "secondary",
  name: "Secondary",
  type: "token",
} as const;

const ActionsStory = ({
  state,
}: {
  state: "delete" | "rename" | "rename-invalid" | "unused-empty" | "unused";
}) => {
  useEffect(() => {
    const previous = {
      styleSources: $styleSources.get(),
      selections: $styleSourceSelections.get(),
    };
    $styleSources.set(
      new Map<string, StyleSource>(
        state === "unused-empty"
          ? []
          : [
              [
                token.id,
                state === "rename-invalid" ? { ...token, name: "" } : token,
              ],
              [otherToken.id, otherToken],
            ]
      )
    );
    $styleSourceSelections.set(new Map());
    if (state.startsWith("unused")) {
      openDeleteUnusedTokensDialog();
    }
    if (state === "rename-invalid") {
      const showError = () => {
        const button = Array.from(document.querySelectorAll("button")).find(
          (item) => item.textContent === "Rename"
        );
        if (button) {
          observer.disconnect();
          button.click();
        }
      };
      const observer = new MutationObserver(showError);
      observer.observe(document.body, { childList: true, subtree: true });
      showError();
      return () => {
        observer.disconnect();
        $styleSources.set(previous.styleSources);
        $styleSourceSelections.set(previous.selections);
      };
    }
    return () => {
      if (state.startsWith("unused")) {
        const close = Array.from(document.querySelectorAll("button")).find(
          (item) =>
            item.textContent === "Close" || item.textContent === "Cancel"
        );
        close?.click();
      }
      $styleSources.set(previous.styleSources);
      $styleSourceSelections.set(previous.selections);
    };
  }, [state]);

  const styleSource = {
    id: token.id,
    name: state === "rename-invalid" ? "" : token.name,
  };
  return (
    <StorySection title="Style source actions">
      {state === "delete" && (
        <DeleteStyleSourceDialog
          styleSource={styleSource}
          onClose={() => {}}
          onConfirm={() => {}}
        />
      )}
      {(state === "rename" || state === "rename-invalid") && (
        <RenameStyleSourceDialog
          styleSource={styleSource}
          onClose={() => {}}
          onConfirm={() => {}}
        />
      )}
      {state.startsWith("unused") && <DeleteUnusedTokensDialog />}
    </StorySection>
  );
};

export const DeleteToken = () => <ActionsStory state="delete" />;
export const RenameToken = () => <ActionsStory state="rename" />;
export const RenameValidation = () => <ActionsStory state="rename-invalid" />;
export const NoUnusedTokens = () => <ActionsStory state="unused-empty" />;
export const UnusedTokens = () => <ActionsStory state="unused" />;
