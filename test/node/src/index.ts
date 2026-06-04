import data from "./data.json" with { type: "json" };
import type { FixtureName } from "./types.ts";

const name: FixtureName = data.name;

console.log(name);
