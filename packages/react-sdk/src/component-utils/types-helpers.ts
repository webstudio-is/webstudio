/**
 * For any object creates a new object with Required keys only
 * Example:
 * type Props = RequiredKeysObject<{src: string, alt?: string}>;
 * output: type Props = {src: string};
 *
 **/
type RequiredKeysObject<T extends object> = {
  [K in keyof T as T extends Record<K, T[K]> ? K : never]: T[K];
};

/**
 * Forces to define in initialVisibleProps all required props default values
 * Example:
 * type Props = {src: string, alt?: string};
 * const SomeComponent = (props: Props) => <img {...props} />
 * const initialValues: InitialValueProps<React.ComponentPropsWithoutRef<typeof SomeComponent>> = {
 *   alt: "",
 * }
 * Would give an error because src is required prop.
 **/
export type InitialVisibleProps<T extends object> = RequiredKeysObject<T> &
  Omit<T, keyof RequiredKeysObject<T>>;
