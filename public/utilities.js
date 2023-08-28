// Some basic utilities

TemplateCache = null
if (false && this.caches) {
    this.caches.open('templates')
        .then(function(cache) { TemplateCache = cache })
        .catch(console.error)
}

CustomTemplateCache = { }

PreloadTemplates()

function IsSecure() {
    const protocol = window.location.protocol
    return (protocol === 'https:')
}

/**
 * @param {string} htmlString
 */
function CreateElement(htmlString) {
    const div = document.createElement(htmlString.startsWith('<tr') ? 'tbody' : 'div')
    div.innerHTML = htmlString
    const result = div.firstElementChild
    if (!result) { throw new Error(`Failed to create element: "${htmlString}"`) }
    return result
}

/**
 * @param {string} name
 * @param {any} values
 */
async function TemplateAsync(name, values) {
    const url = '/templates/' + name + '.hbs'

    /** @type {string | null} */
    let hbs = null

    console.log(`[Handlebars]: Loading template "${name}" ...`)

    if (TemplateCache) {    
        try {
            const cached = await TemplateCache.match(url)
            if (cached) {
                hbs = await cached.text()
            }
        } catch (error) {
            console.error(error)
        }
    }

    if (!hbs) {
        const storedTemplateData = CustomTemplateCache[name]
        if (storedTemplateData) {
            hbs = storedTemplateData
        }
    }

    if (!hbs) {
        console.log(`[Handlebars]: Downloading template "${name}" ...`)

        const res = await fetch(new URL(window.location.origin + url))
    
        if (TemplateCache) {
            TemplateCache.put(new URL(window.location.origin + url), res)
        }
    
        hbs = await res.text()
    
        CustomTemplateCache[name] = hbs
        
        console.log(`[Handlebars]: Template "${name}" downloaded`)
    }

    const html = Handlebars.compile(hbs)(values)
    
    console.log(`[Handlebars]: Template "${name}" loaded`)
    return CreateElement(html)
}

/**
 * @param {string} id
 */
function TryGetElement(id) { return document.getElementById(id) }

/**
 * @param {string} id
 */
function GetElement(id) {
    const element = TryGetElement(id)
    if (!element)
    { throw new Error(`Element with id "${id}" not found`) }
    return element
}

/**
 * @param {string} id
 */
function GetImageElement(id) {
    const element = TryGetElement(id)
    if (!element)
    { throw new Error(`Element with id "${id}" not found`) }
    if (element.tagName.toLowerCase() !== 'img')
    { throw new Error(`Element with id "${id}" is not <img>`) }
    return element
}

/**
 * @param {string} id
 */
function TryGetInputElement(id) {
    const elements = document.getElementsByTagName('input')
    return elements.namedItem(id)
}

/**
 * @param {string} id
 */
function GetInputElement(id) {
    const element =  TryGetInputElement(id)
    if (!element)
    { throw new Error(`Element with id "${id}" not found`) }
    return element
}

/**
 * @param {Element} element
 */
function ClearElement(element) { if (!element) return; while (element.lastChild) { element.removeChild(element.lastChild) } }

/**
 * @author Angelos Chalaris
 * @link https://www.30secondsofcode.org/js/s/levenshtein-distance
 * @param {string} s
 * @param {string} t
 */
function LevenshteinDistance(s, t) {
    if (!s) return t.length
    if (!t) return s.length
    const arr = []
    for (let i = 0; i <= t.length; i++) {
      arr[i] = [i]
      for (let j = 1; j <= s.length; j++) {
        arr[i][j] =
          i === 0
            ? j
            : Math.min(
                arr[i - 1][j] + 1,
                arr[i][j - 1] + 1,
                arr[i - 1][j - 1] + (s[j - 1] === t[i - 1] ? 0 : 1)
              )
      }
    }
    return arr[t.length][s.length]
}

/**
 * @param {string} v
 */
function NormalizeString(v) { return v.trim().toLowerCase().replace(/\s+/g, ' ') }

/**
 * @param {string} a
 * @param {string} b
 * @param {number} maxDifference Must be larger than -1
 * @returns True if `b` is contained in `a` by the specified maximum difference
 */
function CompareString(a, b, maxDifference, trueIfBEmpty = false) {
    if (NormalizeString(b).length === 0 && trueIfBEmpty) return true
    if (maxDifference < 0) { throw new Error('CompareString parameter error: maxDifference must be larger than -1') }
    if (NormalizeString(a).includes(NormalizeString(b))) return true
    if (LevenshteinDistance(NormalizeString(a), NormalizeString(b)) <= maxDifference) return true
    return false
}
