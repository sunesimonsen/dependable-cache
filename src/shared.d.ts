/**
 * A function resolving a value of type T.
 */
export type Resolver<T> = {
  (): Promise<T>;
};

export type Id = number | string;

export type Status = "uninitialized" | "loading" | "loaded" | "failed";
