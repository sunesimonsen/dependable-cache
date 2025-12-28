import { computed, flush } from "@dependable/state";
import { Cache, LOADED, LOADING, UNINITIALIZED, FAILED } from "../src/Cache.js";
import { FakePromise } from "fake-promise";

interface Todo {
  title: string;
}

const delay = (timeout = 0) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, timeout);
  });

describe("Cache", () => {
  let todos: Cache<Todo>;

  beforeEach(() => {
    todos = new Cache<Todo>("todo");
  });

  describe("constructor", () => {
    describe("when given a name", () => {
      it("creates a new entity cache with the given name", () => {
        const todos = new Cache<Todo>("todo");
        expect(todos._cache.id).toBe("todoCache");
        expect(todos._cache.kind).toBe("observable");
      });
    });

    describe("when not given a name", () => {
      it("creates a new anonymous entity cache", () => {
        const todos = new Cache<Todo>();
        expect(todos._cache.id).toBeUndefined();
        expect(todos._cache.kind).toBe("observable");
      });
    });
  });

  describe("byId", () => {
    describe("when the entity isn't loaded", () => {
      it("returns an uninitialised entry", () => {
        const [todo, status, error] = todos.byId(42);

        expect(todo).toEqual(null);
        expect(status).toEqual(UNINITIALIZED);
        expect(error).toEqual(null);
      });
    });

    describe("when the entity is loaded", () => {
      beforeEach(async () => {
        await todos.load(42, { title: "Remember to test" });
      });

      it("returns an initialised entry", () => {
        const [todo, status, error] = todos.byId(42);

        expect(todo).toEqual({ title: "Remember to test" });
        expect(status).toEqual(LOADED);
        expect(error).toEqual(null);
      });

      describe("and a reload is failing", () => {
        const err = new Error("custom error");

        beforeEach(async () => {
          await todos.load(42, { title: "Remember to test" });
          await todos.load(42, () => FakePromise.reject(err));
        });

        it("returns a failed state, together with the current data", () => {
          const [todo, status, error] = todos.byId(42);

          expect(todo).toEqual({ title: "Remember to test" });
          expect(status).toEqual(FAILED);
          expect(error).toEqual(err);
        });
      });
    });

    describe("when the entity is in a failed state", () => {
      const err = new Error("custom error");

      beforeEach(async () => {
        await todos.load(42, () => FakePromise.reject(err));
      });

      it("returns a failed state", () => {
        const [todo, status, error] = todos.byId(42);

        expect(todo).toEqual(null);
        expect(status).toEqual(FAILED);
        expect(error).toEqual(err);
      });
    });

    it("triggers updates to computeds", async () => {
      const fakePromise = new FakePromise<Todo>();

      const wired = computed(() => todos.byId(42));

      const values: [Todo | null, string, Error | null][] = [];
      wired.subscribe(() => {
        values.push(wired());
      });

      todos.load(42, () => fakePromise as Promise<Todo>);

      flush();

      fakePromise.resolve({
        title: "Remember to test",
      });

      await delay();
      flush();

      expect(values).toEqual([
        [null, "LOADING", null],
        [{ title: "Remember to test" }, "LOADED", null],
      ]);

      expect(wired()).toEqual([{ title: "Remember to test" }, "LOADED", null]);
    });
  });

  describe("statusById", () => {
    describe("when the entity isn't loaded", () => {
      it("returns UNINITIALIZED", () => {
        const status = todos.statusById(42);

        expect(status).toEqual(UNINITIALIZED);
      });
    });

    describe("when the entity is loaded", () => {
      beforeEach(async () => {
        await todos.load(42, { title: "Remember to test" });
      });

      it("returns LOADED", () => {
        const status = todos.statusById(42);

        expect(status).toEqual(LOADED);
      });

      describe("and a reload is failing", () => {
        const err = new Error("custom error");

        beforeEach(async () => {
          await todos.load(42, { title: "Remember to test" });
          await todos.load(42, () => FakePromise.reject(err));
        });

        it("returns FAILED", () => {
          const status = todos.statusById(42);

          expect(status).toEqual(FAILED);
        });
      });
    });

    describe("when the entity is in a failed state", () => {
      const err = new Error("custom error");

      beforeEach(async () => {
        await todos.load(42, () => FakePromise.reject(err));
      });

      it("returns a failed state", () => {
        const status = todos.statusById(42);

        expect(status).toEqual(FAILED);
      });
    });

    it("triggers updates to computeds", async () => {
      const fakePromise = new FakePromise<Todo>();

      const wired = computed(() => todos.statusById(42));

      const values: string[] = [];
      wired.subscribe(() => {
        values.push(wired());
      });

      todos.load(42, () => fakePromise as Promise<Todo>);

      flush();

      fakePromise.resolve({
        title: "Remember to test",
      });

      await delay();
      flush();

      expect(values).toEqual(["LOADING", "LOADED"]);

      expect(wired()).toEqual("LOADED");
    });
  });

  describe("load", () => {
    it("sets the status to loading while resolving", () => {
      const fakePromise = new FakePromise<Todo>();

      todos.load(42, () => fakePromise as Promise<Todo>);

      const [todo, status, error] = todos.byId(42);
      expect(todo).toEqual(null);
      expect(status).toEqual(LOADING);
      expect(error).toEqual(null);
    });

    it("updates the entity with the given id with a value", async () => {
      await todos.load(42, { title: "Remember to test" });

      const [todo, status, error] = todos.byId(42);

      expect(todo).toEqual({ title: "Remember to test" });
      expect(status).toEqual(LOADED);
      expect(error).toEqual(null);
    });

    it("updates the entity with the given id with a value returned by the resolver", async () => {
      const todos = new Cache<Todo>("todo");

      await todos.load(42, () => ({
        title: "Remember to test",
      }));

      const [todo, status, error] = todos.byId(42);

      expect(todo).toEqual({ title: "Remember to test" });
      expect(status).toEqual(LOADED);
      expect(error).toEqual(null);
    });

    it("allows re-loading a value", async () => {
      const todos = new Cache<Todo>("todo");

      await todos.load(42, () => ({
        title: "Remember to test",
      }));

      await todos.load(42, () => ({
        title: "This is updated",
      }));

      const [todo, status, error] = todos.byId(42);

      expect(todo).toEqual({ title: "This is updated" });
      expect(status).toEqual(LOADED);
      expect(error).toEqual(null);
    });
  });

  describe("loadMany", () => {
    it("sets the status to loading while resolving", () => {
      const fakePromise = new FakePromise<Todo[]>();

      todos.loadMany([42, 43], () => fakePromise as Promise<Todo[]>);

      expect(todos.byId(42)).toEqual([null, LOADING, null]);
      expect(todos.byId(43)).toEqual([null, LOADING, null]);
    });

    it("updates the entity with the given id with a value", async () => {
      await todos.loadMany(
        [42, 43],
        [
          { title: "Remember to test" },
          { title: "Even when there is many things to test" },
        ],
      );

      expect(todos.byId(42)).toEqual([
        { title: "Remember to test" },
        LOADED,
        null,
      ]);

      expect(todos.byId(43)).toEqual([
        { title: "Even when there is many things to test" },
        LOADED,
        null,
      ]);
    });

    it("updates the entity with the given id with a value returned by the resolver", async () => {
      const todos = new Cache<Todo>("todo");

      await todos.loadMany([42, 43], () =>
        Promise.resolve([
          { title: "Remember to test" },
          { title: "Even when there is many things to test" },
        ]),
      );

      expect(todos.byId(42)).toEqual([
        { title: "Remember to test" },
        LOADED,
        null,
      ]);

      expect(todos.byId(43)).toEqual([
        { title: "Even when there is many things to test" },
        LOADED,
        null,
      ]);
    });
  });

  describe("initialize", () => {
    it("sets the status to loading while resolving", () => {
      const fakePromise = new FakePromise<Todo>();

      todos.initialize(42, () => fakePromise as Promise<Todo>);

      const [todo, status, error] = todos.byId(42);
      expect(todo).toEqual(null);
      expect(status).toEqual(LOADING);
      expect(error).toEqual(null);
    });

    it("updates the entity with the given id with a value", async () => {
      await todos.initialize(42, { title: "Remember to test" });

      const [todo, status, error] = todos.byId(42);

      expect(todo).toEqual({ title: "Remember to test" });
      expect(status).toEqual(LOADED);
      expect(error).toEqual(null);
    });

    it("updates the entity with the given id with a value returned by the resolver", async () => {
      const todos = new Cache<Todo>("todo");

      await todos.initialize(42, () => ({
        title: "Remember to test",
      }));

      const [todo, status, error] = todos.byId(42);

      expect(todo).toEqual({ title: "Remember to test" });
      expect(status).toEqual(LOADED);
      expect(error).toEqual(null);
    });

    it("reloads failed values", async () => {
      const fakePromise = new FakePromise<Todo>();

      const todos = new Cache<Todo>("todo");

      const initializePromise = todos.initialize(
        42,
        () => fakePromise as Promise<Todo>,
      );
      fakePromise.reject(new Error("Failed"));
      await initializePromise;

      let result = todos.byId(42);

      expect(result[0]).toEqual(null);
      expect(result[1]).toEqual(FAILED);
      expect(result[2]).toMatchObject({ message: "Failed" });

      await todos.initialize(42, { title: "Remember to test" });

      result = todos.byId(42);

      expect(result[0]).toEqual({ title: "Remember to test" });
      expect(result[1]).toEqual(LOADED);
      expect(result[2]).toEqual(null);
    });

    it("ignores re-initializing", async () => {
      const todos = new Cache<Todo>("todo");

      await todos.initialize(42, {
        title: "Remember to test",
      });

      await todos.initialize(42, {
        title: "This is an update",
      });

      const [todo, status, error] = todos.byId(42);

      expect(todo).toEqual({ title: "Remember to test" });
      expect(status).toEqual(LOADED);
      expect(error).toEqual(null);
    });
  });

  describe("evict", () => {
    it("removes the value from the cache", async () => {
      await todos.load(42, () =>
        Promise.resolve({ title: "Remember to test" }),
      );

      todos.evict(42);

      const [todo, status, error] = todos.byId(42);

      expect(todo).toEqual(null);
      expect(status).toEqual(UNINITIALIZED);
      expect(error).toEqual(null);
    });
  });

  describe("clear", () => {
    it("removes all values from the cache", async () => {
      await todos.load(42, () => ({
        title: "Remember to test",
      }));

      todos.clear();

      const [todo, status, error] = todos.byId(42);

      expect(todo).toEqual(null);
      expect(status).toEqual(UNINITIALIZED);
      expect(error).toEqual(null);
    });
  });
});
