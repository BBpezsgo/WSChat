(function() {
    Handlebars.registerHelper('json', function(value) {
        return JSON.stringify(value)
    })
    
    Handlebars.registerHelper('readablejson', function(value) {
        return JSON.stringify(value, null, ' ').replace(/\n/g, '<br/>').replace(/ /g, '&nbsp;')
    })

    Handlebars.registerHelper('time', function(value) {
        if (typeof value !== 'number') {
            return JSON.stringify(value)
        }
        const date = new Date(value)

        const Num2 = function(/** @type {number} */ n) { return n.toString().padStart(2, '0') }

        return `${Num2(date.getHours())}:${Num2(date.getMinutes())}`
    })

    Handlebars.registerHelper('datetime', function(value) {
        if (typeof value !== 'number') {
            return JSON.stringify(value)
        }
        const date = new Date(value)

        const Num2 = function(/** @type {number} */ n) { return n.toString().padStart(2, '0') }

        return `${date.getFullYear()}.${date.getMonth()+1}.${date.getDate()} ${Num2(date.getHours())}:${Num2(date.getMinutes())}`
    })

    Handlebars.registerHelper('switch', function(value, options) {
        this.switch_value = value
        return options.fn(this)
    })

    Handlebars.registerHelper('case', function(value, options) {
        // @ts-ignore
        if (value == this.switch_value) {
            // @ts-ignore
            return options.fn(this)
        }
    })

    Handlebars.registerHelper('default', function(options) {
        // @ts-ignore
        return options.fn(this)
    })
    
    console.log(`[Handlebars]: Helpers registered`)
})()