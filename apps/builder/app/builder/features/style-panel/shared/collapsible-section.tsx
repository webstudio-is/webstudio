import { SectionTitle, SectionTitleLabel } from "@webstudio-is/design-system";
import type { ReactNode } from "react";
import {
  CollapsibleSectionBase,
  useOpenState,
} from "~/builder/shared/collapsible-section";
import type { StyleSource } from "./style-info";

export const CollapsibleSection = (props: {
  label: string;
  children: ReactNode;
  sources: StyleSource[];
  isOpen?: boolean;
}) => {
  const { label, children, sources } = props;
  const [isOpen, setIsOpen] = useOpenState(props);

  return (
    <CollapsibleSectionBase
      label={label}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <SectionTitle
          dots={sources.flatMap((source) =>
            source === "local" || source === "remote" ? [source] : []
          )}
        >
          <SectionTitleLabel>{label}</SectionTitleLabel>
        </SectionTitle>
      }
    >
      {children}
    </CollapsibleSectionBase>
  );
};
