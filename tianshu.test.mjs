import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { agent, connect } from "./tianshu.agent.js";

const gateway = { url: "http://127.0.0.1:3425", v1: "http://127.0.0.1:3425/v1", key: "magpie-tianshu" };

test("says where Tianshu keeps its model", () => {
  assert.equal(agent.id, "tianshu");
  assert.equal(agent.config, "~/.rivet/config.json");
  assert.equal(agent.format, "json");
  assert.equal(agent.model, "agent.defaultModel");
  assert.equal(agent.prefix, "magpie:");
});

test("is detected by Tianshu's own command, not by its config folder", () => {
  // agent.dir would make magpie take ~/.rivet for an install on its own;
  // the folder is where Tianshu keeps its settings, not evidence it is here
  assert.equal(agent.bin, "tianshu");
  assert.equal(agent.dir, undefined);
});

test("names Tianshu's requests in usage by its User-Agent", () => {
  assert.deepEqual(agent.ua, ["tianshu", "rivet"]);
});

test("the package declares this module as its agent, and gives its own picture", async () => {
  const pkg = await readFile(new URL("./package.json", import.meta.url), "utf8").then(JSON.parse);
  assert.equal(pkg.magpie.agent, "./tianshu.agent.js");
  // a plugin installed from a path has no package name for the market to
  // match, so its icon has to come from the package itself
  assert.match(pkg.magpie.icon, /^data:image\/png;base64,/);
  assert.deepEqual(pkg.files.filter((f) => /\.m?js$/.test(f)), ["tianshu.agent.js"]);
  assert.equal(pkg.main, undefined);
  assert.equal(pkg.dependencies, undefined);
});

test("points Tianshu at magpie as an OpenAI-compatible provider", () => {
  assert.deepEqual(connect({ gateway, models: [] }), {
    "provider.default": "magpie",
    "provider.providers.magpie": {
      name: "magpie",
      baseUrl: "http://127.0.0.1:3425/v1",
      protocol: "openai",
      apiKey: "magpie-tianshu",
    },
  });
});

test("keeps a model's capacity under rivet's names for it", () => {
  const out = connect({
    gateway,
    models: [{ id: "rylive/deepseek-flash", name: "DeepSeek Flash", context: 1000000, output: 393216, images: true, efforts: ["high", "max"] }],
  });
  assert.deepEqual(out["provider.providers.magpie"].models, [
    { id: "rylive/deepseek-flash", contextWindow: 1000000, maxTokens: 393216, supportsVision: true },
  ]);
});

test("writes no capacity it does not know", () => {
  const out = connect({ gateway, models: [{ id: "opaque/model" }] });
  assert.deepEqual(out["provider.providers.magpie"].models, [{ id: "opaque/model" }]);
});

test("a model magpie gives no capacity for is not written as zero", () => {
  // magpie fills a model it knows nothing about with 0s (#plugged.go), and
  // rivet reads 0 as no capacity budget at all
  const out = connect({ gateway, models: [{ id: "rylive/deepseek-flash", context: 0, output: 0, images: false }] });
  assert.deepEqual(out["provider.providers.magpie"].models, [{ id: "rylive/deepseek-flash" }]);
});

test("lists every model magpie offers again, since the provider is written whole", () => {
  const out = connect({
    gateway,
    models: [
      { id: "a/one", context: 1000, output: 100 },
      { id: "b/two", context: 2000, output: 200 },
    ],
  });
  assert.deepEqual(
    out["provider.providers.magpie"].models.map((m) => m.id),
    ["a/one", "b/two"],
  );
});

test("refuses to point Tianshu at a gateway it was given no address or key for", () => {
  assert.throws(() => connect({ gateway: { key: "k" }, models: [] }), /no \/v1 address/);
  assert.throws(() => connect({ gateway: { v1: "http://127.0.0.1:3425/v1" }, models: [] }), /no key/);
});
