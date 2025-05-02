import useRelativeTime from "@nkzw/use-relative-time";

export const RelativeTime = ({ time }: { time: Date }) => {
  return useRelativeTime(time.getTime());
};
