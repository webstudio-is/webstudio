import { memo, lazy, Suspense } from "react";

const EditorLazy = lazy(() => import("./editor"));

const EditorWithSuspense = (props) => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditorLazy {...props} />
    </Suspense>
  );
};

// Prevent rerender because in editing mode Editor controls the node.
export const Editor = memo(EditorWithSuspense, () => true);
