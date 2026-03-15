import { ThumbnailWithAbbr, ThumbnailLinkWithAbbr } from "./thumbnail";

export default {
  title: "Dashboard/Thumbnail",
};

export const Abbreviation = () => (
  <ThumbnailWithAbbr title="My Next Project" onClick={() => {}} />
);

export const AbbreviationLink = () => (
  <ThumbnailLinkWithAbbr title="Landing Page" to="#" />
);

export const SingleWord = () => (
  <ThumbnailWithAbbr title="Portfolio" onClick={() => {}} />
);
