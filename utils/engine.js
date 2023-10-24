import * as yaml from "https://deno.land/std@0.204.0/yaml/mod.ts";
import * as path from "https://deno.land/std@0.204.0/path/mod.ts";
import { emptyDir } from "https://deno.land/std@0.204.0/fs/empty_dir.ts";
import { ensureDir } from "https://deno.land/std@0.204.0/fs/ensure_dir.ts";
import { exists } from "https://deno.land/std@0.204.0/fs/exists.ts";
import Ajv from "https://esm.sh/ajv@8.8.1?pin=v58";
import addFormats from "https://esm.sh/ajv-formats@2.1.1";

const CONFIG_DEFAULTS = {
  dataDir: "./data",
  schemaDir: "./schema",
  outputDir: "./dist",
};

export default class Engine {
  constructor(params) {
    this.params = params || {};
    if (!this.params.cwd) {
      this.params.cwd = Deno.cwd();
    }
    this.schemas = {};
    this.collections = {};
  }

  async init() {
    // load config
    this.config = Object.assign(
      CONFIG_DEFAULTS,
      await _yamlLoad(this.path("config.yaml")),
    );

    // load models
    for (const modelId in this.config.models) {
      const modelParams = this.config.models[modelId];
      const schema = await _yamlLoad(
        this.path(this.config.schemaDir, `${modelId}.yaml`),
      );
      this.schemas[modelId] = schema;
    }

    // load collections
    for (const colId in this.config.collections) {
      const colParams = this.config.collections[colId];
      const arr = [];
      const colDir = this.path(this.config.dataDir, colId);
      for await (const entry of Deno.readDir(colDir)) {
        const item = await this.itemLoad(
          colId,
          path.join(colDir, entry.name),
          entry.name,
        );
        if (item) {
          arr.push(item);
        }
      }
      this.collections[colId] = arr;
    }

    console.log(`db loaded: ${this.path()}`);
    //console.log(`models: ${Object.keys(this.config.models).join(', ')}`)
  }

  async itemLoad(colId, dir, dirName) {
    // load index
    const indexFn = path.join(dir, "index.yaml");

    if (!await exists(indexFn)) {
      return null;
    }

    const indexBase = await _yamlLoad(indexFn);

    // extensions
    async function eegid() {
      const eegFn = path.join(dir, "eegid");
      if (!await exists(eegFn)) {
        return undefined;
      }
      return Deno.readTextFile(eegFn);
    }

    // generic extensions
    const generic = {};
    for await (const entry of Deno.readDir(dir)) {
      if (entry.name.match(/\.json$/)) {
        Object.assign(
          generic,
          JSON.parse(await Deno.readTextFile(path.join(dir, entry.name))),
        );
      }
    }

    // return item
    return {
      path: dir,
      index: Object.assign({
        eegid: await eegid(),
        slug: dirName,
      }, indexBase),
      generic,
    };
  }

  async itemCreate(colId, slug, index) {
    const dir = this.path(this.config.dataDir, colId, slug);
    const indexFn = path.join(dir, "index.yaml");
    if (await exists(indexFn)) {
      throw Error(`Item exists!: ${dir}`);
    }
    await ensureDir(dir);
    await Deno.writeTextFile(indexFn, yaml.stringify(index));
  }

  path(...paths) {
    return path.join(this.params.cwd, ...paths);
  }

  async cmd_test() {
    const ajv = new Ajv({ strict: false });
    addFormats(ajv);

    // check collections
    for (const colId in this.collections) {
      const modelId = this.config.collections[colId].model;
      const validator = modelId ? ajv.compile(this.schemas[modelId]) : null;
      const colData = this.collections[colId];
      for (const item of this.collections[colId]) {
        Deno.test(`${colId}:${item.index.slug}`, () => {
          if (validator) {
            const valid = validator(item.index);
            if (!valid) {
              throw validator.errors;
            }
          }
        });
      }
    }
  }

  async cmd_build() {
    console.log("Building ..");

    const data = {};
    for (const colId in this.collections) {
      const arr = [];
      for (const item of this.collections[colId]) {
        arr.push(Object.assign(item.index, item.generic));
      }
      data[colId] = arr;
    }
    await emptyDir(this.path(this.config.outputDir));
    const bundleFn = this.path(this.config.outputDir, "bundle.json");

    const output = {
      data,
      time: new Date(),
    };
    await Deno.writeTextFile(bundleFn, JSON.stringify(output, null, 2));
    console.log(`File written: ${bundleFn}`);

    console.log("Done");
  }
}

async function _yamlLoad(fn) {
  return yaml.parse(await Deno.readTextFile(fn));
}
