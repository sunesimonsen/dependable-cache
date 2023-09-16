import { Cache } from "../src/Cache.js";
import { expect } from "./expect.js";
import { FakePromise } from "fake-promise";

describe("Cache", () => {
  let todos;

  beforeEach(() => {
    todos = new Cache("todo");
  });

  describe("constructor", () => {
    it("creates a new entity cache with the given name", () => {
      const [todo, status, error] = todos.byId(42);

      expect(todo, "to equal", null);
      expect(status, "to equal", "uninitialized");
      expect(error, "to equal", null);
    });
  });

  describe("byId", () => {
    describe("when the entity isn't loaded", () => {
      it("returns an uninitialised entry", () => {
        const [todo, status, error] = todos.byId(42);

        expect(todo, "to equal", null);
        expect(status, "to equal", "uninitialized");
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
        expect(status, "to equal", "loaded");
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
          expect(status, "to equal", "failed");
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
        expect(status, "to equal", "failed");
        expect(error, "to equal", err);
      });
    });
  });

  describe("load", () => {
    it("sets the status to loading while resolving", () => {
      const fakePromise = new FakePromise();

      todos.load(42, () => fakePromise);

      const [todo, status, error] = todos.byId(42);
      expect(todo, "to equal", null);
      expect(status, "to equal", "loading");
      expect(error, "to equal", null);
    });

    it("updates the entity with the given id with a value", async () => {
      await todos.load(42, { title: "Remember to test" });

      const [todo, status, error] = todos.byId(42);

      expect(todo, "to equal", { title: "Remember to test" });
      expect(status, "to equal", "loaded");
      expect(error, "to equal", null);
    });

    it("updates the entity with the given id with a value returned by the resolver", async () => {
      const todos = new Cache("todo");

      await todos.load(42, () => ({
        title: "Remember to test",
      }));

      const [todo, status, error] = todos.byId(42);

      expect(todo, "to equal", { title: "Remember to test" });
      expect(status, "to equal", "loaded");
      expect(error, "to equal", null);
    });
  });

  describe("loadMany", () => {
    it("sets the status to loading while resolving", () => {
      const fakePromise = new FakePromise();

      todos.loadMany([42, 43], () => fakePromise);

      expect(todos.byId(42), "to equal", [null, "loading", null]);
      expect(todos.byId(43), "to equal", [null, "loading", null]);
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
        "loaded",
        null,
      ]);

      expect(todos.byId(43), "to equal", [
        { title: "Even when there is many things to test" },
        "loaded",
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
        "loaded",
        null,
      ]);

      expect(todos.byId(43), "to equal", [
        { title: "Even when there is many things to test" },
        "loaded",
        null,
      ]);
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
      expect(status, "to satisfy", "uninitialized");
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
      expect(status, "to satisfy", "uninitialized");
      expect(error, "to satisfy", null);
    });
  });
});
