import { atom } from "nanostores";

type ContentHistory = {
  edits: readonly {
    id: string;
    assetId: string;
    before: string;
    after: string;
  }[];
  index: number;
};

// Source history is separate from the transient instance patches used to render
// MDX. Replaying those patches would also undo loading and rematerialization.
export const $externalContentHistory = atom<
  ReadonlyMap<string, ContentHistory>
>(new Map());

export const recordExternalContentHistory = ({
  projectId,
  assetId,
  before,
  after,
}: {
  projectId: string;
  assetId: string;
  before: string;
  after: string;
}) => {
  if (before === after) {
    return;
  }
  const current = $externalContentHistory.get();
  const history = current.get(projectId);
  const edits = [
    ...(history?.edits.slice(0, history.index) ?? []),
    { id: crypto.randomUUID(), assetId, before, after },
  ].slice(-20);
  $externalContentHistory.set(
    new Map(current).set(projectId, {
      edits,
      index: edits.length,
    })
  );
};
