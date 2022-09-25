import type { RenderCategoryProps } from "../../style-sections";
import { ShowMore } from "../../shared/show-more";
import { renderProperty } from "../../style-sections";
import { ToggleGroupControl } from "../../controls";

export const FlexChildSection = ({
  styleConfigsByCategory,
  moreStyleConfigsByCategory,
}: RenderCategoryProps) => {
  return (
    <>
      <ToggleGroupControl />
      {styleConfigsByCategory.map((entry) => renderProperty(entry))}
      <ShowMore
        styleConfigs={moreStyleConfigsByCategory.map((entry) =>
          renderProperty(entry)
        )}
      />
    </>
  );
};
