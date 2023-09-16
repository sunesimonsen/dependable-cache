/**
 * A resolver function that will be used to resolve entries for the cache.
 */
export type Resolver<T> = {
  (): T;
};
