import { type FetcherWithComponents, useFetcher } from "@remix-run/react";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
} from "react";
import { useOnFetchEnd } from "./on-fetch-end";

/* This utility is designed for the case when you want to send a request using Remix's fetcher,
 * but you don't want the request to be cancelled when the component where useFetcher() is called unmounts.
 */

type Task<Data> = {
  target: Parameters<FetcherWithComponents<Data>["submit"]>[0];
  options: Parameters<FetcherWithComponents<Data>["submit"]>[1];
  callback?: (data: Data) => void;
};

type AddTaskFn = <Data>(
  target: Task<Data>["target"],
  options: Task<Data>["options"],
  callback?: Task<Data>["callback"]
) => void;

const Context = createContext<AddTaskFn | undefined>(undefined);

export const PersistentFetcherProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const fetcher = useFetcher();
  const queue = useRef<Task<unknown>[]>([]);
  const currentRequestCallback = useRef<
    ((data: unknown) => void) | undefined
  >();

  // we can't use fetcher.state === "idle"
  // because it's not updated immediately when you call fetcher.submit()
  const isIdle = useRef(true);

  const submitTask = useCallback(
    (task: Task<unknown>) => {
      isIdle.current = false;
      currentRequestCallback.current = task.callback;
      fetcher.submit(task.target, task.options);
    },
    [fetcher]
  );

  useOnFetchEnd(fetcher, (data) => {
    isIdle.current = true;

    if (currentRequestCallback.current) {
      currentRequestCallback.current(data);
      currentRequestCallback.current = undefined;
    }

    const nextTask = queue.current.shift();

    if (nextTask) {
      submitTask(nextTask);
    }
  });

  const addTask = useCallback(
    (
      target: Task<unknown>["target"],
      options: Task<unknown>["options"],
      callback: Task<unknown>["callback"]
    ) => {
      const task: Task<unknown> = { target, options, callback };
      if (isIdle.current && queue.current.length === 0) {
        submitTask(task);
      } else {
        queue.current.push(task);
      }
    },
    [submitTask]
  ) as AddTaskFn;

  return <Context.Provider value={addTask}>{children}</Context.Provider>;
};

export const usePersistentFetcher = () => {
  const addTask = useContext(Context);
  if (!addTask) {
    throw new Error(
      "usePersistentFetcher is used without PersistentFetcherProvider"
    );
  }
  return addTask;
};
