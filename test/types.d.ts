declare module "fake-promise" {
  export class FakePromise<T = unknown> implements Promise<T> {
    constructor();
    resolve(value: T): void;
    reject(reason: any): void;
    then<TResult1 = T, TResult2 = never>(
      onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined,
      onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined,
    ): Promise<TResult1 | TResult2>;
    catch<TResult = never>(
      onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined,
    ): Promise<T | TResult>;
    finally(onfinally?: (() => void) | null | undefined): Promise<T>;
    readonly [Symbol.toStringTag]: string;
    static reject(reason: any): FakePromise<never>;
  }
}
