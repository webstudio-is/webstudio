import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  Button,
  MenuCheckedIcon,
} from "@webstudio-is/design-system";
import {
  ChevronDownIcon,
  CalendarIcon,
  UploadIcon,
  ArrowDownAZIcon,
  ArrowDownZAIcon,
} from "@webstudio-is/icons";
import type { DashboardProject } from "@webstudio-is/dashboard";

export type SortField = "createdAt" | "title" | "updatedAt" | "publishedAt";
export type SortOrder = "asc" | "desc";

export type SortState = {
  sortBy?: SortField;
  order?: SortOrder;
};

export const sortProjects = (
  projects: Array<DashboardProject>,
  sortState: SortState = {}
) => {
  const sortBy = sortState.sortBy ?? "updatedAt";
  const order = sortState.order ?? "desc";

  const sorted = [...projects];

  sorted.sort((a, b) => {
    let comparison = 0;

    if (sortBy === "title") {
      const aTitle = a.title ?? "";
      const bTitle = b.title ?? "";
      comparison = aTitle.localeCompare(bTitle);
    } else if (sortBy === "createdAt") {
      const aCreated = a.createdAt ?? "";
      const bCreated = b.createdAt ?? "";
      comparison = new Date(aCreated).getTime() - new Date(bCreated).getTime();
    } else if (sortBy === "updatedAt") {
      // Uses Build's updatedAt field from latestBuildVirtual view, falls back to project createdAt
      const aUpdated = a.latestBuildVirtual?.updatedAt || a.createdAt || "";
      const bUpdated = b.latestBuildVirtual?.updatedAt || b.createdAt || "";
      comparison = new Date(aUpdated).getTime() - new Date(bUpdated).getTime();
    } else if (sortBy === "publishedAt") {
      // Sort by published date, putting unpublished projects at the end
      const aPublished = a.isPublished
        ? a.latestBuildVirtual?.createdAt
        : undefined;
      const bPublished = b.isPublished
        ? b.latestBuildVirtual?.createdAt
        : undefined;

      // If both are published, compare dates normally (will be reversed by order)
      if (aPublished && bPublished) {
        comparison =
          new Date(aPublished).getTime() - new Date(bPublished).getTime();
      } else if (aPublished && !bPublished) {
        // Published should always come before unpublished, regardless of order
        // In asc: -1 means a before b (correct)
        // In desc: we return -(-1) = 1, meaning a after b (wrong!)
        // So we need to account for the order reversal
        comparison = order === "asc" ? -1 : 1;
      } else if (!aPublished && bPublished) {
        // Unpublished should always come after published, regardless of order
        comparison = order === "asc" ? 1 : -1;
      } else {
        comparison = 0; // both unpublished, maintain order
      }
    }

    return order === "asc" ? comparison : -comparison;
  });

  return sorted;
};

type SortSelectProps = {
  value: SortState;
  onValueChange: (value: Required<SortState>) => void;
};

export const SortSelect = ({ value, onValueChange }: SortSelectProps) => {
  const sortBy = value.sortBy ?? "updatedAt";
  const order = value.order ?? "desc";

  const sortLabel =
    sortBy === "createdAt"
      ? "Date created"
      : sortBy === "title"
        ? "Alphabetical"
        : sortBy === "publishedAt"
          ? "Date published"
          : "Last modified";

  const sortIcon =
    sortBy === "createdAt" ? (
      <CalendarIcon />
    ) : sortBy === "title" ? (
      order === "asc" ? (
        <ArrowDownAZIcon />
      ) : (
        <ArrowDownZAIcon />
      )
    ) : sortBy === "publishedAt" ? (
      <UploadIcon />
    ) : (
      <CalendarIcon />
    );

  const handleSortChange = (newSortBy: SortField, newOrder: SortOrder) => {
    // When switching to alphabetical sorting, default to A→Z (asc)
    // When switching to date sorting, default to newest first (desc)
    if (newSortBy !== sortBy) {
      onValueChange({
        sortBy: newSortBy,
        order: newSortBy === "title" ? "asc" : "desc",
      });
    } else {
      onValueChange({ sortBy: newSortBy, order: newOrder });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button color="ghost" prefix={sortIcon} suffix={<ChevronDownIcon />}>
          {sortLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Sort</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={sortBy}
          onValueChange={(value) => handleSortChange(value as SortField, order)}
        >
          <DropdownMenuRadioItem value="title" icon={<MenuCheckedIcon />}>
            Alphabetical
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="createdAt" icon={<MenuCheckedIcon />}>
            Date created
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="updatedAt" icon={<MenuCheckedIcon />}>
            Last modified
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="publishedAt" icon={<MenuCheckedIcon />}>
            Date published
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Order</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={order}
          onValueChange={(value) =>
            handleSortChange(sortBy, value as SortOrder)
          }
        >
          {sortBy === "title" ? (
            <>
              <DropdownMenuRadioItem value="asc" icon={<MenuCheckedIcon />}>
                A→Z
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="desc" icon={<MenuCheckedIcon />}>
                Z→A
              </DropdownMenuRadioItem>
            </>
          ) : (
            <>
              <DropdownMenuRadioItem value="desc" icon={<MenuCheckedIcon />}>
                Newest first
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="asc" icon={<MenuCheckedIcon />}>
                Oldest first
              </DropdownMenuRadioItem>
            </>
          )}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
