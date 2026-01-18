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
  ArrowDownAZIcon,
  ArrowDownZAIcon,
  ArrowDownWideNarrowIcon,
  ArrowDownNarrowWideIcon,
} from "@webstudio-is/icons";
import type { SortState, SortField, SortOrder } from "./utils";

type AssetSortSelectProps = {
  value: SortState;
  onValueChange: (value: SortState) => void;
};

export const AssetSortSelect = ({
  value,
  onValueChange,
}: AssetSortSelectProps) => {
  const { sortBy, order } = value;

  const sortLabel =
    sortBy === "name"
      ? "Alphabetical"
      : sortBy === "size"
        ? "File size"
        : "Date created";

  const sortIcon =
    sortBy === "name" ? (
      order === "asc" ? (
        <ArrowDownAZIcon />
      ) : (
        <ArrowDownZAIcon />
      )
    ) : sortBy === "size" ? (
      order === "desc" ? (
        <ArrowDownWideNarrowIcon />
      ) : (
        <ArrowDownNarrowWideIcon />
      )
    ) : (
      <CalendarIcon />
    );

  const handleSortChange = (newSortBy: SortField, newOrder: SortOrder) => {
    // When switching to alphabetical sorting, default to A→Z (asc)
    // When switching to date/size sorting, default to newest/largest first (desc)
    if (newSortBy !== sortBy) {
      onValueChange({
        sortBy: newSortBy,
        order: newSortBy === "name" ? "asc" : "desc",
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
          <DropdownMenuRadioItem value="name" icon={<MenuCheckedIcon />}>
            Alphabetical
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="createdAt" icon={<MenuCheckedIcon />}>
            Date created
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="size" icon={<MenuCheckedIcon />}>
            File size
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
          {sortBy === "name" ? (
            <>
              <DropdownMenuRadioItem value="asc" icon={<MenuCheckedIcon />}>
                A→Z
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="desc" icon={<MenuCheckedIcon />}>
                Z→A
              </DropdownMenuRadioItem>
            </>
          ) : sortBy === "size" ? (
            <>
              <DropdownMenuRadioItem value="desc" icon={<MenuCheckedIcon />}>
                Largest first
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="asc" icon={<MenuCheckedIcon />}>
                Smallest first
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
