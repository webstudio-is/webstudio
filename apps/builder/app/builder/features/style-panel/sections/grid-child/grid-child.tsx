import type { RenderCategoryProps } from "../../style-sections";
import { ShowMore } from "../../shared/show-more";
import { renderProperty } from "../../style-sections";
import { StyleCollapsibleSection } from "../../shared/style-collapsible-section";

export const GridChildSection = ({
  styleConfigsByCategory,
  moreStyleConfigsByCategory,
  label,
  isOpen,
  sources,
}: RenderCategoryProps) => {
  return (
    <StyleCollapsibleSection label={label} isOpen={isOpen} sources={sources}>
      {styleConfigsByCategory.map((entry) => renderProperty(entry))}
      <ShowMore
        styleConfigs={moreStyleConfigsByCategory.map((entry) =>
          renderProperty(entry)
        )}
      />
    </StyleCollapsibleSection>
  );
};
