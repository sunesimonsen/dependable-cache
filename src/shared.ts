/**
 * A function resolving a value of type T.
 * Can return either a Promise or the value directly.
 */
export type Resolver<T> = () => Promise<T> | T;

/**
 * The ID type for cache entries - can be a number or string.
 */
export type Id = number | string;

/**
 * The status of a cache entry.
 */
export type Status = "UNINITIALIZED" | "LOADING" | "LOADED" | "FAILED";

// Export status constants as const values for runtime use
export const UNINITIALIZED: Status = "UNINITIALIZED";
export const FAILED: Status = "FAILED";
export const LOADING: Status = "LOADING";
export const LOADED: Status = "LOADED";
