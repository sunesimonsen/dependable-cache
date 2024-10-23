import { computed, observable } from "@dependable/state";

export const UNINITIALIZED = "UNINITIALIZED";
export const FAILED = "FAILED";
export const LOADING = "LOADING";
export const LOADED = "LOADED";

/**
 * @template T the type of the values stored in the cache.
 *
 * A cache implemented using <a href="https://github.com/sunesimonsen/dependable-state" target="_blank">@dependable/state</a>.
 * This make retrieving values inside of a computed or inside of a <a href="https://github.com/sunesimonsen/dependable-view" target="_blank">@dependable/view</a>
 * component automatically update.
 */
export class Cache {
  /**
   * Creates a new cache with the given name.
   *
   * @param {string?} name the name of the cache. It needs to be unique when specified.
   */
  constructor(name) {
    /** @hidden */
    this._accessors = {};
    /** @hidden */
    if (name) {
      this._cache = observable({}, { id: `${name}Cache` });
    } else {
      this._cache = observable({});
    }
  }

  /**
   * Clear the cache.
   */
  clear() {
    this._accessors = {};
    this._cache({});
  }

  /** @hidden */
  _getCacheEntry(id) {
    const cacheEntries = this._cache();

    let entry = cacheEntries[id];

    if (!entry) {
      entry = {
        value: observable(null),
        status: observable(UNINITIALIZED),
        error: observable(null),
      };

      this._cache({
        ...cacheEntries,
        [id]: entry,
      });
    }

    return entry;
  }

  /**
   * Get the value from the cache with the given id.
   *
   * @param {import('./shared').Id} id the id of the value to retrieve.
   * @returns {[(T | null), import('./shared').Status, (Error | null)]}
   */
  byId(id) {
    let accessor = this._accessors[id];

    if (!accessor) {
      accessor = computed(() => {
        const entry = this._getCacheEntry(id);
        return [entry.value(), entry.status(), entry.error()];
      });
      this._accessors[id] = accessor;
    }

    return accessor();
  }

  /**
   * Get the status of a cache entry with the given id.
   *
   * @param {import('./shared').Id} id the id of the entry to retrieve.
   * @returns {import('./shared').Status}
   */
  statusById(id) {
    return this._getCacheEntry(id).status();
  }

  /**
   * Returns a promise that will resolve when the status of a cache entry with
   * the given id is loaded.
   *
   * This is useful for waiting for a value like an authentication token
   * becoming available.
   *
   * @param {import('./shared').Id} id the id of the entry to retrieve.
   * @returns {T}
   */
  loaded(id) {
    return new Promise((resolve, reject) => {
      const entry = this._getCacheEntry(id);
      const onChange = () => {
        const status = entry.status();
        if (status === LOADED) {
          entry.status.unsubscribe(onChange);
          resolve(entry.value());
        } else if (status === FAILED) {
          entry.status.unsubscribe(onChange);
          reject(entry.error());
        }
      };

      entry.status.subscribe(onChange);
    });
  }

  /**
   * Load state into the cache using the given resolver and store it under the id.
   *
   * @param {import('./shared').Id} id the id that the resolved value should be stored under.
   * @param {import('./shared').Resolver<T> | T} valueOrResolver either the resolved value or a resolver function.
   * @returns {Promise<T | null>} promise for the resolved value.
   */
  async load(id, valueOrResolver) {
    const entry = this._getCacheEntry(id);

    entry.status(LOADING);
    try {
      const newValue =
        typeof valueOrResolver === "function"
          ? valueOrResolver()
          : Promise.resolve(valueOrResolver);

      entry.value(await newValue);
      entry.error(null);
      entry.status(LOADED);

      return newValue;
    } catch (err) {
      entry.error(err);
      entry.status(FAILED);

      return null;
    }
  }

  /**
   * Initialize the value using the given resolver and store it under the id.
   *
   * If the value is already initialized, it is not initialized again.
   *
   * Notice that if initialiazing fails, calling initialize again will reload the value.
   *
   * @param {import('./shared').Id} id the id that the resolved value should be stored under.
   * @param {import('./shared').Resolver<T> | T} valueOrResolver either the resolved value or a resolver function.
   * @returns {Promise<T | null>} promise for the resolved value.
   */
  initialize(id, valueOrResolver) {
    const entry = this._getCacheEntry(id);

    const status = entry.status();
    if (status === UNINITIALIZED || status === FAILED) {
      return this.load(id, valueOrResolver);
    }
  }

  /**
   * Load state into the cache using the given resolver and store it under the ids.
   *
   * @param {(import('./shared').Id)[]} ids the ids that the resolved value should be stored under.
   * @param {import('./shared').Resolver<T[]> | T[]} valuesOrResolver either the resolved values or a resolver function.
   * @returns {Promise<T[] | null>} promise for the resolved value.
   */
  async loadMany(ids, valuesOrResolver) {
    const newValuesPromise =
      typeof valuesOrResolver === "function"
        ? valuesOrResolver()
        : valuesOrResolver;

    const loaded = [];
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
   * @param {import('./shared').Id} id the id of the value to evict.
   */
  evict(id) {
    const entry = this._getCacheEntry(id);

    entry.value(null);
    entry.status(UNINITIALIZED);
    entry.error(null);

    delete this._accessors[id];
    this._cache({ ...this._cache(), [id]: undefined });
  }
}
