import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@webstudio-is/design-system";
import { ChevronDownIcon } from "@webstudio-is/icons";
import { getFileExtensionsByCategory } from "@webstudio-is/asset-uploader";

// Get format categories for UI grouping
const FORMAT_CATEGORIES = getFileExtensionsByCategory();

type FormatCategory = keyof typeof FORMAT_CATEGORIES;

const ALL_FORMATS = "all" as const;

type AssetFiltersProps = {
  formatCounts: Record<string, number>;
  selectedFormat: FormatCategory | typeof ALL_FORMATS;
  onFormatChange: (format: FormatCategory | typeof ALL_FORMATS) => void;
};

export const AssetFilters = ({
  formatCounts,
  selectedFormat,
  onFormatChange,
}: AssetFiltersProps) => {
  const categories = Object.keys(FORMAT_CATEGORIES).sort();
  const totalCount = Object.values(formatCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  const formatLabel =
    selectedFormat === ALL_FORMATS
      ? "All"
      : selectedFormat.charAt(0).toUpperCase() + selectedFormat.slice(1);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button color="ghost" prefix={<ChevronDownIcon />}>
          {formatLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup
          value={selectedFormat}
          onValueChange={(value) => {
            if (value) {
              onFormatChange(value as FormatCategory | typeof ALL_FORMATS);
            }
          }}
        >
          <DropdownMenuRadioItem value={ALL_FORMATS}>
            All ({totalCount})
          </DropdownMenuRadioItem>
          {categories.map((category) => {
            const count = formatCounts[category] || 0;
            return (
              <DropdownMenuRadioItem key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)} ({count})
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
