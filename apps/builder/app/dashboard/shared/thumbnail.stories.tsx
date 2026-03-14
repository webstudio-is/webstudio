import { ThumbnailWithAbbr, ThumbnailLinkWithAbbr } from "./thumbnail";

export default {
  title: "Builder/Dashboard/Thumbnail",
};

export const Abbreviation = () => (
  <div
    style={{
      width: 280,
      aspectRatio: "1.91/1",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--ws-colors-brand-background-project-card-front)",
    }}
  >
    <ThumbnailWithAbbr title="My Next Project" onClick={() => {}} />
  </div>
);

export const AbbreviationLink = () => (
  <div
    style={{
      width: 280,
      aspectRatio: "1.91/1",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--ws-colors-brand-background-project-card-front)",
    }}
  >
    <ThumbnailLinkWithAbbr title="Landing Page" to="#" />
  </div>
);

export const SingleWord = () => (
  <div
    style={{
      width: 280,
      aspectRatio: "1.91/1",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--ws-colors-brand-background-project-card-front)",
    }}
  >
    <ThumbnailWithAbbr title="Portfolio" onClick={() => {}} />
  </div>
);
