// Tianshu (天枢 / rivet harness) keeps the model it starts on in
// ~/.rivet/config.json, in two keys together: provider.default names the
// provider, and agent.defaultModel is "<providerKey>:<modelId>", where the
// model id must be one of that provider's own models. So magpie's model
// goes in under a provider of its own, "magpie", whose baseUrl is the
// gateway's /v1, and agent.defaultModel is that provider key and the id,
// which is what this module's prefix puts before it.
//
// A model's capacity is kept as rivet names it (contextWindow, maxTokens,
// supportsVision), not as magpie hands it over (context, output, images):
// a model magpie knows nothing about keeps its id alone, rather than a
// made-up capacity.
export const agent = {
  id: "tianshu",
  name: "Tianshu",
  // Tianshu's own command, which its installer puts on PATH
  // (~/…/tianshu-harness/dist/cli/entry.js behind a symlink). A plugin
  // must not name its config folder here to be detected: that folder is
  // evidence of the agent's settings, not of the agent.
  bin: "tianshu",
  config: "~/.rivet/config.json",
  format: "json",
  // magpie writes "magpie:" + its model id, as rivet's own setting spells it
  model: "agent.defaultModel",
  prefix: "magpie:",
  // usage names Tianshu's requests by these words of its User-Agent
  // (rivet sends "Tianshu/1.0 (terminal coding agent)…")
  ua: ["tianshu", "rivet"],
  notice:
    "Tianshu reads its config when a session starts: restart Tianshu or open a new session. 天枢在新的会话读取配置：重启天枢或新开会话后生效。",
  // No library: rivet's global skills are ~/.agents/skills and
  // ~/.rivet/skills, and ~/.agents/skills is already the Library's own
  // source, so the two share it. Naming ~/.rivet/skills here would
  // register the same skill twice.
  // No mcp: "tianshu" is not one of the MCP formats magpie can write, and
  // rivet's servers live under mcp.servers in this same file, in a shape
  // of their own.
};

export function connect({ gateway, models }) {
  // A gateway without either half wires Tianshu to nothing, and its config
  // would be left pointing at nothing: fail before writing rather than after.
  if (!gateway || typeof gateway.v1 !== "string" || !gateway.v1) throw new Error("Magpie's gateway has no /v1 address to give Tianshu.");
  if (typeof gateway.key !== "string" || !gateway.key) throw new Error("Magpie's gateway has no key to give Tianshu.");

  // The provider is written whole, so every model magpie offers is listed
  // again: a model picked in Tianshu since is one of magpie's own.
  const list = (Array.isArray(models) ? models : [])
    .filter((m) => m && typeof m.id === "string" && m.id)
    .map((m) => {
      const entry = { id: m.id };
      // keep only what magpie knows, as rivet's own names for it
      if (Number.isInteger(m.context) && m.context > 0) entry.contextWindow = m.context;
      if (Number.isInteger(m.output) && m.output > 0) entry.maxTokens = m.output;
      if (m.images === true) entry.supportsVision = true;
      return entry;
    });

  const provider = {
    name: "magpie",
    baseUrl: gateway.v1,
    protocol: "openai",
    apiKey: gateway.key,
    // no models rather than an empty list, which rivet reads as a provider
    // that can serve nothing
    ...(list.length ? { models: list } : {}),
  };

  return {
    "provider.default": "magpie",
    "provider.providers.magpie": provider,
  };
}
