import { computed, observable } from "@dependable/state";
import type { Id, Status, Resolver } from "./shared.js";
import { UNINITIALIZED, FAILED, LOADING, LOADED } from "./shared.js";

// Re-export constants and types for convenience
export { UNINITIALIZED, FAILED, LOADING, LOADED };
export type { Id, Status, Resolver };

/**
 * Observable type from @dependable/state.
 */
type Observable<T> = {
  (): T;
  (value: T): void;
  id?: string;
  kind?: string;
};

/**
 * Computed type from @dependable/state.
 */
type Computed<T> = {
  (): T;
  subscribe: (callback: () => void) => void;
};

/**
 * Internal cache entry structure.
 */
interface CacheEntry<T> {
  value: Observable<T | null>;
  status: Observable<Status>;
  error: Observable<Error | null>;
}

/**
 * Internal cache storage type.
 */
type CacheStorage<T> = {
  [key: string]: CacheEntry<T> | undefined;
};

/**
 * A cache implemented using {@link https://github.com/sunesimonsen/dependable-state | @dependable/state}.
 * This makes retrieving values inside of a computed or inside of a
 * {@link https://github.com/sunesimonsen/dependable-view | @dependable/view}
 * component automatically update.
 *
 * @typeParam T - The type of the values stored in the cache.
 *
 * @example
 * ```typescript
 * import { Cache } from "@dependable/cache";
 *
 * interface Todo {
 *   id: number;
 *   title: string;
 *   completed: boolean;
 * }
 *
 * const todos = new Cache<Todo>("todos");
 *
 * // Load a todo
 * await todos.load(42, async () => {
 *   const response = await fetch("https://api.example.com/todos/42");
 *   return response.json();
 * });
 *
 * // Get the todo
 * const [todo, status, error] = todos.byId(42);
 * ```
 */
export class Cache<T = any> {
  readonly _cache: Observable<CacheStorage<T>>;
  private _accessors: Record<
    string,
    Computed<[T | null, Status, Error | null]>
  >;

  /**
   * Creates a new cache with the given name.
   *
   * @param name - The name of the cache. It needs to be unique when specified.
   *               If provided, the cache will be identifiable in dev tools.
   *
   * @example
   * ```typescript
   * // Named cache (visible in dev tools)
   * const todos = new Cache<Todo>("todos");
   *
   * // Anonymous cache (for non-serializable objects)
   * const components = new Cache();
   * ```
   */
  constructor(name?: string) {
    this._accessors = {};
    if (name) {
      this._cache = observable<CacheStorage<T>>({}, { id: `${name}Cache` });
    } else {
      this._cache = observable<CacheStorage<T>>({});
    }
  }

  /**
   * Clear the cache, removing all entries and resetting all accessors.
   *
   * @example
   * ```typescript
   * todos.clear();
   * ```
   */
  clear(): void {
    this._accessors = {};
    this._cache({});
  }

  /**
   * Gets or creates a cache entry for the given id.
   * @internal
   */
  private _getCacheEntry(id: Id): CacheEntry<T> {
    const cacheEntries = this._cache();
    const key = String(id);

    let entry = cacheEntries[key];

    if (!entry) {
      entry = {
        value: observable<T | null>(null),
        status: observable<Status>(UNINITIALIZED),
        error: observable<Error | null>(null),
      };

      this._cache({
        ...cacheEntries,
        [key]: entry,
      });
    }

    return entry;
  }

  /**
   * Get the value from the cache with the given id.
   *
   * Returns a tuple containing the cached value, status, and error.
   * When called inside a computed or @dependable/view component,
   * it will automatically trigger updates when the cache entry changes.
   *
   * @param id - The id of the value to retrieve.
   * @returns A tuple of [value, status, error]
   *
   * @example
   * ```typescript
   * const [todo, status, error] = todos.byId(42);
   *
   * if (status === LOADED) {
   *   console.log(todo.title);
   * } else if (status === FAILED) {
   *   console.error(error);
   * }
   * ```
   */
  byId(id: Id): [T | null, Status, Error | null] {
    const key = String(id);
    let accessor = this._accessors[key];

    if (!accessor) {
      accessor = computed(() => {
        const entry = this._getCacheEntry(id);
        return [entry.value(), entry.status(), entry.error()] as [
          T | null,
          Status,
          Error | null,
        ];
      });
      this._accessors[key] = accessor;
    }

    return accessor();
  }

