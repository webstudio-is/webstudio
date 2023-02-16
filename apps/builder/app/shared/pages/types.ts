import type { Page } from "@webstudio-is/project-build";
import type { FetcherData } from "~/shared/form-utils";

export type CreatePageData = FetcherData<{ page: Page }>;

// eslint-disable-next-line @typescript-eslint/ban-types
export type EditPageData = FetcherData<{}>;

// eslint-disable-next-line @typescript-eslint/ban-types
export type DeletePageData = FetcherData<{}>;
