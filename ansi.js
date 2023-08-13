const ESC = '\x1b['

module.exports = {
    FG: {
        Black: ESC + 30 + 'm',
        Red: ESC + 31 + 'm',
        Green: ESC + 32 + 'm',
        Yellow: ESC + 33 + 'm',
        Blue: ESC + 34 + 'm',
        Magenta: ESC + 35 + 'm',
        Cyan: ESC + 36 + 'm',
        Silver: ESC + 37 + 'm',
        Gray: ESC + 90 + 'm',
        BrightRed: ESC + 91 + 'm',
        BrightGreen: ESC + 92 + 'm',
        BrightYellow: ESC + 93 + 'm',
        BrightBlue: ESC + 94 + 'm',
        BrightMagenta: ESC + 95 + 'm',
        BrightCyan: ESC + 96 + 'm',
        White: ESC + 97 + 'm',
    },
    BG: {
        Black: ESC + 40 + 'm',
        Red: ESC + 41 + 'm',
        Green: ESC + 42 + 'm',
        Yellow: ESC + 43 + 'm',
        Blue: ESC + 44 + 'm',
        Magenta: ESC + 45 + 'm',
        Cyan: ESC + 46 + 'm',
        Silver: ESC + 47 + 'm',
        Gray: ESC + 100 + 'm',
        BrightRed: ESC + 101 + 'm',
        BrightGreen: ESC + 102 + 'm',
        BrightYellow: ESC + 103 + 'm',
        BrightBlue: ESC + 104 + 'm',
        BrightMagenta: ESC + 105 + 'm',
        BrightCyan: ESC + 106 + 'm',
        White: ESC + 107 + 'm',
    },
    RESET: ESC + 0 + 'm',
    /** Italic */
    I: ESC + 3 + 'm',
    /** Bold */
    B: ESC + 1 + 'm',
    /** Underline */
    U: ESC + 4 + 'm',
    /** Strikeout */
    S: ESC + 9 + 'm',
}