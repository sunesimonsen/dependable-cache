# @dependable/cache

[![Checks](https://github.com/sunesimonsen/dependable-cache/workflows/CI/badge.svg)](https://github.com/sunesimonsen/dependable-cache/actions?query=workflow%3ACI+branch%3Amain)
[![Bundle Size](https://img.badgesize.io/https:/unpkg.com/@dependable/cache/dist/dependable-cache.esm.min.js?label=gzip&compression=gzip)](https://unpkg.com/@dependable/cache/dist/dependable-cache.esm.min.js)

Reactive cache for storing entities using [@dependable/state](https://github.com/sunesimonsen/dependable-state).

[API documentation](https://dependable-cache-api.surge.sh/classes/Cache.Cache-1.html)

## Install

```sh
# npm
npm install --save @dependable/cache

# yarn
yarn add @dependable/cache
```

## Usage

### Create a cache

Let's create a cache for storing todo's.

```js
import { Cache } from "@dependable/cache";
import { observable } from "@dependable/state";

const todos = new Cache("todos");
```

### Loading state into the cache

Now we can load a todo into the cache using a resolver.

```js
todos.load(42, async () => {
  const response = await fetch("https://example.com/todos/42");

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const data = await response.json();

  return {
    id: data.id,
    title: observable(data.title),
    completed: observable(data.completed),
  };
});
```

If you only would like to initialize a value, you can use the initialize method.
It will only run the resolver if the value hasn't been initialized already.

```js
todos.initialize(42, async () => {
  const response = await fetch("https://example.com/todos/42");

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const data = await response.json();

  return {
    id: data.id,
    title: observable(data.title),
    completed: observable(data.completed),
  };
});
```

### Retrieving a value from the cache

We can get a value from the cache the following way.

```js
import { UNINITIALIZED, LOADING, LOADED, FAILED } from "@dependable/cache";

const [todo, status, error] = todos.byId(42);

if (status === FAILED) {
  // Loading the todo failed.
  // If this was a reload, you will still have the old value.
  console.log(error);
} else if (status === LOADING) {
  // The todo is loading.
  // If this was a reload, you will still have the old value.
} else if (status === UNINITIALIZED) {
  // Loading the todo hasn't been started yet.
} else if (status === LOADED) {
  // The todo finished loading.
}
```

If the above call is done inside of a [@dependable/state](https://github.com/sunesimonsen/dependable-state) computed or a
[@dependable/view](https://github.com/sunesimonsen/dependable-view) component,
it will update every time the status changes.

### Getting only the status

If you just need the status of a cache entry, you can use the `statusById` method.

```js
import { UNINITIALIZED, LOADING, LOADED, FAILED } from "@dependable/cache";

const status = todos.statusById(42);

if (status === FAILED) {
  // Loading the todo failed.
  // If this was a reload, you will still have the old value.
  console.log(error);
} else if (status === LOADING) {
  // The todo is loading.
} else if (status === UNINITIALIZED) {
  // Loading the todo hasn't been started yet.
} else if (status === LOADED) {
  // The todo finished loading.
}
```

### Waiting for a value to be initialized

In some rare cases it is useful to wait for a value being resolved. You can use the `loaded` method to get a promise that will either resolve when the values status becomes `LOADED` or reject when the status becomes `FAILED`.

```js
const todo = await todos.loaded(42);

console.log(todo);
```

### Evicting values

You can evict the a value the following way that will turn it back to be uninitialized.

```js
todos.evict(42);

const [todo, status, error] = todos.byId(42);

// will have null for the todo and a status of UNINITIALIZED.
```

You can also clear the entire cache with the `clear` method.

### Storing non-serializable objects

In case you need to store non-serializable objects in a cache, you can create a cache without giving it a name. This way the observable backing the cache will be anonymous and it's values will not be handled by the development tools.

This is useful for lazy loading components.

```js
const components = new Cache();

components.load("editor", import("./editor.js"));

const [module, status, error] = components.byId("editor");
```
