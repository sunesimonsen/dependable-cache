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

Let's create a cache for storing todo's.

```js
import { Cache } from "@dependable/cache";
import { observable } from "@dependable/state";

const todos = new Cache("todos");
```

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

We can get a value from the cache the following way.

```js
const [todo, status, error] = todos.byId(42);

if (status === "failed") {
  // Loading the todo failed.
  // If this was a reload, you will still have the old value.
  console.log(error);
} else if (status === "loading") {
  // The todo is loading.
  // If this was a reload, you will still have the old value.
} else if (status === "uninitialized") {
  // Loading the todo hasn't been started yet.
} else if (status === "loaded") {
  // The todo finished loading.
}
```

If the above call is done inside of a [@dependable/state](https://github.com/sunesimonsen/dependable-state) computed or a
[@dependable/view](https://github.com/sunesimonsen/dependable-view) component,
it will update everytime the status changes.

You can evict the a value the following way that will turn it back to be uninitialized.

```js
todos.evict(42);

const [todo, status, error] = todos.byId(42);

// will have null for the todo and a status of uninitialized.
```

You can also clear the entire cache with the `clear` method.
