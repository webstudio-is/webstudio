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
import { PlusIcon } from "@webstudio-is/icons";
import { useComputedStyles } from "./model";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import { PropertySectionLabel } from "../property-label";

export const getDots = (styles: ComputedStyleDecl[]) => {
  const dots = new Set<"local" | "overwritten" | "remote">();

  for (const styleDecl of styles) {
    // Unparsed values are not editable directly in the section, so we don't show the dot
    if (
      styleDecl.usedValue.type === "unparsed" ||
      styleDecl.usedValue.type === "guaranteedInvalid"
    ) {
      return [];
    }

    const source = styleDecl.source.name;
    if (source === "local" || source === "overwritten" || source === "remote") {
      dots.add(source);
    }
  }

  return Array.from(dots);
};

export const StyleSection = (props: {
  label: string;
  properties: StyleProperty[];
  // @todo remove to keep sections consistent
  fullWidth?: boolean;
  children: ReactNode;
}) => {
  const { label, children, properties, fullWidth } = props;
  const [isOpen, setIsOpen] = useOpenState(props);
  const styles = useComputedStyles(properties);
  return (
    <CollapsibleSectionRoot
      label={label}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <SectionTitle dots={getDots(styles)}>
          <SectionTitleLabel>{label}</SectionTitleLabel>
        </SectionTitle>
      }
      fullWidth={fullWidth}
    >
      {children}
    </CollapsibleSectionRoot>
  );
};

export const RepeatedStyleSection = (props: {
  label: string;
  description: string;
  properties: [StyleProperty, ...StyleProperty[]];
  collapsible?: boolean;
  onAdd: () => void;
  children: ReactNode;
}) => {
  const { label, description, children, properties, onAdd, collapsible } =
    props;
  const [isOpen, setIsOpen] = useOpenState(props);
  const styles = useComputedStyles(properties);
  const dots = getDots(styles);

  return (
    <CollapsibleSectionRoot
      fullWidth
      label={label}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <SectionTitle
          inactive={dots.length === 0}
          collapsible={collapsible ?? dots.length !== 0}
          dots={getDots(styles)}
          suffix={
            <SectionTitleButton
              prefix={<PlusIcon />}
              onClick={() => {
                setIsOpen(true);
                onAdd();
              }}
            />
          }
        >
          <PropertySectionLabel
            label={label}
            description={description}
            properties={properties}
          />
        </SectionTitle>
      }
    >
      {children}
    </CollapsibleSectionRoot>
  );
};
