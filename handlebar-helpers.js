/**
 * @param {Handlebars} handlebars
 */
module.exports = function(handlebars) {
    handlebars.registerHelper('json', function(value) {
        return JSON.stringify(value)
    })

    handlebars.registerHelper('time', function(value) {
        if (typeof value !== 'number') {
            return JSON.stringify(value)
        }
        const date = new Date(value)

        const Num2 = function(/** @type {number} */ n) { return n.toString().padStart(2, '0') }

        return `${Num2(date.getHours())}:${Num2(date.getMinutes())}`
    })

    handlebars.registerHelper('datetime', function(value) {
        if (typeof value !== 'number') {
            return JSON.stringify(value)
        }
        const date = new Date(value)

        const Num2 = function(/** @type {number} */ n) { return n.toString().padStart(2, '0') }

        return `${date.getFullYear()}.${date.getMonth()+1}.${date.getDate()} ${Num2(date.getHours())}:${Num2(date.getMinutes())}`
    })

    handlebars.registerHelper('switch', function(value, options) {
        this.switch_value = value
        return options.fn(this)
    })

    handlebars.registerHelper('case', function(value, options) {
        if (value == this.switch_value) {
            return options.fn(this)
        }
    })

    handlebars.registerHelper('default', function(options) {
        return options.fn(this)
    })
}