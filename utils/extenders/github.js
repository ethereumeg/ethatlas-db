
export async function process(db, _) {
    for (const p of db.collections.people) {
        if (!p.index.links?.github) {
            continue
        }
        //console.log(p.index.links.github)
        const username = p.index.links.github.match(/^https?:\/\/github.com\/(.+)\/?$/)[1]
        const data = await _.loadUrl(`https://api.github.com/users/${username}`, {
            headers: {
                "Authorization": `Bearer ${Deno.env.get('GH_TOKEN')}`
            }
        });
        const g = JSON.parse(data)

        const output = {
          github: {
            id: g.id,
            name: g.name,
            company: g.company,
            blog: g.blog,
            location: g.location,
            email: g.email,
            bio: g.bio,
            twitterUsername: g.twitter_username,
            publicRepos: g.public_repos,
            publicGists: g.public_gists,
            followers: g.followers,
            following: g.following,
            createdAt: g.created_at,
          }
        }
        await Deno.writeTextFile(
          [p.path, "github.json"].join("/"),
          JSON.stringify(output, null, 2),
        );
        console.log(`${p.index.name} - updated`)
    }
}