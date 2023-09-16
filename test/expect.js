import unexpected from "unexpected";
import unexpectedDependable from "unexpected-dependable";

export const expect = unexpected.clone().use(unexpectedDependable);
