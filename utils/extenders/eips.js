export async function process(db, _) {
    const authors = {}
    const $ = await _.loadHtmlUrl("https://eips.ethereum.org/all")
    for (const el of $('table.eiptable tr').toArray()) {
        const eipnum = $('td.eipnum a', el).text()
        for (const a of $('td.author', el).text().split(', ')) {
            if (!a) {
                continue
            }
            if (!authors[a]) {
                authors[a] = []
            }
            authors[a].push(eipnum)
        }
    }

    const matrix = []

    for (const a of Object.keys(authors)) {
        const info = {}

        // name
        const nameMatch = a.match(/^([^<^\()]+)/)
        if (!nameMatch) {
            console.log(`Bad name? ${a}`)
        }
        info.name = nameMatch[1].trim()

        // github handle
        const ghMatch = a.match(/\(@([^\)]+)\)/)
        if (ghMatch) {
            info.github = ghMatch[1]
        }
        // email
        const emailMatch = a.match(/<([^>]+)>/)
        if (emailMatch) {
            info.email = emailMatch[1]
        }
        //console.log(`${a} - ${JSON.stringify(info)}`)

        const dbFind = db.collections.people.find(p => {
            if (info.github && p.index.links?.github?.toLowerCase() === `https://github.com/${info.github.toLowerCase()}`) {
                return true
            }
            if (info.email && p.index.emails?.includes(info.email)) {
                return true
            }
        })
        if (dbFind) {
            let matrixItem = matrix.find(mi => mi.slug === dbFind.index.slug)
            if (!matrixItem) {
                matrixItem = {
                    slug: dbFind.index.slug,
                    info,
                    eips: [],
                }
                matrix.push(matrixItem)
            }
            matrixItem.eips = matrixItem.eips.concat(authors[a]).sort()
        } else {
            matrix.push({
                slug: null,
                info,
                eips: authors[a]
            })
        }
        //console.log(`${info.name} -> ${dbFind ? dbFind.index.slug : 'x'}`)
    }
    //console.log(matrix)

    // finishing, modify or create people

    for (const p of matrix) {
        if (p.slug) {
            console.log(`${p.info.name} => ${p.slug} (auto)`)
            continue
        }
        const duplicates = []

        console.log(`-----\n${p.info.name} (${JSON.stringify(p)})\n`)
        prompt("Do you want to create new one?")
    }
}