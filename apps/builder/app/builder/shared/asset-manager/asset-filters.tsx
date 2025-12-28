import { useMemo } from "react";
import { Select } from "@webstudio-is/design-system";
import type { AllowedFileExtension } from "@webstudio-is/sdk";

const CATEGORY_ALL = "All" as const;

/**
 * Display categories for file types in the UI
 * These match the comment sections in ALLOWED_FILE_TYPES
 */
const DISPLAY_CATEGORIES = [
  CATEGORY_ALL,
  "Images",
  "Documents",
  "Video",
  "Audio",
  "Code",
  "Archives",
  "Fonts",
] as const;

type DisplayCategory = (typeof DISPLAY_CATEGORIES)[number];

/**
 * Type-safe mapping of file extensions to display categories.
 *
 * TypeScript enforces that:
 * 1. All keys must be valid extensions from ALLOWED_FILE_TYPES
 * 2. All extensions from ALLOWED_FILE_TYPES must be included (completeness check)
 * 3. All values must be valid DisplayCategory types
 *
 * When adding a new file extension to ALLOWED_FILE_TYPES, TypeScript will
 * produce a compile error until that extension is also added to this mapping.
 */
const EXTENSION_TO_DISPLAY_CATEGORY: Record<
  AllowedFileExtension,
  DisplayCategory
> = {
  // Documents
  pdf: "Documents",
  doc: "Documents",
  docx: "Documents",
  xls: "Documents",
  xlsx: "Documents",
  csv: "Documents",
  ppt: "Documents",
  pptx: "Documents",

  // Code
  txt: "Code",
  md: "Code",
  js: "Code",
  css: "Code",
  json: "Code",
  html: "Code",
  xml: "Code",

  // Archives
  zip: "Archives",
  rar: "Archives",

  // Audio
  mp3: "Audio",
  wav: "Audio",
  ogg: "Audio",
  m4a: "Audio",

  // Video
  mp4: "Video",
  mov: "Video",
  avi: "Video",
  webm: "Video",

  // Images
  jpg: "Images",
  jpeg: "Images",
  png: "Images",
  gif: "Images",
  svg: "Images",
  webp: "Images",
  avif: "Images",
  ico: "Images",
  bmp: "Images",
  tif: "Images",
  tiff: "Images",

  // Fonts
  woff: "Fonts",
  woff2: "Fonts",
  ttf: "Fonts",
  otf: "Fonts",
};

/**
 * Get array of extensions for a given display category
 */
const getExtensionsForCategory = (
  category: DisplayCategory
): AllowedFileExtension[] | "*" => {
  if (category === CATEGORY_ALL) {
    return "*";
  }
  return Object.entries(EXTENSION_TO_DISPLAY_CATEGORY)
    .filter(([, cat]) => cat === category)
    .map(([ext]) => ext as AllowedFileExtension);
};

type AssetFiltersProps = {
  formatCounts: Partial<Record<AllowedFileExtension, number>>;
  value: AllowedFileExtension[] | "*";
  onChange: (extensions: AllowedFileExtension[] | "*") => void;
};

export const AssetFilters = ({
  formatCounts,
  value,
  onChange,
}: AssetFiltersProps) => {
  // Aggregate extension counts by display category
  const categoryCounts = useMemo(() => {
    const counts: Record<DisplayCategory, number> = {
      [CATEGORY_ALL]: 0,
      Images: 0,
      Documents: 0,
      Video: 0,
      Audio: 0,
      Code: 0,
      Archives: 0,
      Fonts: 0,
    };

    Object.entries(formatCounts).forEach(([ext, count]) => {
      const category =
        EXTENSION_TO_DISPLAY_CATEGORY[ext as AllowedFileExtension];
      if (category && count !== undefined) {
        counts[category] += count;
        counts[CATEGORY_ALL] += count;
      }
    });

    return counts;
  }, [formatCounts]);

  // Compute display category from extensions array
  const selectedCategory: DisplayCategory =
    value === "*"
      ? CATEGORY_ALL
      : (EXTENSION_TO_DISPLAY_CATEGORY[value[0]] as
          | DisplayCategory
          | undefined) || CATEGORY_ALL;

  const options = DISPLAY_CATEGORIES.map((category) => ({
    label: `${category} (${categoryCounts[category] || 0})`,
    value: category,
  }));

  const selectedOption = options.find((opt) => opt.value === selectedCategory);

  return (
    <Select
      options={options}
      value={selectedOption}
      onChange={(option: { label: string; value: DisplayCategory }) => {
        onChange(getExtensionsForCategory(option.value));
      }}
      getLabel={(option) => option.label}
      getValue={(option) => option.value}
      css={{ flexGrow: 1 }}
    />
  );
};
