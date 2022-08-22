import { memo, lazy, Suspense } from "react";
import type { EditorProps } from "./editor";

const EditorLazy = lazy(() => import("./editor"));

type EditorPropsWithSuspense = EditorProps & {
  fallback: JSX.Element;
};

const EditorWithSuspense = ({
  fallback,
  ...props
}: EditorPropsWithSuspense) => {
  return (
    <Suspense fallback={fallback}>
      <EditorLazy {...props} />
    </Suspense>
  );
};

// Prevent rerender because in editing mode Editor controls the node.
export const Editor = memo(EditorWithSuspense, () => true);
