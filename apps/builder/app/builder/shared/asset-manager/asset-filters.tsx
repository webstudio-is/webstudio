import { Select } from "@webstudio-is/design-system";
import {
  FILE_EXTENSIONS_BY_CATEGORY,
  type MimeCategory,
} from "@webstudio-is/sdk";
import { titleCase } from "title-case";

const ALL_FORMATS = "all" as const;

type AssetFiltersProps = {
  formatCounts: Record<string, number>;
  selectedFormat: MimeCategory | typeof ALL_FORMATS;
  onFormatChange: (format: MimeCategory | typeof ALL_FORMATS) => void;
};

export const AssetFilters = ({
  formatCounts,
  selectedFormat,
  onFormatChange,
}: AssetFiltersProps) => {
  const categories = Object.keys(FILE_EXTENSIONS_BY_CATEGORY) as MimeCategory[];
  const totalCount = Object.values(formatCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  const options: Array<MimeCategory | typeof ALL_FORMATS> = [
    ALL_FORMATS,
    ...categories.sort(),
  ];

  return (
    <Select
      options={options}
      value={selectedFormat}
      onChange={onFormatChange}
      getLabel={(option: MimeCategory | typeof ALL_FORMATS) => {
        if (option === ALL_FORMATS) {
          return `All (${totalCount})`;
        }
        return titleCase(`${option} (${formatCounts[option] || 0})`);
      }}
      css={{ flexGrow: 1 }}
    />
  );
};
