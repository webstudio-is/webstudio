import { SplitView } from "./split-view";
import { Text } from "./text";
import { cssVar } from "../css-var";
export default { title: "Split view", component: SplitView };
const Example = ({
  width = 640,
  single = false,
}: {
  width?: number;
  single?: boolean;
}) => (
  <div
    style={{ width, height: 240, background: cssVar("--background-floating") }}
  >
    <SplitView
      separatorLabel="Resize panels"
      start={<Text>Start</Text>}
      end={single ? undefined : <Text>End</Text>}
    />
  </div>
);
export const Default = () => <Example />;
export const Narrow = () => <Example width={280} />;
export const SinglePane = () => <Example single />;
