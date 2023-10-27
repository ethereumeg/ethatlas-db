export async function process(db, _) {
  const output = { members: [] };
  const md = await _.loadUrl(
    "https://raw.githubusercontent.com/protocolguild/docs/outline/docs/9-membership.md",
  );
  const pattern = /\|\s*(.*?)\s*\|\s*\[(.*?)\]\((.*?)\)\s*\|/g;
  let match;
  while (match = pattern.exec(md)) {
    let [__, team, name, link] = match;
    //console.log(`Team: ${team}, Name: ${name}, Link: ${link}`);
    team = team.replace(/^\| /, "");

    let person = db.collections.people.find((p) => {
      //console.log(Object.keys(p.index.links).filter(k => k.match(/^github:?/)).map(k => p.index.links[k]))
      if (
        p.index.links &&
        Object.keys(p.index.links).filter((k) => k.match(/^github:?/)).map(
          (k) => p.index.links[k].toLowerCase(),
        ).includes(link.toLowerCase())
      ) {
        return true;
      } else if (p.index.pgname && p.index.pgname === name) {
        return true;
      }
    });
    if (!person) {
      try {
        person = await db.itemCreate(
          "people",
          _.slugify(name).toLowerCase().replace(".", ""),
          { name, links: { github: link } },
        );
      } catch (e) {
        console.log({ name, link });
        throw e;
      }
      console.log(`${name} not exists!`);
    } else {
      console.log(`${name} => ${person.index.slug} (auto)`);
    }
    await Deno.writeTextFile(
      [person.path, "protocol-guild.json"].join("/"),
      JSON.stringify({ protocolGuild: { member: true, team } }, null, 2),
    );

    output.members.push({ team, name, link, eegslug: person.index.slug });
  }
  Deno.writeTextFile(
    "./static/protocol-guild.json",
    JSON.stringify(output, null, 2),
  );
}
