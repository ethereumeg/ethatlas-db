export async function process(db, _) {
  const authors = {};
  const $ = await _.loadHtmlUrl("https://eips.ethereum.org/all");
  for (const el of $("table.eiptable tr").toArray()) {
    const eipnum = Number($("td.eipnum a", el).text());
    for (const a of $("td.author", el).text().split(", ")) {
      if (!a) {
        continue;
      }
      if (!authors[a]) {
        authors[a] = [];
      }
      authors[a].push(eipnum);
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
          eips: [],
        };
        matrix.push(matrixItem);
      }
      matrixItem.eips = matrixItem.eips.concat(authors[a]).sort();
    } else {
      matrix.push({
        slug: null,
        info,
        eips: authors[a],
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
      for (const eip of p.eips) {
        if (!eipsComplete[eip]) {
          const resp = await _.loadUrl(
            `https://raw.githubusercontent.com/ethereum/EIPs/master/EIPS/eip-${eip}.md`,
          );
          const respData = resp.split("---");
          const eipData = _.yaml.parse(respData[1]);
          eipsComplete[eip] = eipData;
        }
      }
      await Deno.writeTextFile(
        [dbItem.path, "eips.json"].join("/"),
        JSON.stringify({ eips: p.eips.sort((x, y) => x > y ? 1 : -1) }, null, 2),
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

    await db.itemCreate(
      "people",
      _.slugify(p.info.name).toLowerCase().replace(".", ""),
      person,
    );
  }

  const output = {
    eips: Object.values(eipsComplete),
  };
  Deno.writeTextFile("./static/eips.json", JSON.stringify(output, null, 2));
}
