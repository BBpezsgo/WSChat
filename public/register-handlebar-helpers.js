(async function() {
    console.log(`[Handlebars]: Downloading informations ...`)

    const helpersScript = await GetAsync('/utils/handlebar-helpers.js')
    const partialsJson = await GetAsync('/utils/handlebar-partials.json')

    console.log(`[Handlebars]: Informations downloaded`)

    eval(helpersScript)

    /** @type {string[]} */
    const partials = JSON.parse(partialsJson)

    for (const partial of partials) {
        Handlebars.registerPartial(partial, function(value) {
            let content = null

            if (CustomTemplateCache) {
                content = CustomTemplateCache[partial]
            }

            if (!content) {
                content = Get('/templates/' + partial + '.hbs')
            }
            
            if (CustomTemplateCache) {
                CustomTemplateCache[partial] = content
            }

            return Handlebars.compile(content)(value)
        })
    }
    
    console.log(`[Handlebars]: Partials registered: ${partials.length}`)
    console.log(`[Handlebars]: Currently registered partials: ${Object.keys(Handlebars.partials).length}`)
})()

function PreloadTemplates() {
    const preloadTemplates = [
        'sending_message',
    ]

    console.log(`[Handlebars]: Predownloading ${preloadTemplates.length} templates ...`)

    for (const preloadTempalte of preloadTemplates) {
        GetAsync('/templates/' + preloadTempalte + '.hbs')
            .then(result => { CustomTemplateCache[preloadTempalte] = result })
            .catch(console.error)
    }
}
