import { Select } from "@webstudio-is/design-system";
import { FILE_EXTENSIONS_BY_CATEGORY } from "@webstudio-is/asset-uploader";
import { titleCase } from "title-case";

type FormatCategory = keyof typeof FILE_EXTENSIONS_BY_CATEGORY;

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
  const categories = Object.keys(
    FILE_EXTENSIONS_BY_CATEGORY
  ) as FormatCategory[];
  const totalCount = Object.values(formatCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  const options: Array<FormatCategory | typeof ALL_FORMATS> = [
    ALL_FORMATS,
    ...categories.sort(),
  ];

  return (
    <Select
      options={options}
      value={selectedFormat}
      onChange={onFormatChange}
      getLabel={(option: FormatCategory | typeof ALL_FORMATS) => {
        if (option === ALL_FORMATS) {
          return `All (${totalCount})`;
        }
        return titleCase(`${option} (${formatCounts[option] || 0})`);
      }}
      css={{ flexGrow: 1 }}
    />
  );
};
