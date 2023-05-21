import type { StyleProperty } from "@webstudio-is/css-data";
import { SectionTitle, SectionTitleLabel } from "@webstudio-is/design-system";
import type { ReactNode } from "react";
import {
  CollapsibleSectionBase,
  useOpenState,
} from "~/builder/shared/collapsible-section";
import { getStyleSource, type StyleInfo } from "./style-info";

export const getDots = (
  currentStyle: StyleInfo,
  properties: ReadonlyArray<StyleProperty>
) => {
  const dots = new Set<"local" | "overwritten" | "remote">();

  for (const property of properties) {
    const source = getStyleSource(currentStyle[property]);
    if (source === "local" || source === "overwritten" || source === "remote") {
      dots.add(source);
    }
  }

  return Array.from(dots);
};

export const CollapsibleSection = (props: {
  label: string;
  children: ReactNode;
  currentStyle: StyleInfo;
  properties: ReadonlyArray<StyleProperty>;
}) => {
  const { label, children, currentStyle, properties } = props;
  const [isOpen, setIsOpen] = useOpenState(props);

  return (
    <CollapsibleSectionBase
      label={label}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <SectionTitle dots={getDots(currentStyle, properties)}>
          <SectionTitleLabel>{label}</SectionTitleLabel>
        </SectionTitle>
      }
    >
      {children}
    </CollapsibleSectionBase>
  );
};