  /**
   * Get the status of a cache entry with the given id.
   *
   * This is more efficient than `byId` when you only need the status
   * and don't need to track the value or error.
   *
   * @param id - The id of the entry to retrieve.
   * @returns The status of the cache entry.
   *
   * @example
   * ```typescript
   * const status = todos.statusById(42);
   *
   * if (status === LOADING) {
   *   console.log("Loading todo...");
   * }
   * ```
   */
  statusById(id: Id): Status {
    const entry = this._getCacheEntry(id);
    return entry.status();
  }

  /**
   * Load state into the cache using the given resolver and store it under the id.
   *
   * The resolver can be either a direct value, a Promise, or a function that returns a Promise.
   * This will always trigger a reload, even if the value is already loaded.
   *
   * @param id - The id that the resolved value should be stored under.
   * @param valueOrResolver - Either the resolved value or a resolver function.
   * @returns A promise for the resolved value, or null if loading failed.
   *
   * @example
   * ```typescript
   * // With a resolver function
   * await todos.load(42, async () => {
   *   const response = await fetch("https://api.example.com/todos/42");
   *   return response.json();
   * });
   *
   * // With a direct value
   * await todos.load(42, { id: 42, title: "Test", completed: false });
   * ```
   */
  async load(id: Id, valueOrResolver: Resolver<T> | T): Promise<T | null> {
    const entry = this._getCacheEntry(id);

    entry.status(LOADING);
    try {
      const newValue =
        typeof valueOrResolver === "function"
          ? (valueOrResolver as Resolver<T>)()
          : Promise.resolve(valueOrResolver);

      const resolvedValue = await newValue;
      entry.value(resolvedValue);
      entry.error(null);
      entry.status(LOADED);

      return resolvedValue;
    } catch (err) {
      entry.error(err as Error);
      entry.status(FAILED);

      return null;
    }
  }

  /**
   * Initialize the value using the given resolver and store it under the id.
   *
   * If the value is already initialized, it is not initialized again.
   * However, if initialization previously failed, calling initialize again will reload the value.
   *
   * @param id - The id that the resolved value should be stored under.
   * @param valueOrResolver - Either the resolved value or a resolver function.
   * @returns A promise for the resolved value, or null if loading failed, or undefined if already initialized.
   *
   * @example
   * ```typescript
   * // First call will load
   * await todos.initialize(42, async () => fetchTodo(42));
   *
   * // Second call will not load (already initialized)
   * await todos.initialize(42, async () => fetchTodo(42));
   * ```
   */
  initialize(
    id: Id,
    valueOrResolver: Resolver<T> | T,
  ): Promise<T | null> | undefined {
    const entry = this._getCacheEntry(id);

    const status = entry.status();
    if (status === UNINITIALIZED || status === FAILED) {
      return this.load(id, valueOrResolver);
    }
    return undefined;
  }

  /**
   * Load state into the cache using the given resolver and store it under the ids.
   *
   * The resolver should return an array of values corresponding to the provided ids.
   * Each value will be stored under its respective id from the ids array.
   *
   * @param ids - The ids that the resolved values should be stored under.
   * @param valuesOrResolver - Either the resolved values or a resolver function returning an array.
   * @returns A promise for the resolved values, or null for any that failed.
   *
   * @example
   * ```typescript
   * await todos.loadMany([42, 43], async () => {
   *   const response = await fetch("https://api.example.com/todos?ids=42,43");
   *   return response.json();
   * });
   * ```
   */
  async loadMany(
    ids: Id[],
    valuesOrResolver: Resolver<T[]> | T[],
  ): Promise<(T | null)[]> {
    const newValuesPromise =
      typeof valuesOrResolver === "function"
        ? (valuesOrResolver as Resolver<T[]>)()
        : valuesOrResolver;

    const loaded: Promise<T | null>[] = [];
    for (let i = 0; i < ids.length; i++) {
      loaded.push(
        this.load(ids[i], async () => {
          const newValues = await newValuesPromise;
          return newValues[i];
        }),
      );
    }

    return Promise.all(loaded);
  }

  /**
   * Evict the given id from the cache.
   *
   * This will reset the entry to UNINITIALIZED status and clear the value and error.
   * The entry will need to be loaded again to access it.
   *
   * @param id - The id of the value to evict.
   *
   * @example
   * ```typescript
   * todos.evict(42);
   *
   * const [todo, status] = todos.byId(42);
   * // status === UNINITIALIZED, todo === null
   * ```
   */
  evict(id: Id): void {
    const entry = this._getCacheEntry(id);
    const key = String(id);

    entry.value(null);
    entry.status(UNINITIALIZED);
    entry.error(null);

    delete this._accessors[key];
    this._cache({ ...this._cache(), [key]: undefined });
  }
}
