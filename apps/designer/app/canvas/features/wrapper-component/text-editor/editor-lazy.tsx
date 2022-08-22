import { memo, lazy, Suspense } from "react";
import type { EditorProps } from "./editor";

const EditorLazy = lazy(() => import("./editor"));

const EditorWithSuspense = (props: EditorProps) => {
  return (
    <Suspense fallback={props.renderEditable()}>
      <EditorLazy {...props} />
    </Suspense>
  );
};

// Prevent rerender because in editing mode Editor controls the node.
export const Editor = memo(EditorWithSuspense, () => true);
