export const UNINITIALIZED: "UNINITIALIZED";
export const FAILED: "FAILED";
export const LOADING: "LOADING";
export const LOADED: "LOADED";
/**
 * @template T the type of the values stored in the cache.
 *
 * A cache implemented using <a href="https://github.com/sunesimonsen/dependable-state" target="_blank">@dependable/state</a>.
 * This make retrieving values inside of a computed or inside of a <a href="https://github.com/sunesimonsen/dependable-view" target="_blank">@dependable/view</a>
 * component automatically update.
 */
export class Cache<T> {
    /**
     * Creates a new cache with the given name.
     *
     * @param {string} name the name of the cache. It needs to be unique.
     */
    constructor(name: string);
    /** @hidden */
    _accessors: {};
    /** @hidden */
    _cache: import("@dependable/state/types/shared").Observable<{}>;
    /**
     * Clear the cache.
     */
    clear(): void;
    /** @hidden */
    _getCacheEntry(id: any): any;
    /**
     * Get the value from the cache with the given id.
     *
     * @param {import('./shared').Id} id the id of the value to retrieve.
     * @returns {[(T | null), import('./shared').Status, (Error | null)]}
     */
    byId(id: import('./shared').Id): [(T | null), import('./shared').Status, (Error | null)];
    /**
     * Load state into the cache using the given resolver and store it under the id.
     *
     * @param {import('./shared').Id} id the id that the resolved value should be stored under.
     * @param {import('./shared').Resolver<T> | T} valueOrResolver either the resolved value or a resolver function.
     * @returns {Promise<T | null>} promise for the resolved value.
     */
    load(id: import('./shared').Id, valueOrResolver: import('./shared').Resolver<T> | T): Promise<T | null>;
    /**
     * Initialize the value using the given resolver and store it under the id.
     *
     * If the value is already initialized, it is not initialized again.
     *
     * @param {import('./shared').Id} id the id that the resolved value should be stored under.
     * @param {import('./shared').Resolver<T> | T} valueOrResolver either the resolved value or a resolver function.
     * @returns {Promise<T | null>} promise for the resolved value.
     */
    initialize(id: import('./shared').Id, valueOrResolver: import('./shared').Resolver<T> | T): Promise<T | null>;
    /**
     * Load state into the cache using the given resolver and store it under the ids.
     *
     * @param {(import('./shared').Id)[]} ids the ids that the resolved value should be stored under.
     * @param {import('./shared').Resolver<T[]> | T[]} valuesOrResolver either the resolved values or a resolver function.
     * @returns {Promise<T[] | null>} promise for the resolved value.
     */
    loadMany(ids: (import('./shared').Id)[], valuesOrResolver: import('./shared').Resolver<T[]> | T[]): Promise<T[] | null>;
    /**
     * Evict the given id from the cache.
     * @param {import('./shared').Id} id the id of the value to evict.
     */
    evict(id: import('./shared').Id): void;
}
//# sourceMappingURL=Cache.d.ts.map