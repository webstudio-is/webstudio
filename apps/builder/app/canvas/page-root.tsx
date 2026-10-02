import type { ReactNode } from "react";

export const PageRoot = ({
  pageKey,
  children,
}: {
  pageKey: string;
  children: ReactNode;
}) => (
  <div key={pageKey} style={{ display: "contents" }}>
    {children}
  </div>
);
