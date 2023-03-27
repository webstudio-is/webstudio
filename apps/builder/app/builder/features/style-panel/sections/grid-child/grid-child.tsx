import type { RenderCategoryProps } from "../../style-sections";
import { ShowMore } from "../../shared/show-more";
import { renderProperty } from "../../style-sections";
import { CollapsibleSection } from "~/builder/shared/collapsible-section";

export const GridChildSection = ({
  styleConfigsByCategory,
  moreStyleConfigsByCategory,
  label,
  isOpen,
}: RenderCategoryProps) => {
  return (
    <CollapsibleSection label={label} isOpen={isOpen}>
      {styleConfigsByCategory.map((entry) => renderProperty(entry))}
      <ShowMore
        styleConfigs={moreStyleConfigsByCategory.map((entry) =>
          renderProperty(entry)
        )}
      />
    </CollapsibleSection>
  );
};
