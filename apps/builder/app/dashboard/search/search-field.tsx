import { SearchField } from "@webstudio-is/design-system";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { dashboardPath } from "~/shared/router-utils";

export const Search = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const handleAbortSearch = () => {
    // When user cancels the search, we try to return to the last path they were on.
    if (location.state?.previousPathname) {
      return navigate(location.state.previousPathname);
    }
    navigate(dashboardPath("projects"));
  };
  const isSearchRoute = location.pathname === dashboardPath("search");

  return (
    <SearchField
      value={searchParams.get("q") ?? undefined}
      onChange={(event) => {
        const value = event.currentTarget.value.trim();
        if (value === "") {
          handleAbortSearch();
          return;
        }
        if (isSearchRoute === false) {
          navigate(
            {
              pathname: dashboardPath("search"),
              search: `?q=${value}`,
            },
            // Remember the last path to return to on abort
            {
              state: { previousPathname: location.pathname },
            }
          );
          return;
        }
        setSearchParams({ q: value }, { replace: true });
      }}
      onAbort={handleAbortSearch}
      autoFocus
      placeholder="Search for anything"
    />
  );
};
