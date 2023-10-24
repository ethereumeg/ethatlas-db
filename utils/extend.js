import Engine from "./engine.js";
import cheerio from "npm:cheerio@1.0.0-rc.12";
import { ensureDir, exists } from "https://deno.land/std@0.173.0/fs/mod.ts";

const e = new Engine();
await e.init();

const CACHE_DIR = "./.cache";

const tools = {
    async loadHtmlUrl(url) {
        await ensureDir(CACHE_DIR);
        const hash = Array.from(
            new Uint8Array(
            await crypto.subtle.digest("SHA-256", (new TextEncoder()).encode(url)),
            ),
        ).map((b) => b.toString(16).padStart(2, "0")).join("");
        const cacheFn = `${CACHE_DIR}/${hash}`;
        
        if (await exists(cacheFn)) {
            console.log(`Cache found! ${hash}`);
            return cheerio.load(await Deno.readTextFile(cacheFn));
        }
        
        console.log(`Getting ${url}`);
        const resp = await fetch(url, {
            headers: {
            "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15",
            },
        });
        const output = await resp.text();
        await Deno.writeTextFile(cacheFn, output);
        return cheerio.load(output);
    }
}

for (const extId in e.config.extenders) {
    console.log(`Running extender: ${extId}`)
    const ext = await import(`./extenders/${extId}.js`)
    await ext.process(e, tools)
}

console.log(`Extending done`)