import { useEffect } from "react";
import { $pendingTemplateNameConfirmation } from "~/shared/instance-utils/data";
import { TemplateNameConfirmationDialog } from "./template-name-confirmation-dialog";

export default {
  title: "Builder/Template name confirmation",
  component: TemplateNameConfirmationDialog,
};

const TemplateNameStory = ({ action }: { action: "rename" | "delete" }) => {
  useEffect(() => {
    const previous = $pendingTemplateNameConfirmation.get();
    $pendingTemplateNameConfirmation.set({
      operation:
        action === "rename"
          ? {
              id: "instances.setLabel",
              input: { instanceId: "card", label: "Hero Card" },
            }
          : { id: "instances.delete", input: { instanceIds: ["card"] } },
      confirmation: {
        action,
        templates: [{ instanceId: "card", oldName: "Card" }],
      },
    });
    return () => $pendingTemplateNameConfirmation.set(previous);
  }, [action]);
  return <TemplateNameConfirmationDialog />;
};

export const Rename = () => <TemplateNameStory action="rename" />;
export const Delete = () => <TemplateNameStory action="delete" />;
