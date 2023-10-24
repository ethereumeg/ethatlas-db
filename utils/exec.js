import Engine from "./engine.js";

const e = new Engine();
await e.init();

const cmd = Deno.args[0] || "test";
const cmdFn = e[`cmd_${cmd}`];

if (!cmdFn) {
  console.error(`Command not found: ${cmd}`);
  Deno.exit(1);
}

await cmdFn.call(e);
