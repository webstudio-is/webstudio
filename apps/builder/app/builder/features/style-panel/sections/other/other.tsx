import type { RenderCategoryProps } from "../../style-sections";
import { ShowMore } from "../../shared/show-more";
import { renderProperty } from "../../style-sections";
import { CollapsibleSection } from "../../shared/collapsible-section";

export const OtherSection = ({
  styleConfigsByCategory,
  moreStyleConfigsByCategory,
  label,
  isOpen,
  sources,
}: RenderCategoryProps) => {
  return (
    <CollapsibleSection label={label} isOpen={isOpen} sources={sources}>
      {styleConfigsByCategory.map((entry) => renderProperty(entry))}
      <ShowMore
        styleConfigs={moreStyleConfigsByCategory.map((entry) =>
          renderProperty(entry)
        )}
      />
    </CollapsibleSection>
  );
};
