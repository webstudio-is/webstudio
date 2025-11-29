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
import { ChevronDownIcon } from "@webstudio-is/icons";
import type { DashboardProject } from "@webstudio-is/dashboard";

export type SortField = "createdAt" | "title" | "updatedAt" | "publishedAt";
export type SortOrder = "asc" | "desc";

export const sortProjects = (
  projects: Array<DashboardProject>,
  sortBy: SortField,
  order: SortOrder
) => {
  const sorted = [...projects];

  sorted.sort((a, b) => {
    let comparison = 0;

    if (sortBy === "title") {
      comparison = a.title.localeCompare(b.title);
    } else if (sortBy === "createdAt") {
      comparison =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortBy === "updatedAt") {
      const aUpdated = a.latestBuildVirtual?.createdAt || a.createdAt;
      const bUpdated = b.latestBuildVirtual?.createdAt || b.createdAt;
      comparison = new Date(aUpdated).getTime() - new Date(bUpdated).getTime();
    } else if (sortBy === "publishedAt") {
      // Sort by published date, putting unpublished projects at the end
      const aPublished =
        a.latestBuildVirtual?.publishStatus === "PUBLISHED"
          ? a.latestBuildVirtual?.createdAt
          : null;
      const bPublished =
        b.latestBuildVirtual?.publishStatus === "PUBLISHED"
          ? b.latestBuildVirtual?.createdAt
          : null;

      // If both are published or both are unpublished, compare dates
      if (aPublished && bPublished) {
        comparison =
          new Date(aPublished).getTime() - new Date(bPublished).getTime();
      } else if (aPublished && !bPublished) {
        comparison = -1; // a comes before b
      } else if (!aPublished && bPublished) {
        comparison = 1; // b comes before a
      } else {
        comparison = 0; // both unpublished, maintain order
      }
    }

    return order === "asc" ? comparison : -comparison;
  });

  return sorted;
};

type SortSelectProps = {
  sortBy: SortField;
  order: SortOrder;
  onSortChange: (sortBy: SortField, order: SortOrder) => void;
};

export const SortSelect = ({
  sortBy,
  order,
  onSortChange,
}: SortSelectProps) => {
  const sortLabel =
    sortBy === "createdAt"
      ? "Date created"
      : sortBy === "title"
        ? "Alphabetical"
        : sortBy === "publishedAt"
          ? "Date published"
          : "Last modified";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button color="ghost" suffix={<ChevronDownIcon />}>
          {sortLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Sort</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={sortBy}
          onValueChange={(value) => onSortChange(value as SortField, order)}
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
          onValueChange={(value) => onSortChange(sortBy, value as SortOrder)}
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
