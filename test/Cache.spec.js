import { computed, flush } from "@dependable/state";
import { Cache, LOADED, LOADING, UNINITIALIZED, FAILED } from "../src/Cache.js";
import { expect } from "./expect.js";
import { FakePromise } from "fake-promise";

const delay = (timeout = 0) =>
  new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });

describe("Cache", () => {
  let todos;

  beforeEach(() => {
    todos = new Cache("todo");
  });

  describe("constructor", () => {
    describe("when given a name", () => {
      it("creates a new entity cache with the given name", () => {
        const todos = new Cache("todo");
        expect(todos._cache.id, "to be", "todoCache");
        expect(todos._cache.kind, "to be", "observable");
      });
    });

    describe("when not given a name", () => {
      it("creates a new anonymous entity cache", () => {
        const todos = new Cache();
        expect(todos._cache.id, "to be undefined");
        expect(todos._cache.kind, "to be", "observable");
      });
    });
  });

  describe("byId", () => {
    describe("when the entity isn't loaded", () => {
      it("returns an uninitialised entry", () => {
        const [todo, status, error] = todos.byId(42);

        expect(todo, "to equal", null);
        expect(status, "to equal", UNINITIALIZED);
        expect(error, "to equal", null);
      });
    });

    describe("when the entity is loaded", () => {
      beforeEach(async () => {
        await todos.load(42, { title: "Remember to test" });
      });

      it("returns an initialised entry", () => {
        const [todo, status, error] = todos.byId(42);

        expect(todo, "to equal", { title: "Remember to test" });
        expect(status, "to equal", LOADED);
        expect(error, "to equal", null);
      });

      describe("and a reload is failing", () => {
        const err = new Error("custom error");

        beforeEach(async () => {
          await todos.load(42, { title: "Remember to test" });
          await todos.load(42, () => FakePromise.reject(err));
        });

        it("returns a failed state, together with the current data", () => {
          const [todo, status, error] = todos.byId(42);

          expect(todo, "to equal", { title: "Remember to test" });
          expect(status, "to equal", FAILED);
          expect(error, "to equal", err);
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

        expect(todo, "to equal", null);
        expect(status, "to equal", FAILED);
        expect(error, "to equal", err);
      });
    });

    it("triggers updates to computeds", async () => {
      const fakePromise = new FakePromise();

      const wired = computed(() => todos.byId(42));

      const values = [];
      wired.subscribe(() => {
        values.push(wired());
      });

      todos.load(42, () => fakePromise);

      flush();

      fakePromise.resolve({
        title: "Remember to test",
      });

      await delay();
      flush();

      expect(values, "to equal", [
        [null, "LOADING", null],
        [{ title: "Remember to test" }, "LOADED", null],
      ]);

      expect(wired(), "to equal", [
        { title: "Remember to test" },
        "LOADED",
        null,
      ]);
    });
  });

  describe("statusById", () => {
    describe("when the entity isn't loaded", () => {
      it("returns UNINITIALIZED", () => {
        const status = todos.statusById(42);

        expect(status, "to equal", UNINITIALIZED);
      });
    });

    describe("when the entity is loaded", () => {
      beforeEach(async () => {
        await todos.load(42, { title: "Remember to test" });
      });

      it("returns LOADED", () => {
        const status = todos.statusById(42);

        expect(status, "to equal", LOADED);
      });

      describe("and a reload is failing", () => {
        const err = new Error("custom error");

        beforeEach(async () => {
          await todos.load(42, { title: "Remember to test" });
          await todos.load(42, () => FakePromise.reject(err));
        });

        it("returns FAILED", () => {
          const status = todos.statusById(42);

          expect(status, "to equal", FAILED);
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

        expect(status, "to equal", FAILED);
      });
    });

    it("triggers updates to computeds", async () => {
      const fakePromise = new FakePromise();

      const wired = computed(() => todos.statusById(42));

      const values = [];
      wired.subscribe(() => {
        values.push(wired());
      });

      todos.load(42, () => fakePromise);

      flush();

      fakePromise.resolve({
        title: "Remember to test",
      });

      await delay();
      flush();

      expect(values, "to equal", ["LOADING", "LOADED"]);

      expect(wired(), "to equal", "LOADED");
    });
  });

  describe("load", () => {
    it("sets the status to loading while resolving", () => {
      const fakePromise = new FakePromise();

      todos.load(42, () => fakePromise);

      const [todo, status, error] = todos.byId(42);
      expect(todo, "to equal", null);
      expect(status, "to equal", LOADING);
      expect(error, "to equal", null);
    });

    it("updates the entity with the given id with a value", async () => {
      await todos.load(42, { title: "Remember to test" });

      const [todo, status, error] = todos.byId(42);

      expect(todo, "to equal", { title: "Remember to test" });
      expect(status, "to equal", LOADED);
      expect(error, "to equal", null);
    });

    it("updates the entity with the given id with a value returned by the resolver", async () => {
      const todos = new Cache("todo");

      await todos.load(42, () => ({
        title: "Remember to test",
      }));

      const [todo, status, error] = todos.byId(42);

      expect(todo, "to equal", { title: "Remember to test" });
      expect(status, "to equal", LOADED);
      expect(error, "to equal", null);
    });

    it("allows re-loading a value", async () => {
      const todos = new Cache("todo");

      await todos.load(42, () => ({
        title: "Remember to test",
      }));

      await todos.load(42, () => ({
        title: "This is updated",
      }));

      const [todo, status, error] = todos.byId(42);

      expect(todo, "to equal", { title: "This is updated" });
      expect(status, "to equal", LOADED);
      expect(error, "to equal", null);
    });
  });

  describe("loadMany", () => {
    it("sets the status to loading while resolving", () => {
      const fakePromise = new FakePromise();

      todos.loadMany([42, 43], () => fakePromise);

      expect(todos.byId(42), "to equal", [null, LOADING, null]);
      expect(todos.byId(43), "to equal", [null, LOADING, null]);
    });

    it("updates the entity with the given id with a value", async () => {
      await todos.loadMany(
        [42, 43],
        [
          { title: "Remember to test" },
          { title: "Even when there is many things to test" },
        ],
      );

      expect(todos.byId(42), "to equal", [
        { title: "Remember to test" },
        LOADED,
        null,
      ]);

      expect(todos.byId(43), "to equal", [
        { title: "Even when there is many things to test" },
        LOADED,
        null,
      ]);
    });

    it("updates the entity with the given id with a value returned by the resolver", async () => {
      const todos = new Cache("todo");

      await todos.loadMany([42, 43], () =>
        Promise.resolve([
          { title: "Remember to test" },
          { title: "Even when there is many things to test" },
        ]),
      );

      expect(todos.byId(42), "to equal", [
        { title: "Remember to test" },
        LOADED,
        null,
      ]);

      expect(todos.byId(43), "to equal", [
        { title: "Even when there is many things to test" },
        LOADED,
        null,
      ]);
    });
  });

  describe("initialize", () => {
    it("sets the status to loading while resolving", () => {
      const fakePromise = new FakePromise();

      todos.initialize(42, () => fakePromise);

      const [todo, status, error] = todos.byId(42);
      expect(todo, "to equal", null);
      expect(status, "to equal", LOADING);
      expect(error, "to equal", null);
    });

    it("updates the entity with the given id with a value", async () => {
      await todos.initialize(42, { title: "Remember to test" });

      const [todo, status, error] = todos.byId(42);

      expect(todo, "to equal", { title: "Remember to test" });
      expect(status, "to equal", LOADED);
      expect(error, "to equal", null);
    });

    it("updates the entity with the given id with a value returned by the resolver", async () => {
      const todos = new Cache("todo");

      await todos.initialize(42, () => ({
        title: "Remember to test",
      }));

      const [todo, status, error] = todos.byId(42);

      expect(todo, "to equal", { title: "Remember to test" });
      expect(status, "to equal", LOADED);
      expect(error, "to equal", null);
    });

    it("ignores re-initializing", async () => {
      const todos = new Cache("todo");

      await todos.initialize(42, {
        title: "Remember to test",
      });

      await todos.initialize(42, {
        title: "This is an update",
      });

      const [todo, status, error] = todos.byId(42);

      expect(todo, "to equal", { title: "Remember to test" });
      expect(status, "to equal", LOADED);
      expect(error, "to equal", null);
    });
  });

  describe("evict", () => {
    it("removes the value from the cache", async () => {
      await todos.load(42, () =>
        Promise.resolve({ title: "Remember to test" }),
      );

      todos.evict(42);

      const [todo, status, error] = todos.byId(42);

      expect(todo, "to satisfy", null);
      expect(status, "to satisfy", UNINITIALIZED);
      expect(error, "to satisfy", null);
    });
  });

  describe("clear", () => {
    it("removes all values from the cache", async () => {
      await todos.load(42, () => ({
        title: "Remember to test",
      }));

      todos.clear();

      const [todo, status, error] = todos.byId(42);

      expect(todo, "to satisfy", null);
      expect(status, "to satisfy", UNINITIALIZED);
      expect(error, "to satisfy", null);
    });
  });
});
