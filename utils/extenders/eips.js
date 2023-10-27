export async function process(db, _) {
  async function processEIPArchive(type, url, fn, extractDir) {
    const command = new Deno.Command("bash", {
      args: [
        "-c",
        `rm -f ${fn} .cache/${extractDir} && mkdir -p .cache && cd .cache && wget -O ${fn} ${url} && unzip -o ${fn}`,
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await command.output();
    //console.log(new TextDecoder().decode(stdout), new TextDecoder().decode(stderr))

    const dir = [".cache", extractDir].join("/");
    const arr = [];

    for await (const de of Deno.readDir(dir)) {
      if (!de.name.match(/^(erc|eip)-(\d+)\.md$/)) {
        continue;
      }
      const text = await Deno.readTextFile([dir, de.name].join("/"));
      const respData = text.split("---");
      const data = _.yaml.parse(respData[1]);
      if (data.status === "Moved") {
        continue;
      }
      arr.push(data);
    }
    return arr;
  }

  const output = {
    eips: await processEIPArchive(
      "eips",
      "https://github.com/ethereum/EIPs/archive/refs/heads/master.zip",
      "eips.zip",
      "EIPs-master/EIPS",
    ),
    ercs: await processEIPArchive(
      "ercs",
      "https://github.com/ethereum/ERCs/archive/refs/heads/master.zip",
      "ercs.zip",
      "ERCs-master/ERCS",
    ),
  };

  const both = output.eips.concat(output.ercs);

  const authors = {};
  for (const item of both) {
    for (const a of item.author.split(", ")) {
      if (!a) {
        continue;
      }
      if (!authors[a]) {
        authors[a] = {
          eips: [],
          ercs: [],
        };
      }
      authors[a][item.category === "ERC" ? "ercs" : "eips"].push(item.eip);
    }
  }

  const matrix = [];

  for (const a of Object.keys(authors)) {
    const info = {};

    // name
    const nameMatch = a.match(/^([^<^\()]+)/);
    if (!nameMatch) {
      console.log(`Bad name? ${a}`);
    }
    info.name = nameMatch[1].trim();

    if (info.name === "et al." || info.name === "Portal Network Team") {
      continue;
    }

    // github handle
    const ghMatch = a.match(/\(@([^\)]+)\)/);
    if (ghMatch) {
      info.github = ghMatch[1];
    }
    // email
    const emailMatch = a.match(/<([^>]+)>/);
    if (emailMatch) {
      info.email = emailMatch[1];
    }
    //console.log(`${a} - ${JSON.stringify(info)}`)

    const dbFind = db.collections.people.find((p) => {
      if (
        info.github &&
        p.index.links?.github?.toLowerCase() ===
          `https://github.com/${info.github.toLowerCase()}`
      ) {
        return true;
      }
      if (info.email && p.index.emails?.includes(info.email)) {
        return true;
      }
      if (p.index.eipname === info.name) {
        return true;
      }
    });
    if (dbFind) {
      let matrixItem = matrix.find((mi) => mi.slug === dbFind.index.slug);
      if (!matrixItem) {
        matrixItem = {
          slug: dbFind.index.slug,
          info,
          eips: authors[a].eips,
          ercs: authors[a].ercs,
        };
        matrix.push(matrixItem);
      }
    } else {
      matrix.push({
        slug: null,
        info,
        eips: authors[a].eips,
        ercs: authors[a].ercs,
      });
    }
    //console.log(`${info.name} -> ${dbFind ? dbFind.index.slug : 'x'}`)
  }
  //console.log(matrix)

  // finishing, modify or create people

  const eipsComplete = {};

  for (const p of matrix) {
    if (p.slug) {
      console.log(`${p.info.name} => ${p.slug} (auto)`);
      const dbItem = db.collections.people.find((pi) =>
        pi.index.slug === p.slug
      );
      await Deno.writeTextFile(
        [dbItem.path, "eips.json"].join("/"),
        JSON.stringify(
          {
            eips: p.eips.length === 0
              ? undefined
              : p.eips.sort((x, y) => x > y ? 1 : -1),
            ercs: p.ercs.length === 0
              ? undefined
              : p.ercs.sort((x, y) => x > y ? 1 : -1),
          },
          null,
          2,
        ),
      );
      continue;
    }
    const duplicates = [];
    //console.log(p.info.name)

    //console.log(`-----\n${p.info.name} (${JSON.stringify(p)})\n`)
    //prompt("Do you want to create new one?")
    const person = {
      name: p.info.name,
    };
    if (p.info.github) {
      person.links = { github: "https://github.com/" + p.info.github };
    }
    if (p.info.email) {
      person.emails = [p.info.email];
    }

    try {
      await db.itemCreate(
        "people",
        _.slugify(p.info.name).toLowerCase().replace(".", ""),
        person,
      );
    } catch (e) {
      console.log(p);
      throw e;
    }
  }

  Deno.writeTextFile("./static/eips.json", JSON.stringify(output, null, 2));
}
