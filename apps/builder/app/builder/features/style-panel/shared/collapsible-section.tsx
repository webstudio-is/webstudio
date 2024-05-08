import type { StyleProperty } from "@webstudio-is/css-engine";
import {
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
} from "@webstudio-is/design-system";
import type { ReactNode } from "react";
import {
  CollapsibleSectionRoot,
  useOpenState,
} from "~/builder/shared/collapsible-section";
import { getStyleSource, type StyleInfo } from "./style-info";
import { PlusIcon } from "@webstudio-is/icons";

export const getDots = (
  currentStyle: StyleInfo,
  properties: ReadonlyArray<StyleProperty>
) => {
  const dots = new Set<"local" | "overwritten" | "remote">();

  for (const property of properties) {
    const style = currentStyle[property];

    // Unparsed values are not editable directly in the section, so we don't show the dot
    if (
      style?.value.type === "unparsed" ||
      style?.value.type === "guaranteedInvalid"
    ) {
      return;
    }

    const source = getStyleSource(style);
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
  fullWidth?: boolean;
  onAdd?: () => void;
}) => {
  const { label, children, currentStyle, properties, fullWidth, onAdd } = props;
  const [isOpen, setIsOpen] = useOpenState(props);

  return (
    <CollapsibleSectionRoot
      label={label}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <SectionTitle
          dots={getDots(currentStyle, properties)}
          suffix={
            onAdd && (
              <SectionTitleButton
                prefix={<PlusIcon />}
                onClick={() => {
                  if (isOpen === false) {
                    setIsOpen(true);
                  }
                  onAdd();
                }}
              />
            )
          }
        >
          <SectionTitleLabel>{label}</SectionTitleLabel>
        </SectionTitle>
      }
      fullWidth={fullWidth}
    >
      {children}
    </CollapsibleSectionRoot>
  );
};
