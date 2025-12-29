(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("util"), require("fs"), require("path"), require("https"));
	else if(typeof define === 'function' && define.amd)
		define("utils", ["util", "fs", "path", "https"], factory);
	else if(typeof exports === 'object')
		exports["utils"] = factory(require("util"), require("fs"), require("path"), require("https"));
	else
		root["utils"] = factory(root["util"], root["fs"], root["path"], root["https"]);
})(this, (__WEBPACK_EXTERNAL_MODULE__1024__, __WEBPACK_EXTERNAL_MODULE__2947__, __WEBPACK_EXTERNAL_MODULE__3911__, __WEBPACK_EXTERNAL_MODULE__6333__) => {
return /******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 65:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const strip = __webpack_require__(7096);
/**
 * @param {string} msg
 * @param {number} perLine
 */


module.exports = function (msg, perLine) {
  let lines = String(strip(msg) || '').split(/\r?\n/);
  if (!perLine) return lines.length;
  return lines.map(l => Math.ceil(l.length / perLine)).reduce((a, b) => a + b);
};

/***/ }),

/***/ 323:
/***/ ((module) => {

"use strict";


class DatePart {
  constructor({
    token,
    date,
    parts,
    locales
  }) {
    this.token = token;
    this.date = date || new Date();
    this.parts = parts || [this];
    this.locales = locales || {};
  }

  up() {}

  down() {}

  next() {
    const currentIdx = this.parts.indexOf(this);
    return this.parts.find((part, idx) => idx > currentIdx && part instanceof DatePart);
  }

  setTo(val) {}

  prev() {
    let parts = [].concat(this.parts).reverse();
    const currentIdx = parts.indexOf(this);
    return parts.find((part, idx) => idx > currentIdx && part instanceof DatePart);
  }

  toString() {
    return String(this.date);
  }

}

module.exports = DatePart;

/***/ }),

/***/ 405:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const color = __webpack_require__(1394);
const { cursor } = __webpack_require__(723);
const Prompt = __webpack_require__(4872);
const { clear, figures, style, wrap, entriesToDisplay } = __webpack_require__(1189);

/**
 * MultiselectPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Array} opts.choices Array of choice objects
 * @param {String} [opts.hint] Hint to display
 * @param {String} [opts.warn] Hint shown for disabled choices
 * @param {Number} [opts.max] Max choices
 * @param {Number} [opts.cursor=0] Cursor start position
 * @param {Number} [opts.optionsPerPage=10] Max options to display at once
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */
class MultiselectPrompt extends Prompt {
  constructor(opts={}) {
    super(opts);
    this.msg = opts.message;
    this.cursor = opts.cursor || 0;
    this.scrollIndex = opts.cursor || 0;
    this.hint = opts.hint || '';
    this.warn = opts.warn || '- This option is disabled -';
    this.minSelected = opts.min;
    this.showMinError = false;
    this.maxChoices = opts.max;
    this.instructions = opts.instructions;
    this.optionsPerPage = opts.optionsPerPage || 10;
    this.value = opts.choices.map((ch, idx) => {
      if (typeof ch === 'string')
        ch = {title: ch, value: idx};
      return {
        title: ch && (ch.title || ch.value || ch),
        description: ch && ch.description,
        value: ch && (ch.value === undefined ? idx : ch.value),
        selected: ch && ch.selected,
        disabled: ch && ch.disabled
      };
    });
    this.clear = clear('', this.out.columns);
    if (!opts.overrideRender) {
      this.render();
    }
  }

  reset() {
    this.value.map(v => !v.selected);
    this.cursor = 0;
    this.fire();
    this.render();
  }

  selected() {
    return this.value.filter(v => v.selected);
  }

  exit() {
    this.abort();
  }

  abort() {
    this.done = this.aborted = true;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  submit() {
    const selected = this.value
      .filter(e => e.selected);
    if (this.minSelected && selected.length < this.minSelected) {
      this.showMinError = true;
      this.render();
    } else {
      this.done = true;
      this.aborted = false;
      this.fire();
      this.render();
      this.out.write('\n');
      this.close();
    }
  }

  first() {
    this.cursor = 0;
    this.render();
  }

  last() {
    this.cursor = this.value.length - 1;
    this.render();
  }
  next() {
    this.cursor = (this.cursor + 1) % this.value.length;
    this.render();
  }

  up() {
    if (this.cursor === 0) {
      this.cursor = this.value.length - 1;
    } else {
      this.cursor--;
    }
    this.render();
  }

  down() {
    if (this.cursor === this.value.length - 1) {
      this.cursor = 0;
    } else {
      this.cursor++;
    }
    this.render();
  }

  left() {
    this.value[this.cursor].selected = false;
    this.render();
  }

  right() {
    if (this.value.filter(e => e.selected).length >= this.maxChoices) return this.bell();
    this.value[this.cursor].selected = true;
    this.render();
  }

  handleSpaceToggle() {
    const v = this.value[this.cursor];

    if (v.selected) {
      v.selected = false;
      this.render();
    } else if (v.disabled || this.value.filter(e => e.selected).length >= this.maxChoices) {
      return this.bell();
    } else {
      v.selected = true;
      this.render();
    }
  }

  toggleAll() {
    if (this.maxChoices !== undefined || this.value[this.cursor].disabled) {
      return this.bell();
    }

    const newSelected = !this.value[this.cursor].selected;
    this.value.filter(v => !v.disabled).forEach(v => v.selected = newSelected);
    this.render();
  }

  _(c, key) {
    if (c === ' ') {
      this.handleSpaceToggle();
    } else if (c === 'a') {
      this.toggleAll();
    } else {
      return this.bell();
    }
  }

  renderInstructions() {
    if (this.instructions === undefined || this.instructions) {
      if (typeof this.instructions === 'string') {
        return this.instructions;
      }
      return '\nInstructions:\n'
        + `    ${figures.arrowUp}/${figures.arrowDown}: Highlight option\n`
        + `    ${figures.arrowLeft}/${figures.arrowRight}/[space]: Toggle selection\n`
        + (this.maxChoices === undefined ? `    a: Toggle all\n` : '')
        + `    enter/return: Complete answer`;
    }
    return '';
  }

  renderOption(cursor, v, i, arrowIndicator) {
    const prefix = (v.selected ? color.green(figures.radioOn) : figures.radioOff) + ' ' + arrowIndicator + ' ';
    let title, desc;

    if (v.disabled) {
      title = cursor === i ? color.gray().underline(v.title) : color.strikethrough().gray(v.title);
    } else {
      title = cursor === i ? color.cyan().underline(v.title) : v.title;
      if (cursor === i && v.description) {
        desc = ` - ${v.description}`;
        if (prefix.length + title.length + desc.length >= this.out.columns
          || v.description.split(/\r?\n/).length > 1) {
          desc = '\n' + wrap(v.description, { margin: prefix.length, width: this.out.columns });
        }
      }
    }

    return prefix + title + color.gray(desc || '');
  }

  // shared with autocompleteMultiselect
  paginateOptions(options) {
    if (options.length === 0) {
      return color.red('No matches for this query.');
    }

    let { startIndex, endIndex } = entriesToDisplay(this.cursor, options.length, this.optionsPerPage);
    let prefix, styledOptions = [];

    for (let i = startIndex; i < endIndex; i++) {
      if (i === startIndex && startIndex > 0) {
        prefix = figures.arrowUp;
      } else if (i === endIndex - 1 && endIndex < options.length) {
        prefix = figures.arrowDown;
      } else {
        prefix = ' ';
      }
      styledOptions.push(this.renderOption(this.cursor, options[i], i, prefix));
    }

    return '\n' + styledOptions.join('\n');
  }

  // shared with autocomleteMultiselect
  renderOptions(options) {
    if (!this.done) {
      return this.paginateOptions(options);
    }
    return '';
  }

  renderDoneOrInstructions() {
    if (this.done) {
      return this.value
        .filter(e => e.selected)
        .map(v => v.title)
        .join(', ');
    }

    const output = [color.gray(this.hint), this.renderInstructions()];

    if (this.value[this.cursor].disabled) {
      output.push(color.yellow(this.warn));
    }
    return output.join(' ');
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);
    super.render();

    // print prompt
    let prompt = [
      style.symbol(this.done, this.aborted),
      color.bold(this.msg),
      style.delimiter(false),
      this.renderDoneOrInstructions()
    ].join(' ');
    if (this.showMinError) {
      prompt += color.red(`You must select a minimum of ${this.minSelected} choices.`);
      this.showMinError = false;
    }
    prompt += this.renderOptions(this.value);

    this.out.write(this.clear + prompt);
    this.clear = clear(prompt, this.out.columns);
  }
}

module.exports = MultiselectPrompt;


/***/ }),

/***/ 674:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.StyledString = void 0;
exports.style = style;
const constants_1 = __webpack_require__(6471);
const colors_1 = __webpack_require__(8564);
/**
 * @class StyledString
 * @description A class that extends string functionality with ANSI color and style options.
 * @summary StyledString provides methods to apply various ANSI color and style options to text strings.
 * It implements the ColorizeOptions interface and proxies native string methods to the underlying text.
 * This class allows for chaining of styling methods and easy application of colors and styles to text.
 *
 * @implements {ColorizeOptions}
 * @param {string} text - The initial text string to be styled.
 */
class StyledString {
    constructor(text) {
        this.text = text;
        // Basic colors
        Object.entries(constants_1.StandardForegroundColors).forEach(([name, code]) => {
            Object.defineProperty(this, name, {
                get: () => this.foreground(code),
            });
        });
        Object.entries(constants_1.BrightForegroundColors).forEach(([name, code]) => {
            Object.defineProperty(this, name, {
                get: () => this.foreground(code),
            });
        });
        // Background colors
        Object.entries(constants_1.StandardBackgroundColors).forEach(([name, code]) => {
            Object.defineProperty(this, name, {
                get: () => this.background(code),
            });
        });
        Object.entries(constants_1.BrightBackgroundColors).forEach(([name, code]) => {
            Object.defineProperty(this, name, {
                get: () => this.background(code),
            });
        });
        // Styles
        Object.entries(constants_1.styles).forEach(([name, code]) => {
            Object.defineProperty(this, name, {
                get: () => this.style(code),
            });
        });
    }
    /**
     * @description Clears all styling from the text.
     * @summary Removes all ANSI color and style codes from the text.
     * @return {StyledString} The StyledString instance with cleared styling.
     */
    clear() {
        this.text = (0, colors_1.clear)(this.text);
        return this;
    }
    /**
     * @description Applies raw ANSI codes to the text.
     * @summary Allows direct application of ANSI escape sequences to the text.
     * @param {string} rawAnsi - The raw ANSI escape sequence to apply.
     * @return {StyledString} The StyledString instance with the raw ANSI code applied.
     */
    raw(rawAnsi) {
        this.text = (0, colors_1.raw)(this.text, rawAnsi);
        return this;
    }
    /**
     * @description Applies a foreground color to the text.
     * @summary Sets the text color using ANSI color codes.
     * @param {number} n - The ANSI color code for the foreground color.
     * @return {StyledString} The StyledString instance with the foreground color applied.
     */
    foreground(n) {
        this.text = (0, colors_1.colorizeANSI)(this.text, n);
        return this;
    }
    /**
     * @description Applies a background color to the text.
     * @summary Sets the background color of the text using ANSI color codes.
     * @param {number} n - The ANSI color code for the background color.
     * @return {StyledString} The StyledString instance with the background color applied.
     */
    background(n) {
        this.text = (0, colors_1.colorizeANSI)(this.text, n, true);
        return this;
    }
    /**
     * @description Applies a text style to the string.
     * @summary Sets text styles such as bold, italic, or underline using ANSI style codes.
     * @param {number | string} n - The style code or key from the styles object.
     * @return {StyledString} The StyledString instance with the style applied.
     */
    style(n) {
        if (typeof n === "string" && !(n in constants_1.styles)) {
            console.warn(`Invalid style: ${n}`);
            return this;
        }
        this.text = (0, colors_1.applyStyle)(this.text, n);
        return this;
    }
    /**
     * @description Applies a 256-color foreground color to the text.
     * @summary Sets the text color using the extended 256-color palette.
     * @param {number} n - The color number from the 256-color palette.
     * @return {StyledString} The StyledString instance with the 256-color foreground applied.
     */
    color256(n) {
        this.text = (0, colors_1.colorize256)(this.text, n);
        return this;
    }
    /**
     * @description Applies a 256-color background color to the text.
     * @summary Sets the background color using the extended 256-color palette.
     * @param {number} n - The color number from the 256-color palette.
     * @return {StyledString} The StyledString instance with the 256-color background applied.
     */
    bgColor256(n) {
        this.text = (0, colors_1.colorize256)(this.text, n, true);
        return this;
    }
    /**
     * @description Applies an RGB foreground color to the text.
     * @summary Sets the text color using RGB values.
     * @param {number} r - The red component (0-255).
     * @param {number} g - The green component (0-255).
     * @param {number} b - The blue component (0-255).
     * @return {StyledString} The StyledString instance with the RGB foreground color applied.
     */
    rgb(r, g, b) {
        this.text = (0, colors_1.colorizeRGB)(this.text, r, g, b);
        return this;
    }
    /**
     * @description Applies an RGB background color to the text.
     * @summary Sets the background color using RGB values.
     * @param {number} r - The red component (0-255).
     * @param {number} g - The green component (0-255).
     * @param {number} b - The blue component (0-255).
     * @return {StyledString} The StyledString instance with the RGB background color applied.
     */
    bgRgb(r, g, b) {
        this.text = (0, colors_1.colorizeRGB)(this.text, r, g, b, true);
        return this;
    }
    /**
     * @description Converts the StyledString to a regular string.
     * @summary Returns the underlying text with all applied styling.
     * @return {string} The styled text as a regular string.
     */
    toString() {
        return this.text;
    }
}
exports.StyledString = StyledString;
/**
 * @description Applies styling to a given text string.
 * @summary This function takes a string and returns a StyledString object, which is an enhanced
 * version of the original string with additional methods for applying various ANSI color and style
 * options. It sets up a mapper object with methods for different styling operations and then
 * defines properties on the text string to make these methods accessible.
 *
 * @param {string[]} t  The input text to be styled.
 * @return {StyledString} A StyledString object with additional styling methods.
 *
 * @function style
 *
 * @memberOf StyledString
 */
function style(...t) {
    return new StyledString(t.join(" "));
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9zdHJpbmdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQXdoQkEsc0JBRUM7QUExaEJELDJDQU1xQjtBQUNyQixxQ0FPa0I7QUE2Q2xCOzs7Ozs7Ozs7R0FTRztBQUNILE1BQWEsWUFBWTtJQTZTdkIsWUFBWSxJQUFZO1FBQ3RCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLGVBQWU7UUFDZixNQUFNLENBQUMsT0FBTyxDQUFDLG9DQUF3QixDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtZQUNoRSxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUU7Z0JBQ2hDLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQzthQUNqQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sQ0FBQyxPQUFPLENBQUMsa0NBQXNCLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1lBQzlELE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRTtnQkFDaEMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO2FBQ2pDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsb0JBQW9CO1FBQ3BCLE1BQU0sQ0FBQyxPQUFPLENBQUMsb0NBQXdCLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1lBQ2hFLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRTtnQkFDaEMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO2FBQ2pDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUFDLE9BQU8sQ0FBQyxrQ0FBc0IsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7WUFDOUQsTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFO2dCQUNoQyxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7YUFDakMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7UUFFSCxTQUFTO1FBQ1QsTUFBTSxDQUFDLE9BQU8sQ0FBQyxrQkFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtZQUM5QyxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUU7Z0JBQ2hDLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQzthQUM1QixDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsS0FBSztRQUNILElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBQSxjQUFLLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdCLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0gsR0FBRyxDQUFDLE9BQWU7UUFDakIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFBLFlBQUcsRUFBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3BDLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0gsVUFBVSxDQUFDLENBQVM7UUFDbEIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFBLHFCQUFZLEVBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN2QyxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILFVBQVUsQ0FBQyxDQUFTO1FBQ2xCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBQSxxQkFBWSxFQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzdDLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0gsS0FBSyxDQUFDLENBQStCO1FBQ25DLElBQUksT0FBTyxDQUFDLEtBQUssUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksa0JBQU0sQ0FBQyxFQUFFLENBQUM7WUFDNUMsT0FBTyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNwQyxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFDRCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUEsbUJBQVUsRUFBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0gsUUFBUSxDQUFDLENBQVM7UUFDaEIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFBLG9CQUFXLEVBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0QyxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILFVBQVUsQ0FBQyxDQUFTO1FBQ2xCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBQSxvQkFBVyxFQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVDLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVEOzs7Ozs7O09BT0c7SUFDSCxHQUFHLENBQUMsQ0FBUyxFQUFFLENBQVMsRUFBRSxDQUFTO1FBQ2pDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBQSxvQkFBVyxFQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1QyxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRDs7Ozs7OztPQU9HO0lBQ0gsS0FBSyxDQUFDLENBQVMsRUFBRSxDQUFTLEVBQUUsQ0FBUztRQUNuQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUEsb0JBQVcsRUFBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2xELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxRQUFRO1FBQ04sT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ25CLENBQUM7Q0FDRjtBQW5jRCxvQ0FtY0M7QUFFRDs7Ozs7Ozs7Ozs7OztHQWFHO0FBQ0gsU0FBZ0IsS0FBSyxDQUFDLEdBQUcsQ0FBVztJQUNsQyxPQUFPLElBQUksWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUN2QyxDQUFDIiwiZmlsZSI6InN0cmluZ3MuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBCcmlnaHRCYWNrZ3JvdW5kQ29sb3JzLFxuICBCcmlnaHRGb3JlZ3JvdW5kQ29sb3JzLFxuICBTdGFuZGFyZEJhY2tncm91bmRDb2xvcnMsXG4gIFN0YW5kYXJkRm9yZWdyb3VuZENvbG9ycyxcbiAgc3R5bGVzLFxufSBmcm9tIFwiLi9jb25zdGFudHNcIjtcbmltcG9ydCB7XG4gIGNsZWFyLFxuICBjb2xvcml6ZTI1NixcbiAgY29sb3JpemVBTlNJLFxuICBjb2xvcml6ZVJHQixcbiAgcmF3LFxuICBhcHBseVN0eWxlLFxufSBmcm9tIFwiLi9jb2xvcnNcIjtcblxuLyoqXG4gKiBAdHlwZWRlZiBDb2xvcml6ZU9wdGlvbnNcbiAqIEBkZXNjcmlwdGlvbiBPcHRpb25zIGZvciB0ZXh0IGNvbG9yaXphdGlvbiB1c2luZyBBTlNJIGNvZGVzLlxuICogQHN1bW1hcnkgVGhpcyB0eXBlIGRlZmluZXMgdGhlIHN0cnVjdHVyZSBvZiB0aGUgb2JqZWN0IHJldHVybmVkIGJ5IHRoZSBjb2xvcml6ZSBmdW5jdGlvbi5cbiAqIEl0IGluY2x1ZGVzIG1ldGhvZHMgZm9yIGFwcGx5aW5nIHZhcmlvdXMgY29sb3IgYW5kIHN0eWxlIG9wdGlvbnMgdG8gdGV4dCB1c2luZyBBTlNJIGVzY2FwZSBjb2Rlcy5cbiAqXG4gKiBAcHJvcGVydHkge1N0eWxlZFN0cmluZ30gU3RhbmRhcmRGb3JlZ3JvdW5kQ29sb3JzIEdldHRlciBmb3IgZWFjaCBzdGFuZGFyZCBmb3JlZ3JvdW5kIGNvbG9yLlxuICogQHByb3BlcnR5IHtTdHlsZWRTdHJpbmd9IEJyaWdodEZvcmVncm91bmRDb2xvcnMgR2V0dGVyIGZvciBlYWNoIGJyaWdodCBmb3JlZ3JvdW5kIGNvbG9yLlxuICogQHByb3BlcnR5IHtTdHlsZWRTdHJpbmd9IFN0YW5kYXJkQmFja2dyb3VuZENvbG9ycyBHZXR0ZXIgZm9yIGVhY2ggc3RhbmRhcmQgYmFja2dyb3VuZCBjb2xvci5cbiAqIEBwcm9wZXJ0eSB7U3R5bGVkU3RyaW5nfSBCcmlnaHRCYWNrZ3JvdW5kQ29sb3JzIEdldHRlciBmb3IgZWFjaCBicmlnaHQgYmFja2dyb3VuZCBjb2xvci5cbiAqIEBwcm9wZXJ0eSB7U3R5bGVkU3RyaW5nfSBzdHlsZXMgR2V0dGVyIGZvciBlYWNoIHRleHQgc3R5bGUuXG4gKiBAcHJvcGVydHkge2Z1bmN0aW9uKCk6IFN0eWxlZFN0cmluZ30gY2xlYXIgUmVtb3ZlcyBhbGwgc3R5bGluZyBmcm9tIHRoZSB0ZXh0LlxuICogQHByb3BlcnR5IHtmdW5jdGlvbihzdHJpbmcpOiBTdHlsZWRTdHJpbmd9IHJhdyBBcHBsaWVzIHJhdyBBTlNJIGNvZGVzIHRvIHRoZSB0ZXh0LlxuICogQHByb3BlcnR5IHtmdW5jdGlvbihudW1iZXIpOiBTdHlsZWRTdHJpbmd9IGZvcmVncm91bmQgQXBwbGllcyBhIGZvcmVncm91bmQgY29sb3IgdXNpbmcgQU5TSSBjb2Rlcy5cbiAqIEBwcm9wZXJ0eSB7ZnVuY3Rpb24obnVtYmVyKTogU3R5bGVkU3RyaW5nfSBiYWNrZ3JvdW5kIEFwcGxpZXMgYSBiYWNrZ3JvdW5kIGNvbG9yIHVzaW5nIEFOU0kgY29kZXMuXG4gKiBAcHJvcGVydHkge2Z1bmN0aW9uKHN0cmluZyk6IFN0eWxlZFN0cmluZ30gc3R5bGUgQXBwbGllcyBhIHRleHQgc3R5bGUgdXNpbmcgQU5TSSBjb2Rlcy5cbiAqIEBwcm9wZXJ0eSB7ZnVuY3Rpb24obnVtYmVyKTogU3R5bGVkU3RyaW5nfSBjb2xvcjI1NiBBcHBsaWVzIGEgMjU2LWNvbG9yIGZvcmVncm91bmQgY29sb3IuXG4gKiBAcHJvcGVydHkge2Z1bmN0aW9uKG51bWJlcik6IFN0eWxlZFN0cmluZ30gYmdDb2xvcjI1NiBBcHBsaWVzIGEgMjU2LWNvbG9yIGJhY2tncm91bmQgY29sb3IuXG4gKiBAcHJvcGVydHkge2Z1bmN0aW9uKG51bWJlciwgbnVtYmVyLCBudW1iZXIpOiBTdHlsZWRTdHJpbmd9IHJnYiBBcHBsaWVzIGFuIFJHQiBmb3JlZ3JvdW5kIGNvbG9yLlxuICogQHByb3BlcnR5IHtmdW5jdGlvbihudW1iZXIsIG51bWJlciwgbnVtYmVyKTogU3R5bGVkU3RyaW5nfSBiZ1JnYiBBcHBsaWVzIGFuIFJHQiBiYWNrZ3JvdW5kIGNvbG9yLlxuICogQHByb3BlcnR5IHtzdHJpbmd9IHRleHQgVGhlIHVuZGVybHlpbmcgdGV4dCBjb250ZW50LlxuICpcbiAqIEBtZW1iZXJPZiBtb2R1bGU6U3R5bGVkU3RyaW5nXG4gKi9cbmV4cG9ydCB0eXBlIENvbG9yaXplT3B0aW9ucyA9IHtcbiAgW2sgaW4ga2V5b2YgdHlwZW9mIFN0YW5kYXJkRm9yZWdyb3VuZENvbG9yc106IFN0eWxlZFN0cmluZztcbn0gJiB7IFtrIGluIGtleW9mIHR5cGVvZiBCcmlnaHRGb3JlZ3JvdW5kQ29sb3JzXTogU3R5bGVkU3RyaW5nIH0gJiB7XG4gIFtrIGluIGtleW9mIHR5cGVvZiBTdGFuZGFyZEJhY2tncm91bmRDb2xvcnNdOiBTdHlsZWRTdHJpbmc7XG59ICYgeyBbayBpbiBrZXlvZiB0eXBlb2YgQnJpZ2h0QmFja2dyb3VuZENvbG9yc106IFN0eWxlZFN0cmluZyB9ICYge1xuICBbayBpbiBrZXlvZiB0eXBlb2Ygc3R5bGVzXTogU3R5bGVkU3RyaW5nO1xufSAmIHtcbiAgY2xlYXI6ICgpID0+IFN0eWxlZFN0cmluZztcbiAgcmF3OiAocmF3OiBzdHJpbmcpID0+IFN0eWxlZFN0cmluZztcbiAgZm9yZWdyb3VuZDogKG46IG51bWJlcikgPT4gU3R5bGVkU3RyaW5nO1xuICBiYWNrZ3JvdW5kOiAobjogbnVtYmVyKSA9PiBTdHlsZWRTdHJpbmc7XG4gIHN0eWxlOiAobjogbnVtYmVyIHwga2V5b2YgdHlwZW9mIHN0eWxlcykgPT4gU3R5bGVkU3RyaW5nO1xuICBjb2xvcjI1NjogKG46IG51bWJlcikgPT4gU3R5bGVkU3RyaW5nO1xuICBiZ0NvbG9yMjU2OiAobjogbnVtYmVyKSA9PiBTdHlsZWRTdHJpbmc7XG4gIHJnYjogKHI6IG51bWJlciwgZzogbnVtYmVyLCBiOiBudW1iZXIpID0+IFN0eWxlZFN0cmluZztcbiAgYmdSZ2I6IChyOiBudW1iZXIsIGc6IG51bWJlciwgYjogbnVtYmVyKSA9PiBTdHlsZWRTdHJpbmc7XG4gIHRleHQ6IHN0cmluZztcbn07XG5cbi8qKlxuICogQGNsYXNzIFN0eWxlZFN0cmluZ1xuICogQGRlc2NyaXB0aW9uIEEgY2xhc3MgdGhhdCBleHRlbmRzIHN0cmluZyBmdW5jdGlvbmFsaXR5IHdpdGggQU5TSSBjb2xvciBhbmQgc3R5bGUgb3B0aW9ucy5cbiAqIEBzdW1tYXJ5IFN0eWxlZFN0cmluZyBwcm92aWRlcyBtZXRob2RzIHRvIGFwcGx5IHZhcmlvdXMgQU5TSSBjb2xvciBhbmQgc3R5bGUgb3B0aW9ucyB0byB0ZXh0IHN0cmluZ3MuXG4gKiBJdCBpbXBsZW1lbnRzIHRoZSBDb2xvcml6ZU9wdGlvbnMgaW50ZXJmYWNlIGFuZCBwcm94aWVzIG5hdGl2ZSBzdHJpbmcgbWV0aG9kcyB0byB0aGUgdW5kZXJseWluZyB0ZXh0LlxuICogVGhpcyBjbGFzcyBhbGxvd3MgZm9yIGNoYWluaW5nIG9mIHN0eWxpbmcgbWV0aG9kcyBhbmQgZWFzeSBhcHBsaWNhdGlvbiBvZiBjb2xvcnMgYW5kIHN0eWxlcyB0byB0ZXh0LlxuICogXG4gKiBAaW1wbGVtZW50cyB7Q29sb3JpemVPcHRpb25zfVxuICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUaGUgaW5pdGlhbCB0ZXh0IHN0cmluZyB0byBiZSBzdHlsZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBTdHlsZWRTdHJpbmcgaW1wbGVtZW50cyBDb2xvcml6ZU9wdGlvbnMge1xuICAvKipcbiAgICogQGRlc2NyaXB0aW9uIEFwcGxpZXMgYmxhY2sgY29sb3IgdG8gdGhlIHRleHQuXG4gICAqIEBzdW1tYXJ5IEdldHRlciB0aGF0IHJldHVybnMgYSBuZXcgU3R5bGVkU3RyaW5nIHdpdGggYmxhY2sgZm9yZWdyb3VuZCBjb2xvci5cbiAgICovXG4gIGJsYWNrITogU3R5bGVkU3RyaW5nO1xuXG4gIC8qKlxuICAgKiBAZGVzY3JpcHRpb24gQXBwbGllcyByZWQgY29sb3IgdG8gdGhlIHRleHQuXG4gICAqIEBzdW1tYXJ5IEdldHRlciB0aGF0IHJldHVybnMgYSBuZXcgU3R5bGVkU3RyaW5nIHdpdGggcmVkIGZvcmVncm91bmQgY29sb3IuXG4gICAqL1xuICByZWQhOiBTdHlsZWRTdHJpbmc7XG5cbiAgLyoqXG4gICAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIGdyZWVuIGNvbG9yIHRvIHRoZSB0ZXh0LlxuICAgKiBAc3VtbWFyeSBHZXR0ZXIgdGhhdCByZXR1cm5zIGEgbmV3IFN0eWxlZFN0cmluZyB3aXRoIGdyZWVuIGZvcmVncm91bmQgY29sb3IuXG4gICAqL1xuICBncmVlbiE6IFN0eWxlZFN0cmluZztcblxuICAvKipcbiAgICogQGRlc2NyaXB0aW9uIEFwcGxpZXMgeWVsbG93IGNvbG9yIHRvIHRoZSB0ZXh0LlxuICAgKiBAc3VtbWFyeSBHZXR0ZXIgdGhhdCByZXR1cm5zIGEgbmV3IFN0eWxlZFN0cmluZyB3aXRoIHllbGxvdyBmb3JlZ3JvdW5kIGNvbG9yLlxuICAgKi9cbiAgeWVsbG93ITogU3R5bGVkU3RyaW5nO1xuXG4gIC8qKlxuICAgKiBAZGVzY3JpcHRpb24gQXBwbGllcyBibHVlIGNvbG9yIHRvIHRoZSB0ZXh0LlxuICAgKiBAc3VtbWFyeSBHZXR0ZXIgdGhhdCByZXR1cm5zIGEgbmV3IFN0eWxlZFN0cmluZyB3aXRoIGJsdWUgZm9yZWdyb3VuZCBjb2xvci5cbiAgICovXG4gIGJsdWUhOiBTdHlsZWRTdHJpbmc7XG5cbiAgLyoqXG4gICAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIG1hZ2VudGEgY29sb3IgdG8gdGhlIHRleHQuXG4gICAqIEBzdW1tYXJ5IEdldHRlciB0aGF0IHJldHVybnMgYSBuZXcgU3R5bGVkU3RyaW5nIHdpdGggbWFnZW50YSBmb3JlZ3JvdW5kIGNvbG9yLlxuICAgKi9cbiAgbWFnZW50YSE6IFN0eWxlZFN0cmluZztcblxuICAvKipcbiAgICogQGRlc2NyaXB0aW9uIEFwcGxpZXMgY3lhbiBjb2xvciB0byB0aGUgdGV4dC5cbiAgICogQHN1bW1hcnkgR2V0dGVyIHRoYXQgcmV0dXJucyBhIG5ldyBTdHlsZWRTdHJpbmcgd2l0aCBjeWFuIGZvcmVncm91bmQgY29sb3IuXG4gICAqL1xuICBjeWFuITogU3R5bGVkU3RyaW5nO1xuXG4gIC8qKlxuICAgKiBAZGVzY3JpcHRpb24gQXBwbGllcyB3aGl0ZSBjb2xvciB0byB0aGUgdGV4dC5cbiAgICogQHN1bW1hcnkgR2V0dGVyIHRoYXQgcmV0dXJucyBhIG5ldyBTdHlsZWRTdHJpbmcgd2l0aCB3aGl0ZSBmb3JlZ3JvdW5kIGNvbG9yLlxuICAgKi9cbiAgd2hpdGUhOiBTdHlsZWRTdHJpbmc7XG5cbiAgLyoqXG4gICAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIGJyaWdodCBibGFjayAoZ3JheSkgY29sb3IgdG8gdGhlIHRleHQuXG4gICAqIEBzdW1tYXJ5IEdldHRlciB0aGF0IHJldHVybnMgYSBuZXcgU3R5bGVkU3RyaW5nIHdpdGggYnJpZ2h0IGJsYWNrIGZvcmVncm91bmQgY29sb3IuXG4gICAqL1xuICBicmlnaHRCbGFjayE6IFN0eWxlZFN0cmluZztcblxuICAvKipcbiAgICogQGRlc2NyaXB0aW9uIEFwcGxpZXMgYnJpZ2h0IHJlZCBjb2xvciB0byB0aGUgdGV4dC5cbiAgICogQHN1bW1hcnkgR2V0dGVyIHRoYXQgcmV0dXJucyBhIG5ldyBTdHlsZWRTdHJpbmcgd2l0aCBicmlnaHQgcmVkIGZvcmVncm91bmQgY29sb3IuXG4gICAqL1xuICBicmlnaHRSZWQhOiBTdHlsZWRTdHJpbmc7XG5cbiAgLyoqXG4gICAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIGJyaWdodCBncmVlbiBjb2xvciB0byB0aGUgdGV4dC5cbiAgICogQHN1bW1hcnkgR2V0dGVyIHRoYXQgcmV0dXJucyBhIG5ldyBTdHlsZWRTdHJpbmcgd2l0aCBicmlnaHQgZ3JlZW4gZm9yZWdyb3VuZCBjb2xvci5cbiAgICovXG4gIGJyaWdodEdyZWVuITogU3R5bGVkU3RyaW5nO1xuXG4gIC8qKlxuICAgKiBAZGVzY3JpcHRpb24gQXBwbGllcyBicmlnaHQgeWVsbG93IGNvbG9yIHRvIHRoZSB0ZXh0LlxuICAgKiBAc3VtbWFyeSBHZXR0ZXIgdGhhdCByZXR1cm5zIGEgbmV3IFN0eWxlZFN0cmluZyB3aXRoIGJyaWdodCB5ZWxsb3cgZm9yZWdyb3VuZCBjb2xvci5cbiAgICovXG4gIGJyaWdodFllbGxvdyE6IFN0eWxlZFN0cmluZztcblxuICAvKipcbiAgICogQGRlc2NyaXB0aW9uIEFwcGxpZXMgYnJpZ2h0IGJsdWUgY29sb3IgdG8gdGhlIHRleHQuXG4gICAqIEBzdW1tYXJ5IEdldHRlciB0aGF0IHJldHVybnMgYSBuZXcgU3R5bGVkU3RyaW5nIHdpdGggYnJpZ2h0IGJsdWUgZm9yZWdyb3VuZCBjb2xvci5cbiAgICovXG4gIGJyaWdodEJsdWUhOiBTdHlsZWRTdHJpbmc7XG5cbiAgLyoqXG4gICAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIGJyaWdodCBtYWdlbnRhIGNvbG9yIHRvIHRoZSB0ZXh0LlxuICAgKiBAc3VtbWFyeSBHZXR0ZXIgdGhhdCByZXR1cm5zIGEgbmV3IFN0eWxlZFN0cmluZyB3aXRoIGJyaWdodCBtYWdlbnRhIGZvcmVncm91bmQgY29sb3IuXG4gICAqL1xuICBicmlnaHRNYWdlbnRhITogU3R5bGVkU3RyaW5nO1xuXG4gIC8qKlxuICAgKiBAZGVzY3JpcHRpb24gQXBwbGllcyBicmlnaHQgY3lhbiBjb2xvciB0byB0aGUgdGV4dC5cbiAgICogQHN1bW1hcnkgR2V0dGVyIHRoYXQgcmV0dXJucyBhIG5ldyBTdHlsZWRTdHJpbmcgd2l0aCBicmlnaHQgY3lhbiBmb3JlZ3JvdW5kIGNvbG9yLlxuICAgKi9cbiAgYnJpZ2h0Q3lhbiE6IFN0eWxlZFN0cmluZztcblxuICAvKipcbiAgICogQGRlc2NyaXB0aW9uIEFwcGxpZXMgYnJpZ2h0IHdoaXRlIGNvbG9yIHRvIHRoZSB0ZXh0LlxuICAgKiBAc3VtbWFyeSBHZXR0ZXIgdGhhdCByZXR1cm5zIGEgbmV3IFN0eWxlZFN0cmluZyB3aXRoIGJyaWdodCB3aGl0ZSBmb3JlZ3JvdW5kIGNvbG9yLlxuICAgKi9cbiAgYnJpZ2h0V2hpdGUhOiBTdHlsZWRTdHJpbmc7XG5cbiAgLyoqXG4gICAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIGJsYWNrIGJhY2tncm91bmQgY29sb3IgdG8gdGhlIHRleHQuXG4gICAqIEBzdW1tYXJ5IEdldHRlciB0aGF0IHJldHVybnMgYSBuZXcgU3R5bGVkU3RyaW5nIHdpdGggYmxhY2sgYmFja2dyb3VuZCBjb2xvci5cbiAgICovXG4gIGJnQmxhY2shOiBTdHlsZWRTdHJpbmc7XG5cbiAgLyoqXG4gICAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIHJlZCBiYWNrZ3JvdW5kIGNvbG9yIHRvIHRoZSB0ZXh0LlxuICAgKiBAc3VtbWFyeSBHZXR0ZXIgdGhhdCByZXR1cm5zIGEgbmV3IFN0eWxlZFN0cmluZyB3aXRoIHJlZCBiYWNrZ3JvdW5kIGNvbG9yLlxuICAgKi9cbiAgYmdSZWQhOiBTdHlsZWRTdHJpbmc7XG5cbiAgLyoqXG4gICAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIGdyZWVuIGJhY2tncm91bmQgY29sb3IgdG8gdGhlIHRleHQuXG4gICAqIEBzdW1tYXJ5IEdldHRlciB0aGF0IHJldHVybnMgYSBuZXcgU3R5bGVkU3RyaW5nIHdpdGggZ3JlZW4gYmFja2dyb3VuZCBjb2xvci5cbiAgICovXG4gIGJnR3JlZW4hOiBTdHlsZWRTdHJpbmc7XG5cbiAgLyoqXG4gICAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIHllbGxvdyBiYWNrZ3JvdW5kIGNvbG9yIHRvIHRoZSB0ZXh0LlxuICAgKiBAc3VtbWFyeSBHZXR0ZXIgdGhhdCByZXR1cm5zIGEgbmV3IFN0eWxlZFN0cmluZyB3aXRoIHllbGxvdyBiYWNrZ3JvdW5kIGNvbG9yLlxuICAgKi9cbiAgYmdZZWxsb3chOiBTdHlsZWRTdHJpbmc7XG5cbiAgLyoqXG4gICAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIGJsdWUgYmFja2dyb3VuZCBjb2xvciB0byB0aGUgdGV4dC5cbiAgICogQHN1bW1hcnkgR2V0dGVyIHRoYXQgcmV0dXJucyBhIG5ldyBTdHlsZWRTdHJpbmcgd2l0aCBibHVlIGJhY2tncm91bmQgY29sb3IuXG4gICAqL1xuICBiZ0JsdWUhOiBTdHlsZWRTdHJpbmc7XG5cbiAgLyoqXG4gICAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIG1hZ2VudGEgYmFja2dyb3VuZCBjb2xvciB0byB0aGUgdGV4dC5cbiAgICogQHN1bW1hcnkgR2V0dGVyIHRoYXQgcmV0dXJucyBhIG5ldyBTdHlsZWRTdHJpbmcgd2l0aCBtYWdlbnRhIGJhY2tncm91bmQgY29sb3IuXG4gICAqL1xuICBiZ01hZ2VudGEhOiBTdHlsZWRTdHJpbmc7XG5cbiAgLyoqXG4gICAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIGN5YW4gYmFja2dyb3VuZCBjb2xvciB0byB0aGUgdGV4dC5cbiAgICogQHN1bW1hcnkgR2V0dGVyIHRoYXQgcmV0dXJucyBhIG5ldyBTdHlsZWRTdHJpbmcgd2l0aCBjeWFuIGJhY2tncm91bmQgY29sb3IuXG4gICAqL1xuICBiZ0N5YW4hOiBTdHlsZWRTdHJpbmc7XG5cbiAgLyoqXG4gICAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIHdoaXRlIGJhY2tncm91bmQgY29sb3IgdG8gdGhlIHRleHQuXG4gICAqIEBzdW1tYXJ5IEdldHRlciB0aGF0IHJldHVybnMgYSBuZXcgU3R5bGVkU3RyaW5nIHdpdGggd2hpdGUgYmFja2dyb3VuZCBjb2xvci5cbiAgICovXG4gIGJnV2hpdGUhOiBTdHlsZWRTdHJpbmc7XG5cbiAgLyoqXG4gICAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIGJyaWdodCBibGFjayAoZ3JheSkgYmFja2dyb3VuZCBjb2xvciB0byB0aGUgdGV4dC5cbiAgICogQHN1bW1hcnkgR2V0dGVyIHRoYXQgcmV0dXJucyBhIG5ldyBTdHlsZWRTdHJpbmcgd2l0aCBicmlnaHQgYmxhY2sgYmFja2dyb3VuZCBjb2xvci5cbiAgICovXG4gIGJnQnJpZ2h0QmxhY2shOiBTdHlsZWRTdHJpbmc7XG5cbiAgLyoqXG4gICAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIGJyaWdodCByZWQgYmFja2dyb3VuZCBjb2xvciB0byB0aGUgdGV4dC5cbiAgICogQHN1bW1hcnkgR2V0dGVyIHRoYXQgcmV0dXJucyBhIG5ldyBTdHlsZWRTdHJpbmcgd2l0aCBicmlnaHQgcmVkIGJhY2tncm91bmQgY29sb3IuXG4gICAqL1xuICBiZ0JyaWdodFJlZCE6IFN0eWxlZFN0cmluZztcblxuICAvKipcbiAgICogQGRlc2NyaXB0aW9uIEFwcGxpZXMgYnJpZ2h0IGdyZWVuIGJhY2tncm91bmQgY29sb3IgdG8gdGhlIHRleHQuXG4gICAqIEBzdW1tYXJ5IEdldHRlciB0aGF0IHJldHVybnMgYSBuZXcgU3R5bGVkU3RyaW5nIHdpdGggYnJpZ2h0IGdyZWVuIGJhY2tncm91bmQgY29sb3IuXG4gICAqL1xuICBiZ0JyaWdodEdyZWVuITogU3R5bGVkU3RyaW5nO1xuXG4gIC8qKlxuICAgKiBAZGVzY3JpcHRpb24gQXBwbGllcyBicmlnaHQgeWVsbG93IGJhY2tncm91bmQgY29sb3IgdG8gdGhlIHRleHQuXG4gICAqIEBzdW1tYXJ5IEdldHRlciB0aGF0IHJldHVybnMgYSBuZXcgU3R5bGVkU3RyaW5nIHdpdGggYnJpZ2h0IHllbGxvdyBiYWNrZ3JvdW5kIGNvbG9yLlxuICAgKi9cbiAgYmdCcmlnaHRZZWxsb3chOiBTdHlsZWRTdHJpbmc7XG5cbiAgLyoqXG4gICAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIGJyaWdodCBibHVlIGJhY2tncm91bmQgY29sb3IgdG8gdGhlIHRleHQuXG4gICAqIEBzdW1tYXJ5IEdldHRlciB0aGF0IHJldHVybnMgYSBuZXcgU3R5bGVkU3RyaW5nIHdpdGggYnJpZ2h0IGJsdWUgYmFja2dyb3VuZCBjb2xvci5cbiAgICovXG4gIGJnQnJpZ2h0Qmx1ZSE6IFN0eWxlZFN0cmluZztcblxuICAvKipcbiAgICogQGRlc2NyaXB0aW9uIEFwcGxpZXMgYnJpZ2h0IG1hZ2VudGEgYmFja2dyb3VuZCBjb2xvciB0byB0aGUgdGV4dC5cbiAgICogQHN1bW1hcnkgR2V0dGVyIHRoYXQgcmV0dXJucyBhIG5ldyBTdHlsZWRTdHJpbmcgd2l0aCBicmlnaHQgbWFnZW50YSBiYWNrZ3JvdW5kIGNvbG9yLlxuICAgKi9cbiAgYmdCcmlnaHRNYWdlbnRhITogU3R5bGVkU3RyaW5nO1xuXG4gIC8qKlxuICAgKiBAZGVzY3JpcHRpb24gQXBwbGllcyBicmlnaHQgY3lhbiBiYWNrZ3JvdW5kIGNvbG9yIHRvIHRoZSB0ZXh0LlxuICAgKiBAc3VtbWFyeSBHZXR0ZXIgdGhhdCByZXR1cm5zIGEgbmV3IFN0eWxlZFN0cmluZyB3aXRoIGJyaWdodCBjeWFuIGJhY2tncm91bmQgY29sb3IuXG4gICAqL1xuICBiZ0JyaWdodEN5YW4hOiBTdHlsZWRTdHJpbmc7XG5cbiAgLyoqXG4gICAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIGJyaWdodCB3aGl0ZSBiYWNrZ3JvdW5kIGNvbG9yIHRvIHRoZSB0ZXh0LlxuICAgKiBAc3VtbWFyeSBHZXR0ZXIgdGhhdCByZXR1cm5zIGEgbmV3IFN0eWxlZFN0cmluZyB3aXRoIGJyaWdodCB3aGl0ZSBiYWNrZ3JvdW5kIGNvbG9yLlxuICAgKi9cbiAgYmdCcmlnaHRXaGl0ZSE6IFN0eWxlZFN0cmluZztcblxuICAvKipcbiAgICogQGRlc2NyaXB0aW9uIFJlc2V0cyBhbGwgc3R5bGluZyBhcHBsaWVkIHRvIHRoZSB0ZXh0LlxuICAgKiBAc3VtbWFyeSBHZXR0ZXIgdGhhdCByZXR1cm5zIGEgbmV3IFN0eWxlZFN0cmluZyB3aXRoIGFsbCBzdHlsaW5nIHJlc2V0LlxuICAgKi9cbiAgcmVzZXQhOiBTdHlsZWRTdHJpbmc7XG5cbiAgLyoqXG4gICAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIGJvbGQgc3R5bGUgdG8gdGhlIHRleHQuXG4gICAqIEBzdW1tYXJ5IEdldHRlciB0aGF0IHJldHVybnMgYSBuZXcgU3R5bGVkU3RyaW5nIHdpdGggYm9sZCBzdHlsZS5cbiAgICovXG4gIGJvbGQhOiBTdHlsZWRTdHJpbmc7XG5cbiAgLyoqXG4gICAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIGRpbSAoZGVjcmVhc2VkIGludGVuc2l0eSkgc3R5bGUgdG8gdGhlIHRleHQuXG4gICAqIEBzdW1tYXJ5IEdldHRlciB0aGF0IHJldHVybnMgYSBuZXcgU3R5bGVkU3RyaW5nIHdpdGggZGltIHN0eWxlLlxuICAgKi9cbiAgZGltITogU3R5bGVkU3RyaW5nO1xuXG4gIC8qKlxuICAgKiBAZGVzY3JpcHRpb24gQXBwbGllcyBpdGFsaWMgc3R5bGUgdG8gdGhlIHRleHQuXG4gICAqIEBzdW1tYXJ5IEdldHRlciB0aGF0IHJldHVybnMgYSBuZXcgU3R5bGVkU3RyaW5nIHdpdGggaXRhbGljIHN0eWxlLlxuICAgKi9cbiAgaXRhbGljITogU3R5bGVkU3RyaW5nO1xuXG4gIC8qKlxuICAgKiBAZGVzY3JpcHRpb24gQXBwbGllcyB1bmRlcmxpbmUgc3R5bGUgdG8gdGhlIHRleHQuXG4gICAqIEBzdW1tYXJ5IEdldHRlciB0aGF0IHJldHVybnMgYSBuZXcgU3R5bGVkU3RyaW5nIHdpdGggdW5kZXJsaW5lIHN0eWxlLlxuICAgKi9cbiAgdW5kZXJsaW5lITogU3R5bGVkU3RyaW5nO1xuXG4gIC8qKlxuICAgKiBAZGVzY3JpcHRpb24gQXBwbGllcyBibGlua2luZyBzdHlsZSB0byB0aGUgdGV4dC5cbiAgICogQHN1bW1hcnkgR2V0dGVyIHRoYXQgcmV0dXJucyBhIG5ldyBTdHlsZWRTdHJpbmcgd2l0aCBibGlua2luZyBzdHlsZS5cbiAgICovXG4gIGJsaW5rITogU3R5bGVkU3RyaW5nO1xuXG4gIC8qKlxuICAgKiBAZGVzY3JpcHRpb24gSW52ZXJ0cyB0aGUgZm9yZWdyb3VuZCBhbmQgYmFja2dyb3VuZCBjb2xvcnMgb2YgdGhlIHRleHQuXG4gICAqIEBzdW1tYXJ5IEdldHRlciB0aGF0IHJldHVybnMgYSBuZXcgU3R5bGVkU3RyaW5nIHdpdGggaW52ZXJ0ZWQgY29sb3JzLlxuICAgKi9cbiAgaW52ZXJzZSE6IFN0eWxlZFN0cmluZztcblxuICAvKipcbiAgICogQGRlc2NyaXB0aW9uIEhpZGVzIHRoZSB0ZXh0IChzYW1lIGNvbG9yIGFzIGJhY2tncm91bmQpLlxuICAgKiBAc3VtbWFyeSBHZXR0ZXIgdGhhdCByZXR1cm5zIGEgbmV3IFN0eWxlZFN0cmluZyB3aXRoIGhpZGRlbiB0ZXh0LlxuICAgKi9cbiAgaGlkZGVuITogU3R5bGVkU3RyaW5nO1xuXG4gIC8qKlxuICAgKiBAZGVzY3JpcHRpb24gQXBwbGllcyBzdHJpa2V0aHJvdWdoIHN0eWxlIHRvIHRoZSB0ZXh0LlxuICAgKiBAc3VtbWFyeSBHZXR0ZXIgdGhhdCByZXR1cm5zIGEgbmV3IFN0eWxlZFN0cmluZyB3aXRoIHN0cmlrZXRocm91Z2ggc3R5bGUuXG4gICAqL1xuICBzdHJpa2V0aHJvdWdoITogU3R5bGVkU3RyaW5nO1xuXG4gIC8qKlxuICAgKiBAZGVzY3JpcHRpb24gQXBwbGllcyBkb3VibGUgdW5kZXJsaW5lIHN0eWxlIHRvIHRoZSB0ZXh0LlxuICAgKiBAc3VtbWFyeSBHZXR0ZXIgdGhhdCByZXR1cm5zIGEgbmV3IFN0eWxlZFN0cmluZyB3aXRoIGRvdWJsZSB1bmRlcmxpbmUgc3R5bGUuXG4gICAqL1xuICBkb3VibGVVbmRlcmxpbmUhOiBTdHlsZWRTdHJpbmc7XG5cbiAgLyoqXG4gICAqIEBkZXNjcmlwdGlvbiBSZXNldHMgdGhlIHRleHQgY29sb3IgdG8gbm9ybWFsIGludGVuc2l0eS5cbiAgICogQHN1bW1hcnkgR2V0dGVyIHRoYXQgcmV0dXJucyBhIG5ldyBTdHlsZWRTdHJpbmcgd2l0aCBub3JtYWwgY29sb3IgaW50ZW5zaXR5LlxuICAgKi9cbiAgbm9ybWFsQ29sb3IhOiBTdHlsZWRTdHJpbmc7XG5cbiAgLyoqXG4gICAqIEBkZXNjcmlwdGlvbiBSZW1vdmVzIGl0YWxpYyBvciBmcmFrdHVyIHN0eWxlIGZyb20gdGhlIHRleHQuXG4gICAqIEBzdW1tYXJ5IEdldHRlciB0aGF0IHJldHVybnMgYSBuZXcgU3R5bGVkU3RyaW5nIHdpdGggaXRhbGljIG9yIGZyYWt0dXIgc3R5bGUgcmVtb3ZlZC5cbiAgICovXG4gIG5vSXRhbGljT3JGcmFrdHVyITogU3R5bGVkU3RyaW5nO1xuXG4gIC8qKlxuICAgKiBAZGVzY3JpcHRpb24gUmVtb3ZlcyB1bmRlcmxpbmUgc3R5bGUgZnJvbSB0aGUgdGV4dC5cbiAgICogQHN1bW1hcnkgR2V0dGVyIHRoYXQgcmV0dXJucyBhIG5ldyBTdHlsZWRTdHJpbmcgd2l0aCB1bmRlcmxpbmUgc3R5bGUgcmVtb3ZlZC5cbiAgICovXG4gIG5vVW5kZXJsaW5lITogU3R5bGVkU3RyaW5nO1xuXG4gIC8qKlxuICAgKiBAZGVzY3JpcHRpb24gUmVtb3ZlcyBibGlua2luZyBzdHlsZSBmcm9tIHRoZSB0ZXh0LlxuICAgKiBAc3VtbWFyeSBHZXR0ZXIgdGhhdCByZXR1cm5zIGEgbmV3IFN0eWxlZFN0cmluZyB3aXRoIGJsaW5raW5nIHN0eWxlIHJlbW92ZWQuXG4gICAqL1xuICBub0JsaW5rITogU3R5bGVkU3RyaW5nO1xuXG4gIC8qKlxuICAgKiBAZGVzY3JpcHRpb24gUmVtb3ZlcyBjb2xvciBpbnZlcnNpb24gZnJvbSB0aGUgdGV4dC5cbiAgICogQHN1bW1hcnkgR2V0dGVyIHRoYXQgcmV0dXJucyBhIG5ldyBTdHlsZWRTdHJpbmcgd2l0aCBjb2xvciBpbnZlcnNpb24gcmVtb3ZlZC5cbiAgICovXG4gIG5vSW52ZXJzZSE6IFN0eWxlZFN0cmluZztcblxuICAvKipcbiAgICogQGRlc2NyaXB0aW9uIFJlbW92ZXMgaGlkZGVuIHN0eWxlIGZyb20gdGhlIHRleHQuXG4gICAqIEBzdW1tYXJ5IEdldHRlciB0aGF0IHJldHVybnMgYSBuZXcgU3R5bGVkU3RyaW5nIHdpdGggaGlkZGVuIHN0eWxlIHJlbW92ZWQuXG4gICAqL1xuICBub0hpZGRlbiE6IFN0eWxlZFN0cmluZztcblxuICAvKipcbiAgICogQGRlc2NyaXB0aW9uIFJlbW92ZXMgc3RyaWtldGhyb3VnaCBzdHlsZSBmcm9tIHRoZSB0ZXh0LlxuICAgKiBAc3VtbWFyeSBHZXR0ZXIgdGhhdCByZXR1cm5zIGEgbmV3IFN0eWxlZFN0cmluZyB3aXRoIHN0cmlrZXRocm91Z2ggc3R5bGUgcmVtb3ZlZC5cbiAgICovXG4gIG5vU3RyaWtldGhyb3VnaCE6IFN0eWxlZFN0cmluZztcblxuICAvKipcbiAgICogQGRlc2NyaXB0aW9uIFRoZSB0ZXh0XG4gICAqIEBzdW1tYXJ5IFRoZSBzdHlsZWQgdGV4dCBhcyBhIHJlZ3VsYXIgc3RyaW5nLlxuICAgKi9cbiAgdGV4dCE6IHN0cmluZztcblxuICBjb25zdHJ1Y3Rvcih0ZXh0OiBzdHJpbmcpIHtcbiAgICB0aGlzLnRleHQgPSB0ZXh0O1xuICAgIC8vIEJhc2ljIGNvbG9yc1xuICAgIE9iamVjdC5lbnRyaWVzKFN0YW5kYXJkRm9yZWdyb3VuZENvbG9ycykuZm9yRWFjaCgoW25hbWUsIGNvZGVdKSA9PiB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgbmFtZSwge1xuICAgICAgICBnZXQ6ICgpID0+IHRoaXMuZm9yZWdyb3VuZChjb2RlKSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgT2JqZWN0LmVudHJpZXMoQnJpZ2h0Rm9yZWdyb3VuZENvbG9ycykuZm9yRWFjaCgoW25hbWUsIGNvZGVdKSA9PiB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgbmFtZSwge1xuICAgICAgICBnZXQ6ICgpID0+IHRoaXMuZm9yZWdyb3VuZChjb2RlKSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgLy8gQmFja2dyb3VuZCBjb2xvcnNcbiAgICBPYmplY3QuZW50cmllcyhTdGFuZGFyZEJhY2tncm91bmRDb2xvcnMpLmZvckVhY2goKFtuYW1lLCBjb2RlXSkgPT4ge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIG5hbWUsIHtcbiAgICAgICAgZ2V0OiAoKSA9PiB0aGlzLmJhY2tncm91bmQoY29kZSksXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIE9iamVjdC5lbnRyaWVzKEJyaWdodEJhY2tncm91bmRDb2xvcnMpLmZvckVhY2goKFtuYW1lLCBjb2RlXSkgPT4ge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIG5hbWUsIHtcbiAgICAgICAgZ2V0OiAoKSA9PiB0aGlzLmJhY2tncm91bmQoY29kZSksXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIC8vIFN0eWxlc1xuICAgIE9iamVjdC5lbnRyaWVzKHN0eWxlcykuZm9yRWFjaCgoW25hbWUsIGNvZGVdKSA9PiB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgbmFtZSwge1xuICAgICAgICBnZXQ6ICgpID0+IHRoaXMuc3R5bGUoY29kZSksXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAZGVzY3JpcHRpb24gQ2xlYXJzIGFsbCBzdHlsaW5nIGZyb20gdGhlIHRleHQuXG4gICAqIEBzdW1tYXJ5IFJlbW92ZXMgYWxsIEFOU0kgY29sb3IgYW5kIHN0eWxlIGNvZGVzIGZyb20gdGhlIHRleHQuXG4gICAqIEByZXR1cm4ge1N0eWxlZFN0cmluZ30gVGhlIFN0eWxlZFN0cmluZyBpbnN0YW5jZSB3aXRoIGNsZWFyZWQgc3R5bGluZy5cbiAgICovXG4gIGNsZWFyKCk6IFN0eWxlZFN0cmluZyB7XG4gICAgdGhpcy50ZXh0ID0gY2xlYXIodGhpcy50ZXh0KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBAZGVzY3JpcHRpb24gQXBwbGllcyByYXcgQU5TSSBjb2RlcyB0byB0aGUgdGV4dC5cbiAgICogQHN1bW1hcnkgQWxsb3dzIGRpcmVjdCBhcHBsaWNhdGlvbiBvZiBBTlNJIGVzY2FwZSBzZXF1ZW5jZXMgdG8gdGhlIHRleHQuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSByYXdBbnNpIC0gVGhlIHJhdyBBTlNJIGVzY2FwZSBzZXF1ZW5jZSB0byBhcHBseS5cbiAgICogQHJldHVybiB7U3R5bGVkU3RyaW5nfSBUaGUgU3R5bGVkU3RyaW5nIGluc3RhbmNlIHdpdGggdGhlIHJhdyBBTlNJIGNvZGUgYXBwbGllZC5cbiAgICovXG4gIHJhdyhyYXdBbnNpOiBzdHJpbmcpOiBTdHlsZWRTdHJpbmcge1xuICAgIHRoaXMudGV4dCA9IHJhdyh0aGlzLnRleHQsIHJhd0Fuc2kpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIGEgZm9yZWdyb3VuZCBjb2xvciB0byB0aGUgdGV4dC5cbiAgICogQHN1bW1hcnkgU2V0cyB0aGUgdGV4dCBjb2xvciB1c2luZyBBTlNJIGNvbG9yIGNvZGVzLlxuICAgKiBAcGFyYW0ge251bWJlcn0gbiAtIFRoZSBBTlNJIGNvbG9yIGNvZGUgZm9yIHRoZSBmb3JlZ3JvdW5kIGNvbG9yLlxuICAgKiBAcmV0dXJuIHtTdHlsZWRTdHJpbmd9IFRoZSBTdHlsZWRTdHJpbmcgaW5zdGFuY2Ugd2l0aCB0aGUgZm9yZWdyb3VuZCBjb2xvciBhcHBsaWVkLlxuICAgKi9cbiAgZm9yZWdyb3VuZChuOiBudW1iZXIpOiBTdHlsZWRTdHJpbmcge1xuICAgIHRoaXMudGV4dCA9IGNvbG9yaXplQU5TSSh0aGlzLnRleHQsIG4pO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIGEgYmFja2dyb3VuZCBjb2xvciB0byB0aGUgdGV4dC5cbiAgICogQHN1bW1hcnkgU2V0cyB0aGUgYmFja2dyb3VuZCBjb2xvciBvZiB0aGUgdGV4dCB1c2luZyBBTlNJIGNvbG9yIGNvZGVzLlxuICAgKiBAcGFyYW0ge251bWJlcn0gbiAtIFRoZSBBTlNJIGNvbG9yIGNvZGUgZm9yIHRoZSBiYWNrZ3JvdW5kIGNvbG9yLlxuICAgKiBAcmV0dXJuIHtTdHlsZWRTdHJpbmd9IFRoZSBTdHlsZWRTdHJpbmcgaW5zdGFuY2Ugd2l0aCB0aGUgYmFja2dyb3VuZCBjb2xvciBhcHBsaWVkLlxuICAgKi9cbiAgYmFja2dyb3VuZChuOiBudW1iZXIpOiBTdHlsZWRTdHJpbmcge1xuICAgIHRoaXMudGV4dCA9IGNvbG9yaXplQU5TSSh0aGlzLnRleHQsIG4sIHRydWUpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIGEgdGV4dCBzdHlsZSB0byB0aGUgc3RyaW5nLlxuICAgKiBAc3VtbWFyeSBTZXRzIHRleHQgc3R5bGVzIHN1Y2ggYXMgYm9sZCwgaXRhbGljLCBvciB1bmRlcmxpbmUgdXNpbmcgQU5TSSBzdHlsZSBjb2Rlcy5cbiAgICogQHBhcmFtIHtudW1iZXIgfCBzdHJpbmd9IG4gLSBUaGUgc3R5bGUgY29kZSBvciBrZXkgZnJvbSB0aGUgc3R5bGVzIG9iamVjdC5cbiAgICogQHJldHVybiB7U3R5bGVkU3RyaW5nfSBUaGUgU3R5bGVkU3RyaW5nIGluc3RhbmNlIHdpdGggdGhlIHN0eWxlIGFwcGxpZWQuXG4gICAqL1xuICBzdHlsZShuOiBudW1iZXIgfCBrZXlvZiB0eXBlb2Ygc3R5bGVzKTogU3R5bGVkU3RyaW5nIHtcbiAgICBpZiAodHlwZW9mIG4gPT09IFwic3RyaW5nXCIgJiYgIShuIGluIHN0eWxlcykpIHtcbiAgICAgIGNvbnNvbGUud2FybihgSW52YWxpZCBzdHlsZTogJHtufWApO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHRoaXMudGV4dCA9IGFwcGx5U3R5bGUodGhpcy50ZXh0LCBuKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBAZGVzY3JpcHRpb24gQXBwbGllcyBhIDI1Ni1jb2xvciBmb3JlZ3JvdW5kIGNvbG9yIHRvIHRoZSB0ZXh0LlxuICAgKiBAc3VtbWFyeSBTZXRzIHRoZSB0ZXh0IGNvbG9yIHVzaW5nIHRoZSBleHRlbmRlZCAyNTYtY29sb3IgcGFsZXR0ZS5cbiAgICogQHBhcmFtIHtudW1iZXJ9IG4gLSBUaGUgY29sb3IgbnVtYmVyIGZyb20gdGhlIDI1Ni1jb2xvciBwYWxldHRlLlxuICAgKiBAcmV0dXJuIHtTdHlsZWRTdHJpbmd9IFRoZSBTdHlsZWRTdHJpbmcgaW5zdGFuY2Ugd2l0aCB0aGUgMjU2LWNvbG9yIGZvcmVncm91bmQgYXBwbGllZC5cbiAgICovXG4gIGNvbG9yMjU2KG46IG51bWJlcik6IFN0eWxlZFN0cmluZyB7XG4gICAgdGhpcy50ZXh0ID0gY29sb3JpemUyNTYodGhpcy50ZXh0LCBuKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBAZGVzY3JpcHRpb24gQXBwbGllcyBhIDI1Ni1jb2xvciBiYWNrZ3JvdW5kIGNvbG9yIHRvIHRoZSB0ZXh0LlxuICAgKiBAc3VtbWFyeSBTZXRzIHRoZSBiYWNrZ3JvdW5kIGNvbG9yIHVzaW5nIHRoZSBleHRlbmRlZCAyNTYtY29sb3IgcGFsZXR0ZS5cbiAgICogQHBhcmFtIHtudW1iZXJ9IG4gLSBUaGUgY29sb3IgbnVtYmVyIGZyb20gdGhlIDI1Ni1jb2xvciBwYWxldHRlLlxuICAgKiBAcmV0dXJuIHtTdHlsZWRTdHJpbmd9IFRoZSBTdHlsZWRTdHJpbmcgaW5zdGFuY2Ugd2l0aCB0aGUgMjU2LWNvbG9yIGJhY2tncm91bmQgYXBwbGllZC5cbiAgICovXG4gIGJnQ29sb3IyNTYobjogbnVtYmVyKTogU3R5bGVkU3RyaW5nIHtcbiAgICB0aGlzLnRleHQgPSBjb2xvcml6ZTI1Nih0aGlzLnRleHQsIG4sIHRydWUpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIGFuIFJHQiBmb3JlZ3JvdW5kIGNvbG9yIHRvIHRoZSB0ZXh0LlxuICAgKiBAc3VtbWFyeSBTZXRzIHRoZSB0ZXh0IGNvbG9yIHVzaW5nIFJHQiB2YWx1ZXMuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSByIC0gVGhlIHJlZCBjb21wb25lbnQgKDAtMjU1KS5cbiAgICogQHBhcmFtIHtudW1iZXJ9IGcgLSBUaGUgZ3JlZW4gY29tcG9uZW50ICgwLTI1NSkuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBiIC0gVGhlIGJsdWUgY29tcG9uZW50ICgwLTI1NSkuXG4gICAqIEByZXR1cm4ge1N0eWxlZFN0cmluZ30gVGhlIFN0eWxlZFN0cmluZyBpbnN0YW5jZSB3aXRoIHRoZSBSR0IgZm9yZWdyb3VuZCBjb2xvciBhcHBsaWVkLlxuICAgKi9cbiAgcmdiKHI6IG51bWJlciwgZzogbnVtYmVyLCBiOiBudW1iZXIpOiBTdHlsZWRTdHJpbmcge1xuICAgIHRoaXMudGV4dCA9IGNvbG9yaXplUkdCKHRoaXMudGV4dCwgciwgZywgYik7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogQGRlc2NyaXB0aW9uIEFwcGxpZXMgYW4gUkdCIGJhY2tncm91bmQgY29sb3IgdG8gdGhlIHRleHQuXG4gICAqIEBzdW1tYXJ5IFNldHMgdGhlIGJhY2tncm91bmQgY29sb3IgdXNpbmcgUkdCIHZhbHVlcy5cbiAgICogQHBhcmFtIHtudW1iZXJ9IHIgLSBUaGUgcmVkIGNvbXBvbmVudCAoMC0yNTUpLlxuICAgKiBAcGFyYW0ge251bWJlcn0gZyAtIFRoZSBncmVlbiBjb21wb25lbnQgKDAtMjU1KS5cbiAgICogQHBhcmFtIHtudW1iZXJ9IGIgLSBUaGUgYmx1ZSBjb21wb25lbnQgKDAtMjU1KS5cbiAgICogQHJldHVybiB7U3R5bGVkU3RyaW5nfSBUaGUgU3R5bGVkU3RyaW5nIGluc3RhbmNlIHdpdGggdGhlIFJHQiBiYWNrZ3JvdW5kIGNvbG9yIGFwcGxpZWQuXG4gICAqL1xuICBiZ1JnYihyOiBudW1iZXIsIGc6IG51bWJlciwgYjogbnVtYmVyKTogU3R5bGVkU3RyaW5nIHtcbiAgICB0aGlzLnRleHQgPSBjb2xvcml6ZVJHQih0aGlzLnRleHQsIHIsIGcsIGIsIHRydWUpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIEBkZXNjcmlwdGlvbiBDb252ZXJ0cyB0aGUgU3R5bGVkU3RyaW5nIHRvIGEgcmVndWxhciBzdHJpbmcuXG4gICAqIEBzdW1tYXJ5IFJldHVybnMgdGhlIHVuZGVybHlpbmcgdGV4dCB3aXRoIGFsbCBhcHBsaWVkIHN0eWxpbmcuXG4gICAqIEByZXR1cm4ge3N0cmluZ30gVGhlIHN0eWxlZCB0ZXh0IGFzIGEgcmVndWxhciBzdHJpbmcuXG4gICAqL1xuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnRleHQ7XG4gIH1cbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb24gQXBwbGllcyBzdHlsaW5nIHRvIGEgZ2l2ZW4gdGV4dCBzdHJpbmcuXG4gKiBAc3VtbWFyeSBUaGlzIGZ1bmN0aW9uIHRha2VzIGEgc3RyaW5nIGFuZCByZXR1cm5zIGEgU3R5bGVkU3RyaW5nIG9iamVjdCwgd2hpY2ggaXMgYW4gZW5oYW5jZWRcbiAqIHZlcnNpb24gb2YgdGhlIG9yaWdpbmFsIHN0cmluZyB3aXRoIGFkZGl0aW9uYWwgbWV0aG9kcyBmb3IgYXBwbHlpbmcgdmFyaW91cyBBTlNJIGNvbG9yIGFuZCBzdHlsZVxuICogb3B0aW9ucy4gSXQgc2V0cyB1cCBhIG1hcHBlciBvYmplY3Qgd2l0aCBtZXRob2RzIGZvciBkaWZmZXJlbnQgc3R5bGluZyBvcGVyYXRpb25zIGFuZCB0aGVuXG4gKiBkZWZpbmVzIHByb3BlcnRpZXMgb24gdGhlIHRleHQgc3RyaW5nIHRvIG1ha2UgdGhlc2UgbWV0aG9kcyBhY2Nlc3NpYmxlLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nW119IHQgIFRoZSBpbnB1dCB0ZXh0IHRvIGJlIHN0eWxlZC5cbiAqIEByZXR1cm4ge1N0eWxlZFN0cmluZ30gQSBTdHlsZWRTdHJpbmcgb2JqZWN0IHdpdGggYWRkaXRpb25hbCBzdHlsaW5nIG1ldGhvZHMuXG4gKlxuICogQGZ1bmN0aW9uIHN0eWxlXG4gKlxuICogQG1lbWJlck9mIFN0eWxlZFN0cmluZ1xuICovXG5leHBvcnQgZnVuY3Rpb24gc3R5bGUoLi4udDogc3RyaW5nW10pOiBTdHlsZWRTdHJpbmcge1xuICByZXR1cm4gbmV3IFN0eWxlZFN0cmluZyh0LmpvaW4oXCIgXCIpKTtcbn0iXX0=


/***/ }),

/***/ 723:
/***/ ((module) => {

"use strict";


const ESC = '\x1B';
const CSI = `${ESC}[`;
const beep = '\u0007';

const cursor = {
  to(x, y) {
    if (!y) return `${CSI}${x + 1}G`;
    return `${CSI}${y + 1};${x + 1}H`;
  },
  move(x, y) {
    let ret = '';

    if (x < 0) ret += `${CSI}${-x}D`;
    else if (x > 0) ret += `${CSI}${x}C`;

    if (y < 0) ret += `${CSI}${-y}A`;
    else if (y > 0) ret += `${CSI}${y}B`;

    return ret;
  },
  up: (count = 1) => `${CSI}${count}A`,
  down: (count = 1) => `${CSI}${count}B`,
  forward: (count = 1) => `${CSI}${count}C`,
  backward: (count = 1) => `${CSI}${count}D`,
  nextLine: (count = 1) => `${CSI}E`.repeat(count),
  prevLine: (count = 1) => `${CSI}F`.repeat(count),
  left: `${CSI}G`,
  hide: `${CSI}?25l`,
  show: `${CSI}?25h`,
  save: `${ESC}7`,
  restore: `${ESC}8`
}

const scroll = {
  up: (count = 1) => `${CSI}S`.repeat(count),
  down: (count = 1) => `${CSI}T`.repeat(count)
}

const erase = {
  screen: `${CSI}2J`,
  up: (count = 1) => `${CSI}1J`.repeat(count),
  down: (count = 1) => `${CSI}J`.repeat(count),
  line: `${CSI}2K`,
  lineEnd: `${CSI}K`,
  lineStart: `${CSI}1K`,
  lines(count) {
    let clear = '';
    for (let i = 0; i < count; i++)
      clear += this.line + (i < count - 1 ? cursor.up() : '');
    if (count)
      clear += cursor.left;
    return clear;
  }
}

module.exports = { cursor, scroll, erase, beep };


/***/ }),

/***/ 769:
/***/ ((module) => {

"use strict";

/**
 * Determine what entries should be displayed on the screen, based on the
 * currently selected index and the maximum visible. Used in list-based
 * prompts like `select` and `multiselect`.
 *
 * @param {number} cursor the currently selected entry
 * @param {number} total the total entries available to display
 * @param {number} [maxVisible] the number of entries that can be displayed
 */

module.exports = (cursor, total, maxVisible) => {
  maxVisible = maxVisible || total;
  let startIndex = Math.min(total - maxVisible, cursor - Math.floor(maxVisible / 2));
  if (startIndex < 0) startIndex = 0;
  let endIndex = Math.min(startIndex + maxVisible, total);
  return {
    startIndex,
    endIndex
  };
};

/***/ }),

/***/ 866:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.printBanner = printBanner;
exports.getSlogan = getSlogan;
const slogans_json_1 = __importDefault(__webpack_require__(9680));
const styled_string_builder_1 = __webpack_require__(1076);
/**
 * @description Array of ANSI color codes for banner styling.
 * @summary Defines a set of ANSI color codes used to style the banner text.
 */
const colors = [
    "\x1b[38;5;215m", // soft orange
    "\x1b[38;5;209m", // coral
    "\x1b[38;5;205m", // pink
    "\x1b[38;5;210m", // peachy
    "\x1b[38;5;217m", // salmon
    "\x1b[38;5;216m", // light coral
    "\x1b[38;5;224m", // light peach
    "\x1b[38;5;230m", // soft cream
    "\x1b[38;5;230m", // soft cream
];
/**
 * @description Prints a styled banner to the console.
 * @summary Generates and prints a colorful ASCII art banner with a random slogan.
 * @param {VerbosityLogger} [logger] - Optional logger for verbose output.
 * @function printBanner
 * @mermaid
 * sequenceDiagram
 *   participant printBanner
 *   participant getSlogan
 *   participant padEnd
 *   participant console
 *   printBanner->>getSlogan: Call getSlogan()
 *   getSlogan-->>printBanner: Return random slogan
 *   printBanner->>printBanner: Create banner ASCII art
 *   printBanner->>printBanner: Split banner into lines
 *   printBanner->>printBanner: Calculate max line length
 *   printBanner->>padEnd: Call padEnd with slogan
 *   padEnd-->>printBanner: Return padded slogan line
 *   loop For each banner line
 *     printBanner->>style: Call style(line)
 *     style-->>printBanner: Return styled line
 *     printBanner->>console: Log styled line
 *   end
 */
function printBanner(logger) {
    const message = getSlogan();
    const banner = `#                 ░▒▓███████▓▒░  ░▒▓████████▓▒░  ░▒▓██████▓▒░   ░▒▓██████▓▒░  ░▒▓████████▓▒░       ░▒▓████████▓▒░  ░▒▓███████▓▒░ 
#      ( (        ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░        ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░                 ░▒▓█▓▒░     ░▒▓█▓▒░        
#       ) )       ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░        ░▒▓█▓▒░        ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░                 ░▒▓█▓▒░     ░▒▓█▓▒░        
#    [=======]    ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓██████▓▒░   ░▒▓█▓▒░        ░▒▓████████▓▒░ ░▒▓██████▓▒░            ░▒▓█▓▒░      ░▒▓██████▓▒░  
#     \`-----´     ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░        ░▒▓█▓▒░        ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░                 ░▒▓█▓▒░            ░▒▓█▓▒░ 
#                 ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░        ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░                 ░▒▓█▓▒░            ░▒▓█▓▒░ 
#                 ░▒▓███████▓▒░  ░▒▓████████▓▒░  ░▒▓██████▓▒░  ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░                 ░▒▓█▓▒░     ░▒▓███████▓▒░  
#`.split("\n");
    const maxLength = banner.reduce((max, line) => Math.max(max, line.length), 0);
    banner.push(`#  ${message.padStart(maxLength - 3)}`);
    banner.forEach((line, index) => {
        (logger ? logger.info.bind(logger) : console.log.bind(console))((0, styled_string_builder_1.style)(line || "").raw(colors[index]).text);
    });
}
/**
 * @description Retrieves a slogan from the predefined list.
 * @summary Fetches a random slogan or a specific one by index from the slogans list.
 * @param {number} [i] - Optional index to retrieve a specific slogan.
 * @return {string} The selected slogan.
 * @function getSlogan
 * @mermaid
 * sequenceDiagram
 *   participant getSlogan
 *   participant Math.random
 *   participant slogans
 *   alt i is undefined
 *     getSlogan->>Math.random: Generate random index
 *     Math.random-->>getSlogan: Return random index
 *   else i is defined
 *     Note over getSlogan: Use provided index
 *   end
 *   getSlogan->>slogans: Access slogan at index
 *   slogans-->>getSlogan: Return slogan
 *   alt Error occurs
 *     getSlogan->>getSlogan: Throw error
 *   end
 *   getSlogan-->>Caller: Return slogan
 */
function getSlogan(i) {
    try {
        i =
            typeof i === "undefined" ? Math.floor(Math.random() * slogans_json_1.default.length) : i;
        return slogans_json_1.default[i].Slogan;
    }
    catch (error) {
        throw new Error(`Failed to retrieve slogans: ${error}`);
    }
}


/***/ }),

/***/ 869:
/***/ ((module) => {

"use strict";


/**
 * @param {string} msg The message to wrap
 * @param {object} opts
 * @param {number|string} [opts.margin] Left margin
 * @param {number} opts.width Maximum characters per line including the margin
 */
module.exports = (msg, opts = {}) => {
  const tab = Number.isSafeInteger(parseInt(opts.margin))
    ? new Array(parseInt(opts.margin)).fill(' ').join('')
    : (opts.margin || '');

  const width = opts.width;

  return (msg || '').split(/\r?\n/g)
    .map(line => line
      .split(/\s+/g)
      .reduce((arr, w) => {
        if (w.length + tab.length >= width || arr[arr.length - 1].length + w.length + 1 < width)
          arr[arr.length - 1] += ` ${w}`;
        else arr.push(`${tab}${w}`);
        return arr;
      }, [ tab ])
      .join('\n'))
    .join('\n');
};


/***/ }),

/***/ 948:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const color = __webpack_require__(1394);
const Prompt = __webpack_require__(4872);
const { style, clear } = __webpack_require__(1189);
const { erase, cursor } = __webpack_require__(723);

/**
 * ConfirmPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Boolean} [opts.initial] Default value (true/false)
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 * @param {String} [opts.yes] The "Yes" label
 * @param {String} [opts.yesOption] The "Yes" option when choosing between yes/no
 * @param {String} [opts.no] The "No" label
 * @param {String} [opts.noOption] The "No" option when choosing between yes/no
 */
class ConfirmPrompt extends Prompt {
  constructor(opts={}) {
    super(opts);
    this.msg = opts.message;
    this.value = opts.initial;
    this.initialValue = !!opts.initial;
    this.yesMsg = opts.yes || 'yes';
    this.yesOption = opts.yesOption || '(Y/n)';
    this.noMsg = opts.no || 'no';
    this.noOption = opts.noOption || '(y/N)';
    this.render();
  }

  reset() {
    this.value = this.initialValue;
    this.fire();
    this.render();
  }

  exit() {
    this.abort();
  }

  abort() {
    this.done = this.aborted = true;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  submit() {
    this.value = this.value || false;
    this.done = true;
    this.aborted = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  _(c, key) {
    if (c.toLowerCase() === 'y') {
      this.value = true;
      return this.submit();
    }
    if (c.toLowerCase() === 'n') {
      this.value = false;
      return this.submit();
    }
    return this.bell();
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);
    else this.out.write(clear(this.outputText, this.out.columns));
    super.render();

    this.outputText = [
      style.symbol(this.done, this.aborted),
      color.bold(this.msg),
      style.delimiter(this.done),
      this.done ? (this.value ? this.yesMsg : this.noMsg)
          : color.gray(this.initialValue ? this.yesOption : this.noOption)
    ].join(' ');

    this.out.write(erase.line + cursor.to(0) + this.outputText);
  }
}

module.exports = ConfirmPrompt;


/***/ }),

/***/ 1024:
/***/ ((module) => {

"use strict";
module.exports = __WEBPACK_EXTERNAL_MODULE__1024__;

/***/ }),

/***/ 1076:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(8564), exports);
__exportStar(__webpack_require__(6471), exports);
__exportStar(__webpack_require__(674), exports);
/**
 * @module StyledString
 * @description This module provides utilities for styling and manipulating strings in TypeScript.
 * @summary
 * The StyledString module exports functionality for working with colors, constants, and string manipulation.
 * It includes:
 * - Color-related utilities from {@link colors}
 * - Constant values from {@link constants}
 * - String manipulation functions from {@link strings}
 *
 * This module serves as the main entry point for the StyledString library, consolidating various
 * string-related functionalities into a single, easy-to-use package.
 */

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQXlCO0FBQ3pCLDhDQUE0QjtBQUM1Qiw0Q0FBMEI7QUFFMUI7Ozs7Ozs7Ozs7OztHQVlHIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0ICogZnJvbSBcIi4vY29sb3JzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9jb25zdGFudHNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL3N0cmluZ3NcIjtcblxuLyoqXG4gKiBAbW9kdWxlIFN0eWxlZFN0cmluZ1xuICogQGRlc2NyaXB0aW9uIFRoaXMgbW9kdWxlIHByb3ZpZGVzIHV0aWxpdGllcyBmb3Igc3R5bGluZyBhbmQgbWFuaXB1bGF0aW5nIHN0cmluZ3MgaW4gVHlwZVNjcmlwdC5cbiAqIEBzdW1tYXJ5XG4gKiBUaGUgU3R5bGVkU3RyaW5nIG1vZHVsZSBleHBvcnRzIGZ1bmN0aW9uYWxpdHkgZm9yIHdvcmtpbmcgd2l0aCBjb2xvcnMsIGNvbnN0YW50cywgYW5kIHN0cmluZyBtYW5pcHVsYXRpb24uXG4gKiBJdCBpbmNsdWRlczpcbiAqIC0gQ29sb3ItcmVsYXRlZCB1dGlsaXRpZXMgZnJvbSB7QGxpbmsgY29sb3JzfVxuICogLSBDb25zdGFudCB2YWx1ZXMgZnJvbSB7QGxpbmsgY29uc3RhbnRzfVxuICogLSBTdHJpbmcgbWFuaXB1bGF0aW9uIGZ1bmN0aW9ucyBmcm9tIHtAbGluayBzdHJpbmdzfVxuICogXG4gKiBUaGlzIG1vZHVsZSBzZXJ2ZXMgYXMgdGhlIG1haW4gZW50cnkgcG9pbnQgZm9yIHRoZSBTdHlsZWRTdHJpbmcgbGlicmFyeSwgY29uc29saWRhdGluZyB2YXJpb3VzXG4gKiBzdHJpbmctcmVsYXRlZCBmdW5jdGlvbmFsaXRpZXMgaW50byBhIHNpbmdsZSwgZWFzeS10by11c2UgcGFja2FnZS5cbiAqL1xuIl19


/***/ }),

/***/ 1189:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


module.exports = {
  action: __webpack_require__(3075),
  clear: __webpack_require__(8868),
  style: __webpack_require__(4792),
  strip: __webpack_require__(5815),
  figures: __webpack_require__(5992),
  lines: __webpack_require__(4182),
  wrap: __webpack_require__(869),
  entriesToDisplay: __webpack_require__(4536)
};


/***/ }),

/***/ 1394:
/***/ ((module) => {

"use strict";


const { FORCE_COLOR, NODE_DISABLE_COLORS, TERM } = process.env;

const $ = {
	enabled: !NODE_DISABLE_COLORS && TERM !== 'dumb' && FORCE_COLOR !== '0',

	// modifiers
	reset: init(0, 0),
	bold: init(1, 22),
	dim: init(2, 22),
	italic: init(3, 23),
	underline: init(4, 24),
	inverse: init(7, 27),
	hidden: init(8, 28),
	strikethrough: init(9, 29),

	// colors
	black: init(30, 39),
	red: init(31, 39),
	green: init(32, 39),
	yellow: init(33, 39),
	blue: init(34, 39),
	magenta: init(35, 39),
	cyan: init(36, 39),
	white: init(37, 39),
	gray: init(90, 39),
	grey: init(90, 39),

	// background colors
	bgBlack: init(40, 49),
	bgRed: init(41, 49),
	bgGreen: init(42, 49),
	bgYellow: init(43, 49),
	bgBlue: init(44, 49),
	bgMagenta: init(45, 49),
	bgCyan: init(46, 49),
	bgWhite: init(47, 49)
};

function run(arr, str) {
	let i=0, tmp, beg='', end='';
	for (; i < arr.length; i++) {
		tmp = arr[i];
		beg += tmp.open;
		end += tmp.close;
		if (str.includes(tmp.close)) {
			str = str.replace(tmp.rgx, tmp.close + tmp.open);
		}
	}
	return beg + str + end;
}

function chain(has, keys) {
	let ctx = { has, keys };

	ctx.reset = $.reset.bind(ctx);
	ctx.bold = $.bold.bind(ctx);
	ctx.dim = $.dim.bind(ctx);
	ctx.italic = $.italic.bind(ctx);
	ctx.underline = $.underline.bind(ctx);
	ctx.inverse = $.inverse.bind(ctx);
	ctx.hidden = $.hidden.bind(ctx);
	ctx.strikethrough = $.strikethrough.bind(ctx);

	ctx.black = $.black.bind(ctx);
	ctx.red = $.red.bind(ctx);
	ctx.green = $.green.bind(ctx);
	ctx.yellow = $.yellow.bind(ctx);
	ctx.blue = $.blue.bind(ctx);
	ctx.magenta = $.magenta.bind(ctx);
	ctx.cyan = $.cyan.bind(ctx);
	ctx.white = $.white.bind(ctx);
	ctx.gray = $.gray.bind(ctx);
	ctx.grey = $.grey.bind(ctx);

	ctx.bgBlack = $.bgBlack.bind(ctx);
	ctx.bgRed = $.bgRed.bind(ctx);
	ctx.bgGreen = $.bgGreen.bind(ctx);
	ctx.bgYellow = $.bgYellow.bind(ctx);
	ctx.bgBlue = $.bgBlue.bind(ctx);
	ctx.bgMagenta = $.bgMagenta.bind(ctx);
	ctx.bgCyan = $.bgCyan.bind(ctx);
	ctx.bgWhite = $.bgWhite.bind(ctx);

	return ctx;
}

function init(open, close) {
	let blk = {
		open: `\x1b[${open}m`,
		close: `\x1b[${close}m`,
		rgx: new RegExp(`\\x1b\\[${close}m`, 'g')
	};
	return function (txt) {
		if (this !== void 0 && this.has !== void 0) {
			this.has.includes(open) || (this.has.push(open),this.keys.push(blk));
			return txt === void 0 ? this : $.enabled ? run(this.keys, txt+'') : txt+'';
		}
		return txt === void 0 ? chain([open], [blk]) : $.enabled ? run([blk], txt+'') : txt+'';
	};
}

module.exports = $;


/***/ }),

/***/ 1416:
/***/ ((module) => {

"use strict";

/**
 * @param {string} msg The message to wrap
 * @param {object} opts
 * @param {number|string} [opts.margin] Left margin
 * @param {number} opts.width Maximum characters per line including the margin
 */

module.exports = (msg, opts = {}) => {
  const tab = Number.isSafeInteger(parseInt(opts.margin)) ? new Array(parseInt(opts.margin)).fill(' ').join('') : opts.margin || '';
  const width = opts.width;
  return (msg || '').split(/\r?\n/g).map(line => line.split(/\s+/g).reduce((arr, w) => {
    if (w.length + tab.length >= width || arr[arr.length - 1].length + w.length + 1 < width) arr[arr.length - 1] += ` ${w}`;else arr.push(`${tab}${w}`);
    return arr;
  }, [tab]).join('\n')).join('\n');
};

/***/ }),

/***/ 1458:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const DatePart = __webpack_require__(323);

const pos = n => {
  n = n % 10;
  return n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
};

class Day extends DatePart {
  constructor(opts = {}) {
    super(opts);
  }

  up() {
    this.date.setDate(this.date.getDate() + 1);
  }

  down() {
    this.date.setDate(this.date.getDate() - 1);
  }

  setTo(val) {
    this.date.setDate(parseInt(val.substr(-2)));
  }

  toString() {
    let date = this.date.getDate();
    let day = this.date.getDay();
    return this.token === 'DD' ? String(date).padStart(2, '0') : this.token === 'Do' ? date + pos(date) : this.token === 'd' ? day + 1 : this.token === 'ddd' ? this.locales.weekdaysShort[day] : this.token === 'dddd' ? this.locales.weekdays[day] : date;
  }

}

module.exports = Day;

/***/ }),

/***/ 1494:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const color = __webpack_require__(1394);
const Prompt = __webpack_require__(4872);
const { style, clear } = __webpack_require__(1189);
const { cursor, erase } = __webpack_require__(723);

/**
 * TogglePrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Boolean} [opts.initial=false] Default value
 * @param {String} [opts.active='no'] Active label
 * @param {String} [opts.inactive='off'] Inactive label
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */
class TogglePrompt extends Prompt {
  constructor(opts={}) {
    super(opts);
    this.msg = opts.message;
    this.value = !!opts.initial;
    this.active = opts.active || 'on';
    this.inactive = opts.inactive || 'off';
    this.initialValue = this.value;
    this.render();
  }

  reset() {
    this.value = this.initialValue;
    this.fire();
    this.render();
  }

  exit() {
    this.abort();
  }

  abort() {
    this.done = this.aborted = true;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  submit() {
    this.done = true;
    this.aborted = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  deactivate() {
    if (this.value === false) return this.bell();
    this.value = false;
    this.render();
  }

  activate() {
    if (this.value === true) return this.bell();
    this.value = true;
    this.render();
  }

  delete() {
    this.deactivate();
  }
  left() {
    this.deactivate();
  }
  right() {
    this.activate();
  }
  down() {
    this.deactivate();
  }
  up() {
    this.activate();
  }

  next() {
    this.value = !this.value;
    this.fire();
    this.render();
  }

  _(c, key) {
    if (c === ' ') {
      this.value = !this.value;
    } else if (c === '1') {
      this.value = true;
    } else if (c === '0') {
      this.value = false;
    } else return this.bell();
    this.render();
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);
    else this.out.write(clear(this.outputText, this.out.columns));
    super.render();

    this.outputText = [
      style.symbol(this.done, this.aborted),
      color.bold(this.msg),
      style.delimiter(this.done),
      this.value ? this.inactive : color.cyan().underline(this.inactive),
      color.gray('/'),
      this.value ? color.cyan().underline(this.active) : this.active
    ].join(' ');

    this.out.write(erase.line + cursor.to(0) + this.outputText);
  }
}

module.exports = TogglePrompt;


/***/ }),

/***/ 1679:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

const color = __webpack_require__(1394);

const Prompt = __webpack_require__(4597);

const _require = __webpack_require__(723),
      erase = _require.erase,
      cursor = _require.cursor;

const _require2 = __webpack_require__(4586),
      style = _require2.style,
      clear = _require2.clear,
      figures = _require2.figures,
      wrap = _require2.wrap,
      entriesToDisplay = _require2.entriesToDisplay;

const getVal = (arr, i) => arr[i] && (arr[i].value || arr[i].title || arr[i]);

const getTitle = (arr, i) => arr[i] && (arr[i].title || arr[i].value || arr[i]);

const getIndex = (arr, valOrTitle) => {
  const index = arr.findIndex(el => el.value === valOrTitle || el.title === valOrTitle);
  return index > -1 ? index : undefined;
};
/**
 * TextPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Array} opts.choices Array of auto-complete choices objects
 * @param {Function} [opts.suggest] Filter function. Defaults to sort by title
 * @param {Number} [opts.limit=10] Max number of results to show
 * @param {Number} [opts.cursor=0] Cursor start position
 * @param {String} [opts.style='default'] Render style
 * @param {String} [opts.fallback] Fallback message - initial to default value
 * @param {String} [opts.initial] Index of the default value
 * @param {Boolean} [opts.clearFirst] The first ESCAPE keypress will clear the input
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 * @param {String} [opts.noMatches] The no matches found label
 */


class AutocompletePrompt extends Prompt {
  constructor(opts = {}) {
    super(opts);
    this.msg = opts.message;
    this.suggest = opts.suggest;
    this.choices = opts.choices;
    this.initial = typeof opts.initial === 'number' ? opts.initial : getIndex(opts.choices, opts.initial);
    this.select = this.initial || opts.cursor || 0;
    this.i18n = {
      noMatches: opts.noMatches || 'no matches found'
    };
    this.fallback = opts.fallback || this.initial;
    this.clearFirst = opts.clearFirst || false;
    this.suggestions = [];
    this.input = '';
    this.limit = opts.limit || 10;
    this.cursor = 0;
    this.transform = style.render(opts.style);
    this.scale = this.transform.scale;
    this.render = this.render.bind(this);
    this.complete = this.complete.bind(this);
    this.clear = clear('', this.out.columns);
    this.complete(this.render);
    this.render();
  }

  set fallback(fb) {
    this._fb = Number.isSafeInteger(parseInt(fb)) ? parseInt(fb) : fb;
  }

  get fallback() {
    let choice;
    if (typeof this._fb === 'number') choice = this.choices[this._fb];else if (typeof this._fb === 'string') choice = {
      title: this._fb
    };
    return choice || this._fb || {
      title: this.i18n.noMatches
    };
  }

  moveSelect(i) {
    this.select = i;
    if (this.suggestions.length > 0) this.value = getVal(this.suggestions, i);else this.value = this.fallback.value;
    this.fire();
  }

  complete(cb) {
    var _this = this;

    return _asyncToGenerator(function* () {
      const p = _this.completing = _this.suggest(_this.input, _this.choices);

      const suggestions = yield p;
      if (_this.completing !== p) return;
      _this.suggestions = suggestions.map((s, i, arr) => ({
        title: getTitle(arr, i),
        value: getVal(arr, i),
        description: s.description
      }));
      _this.completing = false;
      const l = Math.max(suggestions.length - 1, 0);

      _this.moveSelect(Math.min(l, _this.select));

      cb && cb();
    })();
  }

  reset() {
    this.input = '';
    this.complete(() => {
      this.moveSelect(this.initial !== void 0 ? this.initial : 0);
      this.render();
    });
    this.render();
  }

  exit() {
    if (this.clearFirst && this.input.length > 0) {
      this.reset();
    } else {
      this.done = this.exited = true;
      this.aborted = false;
      this.fire();
      this.render();
      this.out.write('\n');
      this.close();
    }
  }

  abort() {
    this.done = this.aborted = true;
    this.exited = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  submit() {
    this.done = true;
    this.aborted = this.exited = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  _(c, key) {
    let s1 = this.input.slice(0, this.cursor);
    let s2 = this.input.slice(this.cursor);
    this.input = `${s1}${c}${s2}`;
    this.cursor = s1.length + 1;
    this.complete(this.render);
    this.render();
  }

  delete() {
    if (this.cursor === 0) return this.bell();
    let s1 = this.input.slice(0, this.cursor - 1);
    let s2 = this.input.slice(this.cursor);
    this.input = `${s1}${s2}`;
    this.complete(this.render);
    this.cursor = this.cursor - 1;
    this.render();
  }

  deleteForward() {
    if (this.cursor * this.scale >= this.rendered.length) return this.bell();
    let s1 = this.input.slice(0, this.cursor);
    let s2 = this.input.slice(this.cursor + 1);
    this.input = `${s1}${s2}`;
    this.complete(this.render);
    this.render();
  }

  first() {
    this.moveSelect(0);
    this.render();
  }

  last() {
    this.moveSelect(this.suggestions.length - 1);
    this.render();
  }

  up() {
    if (this.select === 0) {
      this.moveSelect(this.suggestions.length - 1);
    } else {
      this.moveSelect(this.select - 1);
    }

    this.render();
  }

  down() {
    if (this.select === this.suggestions.length - 1) {
      this.moveSelect(0);
    } else {
      this.moveSelect(this.select + 1);
    }

    this.render();
  }

  next() {
    if (this.select === this.suggestions.length - 1) {
      this.moveSelect(0);
    } else this.moveSelect(this.select + 1);

    this.render();
  }

  nextPage() {
    this.moveSelect(Math.min(this.select + this.limit, this.suggestions.length - 1));
    this.render();
  }

  prevPage() {
    this.moveSelect(Math.max(this.select - this.limit, 0));
    this.render();
  }

  left() {
    if (this.cursor <= 0) return this.bell();
    this.cursor = this.cursor - 1;
    this.render();
  }

  right() {
    if (this.cursor * this.scale >= this.rendered.length) return this.bell();
    this.cursor = this.cursor + 1;
    this.render();
  }

  renderOption(v, hovered, isStart, isEnd) {
    let desc;
    let prefix = isStart ? figures.arrowUp : isEnd ? figures.arrowDown : ' ';
    let title = hovered ? color.cyan().underline(v.title) : v.title;
    prefix = (hovered ? color.cyan(figures.pointer) + ' ' : '  ') + prefix;

    if (v.description) {
      desc = ` - ${v.description}`;

      if (prefix.length + title.length + desc.length >= this.out.columns || v.description.split(/\r?\n/).length > 1) {
        desc = '\n' + wrap(v.description, {
          margin: 3,
          width: this.out.columns
        });
      }
    }

    return prefix + ' ' + title + color.gray(desc || '');
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);else this.out.write(clear(this.outputText, this.out.columns));
    super.render();

    let _entriesToDisplay = entriesToDisplay(this.select, this.choices.length, this.limit),
        startIndex = _entriesToDisplay.startIndex,
        endIndex = _entriesToDisplay.endIndex;

    this.outputText = [style.symbol(this.done, this.aborted, this.exited), color.bold(this.msg), style.delimiter(this.completing), this.done && this.suggestions[this.select] ? this.suggestions[this.select].title : this.rendered = this.transform.render(this.input)].join(' ');

    if (!this.done) {
      const suggestions = this.suggestions.slice(startIndex, endIndex).map((item, i) => this.renderOption(item, this.select === i + startIndex, i === 0 && startIndex > 0, i + startIndex === endIndex - 1 && endIndex < this.choices.length)).join('\n');
      this.outputText += `\n` + (suggestions || color.gray(this.fallback.title));
    }

    this.out.write(erase.line + cursor.to(0) + this.outputText);
  }

}

module.exports = AutocompletePrompt;

/***/ }),

/***/ 1715:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const DatePart = __webpack_require__(5568);

const pos = n => {
  n = n % 10;
  return n === 1 ? 'st'
       : n === 2 ? 'nd'
       : n === 3 ? 'rd'
       : 'th';
}

class Day extends DatePart {
  constructor(opts={}) {
    super(opts);
  }

  up() {
    this.date.setDate(this.date.getDate() + 1);
  }

  down() {
    this.date.setDate(this.date.getDate() - 1);
  }

  setTo(val) {
    this.date.setDate(parseInt(val.substr(-2)));
  }

  toString() {
    let date = this.date.getDate();
    let day = this.date.getDay();
    return this.token === 'DD' ? String(date).padStart(2, '0')
         : this.token === 'Do' ? date + pos(date)
         : this.token === 'd' ? day + 1
         : this.token === 'ddd' ? this.locales.weekdaysShort[day]
         : this.token === 'dddd' ? this.locales.weekdays[day]
         : date;
  }
}

module.exports = Day;


/***/ }),

/***/ 1908:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


module.exports = {
  DatePart: __webpack_require__(323),
  Meridiem: __webpack_require__(5404),
  Day: __webpack_require__(1458),
  Hours: __webpack_require__(9199),
  Milliseconds: __webpack_require__(3988),
  Minutes: __webpack_require__(6781),
  Month: __webpack_require__(4906),
  Seconds: __webpack_require__(3217),
  Year: __webpack_require__(8775)
};

/***/ }),

/***/ 1928:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.padEnd = padEnd;
exports.patchPlaceholders = patchPlaceholders;
exports.patchString = patchString;
exports.toCamelCase = toCamelCase;
exports.toENVFormat = toENVFormat;
exports.toSnakeCase = toSnakeCase;
exports.toKebabCase = toKebabCase;
exports.toPascalCase = toPascalCase;
exports.escapeRegExp = escapeRegExp;
/**
 * @description Pads the end of a string with a specified character.
 * @summary Extends the input string to a specified length by adding a padding character to the end.
 * If the input string is already longer than the specified length, it is returned unchanged.
 *
 * @param {string} str - The input string to be padded.
 * @param {number} length - The desired total length of the resulting string.
 * @param {string} [char=" "] - The character to use for padding. Defaults to a space.
 * @return {string} The padded string.
 * @throws {Error} If the padding character is not exactly one character long.
 *
 * @function padEnd
 *
 * @memberOf module:TextUtils
 */
function padEnd(str, length, char = " ") {
    if (char.length !== 1)
        throw new Error("Invalid character length for padding. must be one!");
    return str.padEnd(length, char);
}
/**
 * @description Replaces placeholders in a string with provided values.
 * @summary Interpolates a string by replacing placeholders of the form ${variableName}
 * with corresponding values from the provided object. If a placeholder doesn't have
 * a corresponding value, it is left unchanged in the string.
 *
 * @param {string} input - The input string containing placeholders to be replaced.
 * @param {Record<string, number | string>} values - An object containing key-value pairs for replacement.
 * @return {string} The interpolated string with placeholders replaced by their corresponding values.
 *
 * @function patchPlaceholders
 *
 * @mermaid
 * sequenceDiagram
 *   participant Caller
 *   participant patchString
 *   participant String.replace
 *   Caller->>patchString: Call with input and values
 *   patchString->>String.replace: Call with regex and replacement function
 *   String.replace->>patchString: Return replaced string
 *   patchString-->>Caller: Return patched string
 *
 * @memberOf module:TextUtils
 */
function patchPlaceholders(input, values) {
    return input.replace(/\$\{([a-zA-Z0-9_]+)\}/g, (match, variable) => values[variable] || match);
}
function patchString(input, values, flags = "g") {
    Object.entries(values).forEach(([key, val]) => {
        const regexp = new RegExp(escapeRegExp(key), flags);
        input = input.replace(regexp, val);
    });
    return input;
}
/**
 * @description Converts a string to camelCase.
 * @summary Transforms the input string into camelCase format, where words are joined without spaces
 * and each word after the first starts with a capital letter.
 *
 * @param {string} text - The input string to be converted.
 * @return {string} The input string converted to camelCase.
 *
 * @function toCamelCase
 *
 * @memberOf module:TextUtils
 */
function toCamelCase(text) {
    return text
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => index === 0 ? word.toLowerCase() : word.toUpperCase())
        .replace(/\s+/g, "");
}
/**
 * @description Converts a string to ENVIRONMENT_VARIABLE format.
 * @summary Transforms the input string into uppercase with words separated by underscores,
 * typically used for environment variable names.
 *
 * @param {string} text - The input string to be converted.
 * @return {string} The input string converted to ENVIRONMENT_VARIABLE format.
 *
 * @function toENVFormat
 *
 * @memberOf module:TextUtils
 */
function toENVFormat(text) {
    return toSnakeCase(text).toUpperCase();
}
/**
 * @description Converts a string to snake_case.
 * @summary Transforms the input string into lowercase with words separated by underscores.
 *
 * @param {string} text - The input string to be converted.
 * @return {string} The input string converted to snake_case.
 *
 * @function toSnakeCase
 *
 * @memberOf module:TextUtils
 */
function toSnakeCase(text) {
    return text
        .replace(/([a-z])([A-Z])/g, "$1_$2")
        .replace(/[\s-]+/g, "_")
        .toLowerCase();
}
/**
 * @description Converts a string to kebab-case.
 * @summary Transforms the input string into lowercase with words separated by hyphens.
 *
 * @param {string} text - The input string to be converted.
 * @return {string} The input string converted to kebab-case.
 *
 * @function toKebabCase
 *
 * @memberOf module:TextUtils
 */
function toKebabCase(text) {
    return text
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .replace(/[\s_]+/g, "-")
        .toLowerCase();
}
/**
 * @description Converts a string to PascalCase.
 * @summary Transforms the input string into PascalCase format, where words are joined without spaces
 * and each word starts with a capital letter.
 *
 * @param {string} text - The input string to be converted.
 * @return {string} The input string converted to PascalCase.
 *
 * @function toPascalCase
 *
 * @memberOf module:TextUtils
 */
function toPascalCase(text) {
    return text
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
        .replace(/\s+/g, "");
}
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}


/***/ }),

/***/ 1980:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const DatePart = __webpack_require__(5568);

class Milliseconds extends DatePart {
  constructor(opts={}) {
    super(opts);
  }

  up() {
    this.date.setMilliseconds(this.date.getMilliseconds() + 1);
  }

  down() {
    this.date.setMilliseconds(this.date.getMilliseconds() - 1);
  }

  setTo(val) {
    this.date.setMilliseconds(parseInt(val.substr(-(this.token.length))));
  }

  toString() {
    return String(this.date.getMilliseconds()).padStart(4, '0')
                                              .substr(0, this.token.length);
  }
}

module.exports = Milliseconds;


/***/ }),

/***/ 2030:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Environment = void 0;
const text_1 = __webpack_require__(1928);
const accumulator_1 = __webpack_require__(3741);
const web_1 = __webpack_require__(3885);
/**
 * @class Environment
 * @extends {ObjectAccumulator<T>}
 * @template T
 * @description A class representing an environment with accumulation capabilities.
 * @summary Manages environment-related data and provides methods for accumulation and key retrieval.
 * @param {T} [initialData] - The initial data to populate the environment with.
 */
class Environment extends accumulator_1.ObjectAccumulator {
    /**
     * @static
     * @protected
     * @description A factory function for creating Environment instances.
     * @summary Defines how new instances of the Environment class should be created.
     * @return {Environment<any>} A new instance of the Environment class.
     */
    static { this.factory = () => new Environment(); }
    constructor() {
        super();
    }
    fromEnv(k) {
        let env;
        if ((0, web_1.isBrowser)()) {
            env = globalThis["ENV"];
        }
        else {
            env = globalThis.process.env;
            k = (0, text_1.toENVFormat)(k);
        }
        return env[k];
    }
    expand(value) {
        Object.entries(value).forEach(([k, v]) => {
            Object.defineProperty(this, k, {
                get: () => {
                    const fromEnv = this.fromEnv(k);
                    return typeof fromEnv === "undefined" ? v : fromEnv;
                },
                set: (val) => {
                    v = val;
                },
                configurable: true,
                enumerable: true,
            });
        });
    }
    /**
     * @protected
     * @static
     * @description Retrieves or creates the singleton instance of the Environment class.
     * @summary Ensures only one instance of the Environment class exists.
     * @template E
     * @param {...unknown[]} args - Arguments to pass to the factory function if a new instance is created.
     * @return {E} The singleton instance of the Environment class.
     */
    static instance(...args) {
        Environment._instance = !Environment._instance
            ? Environment.factory(...args)
            : Environment._instance;
        return Environment._instance;
    }
    /**
     * @static
     * @description Accumulates the given value into the environment.
     * @summary Adds new properties to the environment from the provided object.
     * @template V
     * @param {V} value - The object to accumulate into the environment.
     * @return {typeof Environment._instance & V & ObjectAccumulator<typeof Environment._instance & V>} The updated environment instance.
     */
    static accumulate(value) {
        const instance = Environment.instance();
        return instance.accumulate(value);
    }
    /**
     * @static
     * @description Retrieves the keys of the environment, optionally converting them to ENV format.
     * @summary Gets all keys in the environment, with an option to format them for environment variables.
     * @param {boolean} [toEnv=true] - Whether to convert the keys to ENV format.
     * @return {string[]} An array of keys from the environment.
     */
    static keys(toEnv = true) {
        return Environment.instance()
            .keys()
            .map((k) => (toEnv ? (0, text_1.toENVFormat)(k) : k));
    }
}
exports.Environment = Environment;


/***/ }),

/***/ 2064:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


module.exports = {
  TextPrompt: __webpack_require__(4785),
  SelectPrompt: __webpack_require__(5646),
  TogglePrompt: __webpack_require__(1494),
  DatePrompt: __webpack_require__(2378),
  NumberPrompt: __webpack_require__(7679),
  MultiselectPrompt: __webpack_require__(405),
  AutocompletePrompt: __webpack_require__(4230),
  AutocompleteMultiselectPrompt: __webpack_require__(2869),
  ConfirmPrompt: __webpack_require__(948)
};


/***/ }),

/***/ 2191:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ReleaseScript = void 0;
const utils_1 = __webpack_require__(6686);
const constants_1 = __webpack_require__(7154);
const input_1 = __webpack_require__(7714);
const command_1 = __webpack_require__(9529);
const options = {
    ci: {
        type: "boolean",
        default: true,
    },
    message: {
        type: "string",
        short: "m",
    },
    tag: {
        type: "string",
        short: "t",
        default: undefined,
    },
};
/**
 * @class ReleaseScript
 * @extends {Command<typeof options, void>}
 * @cavegory scripts
 * @description A command-line script for managing releases and version updates.
 * @summary This script automates the process of creating and pushing new releases. It handles version updates,
 * commit messages, and optionally publishes to NPM. The script supports semantic versioning and can work in both CI and non-CI environments.
 *
 * @param {Object} options - Configuration options for the script
 * @param {boolean} options.ci - Whether the script is running in a CI environment (default: true)
 * @param {string} options.message - The release message (short: 'm')
 * @param {string} options.tag - The version tag to use (short: 't', default: undefined)
 */
class ReleaseScript extends command_1.Command {
    constructor() {
        super("ReleaseScript", options);
    }
    /**
     * @description Prepares the version for the release.
     * @summary This method validates the provided tag or prompts the user for a new one if not provided or invalid.
     * It also displays the latest git tags for reference.
     * @param {string} tag - The version tag to prepare
     * @returns {Promise<string>} The prepared version tag
     *
     * @mermaid
     * sequenceDiagram
     *   participant R as ReleaseScript
     *   participant T as TestVersion
     *   participant U as UserInput
     *   participant G as Git
     *   R->>T: testVersion(tag)
     *   alt tag is valid
     *     T-->>R: return tag
     *   else tag is invalid or not provided
     *     R->>G: List latest git tags
     *     R->>U: Prompt for new tag
     *     U-->>R: return new tag
     *   end
     */
    async prepareVersion(tag) {
        const log = this.log.for(this.prepareVersion);
        tag = this.testVersion(tag || "");
        if (!tag) {
            log.verbose("No release message provided. Prompting for one:");
            log.info(`Listing latest git tags:`);
            await (0, utils_1.runCommand)("git tag --sort=-taggerdate | head -n 5").promise;
            return await input_1.UserInput.insistForText("tag", "Enter the new tag number (accepts v*.*.*[-...])", (val) => !!val.toString().match(/^v[0-9]+\.[0-9]+.[0-9]+(-[0-9a-zA-Z-]+)?$/));
        }
        return tag;
    }
    /**
     * @description Tests if the provided version is valid.
     * @summary This method checks if the version is a valid semantic version or a predefined update type (PATCH, MINOR, MAJOR).
     * @param {string} version - The version to test
     * @returns {string | undefined} The validated version or undefined if invalid
     */
    testVersion(version) {
        const log = this.log.for(this.testVersion);
        version = version.trim().toLowerCase();
        switch (version) {
            case constants_1.SemVersion.PATCH:
            case constants_1.SemVersion.MINOR:
            case constants_1.SemVersion.MAJOR:
                log.verbose(`Using provided SemVer update: ${version}`, 1);
                return version;
            default:
                log.verbose(`Testing provided version for SemVer compatibility: ${version}`, 1);
                if (!new RegExp(constants_1.SemVersionRegex).test(version)) {
                    log.debug(`Invalid version number: ${version}`);
                    return undefined;
                }
                log.verbose(`version approved: ${version}`, 1);
                return version;
        }
    }
    /**
     * @description Prepares the release message.
     * @summary This method either returns the provided message or prompts the user for a new one if not provided.
     * @param {string} [message] - The release message
     * @returns {Promise<string>} The prepared release message
     */
    async prepareMessage(message) {
        const log = this.log.for(this.prepareMessage);
        if (!message) {
            log.verbose("No release message provided. Prompting for one");
            return await input_1.UserInput.insistForText("message", "What should be the release message/ticket?", (val) => !!val && val.toString().length > 5);
        }
        return message;
    }
    /**
     * @description Runs the release script.
     * @summary This method orchestrates the entire release process, including version preparation, message creation,
     * git operations, and npm publishing (if not in CI environment).
     * @param {ParseArgsResult} args - The parsed command-line arguments
     * @returns {Promise<void>}
     *
     * @mermaid
     * sequenceDiagram
     *   participant R as ReleaseScript
     *   participant V as PrepareVersion
     *   participant M as PrepareMessage
     *   participant N as NPM
     *   participant G as Git
     *   participant U as UserInput
     *   R->>V: prepareVersion(tag)
     *   R->>M: prepareMessage(message)
     *   R->>N: Run prepare-release script
     *   R->>G: Check git status
     *   alt changes exist
     *     R->>U: Ask for confirmation
     *     U-->>R: Confirm
     *     R->>G: Add and commit changes
     *   end
     *   R->>N: Update npm version
     *   R->>G: Push changes and tags
     *   alt not CI environment
     *     R->>N: Publish to npm
     *   end
     */
    async run(args) {
        let result;
        const { ci } = args;
        let { tag, message } = args;
        tag = await this.prepareVersion(tag);
        message = await this.prepareMessage(message);
        result = await (0, utils_1.runCommand)(`npm run prepare-release -- ${tag} ${message}`, {
            cwd: process.cwd(),
        }).promise;
        result = await (0, utils_1.runCommand)("git status --porcelain").promise;
        await result;
        if (result.logs.length &&
            (await input_1.UserInput.askConfirmation("git-changes", "Do you want to push the changes to the remote repository?", true))) {
            await (0, utils_1.runCommand)("git add .").promise;
            await (0, utils_1.runCommand)(`git commit -m "${tag} - ${message} - after release preparation${ci ? "" : constants_1.NoCIFLag}"`).promise;
        }
        await (0, utils_1.runCommand)(`npm version "${tag}" -m "${message}${ci ? "" : constants_1.NoCIFLag}"`).promise;
        await (0, utils_1.runCommand)("git push --follow-tags").promise;
        if (!ci) {
            await (0, utils_1.runCommand)("NPM_TOKEN=$(cat .npmtoken) npm publish --access public")
                .promise;
        }
    }
}
exports.ReleaseScript = ReleaseScript;


/***/ }),

/***/ 2287:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const DatePart = __webpack_require__(5568);

class Month extends DatePart {
  constructor(opts={}) {
    super(opts);
  }

  up() {
    this.date.setMonth(this.date.getMonth() + 1);
  }

  down() {
    this.date.setMonth(this.date.getMonth() - 1);
  }

  setTo(val) {
    val = parseInt(val.substr(-2)) - 1;
    this.date.setMonth(val < 0 ? 0 : val);
  }

  toString() {
    let month = this.date.getMonth();
    let tl = this.token.length;
    return tl === 2 ? String(month + 1).padStart(2, '0')
           : tl === 3 ? this.locales.monthsShort[month]
             : tl === 4 ? this.locales.months[month]
               : String(month + 1);
  }
}

module.exports = Month;


/***/ }),

/***/ 2368:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const DatePart = __webpack_require__(5568);

class Year extends DatePart {
  constructor(opts={}) {
    super(opts);
  }

  up() {
    this.date.setFullYear(this.date.getFullYear() + 1);
  }

  down() {
    this.date.setFullYear(this.date.getFullYear() - 1);
  }

  setTo(val) {
    this.date.setFullYear(val.substr(-4));
  }

  toString() {
    let year = String(this.date.getFullYear()).padStart(4, '0');
    return this.token.length === 2 ? year.substr(-2) : year;
  }
}

module.exports = Year;


/***/ }),

/***/ 2376:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const DatePart = __webpack_require__(5568);

class Seconds extends DatePart {
  constructor(opts={}) {
    super(opts);
  }

  up() {
    this.date.setSeconds(this.date.getSeconds() + 1);
  }

  down() {
    this.date.setSeconds(this.date.getSeconds() - 1);
  }

  setTo(val) {
    this.date.setSeconds(parseInt(val.substr(-2)));
  }

  toString() {
    let s = this.date.getSeconds();
    return this.token.length > 1 ? String(s).padStart(2, '0') : s;
  }
}

module.exports = Seconds;


/***/ }),

/***/ 2378:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const color = __webpack_require__(1394);
const Prompt = __webpack_require__(4872);
const { style, clear, figures } = __webpack_require__(1189);
const { erase, cursor } = __webpack_require__(723);
const { DatePart, Meridiem, Day, Hours, Milliseconds, Minutes, Month, Seconds, Year } = __webpack_require__(7957);

const regex = /\\(.)|"((?:\\["\\]|[^"])+)"|(D[Do]?|d{3,4}|d)|(M{1,4})|(YY(?:YY)?)|([aA])|([Hh]{1,2})|(m{1,2})|(s{1,2})|(S{1,4})|./g;
const regexGroups = {
  1: ({token}) => token.replace(/\\(.)/g, '$1'),
  2: (opts) => new Day(opts), // Day // TODO
  3: (opts) => new Month(opts), // Month
  4: (opts) => new Year(opts), // Year
  5: (opts) => new Meridiem(opts), // AM/PM // TODO (special)
  6: (opts) => new Hours(opts), // Hours
  7: (opts) => new Minutes(opts), // Minutes
  8: (opts) => new Seconds(opts), // Seconds
  9: (opts) => new Milliseconds(opts), // Fractional seconds
}

const dfltLocales = {
  months: 'January,February,March,April,May,June,July,August,September,October,November,December'.split(','),
  monthsShort: 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec'.split(','),
  weekdays: 'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday'.split(','),
  weekdaysShort: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat'.split(',')
}


/**
 * DatePrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Number} [opts.initial] Index of default value
 * @param {String} [opts.mask] The format mask
 * @param {object} [opts.locales] The date locales
 * @param {String} [opts.error] The error message shown on invalid value
 * @param {Function} [opts.validate] Function to validate the submitted value
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */
class DatePrompt extends Prompt {
  constructor(opts={}) {
    super(opts);
    this.msg = opts.message;
    this.cursor = 0;
    this.typed = '';
    this.locales = Object.assign(dfltLocales, opts.locales);
    this._date = opts.initial || new Date();
    this.errorMsg = opts.error || 'Please Enter A Valid Value';
    this.validator = opts.validate || (() => true);
    this.mask = opts.mask || 'YYYY-MM-DD HH:mm:ss';
    this.clear = clear('', this.out.columns);
    this.render();
  }

  get value() {
    return this.date
  }

  get date() {
    return this._date;
  }

  set date(date) {
    if (date) this._date.setTime(date.getTime());
  }

  set mask(mask) {
    let result;
    this.parts = [];
    while(result = regex.exec(mask)) {
      let match = result.shift();
      let idx = result.findIndex(gr => gr != null);
      this.parts.push(idx in regexGroups
        ? regexGroups[idx]({ token: result[idx] || match, date: this.date, parts: this.parts, locales: this.locales })
        : result[idx] || match);
    }

    let parts = this.parts.reduce((arr, i) => {
      if (typeof i === 'string' && typeof arr[arr.length - 1] === 'string')
        arr[arr.length - 1] += i;
      else arr.push(i);
      return arr;
    }, []);

    this.parts.splice(0);
    this.parts.push(...parts);
    this.reset();
  }

  moveCursor(n) {
    this.typed = '';
    this.cursor = n;
    this.fire();
  }

  reset() {
    this.moveCursor(this.parts.findIndex(p => p instanceof DatePart));
    this.fire();
    this.render();
  }

  exit() {
    this.abort();
  }

  abort() {
    this.done = this.aborted = true;
    this.error = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  async validate() {
    let valid = await this.validator(this.value);
    if (typeof valid === 'string') {
      this.errorMsg = valid;
      valid = false;
    }
    this.error = !valid;
  }

  async submit() {
    await this.validate();
    if (this.error) {
      this.color = 'red';
      this.fire();
      this.render();
      return;
    }
    this.done = true;
    this.aborted = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  up() {
    this.typed = '';
    this.parts[this.cursor].up();
    this.render();
  }

  down() {
    this.typed = '';
    this.parts[this.cursor].down();
    this.render();
  }

  left() {
    let prev = this.parts[this.cursor].prev();
    if (prev == null) return this.bell();
    this.moveCursor(this.parts.indexOf(prev));
    this.render();
  }

  right() {
    let next = this.parts[this.cursor].next();
    if (next == null) return this.bell();
    this.moveCursor(this.parts.indexOf(next));
    this.render();
  }

  next() {
    let next = this.parts[this.cursor].next();
    this.moveCursor(next
      ? this.parts.indexOf(next)
      : this.parts.findIndex((part) => part instanceof DatePart));
    this.render();
  }

  _(c) {
    if (/\d/.test(c)) {
      this.typed += c;
      this.parts[this.cursor].setTo(this.typed);
      this.render();
    }
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);
    else this.out.write(clear(this.outputText, this.out.columns));
    super.render();

    // Print prompt
    this.outputText = [
      style.symbol(this.done, this.aborted),
      color.bold(this.msg),
      style.delimiter(false),
      this.parts.reduce((arr, p, idx) => arr.concat(idx === this.cursor && !this.done ? color.cyan().underline(p.toString()) : p), [])
          .join('')
    ].join(' ');

    // Print error
    if (this.error) {
      this.outputText += this.errorMsg.split('\n').reduce(
          (a, l, i) => a + `\n${i ? ` ` : figures.pointerSmall} ${color.red().italic(l)}`, ``);
    }

    this.out.write(erase.line + cursor.to(0) + this.outputText);
  }
}

module.exports = DatePrompt;


/***/ }),

/***/ 2522:
/***/ ((module) => {

"use strict";


module.exports = (key, isSelect) => {
  if (key.meta && key.name !== 'escape') return;

  if (key.ctrl) {
    if (key.name === 'a') return 'first';
    if (key.name === 'c') return 'abort';
    if (key.name === 'd') return 'abort';
    if (key.name === 'e') return 'last';
    if (key.name === 'g') return 'reset';
  }

  if (isSelect) {
    if (key.name === 'j') return 'down';
    if (key.name === 'k') return 'up';
  }

  if (key.name === 'return') return 'submit';
  if (key.name === 'enter') return 'submit'; // ctrl + J

  if (key.name === 'backspace') return 'delete';
  if (key.name === 'delete') return 'deleteForward';
  if (key.name === 'abort') return 'abort';
  if (key.name === 'escape') return 'exit';
  if (key.name === 'tab') return 'next';
  if (key.name === 'pagedown') return 'nextPage';
  if (key.name === 'pageup') return 'prevPage'; // TODO create home() in prompt types (e.g. TextPrompt)

  if (key.name === 'home') return 'home'; // TODO create end() in prompt types (e.g. TextPrompt)

  if (key.name === 'end') return 'end';
  if (key.name === 'up') return 'up';
  if (key.name === 'down') return 'down';
  if (key.name === 'right') return 'right';
  if (key.name === 'left') return 'left';
  return false;
};

/***/ }),

/***/ 2672:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const DatePart = __webpack_require__(5568);

class Minutes extends DatePart {
  constructor(opts={}) {
    super(opts);
  }

  up() {
    this.date.setMinutes(this.date.getMinutes() + 1);
  }

  down() {
    this.date.setMinutes(this.date.getMinutes() - 1);
  }

  setTo(val) {
    this.date.setMinutes(parseInt(val.substr(-2)));
  }

  toString() {
    let m = this.date.getMinutes();
    return this.token.length > 1 ? String(m).padStart(2, '0') : m;
  }
}

module.exports = Minutes;


/***/ }),

/***/ 2869:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const color = __webpack_require__(1394);
const { cursor } = __webpack_require__(723);
const MultiselectPrompt = __webpack_require__(405);
const { clear, style, figures } = __webpack_require__(1189);
/**
 * MultiselectPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Array} opts.choices Array of choice objects
 * @param {String} [opts.hint] Hint to display
 * @param {String} [opts.warn] Hint shown for disabled choices
 * @param {Number} [opts.max] Max choices
 * @param {Number} [opts.cursor=0] Cursor start position
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */
class AutocompleteMultiselectPrompt extends MultiselectPrompt {
  constructor(opts={}) {
    opts.overrideRender = true;
    super(opts);
    this.inputValue = '';
    this.clear = clear('', this.out.columns);
    this.filteredOptions = this.value;
    this.render();
  }

  last() {
    this.cursor = this.filteredOptions.length - 1;
    this.render();
  }
  next() {
    this.cursor = (this.cursor + 1) % this.filteredOptions.length;
    this.render();
  }

  up() {
    if (this.cursor === 0) {
      this.cursor = this.filteredOptions.length - 1;
    } else {
      this.cursor--;
    }
    this.render();
  }

  down() {
    if (this.cursor === this.filteredOptions.length - 1) {
      this.cursor = 0;
    } else {
      this.cursor++;
    }
    this.render();
  }

  left() {
    this.filteredOptions[this.cursor].selected = false;
    this.render();
  }

  right() {
    if (this.value.filter(e => e.selected).length >= this.maxChoices) return this.bell();
    this.filteredOptions[this.cursor].selected = true;
    this.render();
  }

  delete() {
    if (this.inputValue.length) {
      this.inputValue = this.inputValue.substr(0, this.inputValue.length - 1);
      this.updateFilteredOptions();
    }
  }

  updateFilteredOptions() {
    const currentHighlight = this.filteredOptions[this.cursor];
    this.filteredOptions = this.value
      .filter(v => {
        if (this.inputValue) {
          if (typeof v.title === 'string') {
            if (v.title.toLowerCase().includes(this.inputValue.toLowerCase())) {
              return true;
            }
          }
          if (typeof v.value === 'string') {
            if (v.value.toLowerCase().includes(this.inputValue.toLowerCase())) {
              return true;
            }
          }
          return false;
        }
        return true;
      });
    const newHighlightIndex = this.filteredOptions.findIndex(v => v === currentHighlight)
    this.cursor = newHighlightIndex < 0 ? 0 : newHighlightIndex;
    this.render();
  }

  handleSpaceToggle() {
    const v = this.filteredOptions[this.cursor];

    if (v.selected) {
      v.selected = false;
      this.render();
    } else if (v.disabled || this.value.filter(e => e.selected).length >= this.maxChoices) {
      return this.bell();
    } else {
      v.selected = true;
      this.render();
    }
  }

  handleInputChange(c) {
    this.inputValue = this.inputValue + c;
    this.updateFilteredOptions();
  }

  _(c, key) {
    if (c === ' ') {
      this.handleSpaceToggle();
    } else {
      this.handleInputChange(c);
    }
  }

  renderInstructions() {
    if (this.instructions === undefined || this.instructions) {
      if (typeof this.instructions === 'string') {
        return this.instructions;
      }
      return `
Instructions:
    ${figures.arrowUp}/${figures.arrowDown}: Highlight option
    ${figures.arrowLeft}/${figures.arrowRight}/[space]: Toggle selection
    [a,b,c]/delete: Filter choices
    enter/return: Complete answer
`;
    }
    return '';
  }

  renderCurrentInput() {
    return `
Filtered results for: ${this.inputValue ? this.inputValue : color.gray('Enter something to filter')}\n`;
  }

  renderOption(cursor, v, i) {
    let title;
    if (v.disabled) title = cursor === i ? color.gray().underline(v.title) : color.strikethrough().gray(v.title);
    else title = cursor === i ? color.cyan().underline(v.title) : v.title;
    return (v.selected ? color.green(figures.radioOn) : figures.radioOff) + '  ' + title
  }

  renderDoneOrInstructions() {
    if (this.done) {
      return this.value
        .filter(e => e.selected)
        .map(v => v.title)
        .join(', ');
    }

    const output = [color.gray(this.hint), this.renderInstructions(), this.renderCurrentInput()];

    if (this.filteredOptions.length && this.filteredOptions[this.cursor].disabled) {
      output.push(color.yellow(this.warn));
    }
    return output.join(' ');
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);
    super.render();

    // print prompt

    let prompt = [
      style.symbol(this.done, this.aborted),
      color.bold(this.msg),
      style.delimiter(false),
      this.renderDoneOrInstructions()
    ].join(' ');

    if (this.showMinError) {
      prompt += color.red(`You must select a minimum of ${this.minSelected} choices.`);
      this.showMinError = false;
    }
    prompt += this.renderOptions(this.filteredOptions);

    this.out.write(this.clear + prompt);
    this.clear = clear(prompt, this.out.columns);
  }
}

module.exports = AutocompleteMultiselectPrompt;


/***/ }),

/***/ 2935:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(7154), exports);
__exportStar(__webpack_require__(2030), exports);
__exportStar(__webpack_require__(3340), exports);
__exportStar(__webpack_require__(4747), exports);
__exportStar(__webpack_require__(1928), exports);
__exportStar(__webpack_require__(3874), exports);
__exportStar(__webpack_require__(6686), exports);


/***/ }),

/***/ 2947:
/***/ ((module) => {

"use strict";
module.exports = __WEBPACK_EXTERNAL_MODULE__2947__;

/***/ }),

/***/ 3075:
/***/ ((module) => {

"use strict";


module.exports = (key, isSelect) => {
  if (key.meta && key.name !== 'escape') return;
  
  if (key.ctrl) {
    if (key.name === 'a') return 'first';
    if (key.name === 'c') return 'abort';
    if (key.name === 'd') return 'abort';
    if (key.name === 'e') return 'last';
    if (key.name === 'g') return 'reset';
  }
  
  if (isSelect) {
    if (key.name === 'j') return 'down';
    if (key.name === 'k') return 'up';
  }

  if (key.name === 'return') return 'submit';
  if (key.name === 'enter') return 'submit'; // ctrl + J
  if (key.name === 'backspace') return 'delete';
  if (key.name === 'delete') return 'deleteForward';
  if (key.name === 'abort') return 'abort';
  if (key.name === 'escape') return 'exit';
  if (key.name === 'tab') return 'next';
  if (key.name === 'pagedown') return 'nextPage';
  if (key.name === 'pageup') return 'prevPage';
  // TODO create home() in prompt types (e.g. TextPrompt)
  if (key.name === 'home') return 'home';
  // TODO create end() in prompt types (e.g. TextPrompt)
  if (key.name === 'end') return 'end';

  if (key.name === 'up') return 'up';
  if (key.name === 'down') return 'down';
  if (key.name === 'right') return 'right';
  if (key.name === 'left') return 'left';

  return false;
};


/***/ }),

/***/ 3179:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const color = __webpack_require__(1394);

const Prompt = __webpack_require__(4597);

const _require = __webpack_require__(4586),
      style = _require.style,
      clear = _require.clear,
      figures = _require.figures,
      wrap = _require.wrap,
      entriesToDisplay = _require.entriesToDisplay;

const _require2 = __webpack_require__(723),
      cursor = _require2.cursor;
/**
 * SelectPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Array} opts.choices Array of choice objects
 * @param {String} [opts.hint] Hint to display
 * @param {Number} [opts.initial] Index of default value
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 * @param {Number} [opts.optionsPerPage=10] Max options to display at once
 */


class SelectPrompt extends Prompt {
  constructor(opts = {}) {
    super(opts);
    this.msg = opts.message;
    this.hint = opts.hint || '- Use arrow-keys. Return to submit.';
    this.warn = opts.warn || '- This option is disabled';
    this.cursor = opts.initial || 0;
    this.choices = opts.choices.map((ch, idx) => {
      if (typeof ch === 'string') ch = {
        title: ch,
        value: idx
      };
      return {
        title: ch && (ch.title || ch.value || ch),
        value: ch && (ch.value === undefined ? idx : ch.value),
        description: ch && ch.description,
        selected: ch && ch.selected,
        disabled: ch && ch.disabled
      };
    });
    this.optionsPerPage = opts.optionsPerPage || 10;
    this.value = (this.choices[this.cursor] || {}).value;
    this.clear = clear('', this.out.columns);
    this.render();
  }

  moveCursor(n) {
    this.cursor = n;
    this.value = this.choices[n].value;
    this.fire();
  }

  reset() {
    this.moveCursor(0);
    this.fire();
    this.render();
  }

  exit() {
    this.abort();
  }

  abort() {
    this.done = this.aborted = true;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  submit() {
    if (!this.selection.disabled) {
      this.done = true;
      this.aborted = false;
      this.fire();
      this.render();
      this.out.write('\n');
      this.close();
    } else this.bell();
  }

  first() {
    this.moveCursor(0);
    this.render();
  }

  last() {
    this.moveCursor(this.choices.length - 1);
    this.render();
  }

  up() {
    if (this.cursor === 0) {
      this.moveCursor(this.choices.length - 1);
    } else {
      this.moveCursor(this.cursor - 1);
    }

    this.render();
  }

  down() {
    if (this.cursor === this.choices.length - 1) {
      this.moveCursor(0);
    } else {
      this.moveCursor(this.cursor + 1);
    }

    this.render();
  }

  next() {
    this.moveCursor((this.cursor + 1) % this.choices.length);
    this.render();
  }

  _(c, key) {
    if (c === ' ') return this.submit();
  }

  get selection() {
    return this.choices[this.cursor];
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);else this.out.write(clear(this.outputText, this.out.columns));
    super.render();

    let _entriesToDisplay = entriesToDisplay(this.cursor, this.choices.length, this.optionsPerPage),
        startIndex = _entriesToDisplay.startIndex,
        endIndex = _entriesToDisplay.endIndex; // Print prompt


    this.outputText = [style.symbol(this.done, this.aborted), color.bold(this.msg), style.delimiter(false), this.done ? this.selection.title : this.selection.disabled ? color.yellow(this.warn) : color.gray(this.hint)].join(' '); // Print choices

    if (!this.done) {
      this.outputText += '\n';

      for (let i = startIndex; i < endIndex; i++) {
        let title,
            prefix,
            desc = '',
            v = this.choices[i]; // Determine whether to display "more choices" indicators

        if (i === startIndex && startIndex > 0) {
          prefix = figures.arrowUp;
        } else if (i === endIndex - 1 && endIndex < this.choices.length) {
          prefix = figures.arrowDown;
        } else {
          prefix = ' ';
        }

        if (v.disabled) {
          title = this.cursor === i ? color.gray().underline(v.title) : color.strikethrough().gray(v.title);
          prefix = (this.cursor === i ? color.bold().gray(figures.pointer) + ' ' : '  ') + prefix;
        } else {
          title = this.cursor === i ? color.cyan().underline(v.title) : v.title;
          prefix = (this.cursor === i ? color.cyan(figures.pointer) + ' ' : '  ') + prefix;

          if (v.description && this.cursor === i) {
            desc = ` - ${v.description}`;

            if (prefix.length + title.length + desc.length >= this.out.columns || v.description.split(/\r?\n/).length > 1) {
              desc = '\n' + wrap(v.description, {
                margin: 3,
                width: this.out.columns
              });
            }
          }
        }

        this.outputText += `${prefix} ${title}${color.gray(desc)}\n`;
      }
    }

    this.out.write(this.outputText);
  }

}

module.exports = SelectPrompt;

/***/ }),

/***/ 3217:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const DatePart = __webpack_require__(323);

class Seconds extends DatePart {
  constructor(opts = {}) {
    super(opts);
  }

  up() {
    this.date.setSeconds(this.date.getSeconds() + 1);
  }

  down() {
    this.date.setSeconds(this.date.getSeconds() - 1);
  }

  setTo(val) {
    this.date.setSeconds(parseInt(val.substr(-2)));
  }

  toString() {
    let s = this.date.getSeconds();
    return this.token.length > 1 ? String(s).padStart(2, '0') : s;
  }

}

module.exports = Seconds;

/***/ }),

/***/ 3258:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


const $ = exports;

const el = __webpack_require__(3847);

const noop = v => v;

function toPrompt(type, args, opts = {}) {
  return new Promise((res, rej) => {
    const p = new el[type](args);
    const onAbort = opts.onAbort || noop;
    const onSubmit = opts.onSubmit || noop;
    const onExit = opts.onExit || noop;
    p.on('state', args.onState || noop);
    p.on('submit', x => res(onSubmit(x)));
    p.on('exit', x => res(onExit(x)));
    p.on('abort', x => rej(onAbort(x)));
  });
}
/**
 * Text prompt
 * @param {string} args.message Prompt message to display
 * @param {string} [args.initial] Default string value
 * @param {string} [args.style="default"] Render style ('default', 'password', 'invisible')
 * @param {function} [args.onState] On state change callback
 * @param {function} [args.validate] Function to validate user input
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */


$.text = args => toPrompt('TextPrompt', args);
/**
 * Password prompt with masked input
 * @param {string} args.message Prompt message to display
 * @param {string} [args.initial] Default string value
 * @param {function} [args.onState] On state change callback
 * @param {function} [args.validate] Function to validate user input
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */


$.password = args => {
  args.style = 'password';
  return $.text(args);
};
/**
 * Prompt where input is invisible, like sudo
 * @param {string} args.message Prompt message to display
 * @param {string} [args.initial] Default string value
 * @param {function} [args.onState] On state change callback
 * @param {function} [args.validate] Function to validate user input
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */


$.invisible = args => {
  args.style = 'invisible';
  return $.text(args);
};
/**
 * Number prompt
 * @param {string} args.message Prompt message to display
 * @param {number} args.initial Default number value
 * @param {function} [args.onState] On state change callback
 * @param {number} [args.max] Max value
 * @param {number} [args.min] Min value
 * @param {string} [args.style="default"] Render style ('default', 'password', 'invisible')
 * @param {Boolean} [opts.float=false] Parse input as floats
 * @param {Number} [opts.round=2] Round floats to x decimals
 * @param {Number} [opts.increment=1] Number to increment by when using arrow-keys
 * @param {function} [args.validate] Function to validate user input
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */


$.number = args => toPrompt('NumberPrompt', args);
/**
 * Date prompt
 * @param {string} args.message Prompt message to display
 * @param {number} args.initial Default number value
 * @param {function} [args.onState] On state change callback
 * @param {number} [args.max] Max value
 * @param {number} [args.min] Min value
 * @param {string} [args.style="default"] Render style ('default', 'password', 'invisible')
 * @param {Boolean} [opts.float=false] Parse input as floats
 * @param {Number} [opts.round=2] Round floats to x decimals
 * @param {Number} [opts.increment=1] Number to increment by when using arrow-keys
 * @param {function} [args.validate] Function to validate user input
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */


$.date = args => toPrompt('DatePrompt', args);
/**
 * Classic yes/no prompt
 * @param {string} args.message Prompt message to display
 * @param {boolean} [args.initial=false] Default value
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */


$.confirm = args => toPrompt('ConfirmPrompt', args);
/**
 * List prompt, split intput string by `seperator`
 * @param {string} args.message Prompt message to display
 * @param {string} [args.initial] Default string value
 * @param {string} [args.style="default"] Render style ('default', 'password', 'invisible')
 * @param {string} [args.separator] String separator
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input, in form of an `Array`
 */


$.list = args => {
  const sep = args.separator || ',';
  return toPrompt('TextPrompt', args, {
    onSubmit: str => str.split(sep).map(s => s.trim())
  });
};
/**
 * Toggle/switch prompt
 * @param {string} args.message Prompt message to display
 * @param {boolean} [args.initial=false] Default value
 * @param {string} [args.active="on"] Text for `active` state
 * @param {string} [args.inactive="off"] Text for `inactive` state
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */


$.toggle = args => toPrompt('TogglePrompt', args);
/**
 * Interactive select prompt
 * @param {string} args.message Prompt message to display
 * @param {Array} args.choices Array of choices objects `[{ title, value }, ...]`
 * @param {number} [args.initial] Index of default value
 * @param {String} [args.hint] Hint to display
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */


$.select = args => toPrompt('SelectPrompt', args);
/**
 * Interactive multi-select / autocompleteMultiselect prompt
 * @param {string} args.message Prompt message to display
 * @param {Array} args.choices Array of choices objects `[{ title, value, [selected] }, ...]`
 * @param {number} [args.max] Max select
 * @param {string} [args.hint] Hint to display user
 * @param {Number} [args.cursor=0] Cursor start position
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */


$.multiselect = args => {
  args.choices = [].concat(args.choices || []);

  const toSelected = items => items.filter(item => item.selected).map(item => item.value);

  return toPrompt('MultiselectPrompt', args, {
    onAbort: toSelected,
    onSubmit: toSelected
  });
};

$.autocompleteMultiselect = args => {
  args.choices = [].concat(args.choices || []);

  const toSelected = items => items.filter(item => item.selected).map(item => item.value);

  return toPrompt('AutocompleteMultiselectPrompt', args, {
    onAbort: toSelected,
    onSubmit: toSelected
  });
};

const byTitle = (input, choices) => Promise.resolve(choices.filter(item => item.title.slice(0, input.length).toLowerCase() === input.toLowerCase()));
/**
 * Interactive auto-complete prompt
 * @param {string} args.message Prompt message to display
 * @param {Array} args.choices Array of auto-complete choices objects `[{ title, value }, ...]`
 * @param {Function} [args.suggest] Function to filter results based on user input. Defaults to sort by `title`
 * @param {number} [args.limit=10] Max number of results to show
 * @param {string} [args.style="default"] Render style ('default', 'password', 'invisible')
 * @param {String} [args.initial] Index of the default value
 * @param {boolean} [opts.clearFirst] The first ESCAPE keypress will clear the input
 * @param {String} [args.fallback] Fallback message - defaults to initial value
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */


$.autocomplete = args => {
  args.suggest = args.suggest || byTitle;
  args.choices = [].concat(args.choices || []);
  return toPrompt('AutocompletePrompt', args);
};

/***/ }),

/***/ 3340:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.patchFile = patchFile;
exports.readFile = readFile;
exports.writeFile = writeFile;
exports.getPackage = getPackage;
exports.setPackageAttribute = setPackageAttribute;
exports.getPackageVersion = getPackageVersion;
exports.getDependencies = getDependencies;
exports.updateDependencies = updateDependencies;
exports.installIfNotAvailable = installIfNotAvailable;
exports.pushToGit = pushToGit;
exports.installDependencies = installDependencies;
exports.normalizeImport = normalizeImport;
const fs_1 = __importDefault(__webpack_require__(2947));
const path_1 = __importDefault(__webpack_require__(3911));
const logging_1 = __webpack_require__(9834);
const text_1 = __webpack_require__(1928);
const utils_1 = __webpack_require__(6686);
const logger = logging_1.Logging.for("fs");
/**
 * @description Patches a file with given values.
 * @summary Reads a file, applies patches using TextUtils, and writes the result back to the file.
 *
 * @param {string} path - The path to the file to be patched.
 * @param {Record<string, number | string>} values - The values to patch into the file.
 * @return {void}
 *
 * @function patchFile
 *
 * @mermaid
 * sequenceDiagram
 *   participant Caller
 *   participant patchFile
 *   participant fs
 *   participant readFile
 *   participant TextUtils
 *   participant writeFile
 *   Caller->>patchFile: Call with path and values
 *   patchFile->>fs: Check if file exists
 *   patchFile->>readFile: Read file content
 *   readFile->>fs: Read file
 *   fs-->>readFile: Return file content
 *   readFile-->>patchFile: Return file content
 *   patchFile->>TextUtils: Patch string
 *   TextUtils-->>patchFile: Return patched content
 *   patchFile->>writeFile: Write patched content
 *   writeFile->>fs: Write to file
 *   fs-->>writeFile: File written
 *   writeFile-->>patchFile: File written
 *   patchFile-->>Caller: Patching complete
 *
 * @memberOf module:fs-utils
 */
function patchFile(path, values) {
    const log = logger.for(patchFile);
    if (!fs_1.default.existsSync(path))
        throw new Error(`File not found at path "${path}".`);
    let content = readFile(path);
    try {
        log.verbose(`Patching file "${path}"...`);
        log.debug(`with value: ${JSON.stringify(values)}`);
        content = (0, text_1.patchString)(content, values);
    }
    catch (error) {
        throw new Error(`Error patching file: ${error}`);
    }
    writeFile(path, content);
}
/**
 * @description Reads a file and returns its content.
 * @summary Reads the content of a file at the specified path and returns it as a string.
 *
 * @param {string} path - The path to the file to be read.
 * @return {string} The content of the file.
 *
 * @function readFile
 *
 * @memberOf module:utils
 */
function readFile(path) {
    const log = logger.for(readFile);
    try {
        log.verbose(`Reading file "${path}"...`);
        return fs_1.default.readFileSync(path, "utf8");
    }
    catch (error) {
        log.verbose(`Error reading file "${path}": ${error}`);
        throw new Error(`Error reading file "${path}": ${error}`);
    }
}
/**
 * @description Writes data to a file.
 * @summary Writes the provided data to a file at the specified path.
 *
 * @param {string} path - The path to the file to be written.
 * @param {string | Buffer} data - The data to be written to the file.
 * @return {void}
 *
 * @function writeFile
 *
 * @memberOf module:utils
 */
function writeFile(path, data) {
    const log = logger.for(writeFile);
    try {
        log.verbose(`Writing file "${path} with ${data.length} bytes...`);
        fs_1.default.writeFileSync(path, data, "utf8");
    }
    catch (error) {
        log.verbose(`Error writing file "${path}": ${error}`);
        throw new Error(`Error writing file "${path}": ${error}`);
    }
}
/**
 * @description Retrieves package information from package.json.
 * @summary Loads and parses the package.json file from a specified directory or the current working directory. Can return the entire package object or a specific property.
 * @param {string} [p=process.cwd()] - The directory path where the package.json file is located.
 * @param {string} [property] - Optional. The specific property to retrieve from package.json.
 * @return {object | string} The parsed contents of package.json or the value of the specified property.
 * @function getPackage
 * @mermaid
 * sequenceDiagram
 *   participant Caller
 *   participant getPackage
 *   participant readFile
 *   participant JSON
 *   Caller->>getPackage: Call with path and optional property
 *   getPackage->>readFile: Read package.json
 *   readFile-->>getPackage: Return file content
 *   getPackage->>JSON: Parse file content
 *   JSON-->>getPackage: Return parsed object
 *   alt property specified
 *     getPackage->>getPackage: Check if property exists
 *     alt property exists
 *       getPackage-->>Caller: Return property value
 *     else property doesn't exist
 *       getPackage-->>Caller: Throw Error
 *     end
 *   else no property specified
 *     getPackage-->>Caller: Return entire package object
 *   end
 * @memberOf module:utils
 */
function getPackage(p = process.cwd(), property) {
    let pkg;
    try {
        pkg = JSON.parse(readFile(path_1.default.join(p, `package.json`)));
    }
    catch (error) {
        throw new Error(`Failed to retrieve package information" ${error}`);
    }
    if (property) {
        if (!(property in pkg))
            throw new Error(`Property "${property}" not found in package.json`);
        return pkg[property];
    }
    return pkg;
}
function setPackageAttribute(attr, value, p = process.cwd()) {
    const pkg = getPackage(p);
    pkg[attr] = value;
    writeFile(path_1.default.join(p, `package.json`), JSON.stringify(pkg, null, 2));
}
/**
 * @description Retrieves the version from package.json.
 * @summary A convenience function that calls getPackage to retrieve the "version" property from package.json.
 * @param {string} [p=process.cwd()] - The directory path where the package.json file is located.
 * @return {string} The version string from package.json.
 * @function getPackageVersion
 * @memberOf module:fs-utils
 */
function getPackageVersion(p = process.cwd()) {
    return getPackage(p, "version");
}
/**
 * @description Retrieves all dependencies from the project.
 * @summary Executes 'npm ls --json' command to get a detailed list of all dependencies (production, development, and peer) and their versions.
 * @param {string} [path=process.cwd()] - The directory path of the project.
 * @return {Promise<{prod: Array<{name: string, version: string}>, dev: Array<{name: string, version: string}>, peer: Array<{name: string, version: string}>}>} An object containing arrays of production, development, and peer dependencies.
 * @function getDependencies
 * @mermaid
 * sequenceDiagram
 *   participant Caller
 *   participant getDependencies
 *   participant runCommand
 *   participant JSON
 *   Caller->>getDependencies: Call with optional path
 *   getDependencies->>runCommand: Execute 'npm ls --json'
 *   runCommand-->>getDependencies: Return command output
 *   getDependencies->>JSON: Parse command output
 *   JSON-->>getDependencies: Return parsed object
 *   getDependencies->>getDependencies: Process dependencies
 *   getDependencies-->>Caller: Return processed dependencies
 * @memberOf module:fs-utils
 */
async function getDependencies(path = process.cwd()) {
    let pkg;
    try {
        pkg = JSON.parse(await (0, utils_1.runCommand)(`npm ls --json`, { cwd: path }).promise);
    }
    catch (e) {
        throw new Error(`Failed to retrieve dependencies: ${e}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const mapper = (entry, index) => ({
        name: entry[0],
        version: entry[1].version,
    });
    return {
        prod: Object.entries(pkg.dependencies || {}).map(mapper),
        dev: Object.entries(pkg.devDependencies || {}).map(mapper),
        peer: Object.entries(pkg.peerDependencies || {}).map(mapper),
    };
}
async function updateDependencies() {
    const log = logger.for(updateDependencies);
    log.info("checking for updates...");
    await (0, utils_1.runCommand)("npx npm-check-updates -u").promise;
    log.info("updating...");
    await (0, utils_1.runCommand)("npx npm run do-install").promise;
}
async function installIfNotAvailable(deps, dependencies) {
    if (!dependencies) {
        const d = await getDependencies();
        dependencies = {
            prod: d.prod?.map((p) => p.name) || [],
            dev: d.dev?.map((d) => d.name) || [],
            peer: d.peer?.map((p) => p.name) || [],
        };
    }
    const { prod, dev, peer } = dependencies;
    const installed = Array.from(new Set([...(prod || []), ...(dev || []), ...(peer || [])]));
    deps = typeof deps === "string" ? [deps] : deps;
    const toInstall = deps.filter((d) => !installed.includes(d));
    if (toInstall.length)
        await installDependencies({ dev: toInstall });
    dependencies.dev = dependencies.dev || [];
    dependencies.dev.push(...toInstall);
    return dependencies;
}
async function pushToGit() {
    const log = logger.for(pushToGit);
    const gitUser = await (0, utils_1.runCommand)("git config user.name").promise;
    const gitEmail = await (0, utils_1.runCommand)("git config user.email").promise;
    log.verbose(`cached git id: ${gitUser}/${gitEmail}. changing to automation`);
    await (0, utils_1.runCommand)('git config user.email "automation@decaf.ts"').promise;
    await (0, utils_1.runCommand)('git config user.name "decaf"').promise;
    log.info("Pushing changes to git...");
    await (0, utils_1.runCommand)("git add .").promise;
    await (0, utils_1.runCommand)(`git commit -m "refs #1 - after repo setup"`).promise;
    await (0, utils_1.runCommand)("git push").promise;
    await (0, utils_1.runCommand)(`git config user.email "${gitEmail}"`).promise;
    await (0, utils_1.runCommand)(`git config user.name "${gitUser}"`).promise;
    log.verbose(`reverted to git id: ${gitUser}/${gitEmail}`);
}
async function installDependencies(dependencies) {
    const log = logger.for(installDependencies);
    const prod = dependencies.prod || [];
    const dev = dependencies.dev || [];
    const peer = dependencies.peer || [];
    if (prod.length) {
        log.info(`Installing dependencies ${prod.join(", ")}...`);
        await (0, utils_1.runCommand)(`npm install ${prod.join(" ")}`, { cwd: process.cwd() })
            .promise;
    }
    if (dev.length) {
        log.info(`Installing devDependencies ${dev.join(", ")}...`);
        await (0, utils_1.runCommand)(`npm install --save-dev ${dev.join(" ")}`, {
            cwd: process.cwd(),
        }).promise;
    }
    if (peer.length) {
        log.info(`Installing peerDependencies ${peer.join(", ")}...`);
        await (0, utils_1.runCommand)(`npm install --save-peer ${peer.join(" ")}`, {
            cwd: process.cwd(),
        }).promise;
    }
}
async function normalizeImport(importPromise) {
    // CommonJS's `module.exports` is wrapped as `default` in ESModule.
    return importPromise.then((m) => (m.default || m));
}


/***/ }),

/***/ 3741:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ObjectAccumulator = void 0;
/**
 * @class ObjectAccumulator
 * @template T - The type of the accumulated object, extends object
 * @description A class that accumulates objects and provides type-safe access to their properties.
 * It allows for dynamic addition of properties while maintaining type information.
 * @summary Accumulates objects and maintains type information for accumulated properties
 * @memberOf utils
 */
class ObjectAccumulator {
    constructor() {
        Object.defineProperty(this, "__size", {
            value: 0,
            writable: true,
            configurable: false,
            enumerable: false,
        });
    }
    /**
     * @protected
     * @description Expands the accumulator with properties from a new object
     * @summary Adds new properties to the accumulator
     * @template V - The type of the object being expanded
     * @param {V} value - The object to expand with
     * @returns {void}
     */
    expand(value) {
        Object.entries(value).forEach(([k, v]) => {
            Object.defineProperty(this, k, {
                get: () => v,
                set: (val) => {
                    v = val;
                },
                configurable: true,
                enumerable: true,
            });
        });
    }
    /**
     * @description Accumulates a new object into the accumulator
     * @summary Adds properties from a new object to the accumulator, maintaining type information
     * @template V - The type of the object being accumulated
     * @param {V} value - The object to accumulate
     * @returns {T & V & ObjectAccumulator<T & V>} A new ObjectAccumulator instance with updated type information
     * @mermaid
     * sequenceDiagram
     *   participant A as Accumulator
     *   participant O as Object
     *   A->>O: Get entries
     *   loop For each entry
     *     A->>A: Define property
     *   end
     *   A->>A: Update size
     *   A->>A: Return updated accumulator
     */
    accumulate(value) {
        this.expand(value);
        this.__size = this.__size + Object.keys(value).length;
        return this;
    }
    /**
     * @description Retrieves a value from the accumulator by its key
     * @summary Gets a value from the accumulated object using a type-safe key
     * @template K - The key type, must be a key of this
     * @param {K} key - The key of the value to retrieve
     * @returns {this[K] | undefined} The value associated with the key, or undefined if not found
     */
    get(key) {
        return this[key];
    }
    /**
     * @description Checks if a key exists in the accumulator
     * @summary Determines whether the accumulator contains a specific key
     * @param {string} key - The key to check for existence
     * @returns {boolean} True if the key exists, false otherwise
     */
    has(key) {
        return !!this[key];
    }
    /**
     * @description Removes a key-value pair from the accumulator
     * @summary Deletes a property from the accumulated object
     * @param {keyof this | string} key - The key of the property to remove
     * @returns {Omit<this, typeof key> & ObjectAccumulator<Omit<this, typeof key>> | this} The accumulator instance with the specified property removed
     */
    remove(key) {
        if (!(key in this))
            return this;
        delete this[key];
        this.__size--;
        return this;
    }
    /**
     * @description Retrieves all keys from the accumulator
     * @summary Gets an array of all accumulated property keys
     * @returns {string[]} An array of keys as strings
     */
    keys() {
        return Object.keys(this);
    }
    /**
     * @description Retrieves all values from the accumulator
     * @summary Gets an array of all accumulated property values
     * @returns {T[keyof T][]} An array of values
     */
    values() {
        return Object.values(this);
    }
    /**
     * @description Gets the number of key-value pairs in the accumulator
     * @summary Returns the count of accumulated properties
     * @returns {number} The number of key-value pairs
     */
    size() {
        return this.__size;
    }
    /**
     * @description Clears all accumulated key-value pairs
     * @summary Removes all properties from the accumulator and returns a new empty instance
     * @returns {ObjectAccumulator<never>} A new empty ObjectAccumulator instance
     */
    clear() {
        return new ObjectAccumulator();
    }
    /**
     * @description Executes a callback for each key-value pair in the accumulator
     * @summary Iterates over all accumulated properties, calling a function for each
     * @param {(value: this[keyof this], key: keyof this, i: number) => void} callback - The function to execute for each entry
     * @returns {void}
     */
    forEach(callback) {
        Object.entries(this).forEach(([key, value], i) => callback(value, key, i));
    }
    /**
     * @description Creates a new array with the results of calling a provided function on every element in the accumulator
     * @summary Maps each accumulated property to a new value using a callback function
     * @template R - The type of the mapped values
     * @param {(value: this[keyof this], key: keyof this, i: number) => R} callback - Function that produces an element of the new array
     * @returns {R[]} A new array with each element being the result of the callback function
     */
    map(callback) {
        return Object.entries(this).map(([key, value], i) => callback(value, key, i));
    }
}
exports.ObjectAccumulator = ObjectAccumulator;


/***/ }),

/***/ 3785:
/***/ ((module) => {

"use strict";
module.exports = require("readline");

/***/ }),

/***/ 3847:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


module.exports = {
  TextPrompt: __webpack_require__(7160),
  SelectPrompt: __webpack_require__(3179),
  TogglePrompt: __webpack_require__(5319),
  DatePrompt: __webpack_require__(5359),
  NumberPrompt: __webpack_require__(8158),
  MultiselectPrompt: __webpack_require__(6818),
  AutocompletePrompt: __webpack_require__(1679),
  AutocompleteMultiselectPrompt: __webpack_require__(6854),
  ConfirmPrompt: __webpack_require__(9331)
};

/***/ }),

/***/ 3874:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));


/***/ }),

/***/ 3885:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isBrowser = isBrowser;
/**
 * @function isBrowser
 * @description Determines if the current environment is a browser by checking the prototype chain of the global object.
 * @summary Checks if the code is running in a browser environment.
 * @returns {boolean} True if the environment is a browser, false otherwise.
 */
function isBrowser() {
    return (Object.getPrototypeOf(Object.getPrototypeOf(globalThis)) !==
        Object.prototype);
}


/***/ }),

/***/ 3911:
/***/ ((module) => {

"use strict";
module.exports = __WEBPACK_EXTERNAL_MODULE__3911__;

/***/ }),

/***/ 3988:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const DatePart = __webpack_require__(323);

class Milliseconds extends DatePart {
  constructor(opts = {}) {
    super(opts);
  }

  up() {
    this.date.setMilliseconds(this.date.getMilliseconds() + 1);
  }

  down() {
    this.date.setMilliseconds(this.date.getMilliseconds() - 1);
  }

  setTo(val) {
    this.date.setMilliseconds(parseInt(val.substr(-this.token.length)));
  }

  toString() {
    return String(this.date.getMilliseconds()).padStart(4, '0').substr(0, this.token.length);
  }

}

module.exports = Milliseconds;

/***/ }),

/***/ 4182:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const strip = __webpack_require__(5815);

/**
 * @param {string} msg
 * @param {number} perLine
 */
module.exports = function (msg, perLine) {
  let lines = String(strip(msg) || '').split(/\r?\n/);

  if (!perLine) return lines.length;
  return lines.map(l => Math.ceil(l.length / perLine))
      .reduce((a, b) => a + b);
};


/***/ }),

/***/ 4230:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const color = __webpack_require__(1394);
const Prompt = __webpack_require__(4872);
const { erase, cursor } = __webpack_require__(723);
const { style, clear, figures, wrap, entriesToDisplay } = __webpack_require__(1189);

const getVal = (arr, i) => arr[i] && (arr[i].value || arr[i].title || arr[i]);
const getTitle = (arr, i) => arr[i] && (arr[i].title || arr[i].value || arr[i]);
const getIndex = (arr, valOrTitle) => {
  const index = arr.findIndex(el => el.value === valOrTitle || el.title === valOrTitle);
  return index > -1 ? index : undefined;
};

/**
 * TextPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Array} opts.choices Array of auto-complete choices objects
 * @param {Function} [opts.suggest] Filter function. Defaults to sort by title
 * @param {Number} [opts.limit=10] Max number of results to show
 * @param {Number} [opts.cursor=0] Cursor start position
 * @param {String} [opts.style='default'] Render style
 * @param {String} [opts.fallback] Fallback message - initial to default value
 * @param {String} [opts.initial] Index of the default value
 * @param {Boolean} [opts.clearFirst] The first ESCAPE keypress will clear the input
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 * @param {String} [opts.noMatches] The no matches found label
 */
class AutocompletePrompt extends Prompt {
  constructor(opts={}) {
    super(opts);
    this.msg = opts.message;
    this.suggest = opts.suggest;
    this.choices = opts.choices;
    this.initial = typeof opts.initial === 'number'
      ? opts.initial
      : getIndex(opts.choices, opts.initial);
    this.select = this.initial || opts.cursor || 0;
    this.i18n = { noMatches: opts.noMatches || 'no matches found' };
    this.fallback = opts.fallback || this.initial;
    this.clearFirst = opts.clearFirst || false;
    this.suggestions = [];
    this.input = '';
    this.limit = opts.limit || 10;
    this.cursor = 0;
    this.transform = style.render(opts.style);
    this.scale = this.transform.scale;
    this.render = this.render.bind(this);
    this.complete = this.complete.bind(this);
    this.clear = clear('', this.out.columns);
    this.complete(this.render);
    this.render();
  }

  set fallback(fb) {
    this._fb = Number.isSafeInteger(parseInt(fb)) ? parseInt(fb) : fb;
  }

  get fallback() {
    let choice;
    if (typeof this._fb === 'number')
      choice = this.choices[this._fb];
    else if (typeof this._fb === 'string')
      choice = { title: this._fb };
    return choice || this._fb || { title: this.i18n.noMatches };
  }

  moveSelect(i) {
    this.select = i;
    if (this.suggestions.length > 0)
      this.value = getVal(this.suggestions, i);
    else this.value = this.fallback.value;
    this.fire();
  }

  async complete(cb) {
    const p = (this.completing = this.suggest(this.input, this.choices));
    const suggestions = await p;

    if (this.completing !== p) return;
    this.suggestions = suggestions
      .map((s, i, arr) => ({ title: getTitle(arr, i), value: getVal(arr, i), description: s.description }));
    this.completing = false;
    const l = Math.max(suggestions.length - 1, 0);
    this.moveSelect(Math.min(l, this.select));

    cb && cb();
  }

  reset() {
    this.input = '';
    this.complete(() => {
      this.moveSelect(this.initial !== void 0 ? this.initial : 0);
      this.render();
    });
    this.render();
  }

  exit() {
    if (this.clearFirst && this.input.length > 0) {
      this.reset();
    } else {
      this.done = this.exited = true; 
      this.aborted = false;
      this.fire();
      this.render();
      this.out.write('\n');
      this.close();
    }
  }

  abort() {
    this.done = this.aborted = true;
    this.exited = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  submit() {
    this.done = true;
    this.aborted = this.exited = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  _(c, key) {
    let s1 = this.input.slice(0, this.cursor);
    let s2 = this.input.slice(this.cursor);
    this.input = `${s1}${c}${s2}`;
    this.cursor = s1.length+1;
    this.complete(this.render);
    this.render();
  }

  delete() {
    if (this.cursor === 0) return this.bell();
    let s1 = this.input.slice(0, this.cursor-1);
    let s2 = this.input.slice(this.cursor);
    this.input = `${s1}${s2}`;
    this.complete(this.render);
    this.cursor = this.cursor-1;
    this.render();
  }

  deleteForward() {
    if(this.cursor*this.scale >= this.rendered.length) return this.bell();
    let s1 = this.input.slice(0, this.cursor);
    let s2 = this.input.slice(this.cursor+1);
    this.input = `${s1}${s2}`;
    this.complete(this.render);
    this.render();
  }

  first() {
    this.moveSelect(0);
    this.render();
  }

  last() {
    this.moveSelect(this.suggestions.length - 1);
    this.render();
  }

  up() {
    if (this.select === 0) {
      this.moveSelect(this.suggestions.length - 1);
    } else {
      this.moveSelect(this.select - 1);
    }
    this.render();
  }

  down() {
    if (this.select === this.suggestions.length - 1) {
      this.moveSelect(0);
    } else {
      this.moveSelect(this.select + 1);
    }
    this.render();
  }

  next() {
    if (this.select === this.suggestions.length - 1) {
      this.moveSelect(0);
    } else this.moveSelect(this.select + 1);
    this.render();
  }

  nextPage() {
    this.moveSelect(Math.min(this.select + this.limit, this.suggestions.length - 1));
    this.render();
  }

  prevPage() {
    this.moveSelect(Math.max(this.select - this.limit, 0));
    this.render();
  }

  left() {
    if (this.cursor <= 0) return this.bell();
    this.cursor = this.cursor-1;
    this.render();
  }

  right() {
    if (this.cursor*this.scale >= this.rendered.length) return this.bell();
    this.cursor = this.cursor+1;
    this.render();
  }

  renderOption(v, hovered, isStart, isEnd) {
    let desc;
    let prefix = isStart ? figures.arrowUp : isEnd ? figures.arrowDown : ' ';
    let title = hovered ? color.cyan().underline(v.title) : v.title;
    prefix = (hovered ? color.cyan(figures.pointer) + ' ' : '  ') + prefix;
    if (v.description) {
      desc = ` - ${v.description}`;
      if (prefix.length + title.length + desc.length >= this.out.columns
        || v.description.split(/\r?\n/).length > 1) {
        desc = '\n' + wrap(v.description, { margin: 3, width: this.out.columns })
      }
    }
    return prefix + ' ' + title + color.gray(desc || '');
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);
    else this.out.write(clear(this.outputText, this.out.columns));
    super.render();

    let { startIndex, endIndex } = entriesToDisplay(this.select, this.choices.length, this.limit);

    this.outputText = [
      style.symbol(this.done, this.aborted, this.exited),
      color.bold(this.msg),
      style.delimiter(this.completing),
      this.done && this.suggestions[this.select]
        ? this.suggestions[this.select].title
        : this.rendered = this.transform.render(this.input)
    ].join(' ');

    if (!this.done) {
      const suggestions = this.suggestions
        .slice(startIndex, endIndex)
        .map((item, i) =>  this.renderOption(item,
          this.select === i + startIndex,
          i === 0 && startIndex > 0,
          i + startIndex === endIndex - 1 && endIndex < this.choices.length))
        .join('\n');
      this.outputText += `\n` + (suggestions || color.gray(this.fallback.title));
    }

    this.out.write(erase.line + cursor.to(0) + this.outputText);
  }
}

module.exports = AutocompletePrompt;


/***/ }),

/***/ 4409:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

const prompts = __webpack_require__(3258);

const passOn = ['suggest', 'format', 'onState', 'validate', 'onRender', 'type'];

const noop = () => {};
/**
 * Prompt for a series of questions
 * @param {Array|Object} questions Single question object or Array of question objects
 * @param {Function} [onSubmit] Callback function called on prompt submit
 * @param {Function} [onCancel] Callback function called on cancel/abort
 * @returns {Object} Object with values from user input
 */


function prompt() {
  return _prompt.apply(this, arguments);
}

function _prompt() {
  _prompt = _asyncToGenerator(function* (questions = [], {
    onSubmit = noop,
    onCancel = noop
  } = {}) {
    const answers = {};
    const override = prompt._override || {};
    questions = [].concat(questions);
    let answer, question, quit, name, type, lastPrompt;

    const getFormattedAnswer = /*#__PURE__*/function () {
      var _ref = _asyncToGenerator(function* (question, answer, skipValidation = false) {
        if (!skipValidation && question.validate && question.validate(answer) !== true) {
          return;
        }

        return question.format ? yield question.format(answer, answers) : answer;
      });

      return function getFormattedAnswer(_x, _x2) {
        return _ref.apply(this, arguments);
      };
    }();

    var _iterator = _createForOfIteratorHelper(questions),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        question = _step.value;
        var _question = question;
        name = _question.name;
        type = _question.type;

        // evaluate type first and skip if type is a falsy value
        if (typeof type === 'function') {
          type = yield type(answer, _objectSpread({}, answers), question);
          question['type'] = type;
        }

        if (!type) continue; // if property is a function, invoke it unless it's a special function

        for (let key in question) {
          if (passOn.includes(key)) continue;
          let value = question[key];
          question[key] = typeof value === 'function' ? yield value(answer, _objectSpread({}, answers), lastPrompt) : value;
        }

        lastPrompt = question;

        if (typeof question.message !== 'string') {
          throw new Error('prompt message is required');
        } // update vars in case they changed


        var _question2 = question;
        name = _question2.name;
        type = _question2.type;

        if (prompts[type] === void 0) {
          throw new Error(`prompt type (${type}) is not defined`);
        }

        if (override[question.name] !== undefined) {
          answer = yield getFormattedAnswer(question, override[question.name]);

          if (answer !== undefined) {
            answers[name] = answer;
            continue;
          }
        }

        try {
          // Get the injected answer if there is one or prompt the user
          answer = prompt._injected ? getInjectedAnswer(prompt._injected, question.initial) : yield prompts[type](question);
          answers[name] = answer = yield getFormattedAnswer(question, answer, true);
          quit = yield onSubmit(question, answer, answers);
        } catch (err) {
          quit = !(yield onCancel(question, answers));
        }

        if (quit) return answers;
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }

    return answers;
  });
  return _prompt.apply(this, arguments);
}

function getInjectedAnswer(injected, deafultValue) {
  const answer = injected.shift();

  if (answer instanceof Error) {
    throw answer;
  }

  return answer === undefined ? deafultValue : answer;
}

function inject(answers) {
  prompt._injected = (prompt._injected || []).concat(answers);
}

function override(answers) {
  prompt._override = Object.assign({}, answers);
}

module.exports = Object.assign(prompt, {
  prompt,
  prompts,
  inject,
  override
});

/***/ }),

/***/ 4434:
/***/ ((module) => {

"use strict";
module.exports = require("events");

/***/ }),

/***/ 4515:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }

const strip = __webpack_require__(7096);

const _require = __webpack_require__(723),
      erase = _require.erase,
      cursor = _require.cursor;

const width = str => [...strip(str)].length;
/**
 * @param {string} prompt
 * @param {number} perLine
 */


module.exports = function (prompt, perLine) {
  if (!perLine) return erase.line + cursor.to(0);
  let rows = 0;
  const lines = prompt.split(/\r?\n/);

  var _iterator = _createForOfIteratorHelper(lines),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      let line = _step.value;
      rows += 1 + Math.floor(Math.max(width(line) - 1, 0) / perLine);
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return erase.lines(rows);
};

/***/ }),

/***/ 4536:
/***/ ((module) => {

"use strict";


/**
 * Determine what entries should be displayed on the screen, based on the
 * currently selected index and the maximum visible. Used in list-based
 * prompts like `select` and `multiselect`.
 *
 * @param {number} cursor the currently selected entry
 * @param {number} total the total entries available to display
 * @param {number} [maxVisible] the number of entries that can be displayed
 */
module.exports = (cursor, total, maxVisible)  => {
  maxVisible = maxVisible || total;

  let startIndex = Math.min(total- maxVisible, cursor - Math.floor(maxVisible / 2));
  if (startIndex < 0) startIndex = 0;

  let endIndex = Math.min(startIndex + maxVisible, total);

  return { startIndex, endIndex };
};


/***/ }),

/***/ 4586:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


module.exports = {
  action: __webpack_require__(2522),
  clear: __webpack_require__(4515),
  style: __webpack_require__(9939),
  strip: __webpack_require__(7096),
  figures: __webpack_require__(9599),
  lines: __webpack_require__(65),
  wrap: __webpack_require__(1416),
  entriesToDisplay: __webpack_require__(769)
};

/***/ }),

/***/ 4597:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const readline = __webpack_require__(3785);

const _require = __webpack_require__(4586),
      action = _require.action;

const EventEmitter = __webpack_require__(4434);

const _require2 = __webpack_require__(723),
      beep = _require2.beep,
      cursor = _require2.cursor;

const color = __webpack_require__(1394);
/**
 * Base prompt skeleton
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */


class Prompt extends EventEmitter {
  constructor(opts = {}) {
    super();
    this.firstRender = true;
    this.in = opts.stdin || process.stdin;
    this.out = opts.stdout || process.stdout;

    this.onRender = (opts.onRender || (() => void 0)).bind(this);

    const rl = readline.createInterface({
      input: this.in,
      escapeCodeTimeout: 50
    });
    readline.emitKeypressEvents(this.in, rl);
    if (this.in.isTTY) this.in.setRawMode(true);
    const isSelect = ['SelectPrompt', 'MultiselectPrompt'].indexOf(this.constructor.name) > -1;

    const keypress = (str, key) => {
      let a = action(key, isSelect);

      if (a === false) {
        this._ && this._(str, key);
      } else if (typeof this[a] === 'function') {
        this[a](key);
      } else {
        this.bell();
      }
    };

    this.close = () => {
      this.out.write(cursor.show);
      this.in.removeListener('keypress', keypress);
      if (this.in.isTTY) this.in.setRawMode(false);
      rl.close();
      this.emit(this.aborted ? 'abort' : this.exited ? 'exit' : 'submit', this.value);
      this.closed = true;
    };

    this.in.on('keypress', keypress);
  }

  fire() {
    this.emit('state', {
      value: this.value,
      aborted: !!this.aborted,
      exited: !!this.exited
    });
  }

  bell() {
    this.out.write(beep);
  }

  render() {
    this.onRender(color);
    if (this.firstRender) this.firstRender = false;
  }

}

module.exports = Prompt;

/***/ }),

/***/ 4639:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TemplateSync = void 0;
const path_1 = __importDefault(__webpack_require__(3911));
const command_1 = __webpack_require__(9529);
const utils_1 = __webpack_require__(2935);
const input_1 = __webpack_require__(6946);
const fs_1 = __importDefault(__webpack_require__(2947));
const baseUrl = "https://raw.githubusercontent.com/decaf-ts/ts-workspace/master";
const options = {
    templates: [
        ".github/ISSUE_TEMPLATE/bug_report.md",
        ".github/ISSUE_TEMPLATE/feature_request.md",
        ".github/FUNDING.yml",
    ],
    workflows: [
        ".github/workflows/codeql-analysis.yml",
        ".github/workflows/jest-coverage.yaml",
        ".github/workflows/nodejs-build-prod.yaml",
        ".github/workflows/pages.yaml",
        ".github/workflows/publish-on-release.yaml",
        ".github/workflows/release-on-tag.yaml",
        ".github/workflows/snyk-analysis.yaml",
    ],
    ide: [
        ".idea/runConfigurations/All Tests.run.xml",
        ".idea/runConfigurations/build.run.xml",
        ".idea/runConfigurations/build_prod.run.xml",
        ".idea/runConfigurations/coverage.run.xml",
        ".idea/runConfigurations/docs.run.xml",
        ".idea/runConfigurations/drawings.run.xml",
        ".idea/runConfigurations/flash-forward.run.xml",
        ".idea/runConfigurations/Integration_Tests.run.xml",
        ".idea/runConfigurations/Bundling_Tests.run.xml",
        ".idea/runConfigurations/lint-fix.run.xml",
        ".idea/runConfigurations/release.run.xml",
        ".idea/runConfigurations/test_circular.run.xml",
        ".idea/runConfigurations/uml.run.xml",
        ".idea/runConfigurations/Unit Tests.run.xml",
        ".idea/runConfigurations/update-scripts.run.xml",
    ],
    docs: [
        "workdocs/tutorials/Contributing.md",
        "workdocs/tutorials/Documentation.md",
        "workdocs/tutorials/For Developers.md",
        "workdocs/2-Badges.md",
        "workdocs/jsdocs.json",
        "workdocs/readme-md.json",
    ],
    styles: [".prettierrc", "eslint.config.js"],
    scripts: ["bin/update-scripts.cjs", "bin/tag-release.cjs"],
    tests: ["jest.config.ts", "workdocs/reports/jest.coverage.config.ts"],
    typescript: ["tsconfig.json"],
    docker: ["Dockerfile"],
    automation: [
        "workdocs/confluence/Continuous Integration-Deployment/GitHub.md",
        "workdocs/confluence/Continuous Integration-Deployment/Jira.md",
        "workdocs/confluence/Continuous Integration-Deployment/Teams.md",
    ],
};
const argzz = {
    // init attributes
    boot: {
        type: "boolean",
    },
    org: {
        type: "string",
        short: "o",
    },
    name: {
        type: "string",
        short: "n",
        default: undefined,
    },
    author: {
        type: "string",
        short: "a",
        default: undefined,
    },
    // update attributes
    all: {
        type: "boolean",
    },
    license: {
        type: "string",
        message: "Pick the license",
    },
    scripts: {
        type: "boolean",
    },
    styles: {
        type: "boolean",
    },
    docs: {
        type: "boolean",
    },
    ide: {
        type: "boolean",
    },
    workflows: {
        type: "boolean",
    },
    templates: {
        type: "boolean",
    },
    typescript: {
        type: "boolean",
    },
    docker: {
        type: "boolean",
    },
    pkg: {
        type: "boolean",
    },
    dependencies: {
        type: "boolean",
    },
    tests: {
        type: "boolean",
    },
    automation: {
        type: "boolean",
    },
};
/**
 * @class TemplateSync
 * @extends {Command<CommandOptions<typeof args>, void>}
 * @category scripts
 * @description A command-line tool for synchronizing project templates and configurations.
 * @summary This class provides functionality to download and update various project files and configurations from a remote repository.
 * It supports updating licenses, IDE configurations, scripts, styles, documentation, workflows, and templates.
 *
 * @param {CommandOptions<typeof args>} args - The command options for TemplateSync
 */
class TemplateSync extends command_1.Command {
    constructor() {
        super("TemplateSync", argzz);
        this.replacements = {};
        /**
         * @description Downloads style configuration files.
         * @returns {Promise<void>}
         */
        this.getStyles = () => this.downloadOption("styles");
        /**
         * @description Downloads template files.
         * @returns {Promise<void>}
         */
        this.getTemplates = () => this.downloadOption("templates");
        /**
         * @description Downloads workflow configuration files.
         * @returns {Promise<void>}
         */
        this.getWorkflows = () => this.downloadOption("workflows");
        /**
         * @description Downloads documentation files.
         * @returns {Promise<void>}
         */
        this.getDocs = () => this.downloadOption("docs");
        /**
         * @description Downloads typescript config files.
         * @returns {Promise<void>}
         */
        this.getTypescript = () => this.downloadOption("typescript");
        /**
         * @description Downloads automation documentation files.
         * @returns {Promise<void>}
         */
        this.getAutomation = () => this.downloadOption("automation");
        /**
         * @description Downloads automation documentation files.
         * @returns {Promise<void>}
         */
        this.getTests = () => this.downloadOption("tests");
        /**
         * @description Downloads docker image files.
         * @returns {Promise<void>}
         */
        this.getDocker = () => this.downloadOption("docker");
    }
    loadValuesFromPackage() {
        const p = process.cwd();
        const author = (0, utils_1.getPackage)(p, "author");
        const scopedName = (0, utils_1.getPackage)(p, "name");
        let name = scopedName;
        let org;
        if (name.startsWith("@")) {
            const split = name.split("/");
            name = split[1];
            org = split[0].replace("@", "");
        }
        ["Tiago Venceslau", "TiagoVenceslau", "${author}"].forEach((el) => (this.replacements[el] = author));
        ["TS-Workspace", "ts-workspace", "${name}"].forEach((el) => (this.replacements[el] = name));
        ["decaf-ts", "${org}"].forEach((el) => (this.replacements[el] = org || '""'));
        this.replacements["${org_or_owner}"] = org || name;
    }
    /**
     * @description Downloads files for a specific option category.
     * @summary This method downloads all files associated with a given option key from the remote repository.
     * @param {keyof typeof options} key - The key representing the option category to download
     * @returns {Promise<void>}
     * @throws {Error} If the specified option key is not found
     */
    async downloadOption(key) {
        if (!(key in options)) {
            throw new Error(`Option "${key}" not found in options`);
        }
        const files = options[key];
        for (const file of files) {
            this.log.info(`Downloading ${file}`);
            let data = await utils_1.HttpClient.downloadFile(`${baseUrl}/${file}`);
            data = (0, utils_1.patchString)(data, this.replacements);
            (0, utils_1.writeFile)(path_1.default.join(process.cwd(), file), data);
        }
    }
    /**
     * @description Downloads and sets up the specified license.
     * @summary This method downloads the chosen license file, saves it to the project, and updates the package.json license field.
     * @param {"MIT" | "GPL" | "Apache" | "LGPL" | "AGPL"} license - The license to download and set up
     * @returns {Promise<void>}
     */
    async getLicense(license) {
        this.log.info(`Downloading ${license} license`);
        const url = `${baseUrl}/workdocs/licenses/${license}.md`;
        let data = await utils_1.HttpClient.downloadFile(url);
        data = (0, utils_1.patchString)(data, this.replacements);
        (0, utils_1.writeFile)(path_1.default.join(process.cwd(), "LICENSE.md"), data);
        (0, utils_1.setPackageAttribute)("license", license);
    }
    /**
     * @description Downloads IDE configuration files.
     * @returns {Promise<void>}
     */
    async getIde() {
        fs_1.default.mkdirSync(path_1.default.join(process.cwd(), ".idea", "runConfigurations"), {
            recursive: true,
        });
        await this.downloadOption("ide");
    }
    /**
     * @description Update npm scripts
     * @returns {Promise<void>}
     */
    async getScripts() {
        await this.downloadOption("scripts");
        this.log.info("please re-run the command");
        process.exit(0);
    }
    async initPackage(pkgName, author, license) {
        try {
            const pkg = (0, utils_1.getPackage)();
            delete pkg[utils_1.SetupScriptKey];
            pkg.name = pkgName;
            pkg.version = "0.0.1";
            pkg.author = author;
            pkg.license = license;
            fs_1.default.writeFileSync("package.json", JSON.stringify(pkg, null, 2));
        }
        catch (e) {
            throw new Error(`Error fixing package.json: ${e}`);
        }
    }
    async updatePackageScrips() {
        try {
            const originalPkg = JSON.parse(await utils_1.HttpClient.downloadFile(`${baseUrl}/package.json`));
            const { scripts } = originalPkg;
            const pkg = (0, utils_1.getPackage)();
            Object.keys(pkg.scripts).forEach((key) => {
                if (key in scripts) {
                    const replaced = (0, utils_1.patchString)(scripts[key], this.replacements);
                    if (replaced !== scripts[key]) {
                        pkg.scripts[key] = replaced;
                    }
                }
            });
            pkg["exports"]["require"] = originalPkg["exports"]["require"];
            pkg["exports"]["import"] = originalPkg["exports"]["import"];
            pkg["types"] = originalPkg["types"];
            fs_1.default.writeFileSync("package.json", JSON.stringify(pkg, null, 2));
        }
        catch (e) {
            throw new Error(`Error fixing package.json scripts: ${e}`);
        }
    }
    async createTokenFiles() {
        const log = this.log.for(this.createTokenFiles);
        const gitToken = await input_1.UserInput.insistForText("token", "please input your github token", (res) => {
            return !!res.match(/^ghp_[0-9a-zA-Z]{36}$/g);
        });
        Object.values(utils_1.Tokens).forEach((token) => {
            try {
                let status;
                try {
                    status = fs_1.default.existsSync(token);
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                }
                catch (e) {
                    log.info(`Token file ${token} not found. Creating a new one...`);
                    fs_1.default.writeFileSync(token, token === ".token" ? gitToken : "");
                    return;
                }
                if (!status) {
                    fs_1.default.writeFileSync(token, token === ".token" ? gitToken : "");
                }
            }
            catch (e) {
                throw new Error(`Error creating token file ${token}: ${e}`);
            }
        });
    }
    async getOrg() {
        const org = await input_1.UserInput.askText("Organization", "Enter the organization name (will be used to scope your npm project. leave blank to create a unscoped project):");
        const confirmation = await input_1.UserInput.askConfirmation("Confirm organization", "Is this organization correct?", true);
        if (!confirmation)
            return this.getOrg();
        return org;
    }
    async auditFix() {
        return await (0, utils_1.runCommand)("npm audit fix --force").promise;
    }
    patchFiles() {
        const files = [
            ...fs_1.default
                .readdirSync(path_1.default.join(process.cwd(), "src"), {
                recursive: true,
                withFileTypes: true,
            })
                .filter((entry) => entry.isFile())
                .map((entry) => path_1.default.join(entry.parentPath, entry.name)),
            ...fs_1.default
                .readdirSync(path_1.default.join(process.cwd(), "workdocs"), {
                recursive: true,
                withFileTypes: true,
            })
                .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
                .map((entry) => path_1.default.join(entry.parentPath, entry.name)),
            path_1.default.join(process.cwd(), ".gitlab-ci.yml"),
            path_1.default.join(process.cwd(), "workdocs", "jsdocs.json"),
        ];
        for (const file of files) {
            (0, utils_1.patchFile)(file, this.replacements);
        }
    }
    async updateDependencies() {
        try {
            const originalPkg = JSON.parse(await utils_1.HttpClient.downloadFile(`${baseUrl}/package.json`));
            const { devDependencies } = originalPkg;
            const pkg = (0, utils_1.getPackage)();
            Object.keys(pkg.scripts).forEach((key) => {
                if (key in devDependencies) {
                    const replaced = devDependencies[key];
                    if (replaced !== devDependencies[key]) {
                        pkg["devDependencies"] =
                            pkg["devDependencies"] || {};
                        pkg["devDependencies"][key] = replaced;
                    }
                }
            });
            fs_1.default.writeFileSync("package.json", JSON.stringify(pkg, null, 2));
            await (0, utils_1.runCommand)("npm install").promise;
        }
        catch (e) {
            throw new Error(`Error fixing package.json dependencies: ${e}`);
        }
    }
    /**
     * @description Runs the template synchronization process.
     * @summary This method orchestrates the downloading of various project components based on the provided arguments.
     * @param {ParseArgsResult} args - The parsed command-line arguments
     * @returns {Promise<void>}
     *
     * @mermaid
     * sequenceDiagram
     *   participant T as TemplateSync
     *   participant L as getLicense
     *   participant I as getIde
     *   participant S as getScripts
     *   participant St as getStyles
     *   participant D as getDocs
     *   participant W as getWorkflows
     *   participant Te as getTemplates
     *   T->>T: Parse arguments
     *   alt all flag is true
     *     T->>T: Set all component flags to true
     *   end
     *   alt license is specified
     *     T->>L: getLicense(license)
     *   end
     *   alt ide flag is true
     *     T->>I: getIde()
     *   end
     *   alt scripts flag is true
     *     T->>S: getScripts()
     *   end
     *   alt styles flag is true
     *     T->>St: getStyles()
     *   end
     *   alt docs flag is true
     *     T->>D: getDocs()
     *   end
     *   alt workflows flag is true
     *     T->>W: getWorkflows()
     *   end
     *   alt templates flag is true
     *     T->>Te: getTemplates()
     *   end
     */
    async run(args) {
        let { license } = args;
        const { boot } = args;
        let { all, scripts, styles, docs, ide, workflows, templates, docker, typescript, dependencies, tests, automation, pkg, } = args;
        if (scripts ||
            styles ||
            docs ||
            ide ||
            workflows ||
            templates ||
            docker ||
            typescript ||
            automation ||
            dependencies ||
            tests ||
            pkg)
            all = false;
        if (boot) {
            const org = await this.getOrg();
            const name = await input_1.UserInput.insistForText("Project name", "Enter the project name:", (res) => res.length > 1);
            const author = await input_1.UserInput.insistForText("Author", "Enter the author name:", (res) => res.length > 1);
            const pkgName = org ? `@${org}/${name}` : name;
            await this.initPackage(pkgName, author, license);
            await this.createTokenFiles();
            await this.auditFix();
            this.patchFiles();
        }
        if (all) {
            scripts = false;
            styles = true;
            docs = true;
            ide = true;
            workflows = true;
            templates = true;
            docker = true;
            typescript = true;
            pkg = true;
            dependencies = true;
            tests = true;
            automation = false;
        }
        if (typeof scripts === "undefined")
            scripts = await input_1.UserInput.askConfirmation("scripts", "Do you want to get scripts?", true);
        if (scripts)
            await this.getScripts();
        this.loadValuesFromPackage();
        if (!all && typeof license === "undefined") {
            const confirmation = await input_1.UserInput.askConfirmation("license", "Do you want to set a license?", true);
            if (confirmation)
                license = await input_1.UserInput.insistForText("license", "Enter the desired License (MIT|GPL|Apache|LGPL|AGPL):", (val) => !!val && !!val.match(/^(MIT|GPL|Apache|LGPL|AGPL)$/g));
        }
        if (typeof license !== "undefined")
            await this.getLicense(license);
        if (typeof ide === "undefined")
            ide = await input_1.UserInput.askConfirmation("ide", "Do you want to get ide configs?", true);
        if (ide)
            await this.getIde();
        if (typeof typescript === "undefined")
            typescript = await input_1.UserInput.askConfirmation("typescript", "Do you want to get typescript configs?", true);
        if (typescript)
            await this.getTypescript();
        if (typeof docker === "undefined")
            docker = await input_1.UserInput.askConfirmation("docker", "Do you want to get docker configs?", true);
        if (docker)
            await this.getDocker();
        if (typeof automation === "undefined")
            automation = await input_1.UserInput.askConfirmation("automation", "Do you want to get automation configs?", true);
        if (automation)
            await this.getAutomation();
        if (typeof styles === "undefined")
            styles = await input_1.UserInput.askConfirmation("styles", "Do you want to get styles?", true);
        if (styles)
            await this.getStyles();
        if (typeof docs === "undefined")
            docs = await input_1.UserInput.askConfirmation("docs", "Do you want to get docs?", true);
        if (docs)
            await this.getDocs();
        if (typeof workflows === "undefined")
            workflows = await input_1.UserInput.askConfirmation("workflows", "Do you want to get workflows?", true);
        if (workflows)
            await this.getWorkflows();
        if (typeof templates === "undefined")
            templates = await input_1.UserInput.askConfirmation("templates", "Do you want to get templates?", true);
        if (templates)
            await this.getTemplates();
        if (typeof pkg === "undefined")
            pkg = await input_1.UserInput.askConfirmation("pkg", "Do you want to update your package.json scripts?", true);
        if (pkg)
            await this.updatePackageScrips();
        if (typeof tests === "undefined")
            tests = await input_1.UserInput.askConfirmation("pkg", "Do you want to update your test configs?", true);
        if (tests)
            await this.getTests();
        if (typeof dependencies === "undefined")
            dependencies = await input_1.UserInput.askConfirmation("pkg", "Do you want to update dev dependencies?", true);
        if (dependencies)
            await this.updateDependencies();
    }
}
exports.TemplateSync = TemplateSync;


/***/ }),

/***/ 4747:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.HttpClient = void 0;
const https_1 = __importDefault(__webpack_require__(6333));
const logging_1 = __webpack_require__(9834);
/**
 * @description A simple HTTP client for downloading files.
 * @summary This class provides functionality to download files from HTTPS URLs.
 * It uses Node.js built-in https module to make requests.
 *
 * @class
 */
class HttpClient {
    static { this.log = logging_1.Logging.for(HttpClient); }
    /**
     * @description Downloads a file from a given URL.
     * @summary This method sends a GET request to the specified URL and returns the response body as a string.
     * It handles different scenarios such as non-200 status codes and network errors.
     *
     * @param url - The URL of the file to download.
     * @return A promise that resolves with the file content as a string.
     *
     * @mermaid
     * sequenceDiagram
     *   participant Client
     *   participant HttpClient
     *   participant HTTPS
     *   participant Server
     *   Client->>HttpClient: downloadFile(url)
     *   HttpClient->>HTTPS: get(url)
     *   HTTPS->>Server: GET request
     *   Server-->>HTTPS: Response
     *   HTTPS-->>HttpClient: Response object
     *   alt Status code is 200
     *     loop For each data chunk
     *       HTTPS->>HttpClient: 'data' event
     *       HttpClient->>HttpClient: Accumulate data
     *     end
     *     HTTPS->>HttpClient: 'end' event
     *     HttpClient-->>Client: Resolve with data
     *   else Status code is not 200
     *     HttpClient-->>Client: Reject with error
     *   end
     */
    static async downloadFile(url) {
        return new Promise((resolve, reject) => {
            function request(url) {
                url = encodeURI(url);
                https_1.default.get(url, (res) => {
                    if (res.statusCode === 301 || res.statusCode === 307)
                        return request(res.headers.location);
                    if (res.statusCode !== 200) {
                        HttpClient.log.error(`Failed to fetch ${url} (status: ${res.statusCode})`);
                        return reject(new Error(`Failed to fetch ${url}`));
                    }
                    let data = "";
                    res.on("data", (chunk) => {
                        data += chunk;
                    });
                    res.on("error", (error) => {
                        reject(error);
                    });
                    res.on("end", () => {
                        resolve(data);
                    });
                });
            }
            request(url);
        });
    }
}
exports.HttpClient = HttpClient;


/***/ }),

/***/ 4785:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const color = __webpack_require__(1394);
const Prompt = __webpack_require__(4872);
const { erase, cursor } = __webpack_require__(723);
const { style, clear, lines, figures } = __webpack_require__(1189);

/**
 * TextPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {String} [opts.style='default'] Render style
 * @param {String} [opts.initial] Default value
 * @param {Function} [opts.validate] Validate function
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 * @param {String} [opts.error] The invalid error label
 */
class TextPrompt extends Prompt {
  constructor(opts={}) {
    super(opts);
    this.transform = style.render(opts.style);
    this.scale = this.transform.scale;
    this.msg = opts.message;
    this.initial = opts.initial || ``;
    this.validator = opts.validate || (() => true);
    this.value = ``;
    this.errorMsg = opts.error || `Please Enter A Valid Value`;
    this.cursor = Number(!!this.initial);
    this.cursorOffset = 0;
    this.clear = clear(``, this.out.columns);
    this.render();
  }

  set value(v) {
    if (!v && this.initial) {
      this.placeholder = true;
      this.rendered = color.gray(this.transform.render(this.initial));
    } else {
      this.placeholder = false;
      this.rendered = this.transform.render(v);
    }
    this._value = v;
    this.fire();
  }

  get value() {
    return this._value;
  }

  reset() {
    this.value = ``;
    this.cursor = Number(!!this.initial);
    this.cursorOffset = 0;
    this.fire();
    this.render();
  }

  exit() {
    this.abort();
  }

  abort() {
    this.value = this.value || this.initial;
    this.done = this.aborted = true;
    this.error = false;
    this.red = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  async validate() {
    let valid = await this.validator(this.value);
    if (typeof valid === `string`) {
      this.errorMsg = valid;
      valid = false;
    }
    this.error = !valid;
  }

  async submit() {
    this.value = this.value || this.initial;
    this.cursorOffset = 0;
    this.cursor = this.rendered.length;
    await this.validate();
    if (this.error) {
      this.red = true;
      this.fire();
      this.render();
      return;
    }
    this.done = true;
    this.aborted = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  next() {
    if (!this.placeholder) return this.bell();
    this.value = this.initial;
    this.cursor = this.rendered.length;
    this.fire();
    this.render();
  }

  moveCursor(n) {
    if (this.placeholder) return;
    this.cursor = this.cursor+n;
    this.cursorOffset += n;
  }

  _(c, key) {
    let s1 = this.value.slice(0, this.cursor);
    let s2 = this.value.slice(this.cursor);
    this.value = `${s1}${c}${s2}`;
    this.red = false;
    this.cursor = this.placeholder ? 0 : s1.length+1;
    this.render();
  }

  delete() {
    if (this.isCursorAtStart()) return this.bell();
    let s1 = this.value.slice(0, this.cursor-1);
    let s2 = this.value.slice(this.cursor);
    this.value = `${s1}${s2}`;
    this.red = false;
    if (this.isCursorAtStart()) {
      this.cursorOffset = 0
    } else {
      this.cursorOffset++;
      this.moveCursor(-1);
    }
    this.render();
  }

  deleteForward() {
    if(this.cursor*this.scale >= this.rendered.length || this.placeholder) return this.bell();
    let s1 = this.value.slice(0, this.cursor);
    let s2 = this.value.slice(this.cursor+1);
    this.value = `${s1}${s2}`;
    this.red = false;
    if (this.isCursorAtEnd()) {
      this.cursorOffset = 0;
    } else {
      this.cursorOffset++;
    }
    this.render();
  }

  first() {
    this.cursor = 0;
    this.render();
  }

  last() {
    this.cursor = this.value.length;
    this.render();
  }

  left() {
    if (this.cursor <= 0 || this.placeholder) return this.bell();
    this.moveCursor(-1);
    this.render();
  }

  right() {
    if (this.cursor*this.scale >= this.rendered.length || this.placeholder) return this.bell();
    this.moveCursor(1);
    this.render();
  }

  isCursorAtStart() {
    return this.cursor === 0 || (this.placeholder && this.cursor === 1);
  }

  isCursorAtEnd() {
    return this.cursor === this.rendered.length || (this.placeholder && this.cursor === this.rendered.length + 1)
  }

  render() {
    if (this.closed) return;
    if (!this.firstRender) {
      if (this.outputError)
        this.out.write(cursor.down(lines(this.outputError, this.out.columns) - 1) + clear(this.outputError, this.out.columns));
      this.out.write(clear(this.outputText, this.out.columns));
    }
    super.render();
    this.outputError = '';

    this.outputText = [
      style.symbol(this.done, this.aborted),
      color.bold(this.msg),
      style.delimiter(this.done),
      this.red ? color.red(this.rendered) : this.rendered
    ].join(` `);

    if (this.error) {
      this.outputError += this.errorMsg.split(`\n`)
          .reduce((a, l, i) => a + `\n${i ? ' ' : figures.pointerSmall} ${color.red().italic(l)}`, ``);
    }

    this.out.write(erase.line + cursor.to(0) + this.outputText + cursor.save + this.outputError + cursor.restore + cursor.move(this.cursorOffset, 0));
  }
}

module.exports = TextPrompt;

/***/ }),

/***/ 4792:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const c = __webpack_require__(1394);
const figures = __webpack_require__(5992);

// rendering user input.
const styles = Object.freeze({
  password: { scale: 1, render: input => '*'.repeat(input.length) },
  emoji: { scale: 2, render: input => '😃'.repeat(input.length) },
  invisible: { scale: 0, render: input => '' },
  default: { scale: 1, render: input => `${input}` }
});
const render = type => styles[type] || styles.default;

// icon to signalize a prompt.
const symbols = Object.freeze({
  aborted: c.red(figures.cross),
  done: c.green(figures.tick),
  exited: c.yellow(figures.cross),
  default: c.cyan('?')
});

const symbol = (done, aborted, exited) =>
  aborted ? symbols.aborted : exited ? symbols.exited : done ? symbols.done : symbols.default;

// between the question and the user's input.
const delimiter = completing =>
  c.gray(completing ? figures.ellipsis : figures.pointerSmall);

const item = (expandable, expanded) =>
  c.gray(expandable ? (expanded ? figures.pointerSmall : '+') : figures.line);

module.exports = {
  styles,
  render,
  symbols,
  symbol,
  delimiter,
  item
};


/***/ }),

/***/ 4872:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const readline = __webpack_require__(3785);
const { action } = __webpack_require__(1189);
const EventEmitter = __webpack_require__(4434);
const { beep, cursor } = __webpack_require__(723);
const color = __webpack_require__(1394);

/**
 * Base prompt skeleton
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */
class Prompt extends EventEmitter {
  constructor(opts={}) {
    super();

    this.firstRender = true;
    this.in = opts.stdin || process.stdin;
    this.out = opts.stdout || process.stdout;
    this.onRender = (opts.onRender || (() => void 0)).bind(this);
    const rl = readline.createInterface({ input:this.in, escapeCodeTimeout:50 });
    readline.emitKeypressEvents(this.in, rl);

    if (this.in.isTTY) this.in.setRawMode(true);
    const isSelect = [ 'SelectPrompt', 'MultiselectPrompt' ].indexOf(this.constructor.name) > -1;
    const keypress = (str, key) => {
      let a = action(key, isSelect);
      if (a === false) {
        this._ && this._(str, key);
      } else if (typeof this[a] === 'function') {
        this[a](key);
      } else {
        this.bell();
      }
    };

    this.close = () => {
      this.out.write(cursor.show);
      this.in.removeListener('keypress', keypress);
      if (this.in.isTTY) this.in.setRawMode(false);
      rl.close();
      this.emit(this.aborted ? 'abort' : this.exited ? 'exit' : 'submit', this.value);
      this.closed = true;
    };

    this.in.on('keypress', keypress);
  }

  fire() {
    this.emit('state', {
      value: this.value,
      aborted: !!this.aborted,
      exited: !!this.exited
    });
  }

  bell() {
    this.out.write(beep);
  }

  render() {
    this.onRender(color);
    if (this.firstRender) this.firstRender = false;
  }
}

module.exports = Prompt;


/***/ }),

/***/ 4906:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const DatePart = __webpack_require__(323);

class Month extends DatePart {
  constructor(opts = {}) {
    super(opts);
  }

  up() {
    this.date.setMonth(this.date.getMonth() + 1);
  }

  down() {
    this.date.setMonth(this.date.getMonth() - 1);
  }

  setTo(val) {
    val = parseInt(val.substr(-2)) - 1;
    this.date.setMonth(val < 0 ? 0 : val);
  }

  toString() {
    let month = this.date.getMonth();
    let tl = this.token.length;
    return tl === 2 ? String(month + 1).padStart(2, '0') : tl === 3 ? this.locales.monthsShort[month] : tl === 4 ? this.locales.months[month] : String(month + 1);
  }

}

module.exports = Month;

/***/ }),

/***/ 5135:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const DatePart = __webpack_require__(5568);

class Meridiem extends DatePart {
  constructor(opts={}) {
    super(opts);
  }

  up() {
    this.date.setHours((this.date.getHours() + 12) % 24);
  }

  down() {
    this.up();
  }

  toString() {
    let meridiem = this.date.getHours() > 12 ? 'pm' : 'am';
    return /\A/.test(this.token) ? meridiem.toUpperCase() : meridiem;
  }
}

module.exports = Meridiem;


/***/ }),

/***/ 5317:
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ 5319:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const color = __webpack_require__(1394);

const Prompt = __webpack_require__(4597);

const _require = __webpack_require__(4586),
      style = _require.style,
      clear = _require.clear;

const _require2 = __webpack_require__(723),
      cursor = _require2.cursor,
      erase = _require2.erase;
/**
 * TogglePrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Boolean} [opts.initial=false] Default value
 * @param {String} [opts.active='no'] Active label
 * @param {String} [opts.inactive='off'] Inactive label
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */


class TogglePrompt extends Prompt {
  constructor(opts = {}) {
    super(opts);
    this.msg = opts.message;
    this.value = !!opts.initial;
    this.active = opts.active || 'on';
    this.inactive = opts.inactive || 'off';
    this.initialValue = this.value;
    this.render();
  }

  reset() {
    this.value = this.initialValue;
    this.fire();
    this.render();
  }

  exit() {
    this.abort();
  }

  abort() {
    this.done = this.aborted = true;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  submit() {
    this.done = true;
    this.aborted = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  deactivate() {
    if (this.value === false) return this.bell();
    this.value = false;
    this.render();
  }

  activate() {
    if (this.value === true) return this.bell();
    this.value = true;
    this.render();
  }

  delete() {
    this.deactivate();
  }

  left() {
    this.deactivate();
  }

  right() {
    this.activate();
  }

  down() {
    this.deactivate();
  }

  up() {
    this.activate();
  }

  next() {
    this.value = !this.value;
    this.fire();
    this.render();
  }

  _(c, key) {
    if (c === ' ') {
      this.value = !this.value;
    } else if (c === '1') {
      this.value = true;
    } else if (c === '0') {
      this.value = false;
    } else return this.bell();

    this.render();
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);else this.out.write(clear(this.outputText, this.out.columns));
    super.render();
    this.outputText = [style.symbol(this.done, this.aborted), color.bold(this.msg), style.delimiter(this.done), this.value ? this.inactive : color.cyan().underline(this.inactive), color.gray('/'), this.value ? color.cyan().underline(this.active) : this.active].join(' ');
    this.out.write(erase.line + cursor.to(0) + this.outputText);
  }

}

module.exports = TogglePrompt;

/***/ }),

/***/ 5359:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

const color = __webpack_require__(1394);

const Prompt = __webpack_require__(4597);

const _require = __webpack_require__(4586),
      style = _require.style,
      clear = _require.clear,
      figures = _require.figures;

const _require2 = __webpack_require__(723),
      erase = _require2.erase,
      cursor = _require2.cursor;

const _require3 = __webpack_require__(1908),
      DatePart = _require3.DatePart,
      Meridiem = _require3.Meridiem,
      Day = _require3.Day,
      Hours = _require3.Hours,
      Milliseconds = _require3.Milliseconds,
      Minutes = _require3.Minutes,
      Month = _require3.Month,
      Seconds = _require3.Seconds,
      Year = _require3.Year;

const regex = /\\(.)|"((?:\\["\\]|[^"])+)"|(D[Do]?|d{3,4}|d)|(M{1,4})|(YY(?:YY)?)|([aA])|([Hh]{1,2})|(m{1,2})|(s{1,2})|(S{1,4})|./g;
const regexGroups = {
  1: ({
    token
  }) => token.replace(/\\(.)/g, '$1'),
  2: opts => new Day(opts),
  // Day // TODO
  3: opts => new Month(opts),
  // Month
  4: opts => new Year(opts),
  // Year
  5: opts => new Meridiem(opts),
  // AM/PM // TODO (special)
  6: opts => new Hours(opts),
  // Hours
  7: opts => new Minutes(opts),
  // Minutes
  8: opts => new Seconds(opts),
  // Seconds
  9: opts => new Milliseconds(opts) // Fractional seconds

};
const dfltLocales = {
  months: 'January,February,March,April,May,June,July,August,September,October,November,December'.split(','),
  monthsShort: 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec'.split(','),
  weekdays: 'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday'.split(','),
  weekdaysShort: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat'.split(',')
};
/**
 * DatePrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Number} [opts.initial] Index of default value
 * @param {String} [opts.mask] The format mask
 * @param {object} [opts.locales] The date locales
 * @param {String} [opts.error] The error message shown on invalid value
 * @param {Function} [opts.validate] Function to validate the submitted value
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */

class DatePrompt extends Prompt {
  constructor(opts = {}) {
    super(opts);
    this.msg = opts.message;
    this.cursor = 0;
    this.typed = '';
    this.locales = Object.assign(dfltLocales, opts.locales);
    this._date = opts.initial || new Date();
    this.errorMsg = opts.error || 'Please Enter A Valid Value';

    this.validator = opts.validate || (() => true);

    this.mask = opts.mask || 'YYYY-MM-DD HH:mm:ss';
    this.clear = clear('', this.out.columns);
    this.render();
  }

  get value() {
    return this.date;
  }

  get date() {
    return this._date;
  }

  set date(date) {
    if (date) this._date.setTime(date.getTime());
  }

  set mask(mask) {
    let result;
    this.parts = [];

    while (result = regex.exec(mask)) {
      let match = result.shift();
      let idx = result.findIndex(gr => gr != null);
      this.parts.push(idx in regexGroups ? regexGroups[idx]({
        token: result[idx] || match,
        date: this.date,
        parts: this.parts,
        locales: this.locales
      }) : result[idx] || match);
    }

    let parts = this.parts.reduce((arr, i) => {
      if (typeof i === 'string' && typeof arr[arr.length - 1] === 'string') arr[arr.length - 1] += i;else arr.push(i);
      return arr;
    }, []);
    this.parts.splice(0);
    this.parts.push(...parts);
    this.reset();
  }

  moveCursor(n) {
    this.typed = '';
    this.cursor = n;
    this.fire();
  }

  reset() {
    this.moveCursor(this.parts.findIndex(p => p instanceof DatePart));
    this.fire();
    this.render();
  }

  exit() {
    this.abort();
  }

  abort() {
    this.done = this.aborted = true;
    this.error = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  validate() {
    var _this = this;

    return _asyncToGenerator(function* () {
      let valid = yield _this.validator(_this.value);

      if (typeof valid === 'string') {
        _this.errorMsg = valid;
        valid = false;
      }

      _this.error = !valid;
    })();
  }

  submit() {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      yield _this2.validate();

      if (_this2.error) {
        _this2.color = 'red';

        _this2.fire();

        _this2.render();

        return;
      }

      _this2.done = true;
      _this2.aborted = false;

      _this2.fire();

      _this2.render();

      _this2.out.write('\n');

      _this2.close();
    })();
  }

  up() {
    this.typed = '';
    this.parts[this.cursor].up();
    this.render();
  }

  down() {
    this.typed = '';
    this.parts[this.cursor].down();
    this.render();
  }

  left() {
    let prev = this.parts[this.cursor].prev();
    if (prev == null) return this.bell();
    this.moveCursor(this.parts.indexOf(prev));
    this.render();
  }

  right() {
    let next = this.parts[this.cursor].next();
    if (next == null) return this.bell();
    this.moveCursor(this.parts.indexOf(next));
    this.render();
  }

  next() {
    let next = this.parts[this.cursor].next();
    this.moveCursor(next ? this.parts.indexOf(next) : this.parts.findIndex(part => part instanceof DatePart));
    this.render();
  }

  _(c) {
    if (/\d/.test(c)) {
      this.typed += c;
      this.parts[this.cursor].setTo(this.typed);
      this.render();
    }
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);else this.out.write(clear(this.outputText, this.out.columns));
    super.render(); // Print prompt

    this.outputText = [style.symbol(this.done, this.aborted), color.bold(this.msg), style.delimiter(false), this.parts.reduce((arr, p, idx) => arr.concat(idx === this.cursor && !this.done ? color.cyan().underline(p.toString()) : p), []).join('')].join(' '); // Print error

    if (this.error) {
      this.outputText += this.errorMsg.split('\n').reduce((a, l, i) => a + `\n${i ? ` ` : figures.pointerSmall} ${color.red().italic(l)}`, ``);
    }

    this.out.write(erase.line + cursor.to(0) + this.outputText);
  }

}

module.exports = DatePrompt;

/***/ }),

/***/ 5404:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const DatePart = __webpack_require__(323);

class Meridiem extends DatePart {
  constructor(opts = {}) {
    super(opts);
  }

  up() {
    this.date.setHours((this.date.getHours() + 12) % 24);
  }

  down() {
    this.up();
  }

  toString() {
    let meridiem = this.date.getHours() > 12 ? 'pm' : 'am';
    return /\A/.test(this.token) ? meridiem.toUpperCase() : meridiem;
  }

}

module.exports = Meridiem;

/***/ }),

/***/ 5568:
/***/ ((module) => {

"use strict";


class DatePart {
  constructor({token, date, parts, locales}) {
    this.token = token;
    this.date = date || new Date();
    this.parts = parts || [this];
    this.locales = locales || {};
  }

  up() {}

  down() {}

  next() {
    const currentIdx = this.parts.indexOf(this);
    return this.parts.find((part, idx) => idx > currentIdx && part instanceof DatePart);
  }

  setTo(val) {}

  prev() {
    let parts = [].concat(this.parts).reverse();
    const currentIdx = parts.indexOf(this);
    return parts.find((part, idx) => idx > currentIdx && part instanceof DatePart);
  }

  toString() {
    return String(this.date);
  }
}

module.exports = DatePart;




/***/ }),

/***/ 5646:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const color = __webpack_require__(1394);
const Prompt = __webpack_require__(4872);
const { style, clear, figures, wrap, entriesToDisplay } = __webpack_require__(1189);
const { cursor } = __webpack_require__(723);

/**
 * SelectPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Array} opts.choices Array of choice objects
 * @param {String} [opts.hint] Hint to display
 * @param {Number} [opts.initial] Index of default value
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 * @param {Number} [opts.optionsPerPage=10] Max options to display at once
 */
class SelectPrompt extends Prompt {
  constructor(opts={}) {
    super(opts);
    this.msg = opts.message;
    this.hint = opts.hint || '- Use arrow-keys. Return to submit.';
    this.warn = opts.warn || '- This option is disabled';
    this.cursor = opts.initial || 0;
    this.choices = opts.choices.map((ch, idx) => {
      if (typeof ch === 'string')
        ch = {title: ch, value: idx};
      return {
        title: ch && (ch.title || ch.value || ch),
        value: ch && (ch.value === undefined ? idx : ch.value),
        description: ch && ch.description,
        selected: ch && ch.selected,
        disabled: ch && ch.disabled
      };
    });
    this.optionsPerPage = opts.optionsPerPage || 10;
    this.value = (this.choices[this.cursor] || {}).value;
    this.clear = clear('', this.out.columns);
    this.render();
  }

  moveCursor(n) {
    this.cursor = n;
    this.value = this.choices[n].value;
    this.fire();
  }

  reset() {
    this.moveCursor(0);
    this.fire();
    this.render();
  }

  exit() {
    this.abort();
  }

  abort() {
    this.done = this.aborted = true;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  submit() {
    if (!this.selection.disabled) {
      this.done = true;
      this.aborted = false;
      this.fire();
      this.render();
      this.out.write('\n');
      this.close();
    } else
      this.bell();
  }

  first() {
    this.moveCursor(0);
    this.render();
  }

  last() {
    this.moveCursor(this.choices.length - 1);
    this.render();
  }

  up() {
    if (this.cursor === 0) {
      this.moveCursor(this.choices.length - 1);
    } else {
      this.moveCursor(this.cursor - 1);
    }
    this.render();
  }

  down() {
    if (this.cursor === this.choices.length - 1) {
      this.moveCursor(0);
    } else {
      this.moveCursor(this.cursor + 1);
    }
    this.render();
  }

  next() {
    this.moveCursor((this.cursor + 1) % this.choices.length);
    this.render();
  }

  _(c, key) {
    if (c === ' ') return this.submit();
  }

  get selection() {
    return this.choices[this.cursor];
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);
    else this.out.write(clear(this.outputText, this.out.columns));
    super.render();

    let { startIndex, endIndex } = entriesToDisplay(this.cursor, this.choices.length, this.optionsPerPage);

    // Print prompt
    this.outputText = [
      style.symbol(this.done, this.aborted),
      color.bold(this.msg),
      style.delimiter(false),
      this.done ? this.selection.title : this.selection.disabled
          ? color.yellow(this.warn) : color.gray(this.hint)
    ].join(' ');

    // Print choices
    if (!this.done) {
      this.outputText += '\n';
      for (let i = startIndex; i < endIndex; i++) {
        let title, prefix, desc = '', v = this.choices[i];

        // Determine whether to display "more choices" indicators
        if (i === startIndex && startIndex > 0) {
          prefix = figures.arrowUp;
        } else if (i === endIndex - 1 && endIndex < this.choices.length) {
          prefix = figures.arrowDown;
        } else {
          prefix = ' ';
        }

        if (v.disabled) {
          title = this.cursor === i ? color.gray().underline(v.title) : color.strikethrough().gray(v.title);
          prefix = (this.cursor === i ? color.bold().gray(figures.pointer) + ' ' : '  ') + prefix;
        } else {
          title = this.cursor === i ? color.cyan().underline(v.title) : v.title;
          prefix = (this.cursor === i ? color.cyan(figures.pointer) + ' ' : '  ') + prefix;
          if (v.description && this.cursor === i) {
            desc = ` - ${v.description}`;
            if (prefix.length + title.length + desc.length >= this.out.columns
                || v.description.split(/\r?\n/).length > 1) {
              desc = '\n' + wrap(v.description, { margin: 3, width: this.out.columns });
            }
          }
        }

        this.outputText += `${prefix} ${title}${color.gray(desc)}\n`;
      }
    }

    this.out.write(this.outputText);
  }
}

module.exports = SelectPrompt;


/***/ }),

/***/ 5815:
/***/ ((module) => {

"use strict";


module.exports = str => {
  const pattern = [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))'
  ].join('|');

  const RGX = new RegExp(pattern, 'g');
  return typeof str === 'string' ? str.replace(RGX, '') : str;
};


/***/ }),

/***/ 5992:
/***/ ((module) => {

"use strict";
	

 const main = {
  arrowUp: '↑',
  arrowDown: '↓',
  arrowLeft: '←',
  arrowRight: '→',
  radioOn: '◉',
  radioOff: '◯',
  tick: '✔',	
  cross: '✖',	
  ellipsis: '…',	
  pointerSmall: '›',	
  line: '─',	
  pointer: '❯'	
};	
const win = {
  arrowUp: main.arrowUp,
  arrowDown: main.arrowDown,
  arrowLeft: main.arrowLeft,
  arrowRight: main.arrowRight,
  radioOn: '(*)',
  radioOff: '( )',	
  tick: '√',	
  cross: '×',	
  ellipsis: '...',	
  pointerSmall: '»',	
  line: '─',	
  pointer: '>'	
};	
const figures = process.platform === 'win32' ? win : main;	

 module.exports = figures;


/***/ }),

/***/ 6333:
/***/ ((module) => {

"use strict";
module.exports = __WEBPACK_EXTERNAL_MODULE__6333__;

/***/ }),

/***/ 6471:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.styles = exports.BrightBackgroundColors = exports.StandardBackgroundColors = exports.BrightForegroundColors = exports.StandardForegroundColors = exports.AnsiReset = void 0;
/**
 * @description ANSI escape code for resetting text formatting.
 * @summary This constant holds the ANSI escape sequence used to reset all text formatting to default.
 * @const AnsiReset
 * @memberOf module:StyledString
 */
exports.AnsiReset = "\x1b[0m";
/**
 * @description Standard foreground color codes for ANSI text formatting.
 * @summary This object maps color names to their corresponding ANSI color codes for standard foreground colors.
 * @const StandardForegroundColors
 * @property {number} black - ANSI code for black text (30).
 * @property {number} red - ANSI code for red text (31).
 * @property {number} green - ANSI code for green text (32).
 * @property {number} yellow - ANSI code for yellow text (33).
 * @property {number} blue - ANSI code for blue text (34).
 * @property {number} magenta - ANSI code for magenta text (35).
 * @property {number} cyan - ANSI code for cyan text (36).
 * @property {number} white - ANSI code for white text (37).
 * @memberOf module:StyledString
 */
exports.StandardForegroundColors = {
    black: 30,
    red: 31,
    green: 32,
    yellow: 33,
    blue: 34,
    magenta: 35,
    cyan: 36,
    white: 37,
};
/**
 * @description Bright foreground color codes for ANSI text formatting.
 * @summary This object maps color names to their corresponding ANSI color codes for bright foreground colors.
 * @const BrightForegroundColors
 * @property {number} black - ANSI code for bright black text (90).
 * @property {number} red - ANSI code for bright red text (91).
 * @property {number} green - ANSI code for bright green text (92).
 * @property {number} yellow - ANSI code for bright yellow text (93).
 * @property {number} blue - ANSI code for bright blue text (94).
 * @property {number} magenta - ANSI code for bright magenta text (95).
 * @property {number} cyan - ANSI code for bright cyan text (96).
 * @property {number} white - ANSI code for bright white text (97).
 * @memberOf module:@StyledString
 */
exports.BrightForegroundColors = {
    brightBlack: 90,
    brightRed: 91,
    brightGreen: 92,
    brightYellow: 93,
    brightBlue: 94,
    brightMagenta: 95,
    brightCyan: 96,
    brightWhite: 97,
};
/**
 * @description Standard background color codes for ANSI text formatting.
 * @summary This object maps color names to their corresponding ANSI color codes for standard background colors.
 * @const StandardBackgroundColors
 * @property {number} bgBlack - ANSI code for black background (40).
 * @property {number} bgRed - ANSI code for red background (41).
 * @property {number} bgGreen - ANSI code for green background (42).
 * @property {number} bgYellow - ANSI code for yellow background (43).
 * @property {number} bgBlue - ANSI code for blue background (44).
 * @property {number} bgMagenta - ANSI code for magenta background (45).
 * @property {number} bgCyan - ANSI code for cyan background (46).
 * @property {number} bgWhite - ANSI code for white background (47).
 * @memberOf module:@StyledString
 */
exports.StandardBackgroundColors = {
    bgBlack: 40,
    bgRed: 41,
    bgGreen: 42,
    bgYellow: 43,
    bgBlue: 44,
    bgMagenta: 45,
    bgCyan: 46,
    bgWhite: 47,
};
/**
 * @description Bright background color codes for ANSI text formatting.
 * @summary This object maps color names to their corresponding ANSI color codes for bright background colors.
 * @const BrightBackgroundColors
 * @property {number} bgBrightBlack - ANSI code for bright black background (100).
 * @property {number} bgBrightRed - ANSI code for bright red background (101).
 * @property {number} bgBrightGreen - ANSI code for bright green background (102).
 * @property {number} bgBrightYellow - ANSI code for bright yellow background (103).
 * @property {number} bgBrightBlue - ANSI code for bright blue background (104).
 * @property {number} bgBrightMagenta - ANSI code for bright magenta background (105).
 * @property {number} bgBrightCyan - ANSI code for bright cyan background (106).
 * @property {number} bgBrightWhite - ANSI code for bright white background (107).
 * @memberOf module:@StyledString
 */
exports.BrightBackgroundColors = {
    bgBrightBlack: 100,
    bgBrightRed: 101,
    bgBrightGreen: 102,
    bgBrightYellow: 103,
    bgBrightBlue: 104,
    bgBrightMagenta: 105,
    bgBrightCyan: 106,
    bgBrightWhite: 107,
};
/**
 * @description Text style codes for ANSI text formatting.
 * @summary This object maps style names to their corresponding ANSI codes for various text styles.
 * @const styles
 * @property {number} reset - ANSI code to reset all styles (0).
 * @property {number} bold - ANSI code for bold text (1).
 * @property {number} dim - ANSI code for dim text (2).
 * @property {number} italic - ANSI code for italic text (3).
 * @property {number} underline - ANSI code for underlined text (4).
 * @property {number} blink - ANSI code for blinking text (5).
 * @property {number} inverse - ANSI code for inverse colors (7).
 * @property {number} hidden - ANSI code for hidden text (8).
 * @property {number} strikethrough - ANSI code for strikethrough text (9).
 * @property {number} doubleUnderline - ANSI code for double underlined text (21).
 * @property {number} normalColor - ANSI code to reset color to normal (22).
 * @property {number} noItalicOrFraktur - ANSI code to turn off italic (23).
 * @property {number} noUnderline - ANSI code to turn off underline (24).
 * @property {number} noBlink - ANSI code to turn off blink (25).
 * @property {number} noInverse - ANSI code to turn off inverse (27).
 * @property {number} noHidden - ANSI code to turn off hidden (28).
 * @property {number} noStrikethrough - ANSI code to turn off strikethrough (29).
 * @memberOf module:@StyledString
 */
exports.styles = {
    reset: 0,
    bold: 1,
    dim: 2,
    italic: 3,
    underline: 4,
    blink: 5,
    inverse: 7,
    hidden: 8,
    strikethrough: 9,
    doubleUnderline: 21,
    normalColor: 22,
    noItalicOrFraktur: 23,
    noUnderline: 24,
    noBlink: 25,
    noInverse: 27,
    noHidden: 28,
    noStrikethrough: 29,
};

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9jb25zdGFudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0E7Ozs7O0dBS0c7QUFDVSxRQUFBLFNBQVMsR0FBRyxTQUFTLENBQUM7QUFFbkM7Ozs7Ozs7Ozs7Ozs7R0FhRztBQUNVLFFBQUEsd0JBQXdCLEdBQUc7SUFDdEMsS0FBSyxFQUFFLEVBQUU7SUFDVCxHQUFHLEVBQUUsRUFBRTtJQUNQLEtBQUssRUFBRSxFQUFFO0lBQ1QsTUFBTSxFQUFFLEVBQUU7SUFDVixJQUFJLEVBQUUsRUFBRTtJQUNSLE9BQU8sRUFBRSxFQUFFO0lBQ1gsSUFBSSxFQUFFLEVBQUU7SUFDUixLQUFLLEVBQUUsRUFBRTtDQUNWLENBQUM7QUFFRjs7Ozs7Ozs7Ozs7OztHQWFHO0FBQ1UsUUFBQSxzQkFBc0IsR0FBRztJQUNwQyxXQUFXLEVBQUUsRUFBRTtJQUNmLFNBQVMsRUFBRSxFQUFFO0lBQ2IsV0FBVyxFQUFFLEVBQUU7SUFDZixZQUFZLEVBQUUsRUFBRTtJQUNoQixVQUFVLEVBQUUsRUFBRTtJQUNkLGFBQWEsRUFBRSxFQUFFO0lBQ2pCLFVBQVUsRUFBRSxFQUFFO0lBQ2QsV0FBVyxFQUFFLEVBQUU7Q0FDaEIsQ0FBQztBQUVGOzs7Ozs7Ozs7Ozs7O0dBYUc7QUFDVSxRQUFBLHdCQUF3QixHQUFHO0lBQ3RDLE9BQU8sRUFBRSxFQUFFO0lBQ1gsS0FBSyxFQUFFLEVBQUU7SUFDVCxPQUFPLEVBQUUsRUFBRTtJQUNYLFFBQVEsRUFBRSxFQUFFO0lBQ1osTUFBTSxFQUFFLEVBQUU7SUFDVixTQUFTLEVBQUUsRUFBRTtJQUNiLE1BQU0sRUFBRSxFQUFFO0lBQ1YsT0FBTyxFQUFFLEVBQUU7Q0FDWixDQUFDO0FBRUY7Ozs7Ozs7Ozs7Ozs7R0FhRztBQUNVLFFBQUEsc0JBQXNCLEdBQUc7SUFDcEMsYUFBYSxFQUFFLEdBQUc7SUFDbEIsV0FBVyxFQUFFLEdBQUc7SUFDaEIsYUFBYSxFQUFFLEdBQUc7SUFDbEIsY0FBYyxFQUFFLEdBQUc7SUFDbkIsWUFBWSxFQUFFLEdBQUc7SUFDakIsZUFBZSxFQUFFLEdBQUc7SUFDcEIsWUFBWSxFQUFFLEdBQUc7SUFDakIsYUFBYSxFQUFFLEdBQUc7Q0FDbkIsQ0FBQztBQUVGOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBc0JHO0FBQ1UsUUFBQSxNQUFNLEdBQUc7SUFDcEIsS0FBSyxFQUFFLENBQUM7SUFDUixJQUFJLEVBQUUsQ0FBQztJQUNQLEdBQUcsRUFBRSxDQUFDO0lBQ04sTUFBTSxFQUFFLENBQUM7SUFDVCxTQUFTLEVBQUUsQ0FBQztJQUNaLEtBQUssRUFBRSxDQUFDO0lBQ1IsT0FBTyxFQUFFLENBQUM7SUFDVixNQUFNLEVBQUUsQ0FBQztJQUNULGFBQWEsRUFBRSxDQUFDO0lBQ2hCLGVBQWUsRUFBRSxFQUFFO0lBQ25CLFdBQVcsRUFBRSxFQUFFO0lBQ2YsaUJBQWlCLEVBQUUsRUFBRTtJQUNyQixXQUFXLEVBQUUsRUFBRTtJQUNmLE9BQU8sRUFBRSxFQUFFO0lBQ1gsU0FBUyxFQUFFLEVBQUU7SUFDYixRQUFRLEVBQUUsRUFBRTtJQUNaLGVBQWUsRUFBRSxFQUFFO0NBQ3BCLENBQUMiLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4vKipcbiAqIEBkZXNjcmlwdGlvbiBBTlNJIGVzY2FwZSBjb2RlIGZvciByZXNldHRpbmcgdGV4dCBmb3JtYXR0aW5nLlxuICogQHN1bW1hcnkgVGhpcyBjb25zdGFudCBob2xkcyB0aGUgQU5TSSBlc2NhcGUgc2VxdWVuY2UgdXNlZCB0byByZXNldCBhbGwgdGV4dCBmb3JtYXR0aW5nIHRvIGRlZmF1bHQuXG4gKiBAY29uc3QgQW5zaVJlc2V0XG4gKiBAbWVtYmVyT2YgbW9kdWxlOlN0eWxlZFN0cmluZ1xuICovXG5leHBvcnQgY29uc3QgQW5zaVJlc2V0ID0gXCJcXHgxYlswbVwiO1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvbiBTdGFuZGFyZCBmb3JlZ3JvdW5kIGNvbG9yIGNvZGVzIGZvciBBTlNJIHRleHQgZm9ybWF0dGluZy5cbiAqIEBzdW1tYXJ5IFRoaXMgb2JqZWN0IG1hcHMgY29sb3IgbmFtZXMgdG8gdGhlaXIgY29ycmVzcG9uZGluZyBBTlNJIGNvbG9yIGNvZGVzIGZvciBzdGFuZGFyZCBmb3JlZ3JvdW5kIGNvbG9ycy5cbiAqIEBjb25zdCBTdGFuZGFyZEZvcmVncm91bmRDb2xvcnNcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBibGFjayAtIEFOU0kgY29kZSBmb3IgYmxhY2sgdGV4dCAoMzApLlxuICogQHByb3BlcnR5IHtudW1iZXJ9IHJlZCAtIEFOU0kgY29kZSBmb3IgcmVkIHRleHQgKDMxKS5cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBncmVlbiAtIEFOU0kgY29kZSBmb3IgZ3JlZW4gdGV4dCAoMzIpLlxuICogQHByb3BlcnR5IHtudW1iZXJ9IHllbGxvdyAtIEFOU0kgY29kZSBmb3IgeWVsbG93IHRleHQgKDMzKS5cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBibHVlIC0gQU5TSSBjb2RlIGZvciBibHVlIHRleHQgKDM0KS5cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBtYWdlbnRhIC0gQU5TSSBjb2RlIGZvciBtYWdlbnRhIHRleHQgKDM1KS5cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBjeWFuIC0gQU5TSSBjb2RlIGZvciBjeWFuIHRleHQgKDM2KS5cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSB3aGl0ZSAtIEFOU0kgY29kZSBmb3Igd2hpdGUgdGV4dCAoMzcpLlxuICogQG1lbWJlck9mIG1vZHVsZTpTdHlsZWRTdHJpbmdcbiAqL1xuZXhwb3J0IGNvbnN0IFN0YW5kYXJkRm9yZWdyb3VuZENvbG9ycyA9IHtcbiAgYmxhY2s6IDMwLFxuICByZWQ6IDMxLFxuICBncmVlbjogMzIsXG4gIHllbGxvdzogMzMsXG4gIGJsdWU6IDM0LFxuICBtYWdlbnRhOiAzNSxcbiAgY3lhbjogMzYsXG4gIHdoaXRlOiAzNyxcbn07XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uIEJyaWdodCBmb3JlZ3JvdW5kIGNvbG9yIGNvZGVzIGZvciBBTlNJIHRleHQgZm9ybWF0dGluZy5cbiAqIEBzdW1tYXJ5IFRoaXMgb2JqZWN0IG1hcHMgY29sb3IgbmFtZXMgdG8gdGhlaXIgY29ycmVzcG9uZGluZyBBTlNJIGNvbG9yIGNvZGVzIGZvciBicmlnaHQgZm9yZWdyb3VuZCBjb2xvcnMuXG4gKiBAY29uc3QgQnJpZ2h0Rm9yZWdyb3VuZENvbG9yc1xuICogQHByb3BlcnR5IHtudW1iZXJ9IGJsYWNrIC0gQU5TSSBjb2RlIGZvciBicmlnaHQgYmxhY2sgdGV4dCAoOTApLlxuICogQHByb3BlcnR5IHtudW1iZXJ9IHJlZCAtIEFOU0kgY29kZSBmb3IgYnJpZ2h0IHJlZCB0ZXh0ICg5MSkuXG4gKiBAcHJvcGVydHkge251bWJlcn0gZ3JlZW4gLSBBTlNJIGNvZGUgZm9yIGJyaWdodCBncmVlbiB0ZXh0ICg5MikuXG4gKiBAcHJvcGVydHkge251bWJlcn0geWVsbG93IC0gQU5TSSBjb2RlIGZvciBicmlnaHQgeWVsbG93IHRleHQgKDkzKS5cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBibHVlIC0gQU5TSSBjb2RlIGZvciBicmlnaHQgYmx1ZSB0ZXh0ICg5NCkuXG4gKiBAcHJvcGVydHkge251bWJlcn0gbWFnZW50YSAtIEFOU0kgY29kZSBmb3IgYnJpZ2h0IG1hZ2VudGEgdGV4dCAoOTUpLlxuICogQHByb3BlcnR5IHtudW1iZXJ9IGN5YW4gLSBBTlNJIGNvZGUgZm9yIGJyaWdodCBjeWFuIHRleHQgKDk2KS5cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSB3aGl0ZSAtIEFOU0kgY29kZSBmb3IgYnJpZ2h0IHdoaXRlIHRleHQgKDk3KS5cbiAqIEBtZW1iZXJPZiBtb2R1bGU6QFN0eWxlZFN0cmluZ1xuICovXG5leHBvcnQgY29uc3QgQnJpZ2h0Rm9yZWdyb3VuZENvbG9ycyA9IHtcbiAgYnJpZ2h0QmxhY2s6IDkwLFxuICBicmlnaHRSZWQ6IDkxLFxuICBicmlnaHRHcmVlbjogOTIsXG4gIGJyaWdodFllbGxvdzogOTMsXG4gIGJyaWdodEJsdWU6IDk0LFxuICBicmlnaHRNYWdlbnRhOiA5NSxcbiAgYnJpZ2h0Q3lhbjogOTYsXG4gIGJyaWdodFdoaXRlOiA5Nyxcbn07XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uIFN0YW5kYXJkIGJhY2tncm91bmQgY29sb3IgY29kZXMgZm9yIEFOU0kgdGV4dCBmb3JtYXR0aW5nLlxuICogQHN1bW1hcnkgVGhpcyBvYmplY3QgbWFwcyBjb2xvciBuYW1lcyB0byB0aGVpciBjb3JyZXNwb25kaW5nIEFOU0kgY29sb3IgY29kZXMgZm9yIHN0YW5kYXJkIGJhY2tncm91bmQgY29sb3JzLlxuICogQGNvbnN0IFN0YW5kYXJkQmFja2dyb3VuZENvbG9yc1xuICogQHByb3BlcnR5IHtudW1iZXJ9IGJnQmxhY2sgLSBBTlNJIGNvZGUgZm9yIGJsYWNrIGJhY2tncm91bmQgKDQwKS5cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBiZ1JlZCAtIEFOU0kgY29kZSBmb3IgcmVkIGJhY2tncm91bmQgKDQxKS5cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBiZ0dyZWVuIC0gQU5TSSBjb2RlIGZvciBncmVlbiBiYWNrZ3JvdW5kICg0MikuXG4gKiBAcHJvcGVydHkge251bWJlcn0gYmdZZWxsb3cgLSBBTlNJIGNvZGUgZm9yIHllbGxvdyBiYWNrZ3JvdW5kICg0MykuXG4gKiBAcHJvcGVydHkge251bWJlcn0gYmdCbHVlIC0gQU5TSSBjb2RlIGZvciBibHVlIGJhY2tncm91bmQgKDQ0KS5cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBiZ01hZ2VudGEgLSBBTlNJIGNvZGUgZm9yIG1hZ2VudGEgYmFja2dyb3VuZCAoNDUpLlxuICogQHByb3BlcnR5IHtudW1iZXJ9IGJnQ3lhbiAtIEFOU0kgY29kZSBmb3IgY3lhbiBiYWNrZ3JvdW5kICg0NikuXG4gKiBAcHJvcGVydHkge251bWJlcn0gYmdXaGl0ZSAtIEFOU0kgY29kZSBmb3Igd2hpdGUgYmFja2dyb3VuZCAoNDcpLlxuICogQG1lbWJlck9mIG1vZHVsZTpAU3R5bGVkU3RyaW5nXG4gKi9cbmV4cG9ydCBjb25zdCBTdGFuZGFyZEJhY2tncm91bmRDb2xvcnMgPSB7XG4gIGJnQmxhY2s6IDQwLFxuICBiZ1JlZDogNDEsXG4gIGJnR3JlZW46IDQyLFxuICBiZ1llbGxvdzogNDMsXG4gIGJnQmx1ZTogNDQsXG4gIGJnTWFnZW50YTogNDUsXG4gIGJnQ3lhbjogNDYsXG4gIGJnV2hpdGU6IDQ3LFxufTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb24gQnJpZ2h0IGJhY2tncm91bmQgY29sb3IgY29kZXMgZm9yIEFOU0kgdGV4dCBmb3JtYXR0aW5nLlxuICogQHN1bW1hcnkgVGhpcyBvYmplY3QgbWFwcyBjb2xvciBuYW1lcyB0byB0aGVpciBjb3JyZXNwb25kaW5nIEFOU0kgY29sb3IgY29kZXMgZm9yIGJyaWdodCBiYWNrZ3JvdW5kIGNvbG9ycy5cbiAqIEBjb25zdCBCcmlnaHRCYWNrZ3JvdW5kQ29sb3JzXG4gKiBAcHJvcGVydHkge251bWJlcn0gYmdCcmlnaHRCbGFjayAtIEFOU0kgY29kZSBmb3IgYnJpZ2h0IGJsYWNrIGJhY2tncm91bmQgKDEwMCkuXG4gKiBAcHJvcGVydHkge251bWJlcn0gYmdCcmlnaHRSZWQgLSBBTlNJIGNvZGUgZm9yIGJyaWdodCByZWQgYmFja2dyb3VuZCAoMTAxKS5cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBiZ0JyaWdodEdyZWVuIC0gQU5TSSBjb2RlIGZvciBicmlnaHQgZ3JlZW4gYmFja2dyb3VuZCAoMTAyKS5cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBiZ0JyaWdodFllbGxvdyAtIEFOU0kgY29kZSBmb3IgYnJpZ2h0IHllbGxvdyBiYWNrZ3JvdW5kICgxMDMpLlxuICogQHByb3BlcnR5IHtudW1iZXJ9IGJnQnJpZ2h0Qmx1ZSAtIEFOU0kgY29kZSBmb3IgYnJpZ2h0IGJsdWUgYmFja2dyb3VuZCAoMTA0KS5cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBiZ0JyaWdodE1hZ2VudGEgLSBBTlNJIGNvZGUgZm9yIGJyaWdodCBtYWdlbnRhIGJhY2tncm91bmQgKDEwNSkuXG4gKiBAcHJvcGVydHkge251bWJlcn0gYmdCcmlnaHRDeWFuIC0gQU5TSSBjb2RlIGZvciBicmlnaHQgY3lhbiBiYWNrZ3JvdW5kICgxMDYpLlxuICogQHByb3BlcnR5IHtudW1iZXJ9IGJnQnJpZ2h0V2hpdGUgLSBBTlNJIGNvZGUgZm9yIGJyaWdodCB3aGl0ZSBiYWNrZ3JvdW5kICgxMDcpLlxuICogQG1lbWJlck9mIG1vZHVsZTpAU3R5bGVkU3RyaW5nXG4gKi9cbmV4cG9ydCBjb25zdCBCcmlnaHRCYWNrZ3JvdW5kQ29sb3JzID0ge1xuICBiZ0JyaWdodEJsYWNrOiAxMDAsXG4gIGJnQnJpZ2h0UmVkOiAxMDEsXG4gIGJnQnJpZ2h0R3JlZW46IDEwMixcbiAgYmdCcmlnaHRZZWxsb3c6IDEwMyxcbiAgYmdCcmlnaHRCbHVlOiAxMDQsXG4gIGJnQnJpZ2h0TWFnZW50YTogMTA1LFxuICBiZ0JyaWdodEN5YW46IDEwNixcbiAgYmdCcmlnaHRXaGl0ZTogMTA3LFxufTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb24gVGV4dCBzdHlsZSBjb2RlcyBmb3IgQU5TSSB0ZXh0IGZvcm1hdHRpbmcuXG4gKiBAc3VtbWFyeSBUaGlzIG9iamVjdCBtYXBzIHN0eWxlIG5hbWVzIHRvIHRoZWlyIGNvcnJlc3BvbmRpbmcgQU5TSSBjb2RlcyBmb3IgdmFyaW91cyB0ZXh0IHN0eWxlcy5cbiAqIEBjb25zdCBzdHlsZXNcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSByZXNldCAtIEFOU0kgY29kZSB0byByZXNldCBhbGwgc3R5bGVzICgwKS5cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBib2xkIC0gQU5TSSBjb2RlIGZvciBib2xkIHRleHQgKDEpLlxuICogQHByb3BlcnR5IHtudW1iZXJ9IGRpbSAtIEFOU0kgY29kZSBmb3IgZGltIHRleHQgKDIpLlxuICogQHByb3BlcnR5IHtudW1iZXJ9IGl0YWxpYyAtIEFOU0kgY29kZSBmb3IgaXRhbGljIHRleHQgKDMpLlxuICogQHByb3BlcnR5IHtudW1iZXJ9IHVuZGVybGluZSAtIEFOU0kgY29kZSBmb3IgdW5kZXJsaW5lZCB0ZXh0ICg0KS5cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBibGluayAtIEFOU0kgY29kZSBmb3IgYmxpbmtpbmcgdGV4dCAoNSkuXG4gKiBAcHJvcGVydHkge251bWJlcn0gaW52ZXJzZSAtIEFOU0kgY29kZSBmb3IgaW52ZXJzZSBjb2xvcnMgKDcpLlxuICogQHByb3BlcnR5IHtudW1iZXJ9IGhpZGRlbiAtIEFOU0kgY29kZSBmb3IgaGlkZGVuIHRleHQgKDgpLlxuICogQHByb3BlcnR5IHtudW1iZXJ9IHN0cmlrZXRocm91Z2ggLSBBTlNJIGNvZGUgZm9yIHN0cmlrZXRocm91Z2ggdGV4dCAoOSkuXG4gKiBAcHJvcGVydHkge251bWJlcn0gZG91YmxlVW5kZXJsaW5lIC0gQU5TSSBjb2RlIGZvciBkb3VibGUgdW5kZXJsaW5lZCB0ZXh0ICgyMSkuXG4gKiBAcHJvcGVydHkge251bWJlcn0gbm9ybWFsQ29sb3IgLSBBTlNJIGNvZGUgdG8gcmVzZXQgY29sb3IgdG8gbm9ybWFsICgyMikuXG4gKiBAcHJvcGVydHkge251bWJlcn0gbm9JdGFsaWNPckZyYWt0dXIgLSBBTlNJIGNvZGUgdG8gdHVybiBvZmYgaXRhbGljICgyMykuXG4gKiBAcHJvcGVydHkge251bWJlcn0gbm9VbmRlcmxpbmUgLSBBTlNJIGNvZGUgdG8gdHVybiBvZmYgdW5kZXJsaW5lICgyNCkuXG4gKiBAcHJvcGVydHkge251bWJlcn0gbm9CbGluayAtIEFOU0kgY29kZSB0byB0dXJuIG9mZiBibGluayAoMjUpLlxuICogQHByb3BlcnR5IHtudW1iZXJ9IG5vSW52ZXJzZSAtIEFOU0kgY29kZSB0byB0dXJuIG9mZiBpbnZlcnNlICgyNykuXG4gKiBAcHJvcGVydHkge251bWJlcn0gbm9IaWRkZW4gLSBBTlNJIGNvZGUgdG8gdHVybiBvZmYgaGlkZGVuICgyOCkuXG4gKiBAcHJvcGVydHkge251bWJlcn0gbm9TdHJpa2V0aHJvdWdoIC0gQU5TSSBjb2RlIHRvIHR1cm4gb2ZmIHN0cmlrZXRocm91Z2ggKDI5KS5cbiAqIEBtZW1iZXJPZiBtb2R1bGU6QFN0eWxlZFN0cmluZ1xuICovXG5leHBvcnQgY29uc3Qgc3R5bGVzID0ge1xuICByZXNldDogMCxcbiAgYm9sZDogMSxcbiAgZGltOiAyLFxuICBpdGFsaWM6IDMsXG4gIHVuZGVybGluZTogNCxcbiAgYmxpbms6IDUsXG4gIGludmVyc2U6IDcsXG4gIGhpZGRlbjogOCxcbiAgc3RyaWtldGhyb3VnaDogOSxcbiAgZG91YmxlVW5kZXJsaW5lOiAyMSxcbiAgbm9ybWFsQ29sb3I6IDIyLFxuICBub0l0YWxpY09yRnJha3R1cjogMjMsXG4gIG5vVW5kZXJsaW5lOiAyNCxcbiAgbm9CbGluazogMjUsXG4gIG5vSW52ZXJzZTogMjcsXG4gIG5vSGlkZGVuOiAyOCxcbiAgbm9TdHJpa2V0aHJvdWdoOiAyOSxcbn07XG4iXX0=


/***/ }),

/***/ 6483:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));


/***/ }),

/***/ 6487:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(2191), exports);
__exportStar(__webpack_require__(4639), exports);


/***/ }),

/***/ 6686:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.lockify = lockify;
exports.chainAbortController = chainAbortController;
exports.spawnCommand = spawnCommand;
exports.runCommand = runCommand;
const child_process_1 = __webpack_require__(5317);
const StandardOutputWriter_1 = __webpack_require__(9499);
const logging_1 = __webpack_require__(9834);
const constants_1 = __webpack_require__(7154);
/**
 * @description Creates a locked version of a function.
 * @summary This higher-order function takes a function and returns a new function that ensures
 * sequential execution of the original function, even when called multiple times concurrently.
 * It uses a Promise-based locking mechanism to queue function calls.
 *
 * @template R - The return type of the input function.
 *
 * @param f - The function to be locked. It can take any number of parameters and return a value of type R.
 * @return A new function with the same signature as the input function, but with sequential execution guaranteed.
 *
 * @function lockify
 *
 * @mermaid
 * sequenceDiagram
 *   participant Caller
 *   participant LockedFunction
 *   participant OriginalFunction
 *   Caller->>LockedFunction: Call with params
 *   LockedFunction->>LockedFunction: Check current lock
 *   alt Lock is resolved
 *     LockedFunction->>OriginalFunction: Execute with params
 *     OriginalFunction-->>LockedFunction: Return result
 *     LockedFunction-->>Caller: Return result
 *   else Lock is pending
 *     LockedFunction->>LockedFunction: Queue execution
 *     LockedFunction-->>Caller: Return promise
 *     Note over LockedFunction: Wait for previous execution
 *     LockedFunction->>OriginalFunction: Execute with params
 *     OriginalFunction-->>LockedFunction: Return result
 *     LockedFunction-->>Caller: Resolve promise with result
 *   end
 *   LockedFunction->>LockedFunction: Update lock
 *
 * @memberOf @decaf-ts/utils
 */
function lockify(f) {
    let lock = Promise.resolve();
    return (...params) => {
        const result = lock.then(() => f(...params));
        lock = result.catch(() => { });
        return result;
    };
}
function chainAbortController(argument0, ...remainder) {
    let signals;
    let controller;
    // normalize args
    if (argument0 instanceof AbortSignal) {
        controller = new AbortController();
        signals = [argument0, ...remainder];
    }
    else {
        controller = argument0;
        signals = remainder;
    }
    // if the controller is already aborted, exit early
    if (controller.signal.aborted) {
        return controller;
    }
    const handler = () => controller.abort();
    for (const signal of signals) {
        // check before adding! (and assume there is no possible way that the signal could
        // abort between the `if` check and adding the event listener)
        if (signal.aborted) {
            controller.abort();
            break;
        }
        signal.addEventListener("abort", handler, {
            once: true,
            signal: controller.signal,
        });
    }
    return controller;
}
function spawnCommand(output, command, opts, abort, logger) {
    function spawnInner(command, controller) {
        const [cmd, argz] = output.parseCommand(command);
        logger.info(`Running command: ${cmd}`);
        logger.debug(`with args: ${argz.join(" ")}`);
        const childProcess = (0, child_process_1.spawn)(cmd, argz, {
            ...opts,
            cwd: opts.cwd || process.cwd(),
            env: Object.assign({}, process.env, opts.env, { PATH: process.env.PATH }),
            shell: opts.shell || false,
            signal: controller.signal,
        });
        logger.verbose(`pid : ${childProcess.pid}`);
        return childProcess;
    }
    const m = command.match(/[<>$#]/g);
    if (m)
        throw new Error(`Invalid command: ${command}. contains invalid characters: ${m}`);
    if (command.includes(" | ")) {
        const cmds = command.split(" | ");
        const spawns = [];
        const controllers = new Array(cmds.length);
        controllers[0] = abort;
        for (let i = 0; i < cmds.length; i++) {
            if (i !== 0)
                controllers[i] = chainAbortController(controllers[i - 1].signal);
            spawns.push(spawnInner(cmds[i], controllers[i]));
            if (i === 0)
                continue;
            spawns[i - 1].stdout.pipe(spawns[i].stdin);
        }
        return spawns[cmds.length - 1];
    }
    return spawnInner(command, abort);
}
/**
 * @description Executes a command asynchronously with customizable output handling.
 * @summary This function runs a shell command as a child process, providing fine-grained
 * control over its execution and output handling. It supports custom output writers,
 * allows for command abortion, and captures both stdout and stderr.
 *
 * @template R - The type of the resolved value from the command execution.
 *
 * @param command - The command to run, either as a string or an array of strings.
 * @param opts - Spawn options for the child process. Defaults to an empty object.
 * @param outputConstructor - Constructor for the output writer. Defaults to StandardOutputWriter.
 * @param args - Additional arguments to pass to the output constructor.
 * @return {CommandResult} A promise that resolves to the command result of type R.
 *
 * @function runCommand
 *
 * @mermaid
 * sequenceDiagram
 *   participant Caller
 *   participant runCommand
 *   participant OutputWriter
 *   participant ChildProcess
 *   Caller->>runCommand: Call with command and options
 *   runCommand->>OutputWriter: Create new instance
 *   runCommand->>OutputWriter: Parse command
 *   runCommand->>ChildProcess: Spawn process
 *   ChildProcess-->>runCommand: Return process object
 *   runCommand->>ChildProcess: Set up event listeners
 *   loop For each stdout data
 *     ChildProcess->>runCommand: Emit stdout data
 *     runCommand->>OutputWriter: Handle stdout data
 *   end
 *   loop For each stderr data
 *     ChildProcess->>runCommand: Emit stderr data
 *     runCommand->>OutputWriter: Handle stderr data
 *   end
 *   ChildProcess->>runCommand: Emit error (if any)
 *   runCommand->>OutputWriter: Handle error
 *   ChildProcess->>runCommand: Emit exit
 *   runCommand->>OutputWriter: Handle exit
 *   OutputWriter-->>runCommand: Resolve or reject promise
 *   runCommand-->>Caller: Return CommandResult
 *
 * @memberOf @decaf-ts/utils
 */
function runCommand(command, opts = {}, outputConstructor = (StandardOutputWriter_1.StandardOutputWriter), ...args) {
    const logger = logging_1.Logging.for(runCommand);
    const abort = new AbortController();
    const result = {
        abort: abort,
        command: command,
        logs: [],
        errs: [],
    };
    const lock = new Promise((resolve, reject) => {
        let output;
        try {
            output = new outputConstructor(command, {
                resolve,
                reject,
            }, ...args);
            result.cmd = spawnCommand(output, command, opts, abort, logger);
        }
        catch (e) {
            return reject(new Error(`Error running command ${command}: ${e}`));
        }
        result.cmd.stdout.setEncoding("utf8");
        result.cmd.stdout.on("data", (chunk) => {
            chunk = chunk.toString();
            result.logs.push(chunk);
            output.data(chunk);
        });
        result.cmd.stderr.on("data", (data) => {
            data = data.toString();
            result.errs.push(data);
            output.error(data);
        });
        result.cmd.once("error", (err) => {
            output.exit(err.message, result.errs);
        });
        result.cmd.once("exit", (code = 0) => {
            if (abort.signal.aborted && code === null)
                code = constants_1.AbortCode;
            output.exit(code, code === 0 ? result.logs : result.errs);
        });
    });
    Object.assign(result, {
        promise: lock,
        pipe: async (cb) => {
            const l = logger.for("pipe");
            try {
                l.verbose(`Executing pipe function ${command}...`);
                const result = await lock;
                l.verbose(`Piping output to ${cb.name}: ${result}`);
                return cb(result);
            }
            catch (e) {
                l.error(`Error piping command output: ${e}`);
                throw e;
            }
        },
    });
    return result;
}


/***/ }),

/***/ 6694:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const DatePart = __webpack_require__(5568);

class Hours extends DatePart {
  constructor(opts={}) {
    super(opts);
  }

  up() {
    this.date.setHours(this.date.getHours() + 1);
  }

  down() {
    this.date.setHours(this.date.getHours() - 1);
  }

  setTo(val) {
    this.date.setHours(parseInt(val.substr(-2)));
  }

  toString() {
    let hours = this.date.getHours();
    if (/h/.test(this.token))
      hours = (hours % 12) || 12;
    return this.token.length > 1 ? String(hours).padStart(2, '0') : hours;
  }
}

module.exports = Hours;


/***/ }),

/***/ 6781:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const DatePart = __webpack_require__(323);

class Minutes extends DatePart {
  constructor(opts = {}) {
    super(opts);
  }

  up() {
    this.date.setMinutes(this.date.getMinutes() + 1);
  }

  down() {
    this.date.setMinutes(this.date.getMinutes() - 1);
  }

  setTo(val) {
    this.date.setMinutes(parseInt(val.substr(-2)));
  }

  toString() {
    let m = this.date.getMinutes();
    return this.token.length > 1 ? String(m).padStart(2, '0') : m;
  }

}

module.exports = Minutes;

/***/ }),

/***/ 6818:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const color = __webpack_require__(1394);

const _require = __webpack_require__(723),
      cursor = _require.cursor;

const Prompt = __webpack_require__(4597);

const _require2 = __webpack_require__(4586),
      clear = _require2.clear,
      figures = _require2.figures,
      style = _require2.style,
      wrap = _require2.wrap,
      entriesToDisplay = _require2.entriesToDisplay;
/**
 * MultiselectPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Array} opts.choices Array of choice objects
 * @param {String} [opts.hint] Hint to display
 * @param {String} [opts.warn] Hint shown for disabled choices
 * @param {Number} [opts.max] Max choices
 * @param {Number} [opts.cursor=0] Cursor start position
 * @param {Number} [opts.optionsPerPage=10] Max options to display at once
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */


class MultiselectPrompt extends Prompt {
  constructor(opts = {}) {
    super(opts);
    this.msg = opts.message;
    this.cursor = opts.cursor || 0;
    this.scrollIndex = opts.cursor || 0;
    this.hint = opts.hint || '';
    this.warn = opts.warn || '- This option is disabled -';
    this.minSelected = opts.min;
    this.showMinError = false;
    this.maxChoices = opts.max;
    this.instructions = opts.instructions;
    this.optionsPerPage = opts.optionsPerPage || 10;
    this.value = opts.choices.map((ch, idx) => {
      if (typeof ch === 'string') ch = {
        title: ch,
        value: idx
      };
      return {
        title: ch && (ch.title || ch.value || ch),
        description: ch && ch.description,
        value: ch && (ch.value === undefined ? idx : ch.value),
        selected: ch && ch.selected,
        disabled: ch && ch.disabled
      };
    });
    this.clear = clear('', this.out.columns);

    if (!opts.overrideRender) {
      this.render();
    }
  }

  reset() {
    this.value.map(v => !v.selected);
    this.cursor = 0;
    this.fire();
    this.render();
  }

  selected() {
    return this.value.filter(v => v.selected);
  }

  exit() {
    this.abort();
  }

  abort() {
    this.done = this.aborted = true;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  submit() {
    const selected = this.value.filter(e => e.selected);

    if (this.minSelected && selected.length < this.minSelected) {
      this.showMinError = true;
      this.render();
    } else {
      this.done = true;
      this.aborted = false;
      this.fire();
      this.render();
      this.out.write('\n');
      this.close();
    }
  }

  first() {
    this.cursor = 0;
    this.render();
  }

  last() {
    this.cursor = this.value.length - 1;
    this.render();
  }

  next() {
    this.cursor = (this.cursor + 1) % this.value.length;
    this.render();
  }

  up() {
    if (this.cursor === 0) {
      this.cursor = this.value.length - 1;
    } else {
      this.cursor--;
    }

    this.render();
  }

  down() {
    if (this.cursor === this.value.length - 1) {
      this.cursor = 0;
    } else {
      this.cursor++;
    }

    this.render();
  }

  left() {
    this.value[this.cursor].selected = false;
    this.render();
  }

  right() {
    if (this.value.filter(e => e.selected).length >= this.maxChoices) return this.bell();
    this.value[this.cursor].selected = true;
    this.render();
  }

  handleSpaceToggle() {
    const v = this.value[this.cursor];

    if (v.selected) {
      v.selected = false;
      this.render();
    } else if (v.disabled || this.value.filter(e => e.selected).length >= this.maxChoices) {
      return this.bell();
    } else {
      v.selected = true;
      this.render();
    }
  }

  toggleAll() {
    if (this.maxChoices !== undefined || this.value[this.cursor].disabled) {
      return this.bell();
    }

    const newSelected = !this.value[this.cursor].selected;
    this.value.filter(v => !v.disabled).forEach(v => v.selected = newSelected);
    this.render();
  }

  _(c, key) {
    if (c === ' ') {
      this.handleSpaceToggle();
    } else if (c === 'a') {
      this.toggleAll();
    } else {
      return this.bell();
    }
  }

  renderInstructions() {
    if (this.instructions === undefined || this.instructions) {
      if (typeof this.instructions === 'string') {
        return this.instructions;
      }

      return '\nInstructions:\n' + `    ${figures.arrowUp}/${figures.arrowDown}: Highlight option\n` + `    ${figures.arrowLeft}/${figures.arrowRight}/[space]: Toggle selection\n` + (this.maxChoices === undefined ? `    a: Toggle all\n` : '') + `    enter/return: Complete answer`;
    }

    return '';
  }

  renderOption(cursor, v, i, arrowIndicator) {
    const prefix = (v.selected ? color.green(figures.radioOn) : figures.radioOff) + ' ' + arrowIndicator + ' ';
    let title, desc;

    if (v.disabled) {
      title = cursor === i ? color.gray().underline(v.title) : color.strikethrough().gray(v.title);
    } else {
      title = cursor === i ? color.cyan().underline(v.title) : v.title;

      if (cursor === i && v.description) {
        desc = ` - ${v.description}`;

        if (prefix.length + title.length + desc.length >= this.out.columns || v.description.split(/\r?\n/).length > 1) {
          desc = '\n' + wrap(v.description, {
            margin: prefix.length,
            width: this.out.columns
          });
        }
      }
    }

    return prefix + title + color.gray(desc || '');
  } // shared with autocompleteMultiselect


  paginateOptions(options) {
    if (options.length === 0) {
      return color.red('No matches for this query.');
    }

    let _entriesToDisplay = entriesToDisplay(this.cursor, options.length, this.optionsPerPage),
        startIndex = _entriesToDisplay.startIndex,
        endIndex = _entriesToDisplay.endIndex;

    let prefix,
        styledOptions = [];

    for (let i = startIndex; i < endIndex; i++) {
      if (i === startIndex && startIndex > 0) {
        prefix = figures.arrowUp;
      } else if (i === endIndex - 1 && endIndex < options.length) {
        prefix = figures.arrowDown;
      } else {
        prefix = ' ';
      }

      styledOptions.push(this.renderOption(this.cursor, options[i], i, prefix));
    }

    return '\n' + styledOptions.join('\n');
  } // shared with autocomleteMultiselect


  renderOptions(options) {
    if (!this.done) {
      return this.paginateOptions(options);
    }

    return '';
  }

  renderDoneOrInstructions() {
    if (this.done) {
      return this.value.filter(e => e.selected).map(v => v.title).join(', ');
    }

    const output = [color.gray(this.hint), this.renderInstructions()];

    if (this.value[this.cursor].disabled) {
      output.push(color.yellow(this.warn));
    }

    return output.join(' ');
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);
    super.render(); // print prompt

    let prompt = [style.symbol(this.done, this.aborted), color.bold(this.msg), style.delimiter(false), this.renderDoneOrInstructions()].join(' ');

    if (this.showMinError) {
      prompt += color.red(`You must select a minimum of ${this.minSelected} choices.`);
      this.showMinError = false;
    }

    prompt += this.renderOptions(this.value);
    this.out.write(this.clear + prompt);
    this.clear = clear(prompt, this.out.columns);
  }

}

module.exports = MultiselectPrompt;

/***/ }),

/***/ 6837:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DefaultCommandValues = exports.DefaultCommandOptions = void 0;
/**
 * @description Default command options for CLI commands.
 * @summary Defines the structure and default values for common command-line options used across various CLI commands.
 * @const DefaultCommandOptions
 * @typedef {Object} DefaultCommandOptions
 * @property {Object} verbose - Verbosity level option.
 * @property {string} verbose.type - The type of the verbose option (number).
 * @property {string} verbose.short - The short flag for the verbose option (V).
 * @property {number} verbose.default - The default value for verbosity (0).
 * @property {Object} version - Version display option.
 * @property {string} version.type - The type of the version option (boolean).
 * @property {string} version.short - The short flag for the version option (v).
 * @property {undefined} version.default - The default value for version display (undefined).
 * @property {Object} help - Help display option.
 * @property {string} help.type - The type of the help option (boolean).
 * @property {string} help.short - The short flag for the help option (h).
 * @property {boolean} help.default - The default value for help display (false).
 * @property {Object} logLevel - Log level option.
 * @property {string} logLevel.type - The type of the logLevel option (string).
 * @property {string} logLevel.default - The default value for log level ("info").
 * @property {Object} logStyle - Log styling option.
 * @property {string} logStyle.type - The type of the logStyle option (boolean).
 * @property {boolean} logStyle.default - The default value for log styling (true).
 * @property {Object} timestamp - Timestamp display option.
 * @property {string} timestamp.type - The type of the timestamp option (boolean).
 * @property {boolean} timestamp.default - The default value for timestamp display (true).
 * @property {Object} banner - Banner display option.
 * @property {string} banner.type - The type of the banner option (boolean).
 * @property {boolean} banner.default - The default value for banner display (false).
 */
exports.DefaultCommandOptions = {
    verbose: {
        type: "boolean",
        short: "V",
        default: undefined,
    },
    version: {
        type: "boolean",
        short: "v",
        default: undefined,
    },
    help: {
        type: "boolean",
        short: "h",
        default: false,
    },
    logLevel: {
        type: "string",
        default: "info",
    },
    logStyle: {
        type: "boolean",
        default: true,
    },
    timestamp: {
        type: "boolean",
        default: true,
    },
    banner: {
        type: "boolean",
        default: true,
    },
};
/**
 * @description Default command values derived from DefaultCommandOptions.
 * @summary Creates an object with the default values of all options defined in DefaultCommandOptions.
 * @const DefaultCommandValues
 * @typedef {Object} DefaultCommandValues
 * @property {unknown} [key: string] - The default value for each option in DefaultCommandOptions.
 */
exports.DefaultCommandValues = Object.keys(exports.DefaultCommandOptions).reduce((acc, key) => {
    acc[key] =
        exports.DefaultCommandOptions[key].default;
    return acc;
}, {});


/***/ }),

/***/ 6854:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const color = __webpack_require__(1394);

const _require = __webpack_require__(723),
      cursor = _require.cursor;

const MultiselectPrompt = __webpack_require__(6818);

const _require2 = __webpack_require__(4586),
      clear = _require2.clear,
      style = _require2.style,
      figures = _require2.figures;
/**
 * MultiselectPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Array} opts.choices Array of choice objects
 * @param {String} [opts.hint] Hint to display
 * @param {String} [opts.warn] Hint shown for disabled choices
 * @param {Number} [opts.max] Max choices
 * @param {Number} [opts.cursor=0] Cursor start position
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */


class AutocompleteMultiselectPrompt extends MultiselectPrompt {
  constructor(opts = {}) {
    opts.overrideRender = true;
    super(opts);
    this.inputValue = '';
    this.clear = clear('', this.out.columns);
    this.filteredOptions = this.value;
    this.render();
  }

  last() {
    this.cursor = this.filteredOptions.length - 1;
    this.render();
  }

  next() {
    this.cursor = (this.cursor + 1) % this.filteredOptions.length;
    this.render();
  }

  up() {
    if (this.cursor === 0) {
      this.cursor = this.filteredOptions.length - 1;
    } else {
      this.cursor--;
    }

    this.render();
  }

  down() {
    if (this.cursor === this.filteredOptions.length - 1) {
      this.cursor = 0;
    } else {
      this.cursor++;
    }

    this.render();
  }

  left() {
    this.filteredOptions[this.cursor].selected = false;
    this.render();
  }

  right() {
    if (this.value.filter(e => e.selected).length >= this.maxChoices) return this.bell();
    this.filteredOptions[this.cursor].selected = true;
    this.render();
  }

  delete() {
    if (this.inputValue.length) {
      this.inputValue = this.inputValue.substr(0, this.inputValue.length - 1);
      this.updateFilteredOptions();
    }
  }

  updateFilteredOptions() {
    const currentHighlight = this.filteredOptions[this.cursor];
    this.filteredOptions = this.value.filter(v => {
      if (this.inputValue) {
        if (typeof v.title === 'string') {
          if (v.title.toLowerCase().includes(this.inputValue.toLowerCase())) {
            return true;
          }
        }

        if (typeof v.value === 'string') {
          if (v.value.toLowerCase().includes(this.inputValue.toLowerCase())) {
            return true;
          }
        }

        return false;
      }

      return true;
    });
    const newHighlightIndex = this.filteredOptions.findIndex(v => v === currentHighlight);
    this.cursor = newHighlightIndex < 0 ? 0 : newHighlightIndex;
    this.render();
  }

  handleSpaceToggle() {
    const v = this.filteredOptions[this.cursor];

    if (v.selected) {
      v.selected = false;
      this.render();
    } else if (v.disabled || this.value.filter(e => e.selected).length >= this.maxChoices) {
      return this.bell();
    } else {
      v.selected = true;
      this.render();
    }
  }

  handleInputChange(c) {
    this.inputValue = this.inputValue + c;
    this.updateFilteredOptions();
  }

  _(c, key) {
    if (c === ' ') {
      this.handleSpaceToggle();
    } else {
      this.handleInputChange(c);
    }
  }

  renderInstructions() {
    if (this.instructions === undefined || this.instructions) {
      if (typeof this.instructions === 'string') {
        return this.instructions;
      }

      return `
Instructions:
    ${figures.arrowUp}/${figures.arrowDown}: Highlight option
    ${figures.arrowLeft}/${figures.arrowRight}/[space]: Toggle selection
    [a,b,c]/delete: Filter choices
    enter/return: Complete answer
`;
    }

    return '';
  }

  renderCurrentInput() {
    return `
Filtered results for: ${this.inputValue ? this.inputValue : color.gray('Enter something to filter')}\n`;
  }

  renderOption(cursor, v, i) {
    let title;
    if (v.disabled) title = cursor === i ? color.gray().underline(v.title) : color.strikethrough().gray(v.title);else title = cursor === i ? color.cyan().underline(v.title) : v.title;
    return (v.selected ? color.green(figures.radioOn) : figures.radioOff) + '  ' + title;
  }

  renderDoneOrInstructions() {
    if (this.done) {
      return this.value.filter(e => e.selected).map(v => v.title).join(', ');
    }

    const output = [color.gray(this.hint), this.renderInstructions(), this.renderCurrentInput()];

    if (this.filteredOptions.length && this.filteredOptions[this.cursor].disabled) {
      output.push(color.yellow(this.warn));
    }

    return output.join(' ');
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);
    super.render(); // print prompt

    let prompt = [style.symbol(this.done, this.aborted), color.bold(this.msg), style.delimiter(false), this.renderDoneOrInstructions()].join(' ');

    if (this.showMinError) {
      prompt += color.red(`You must select a minimum of ${this.minSelected} choices.`);
      this.showMinError = false;
    }

    prompt += this.renderOptions(this.filteredOptions);
    this.out.write(this.clear + prompt);
    this.clear = clear(prompt, this.out.columns);
  }

}

module.exports = AutocompleteMultiselectPrompt;

/***/ }),

/***/ 6946:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(7714), exports);
__exportStar(__webpack_require__(6483), exports);


/***/ }),

/***/ 7096:
/***/ ((module) => {

"use strict";


module.exports = str => {
  const pattern = ['[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)', '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))'].join('|');
  const RGX = new RegExp(pattern, 'g');
  return typeof str === 'string' ? str.replace(RGX, '') : str;
};

/***/ }),

/***/ 7154:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AbortCode = exports.DefaultLoggingConfig = exports.DefaultTheme = exports.NumericLogLevels = exports.LogLevel = exports.Tokens = exports.SetupScriptKey = exports.NoCIFLag = exports.SemVersion = exports.SemVersionRegex = exports.Encoding = void 0;
/**
 * @description Default encoding for text operations.
 * @summary The standard UTF-8 encoding used for text processing.
 * @const {string} Encoding
 * @memberOf @decaf-ts/utils
 */
exports.Encoding = "utf-8";
/**
 * @description Regular expression for semantic versioning.
 * @summary A regex pattern to match and parse semantic version strings.
 * @const {RegExp} SemVersionRegex
 * @memberOf @decaf-ts/utils
 */
exports.SemVersionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z])))/g;
/**
 * @description Enum for semantic version components.
 * @summary Defines the three levels of semantic versioning: PATCH, MINOR, and MAJOR.
 * @enum {string}
 * @memberOf @decaf-ts/utils
 */
var SemVersion;
(function (SemVersion) {
    /** Patch version for backwards-compatible bug fixes. */
    SemVersion["PATCH"] = "patch";
    /** Minor version for backwards-compatible new features. */
    SemVersion["MINOR"] = "minor";
    /** Major version for changes that break backwards compatibility. */
    SemVersion["MAJOR"] = "major";
})(SemVersion || (exports.SemVersion = SemVersion = {}));
/**
 * @description Flag to indicate non-CI environment.
 * @summary Used to specify that a command should run outside of a Continuous Integration environment.
 * @const {string} NoCIFLag
 * @memberOf @decaf-ts/utils
 */
exports.NoCIFLag = "-no-ci";
/**
 * @description Key for the setup script in package.json.
 * @summary Identifies the script that runs after package installation.
 * @const {string} SetupScriptKey
 * @memberOf @decaf-ts/utils
 */
exports.SetupScriptKey = "postinstall";
/**
 * @description Enum for various authentication tokens.
 * @summary Defines the file names for storing different types of authentication tokens.
 * @enum {string}
 * @memberOf @decaf-ts/utils
 */
var Tokens;
(function (Tokens) {
    /** Git authentication token file name. */
    Tokens["GIT"] = ".token";
    /** NPM authentication token file name. */
    Tokens["NPM"] = ".npmtoken";
    /** Docker authentication token file name. */
    Tokens["DOCKER"] = ".dockertoken";
    /** Confluence authentication token file name. */
    Tokens["CONFLUENCE"] = ".confluence-token";
})(Tokens || (exports.Tokens = Tokens = {}));
/**
 * @description Enum for log levels.
 * @summary Defines different levels of logging for the application.
 * @enum {string}
 * @memberOf @decaf-ts/utils
 */
var LogLevel;
(function (LogLevel) {
    /** Error events that are likely to cause problems. */
    LogLevel["error"] = "error";
    /** Routine information, such as ongoing status or performance. */
    LogLevel["info"] = "info";
    /** Additional relevant information. */
    LogLevel["verbose"] = "verbose";
    /** Debug or trace information. */
    LogLevel["debug"] = "debug";
    /** way too verbose or silly information. */
    LogLevel["silly"] = "silly";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
/**
 * @description Numeric values associated with log levels.
 * @summary Provides a numeric representation of log levels for comparison and filtering.
 * @const {Object} NumericLogLevels
 * @property {number} error - Numeric value for error level (0).
 * @property {number} info - Numeric value for info level (2).
 * @property {number} verbose - Numeric value for verbose level (4).
 * @property {number} debug - Numeric value for debug level (5).
 * @property {number} silly - Numeric value for silly level (8).
 * @memberOf @decaf-ts/utils
 */
exports.NumericLogLevels = {
    error: 2,
    info: 4,
    verbose: 6,
    debug: 7,
    silly: 9,
};
/**
 * @description Default theme for styling log output.
 * @summary Defines the default color and style settings for various components of log messages.
 * @const DefaultTheme
 * @typedef {Theme} DefaultTheme
 * @property {Object} class - Styling for class names.
 * @property {number} class.fg - Foreground color code for class names (4).
 * @property {Object} id - Styling for identifiers.
 * @property {number} id.fg - Foreground color code for identifiers (36).
 * @property {Object} stack - Styling for stack traces (empty object).
 * @property {Object} timestamp - Styling for timestamps (empty object).
 * @property {Object} message - Styling for different types of messages.
 * @property {Object} message.error - Styling for error messages.
 * @property {number} message.error.fg - Foreground color code for error messages (34).
 * @property {Object} method - Styling for method names (empty object).
 * @property {Object} logLevel - Styling for different log levels.
 * @property {Object} logLevel.error - Styling for error level logs.
 * @property {number} logLevel.error.fg - Foreground color code for error level logs (6).
 * @property {Object} logLevel.info - Styling for info level logs (empty object).
 * @property {Object} logLevel.verbose - Styling for verbose level logs (empty object).
 * @property {Object} logLevel.debug - Styling for debug level logs.
 * @property {number} logLevel.debug.fg - Foreground color code for debug level logs (7).
 * @memberOf @decaf-ts/utils
 */
exports.DefaultTheme = {
    class: {
        fg: 34,
    },
    id: {
        fg: 36,
    },
    stack: {},
    timestamp: {},
    message: {
        error: {
            fg: 31,
        },
    },
    method: {},
    logLevel: {
        error: {
            fg: 31,
            style: ["bold"],
        },
        info: {},
        verbose: {},
        debug: {
            fg: 33,
        },
    },
};
/**
 * @description Default configuration for logging.
 * @summary Defines the default settings for the logging system, including verbosity, log level, styling, and timestamp format.
 * @const DefaultLoggingConfig
 * @typedef {LoggingConfig} DefaultLoggingConfig
 * @property {number} verbose - Verbosity level (0).
 * @property {LogLevel} level - Default log level (LogLevel.info).
 * @property {boolean} style - Whether to apply styling to log output (false).
 * @property {boolean} timestamp - Whether to include timestamps in log messages (true).
 * @property {string} timestampFormat - Format for timestamps ("HH:mm:ss.SSS").
 * @property {boolean} context - Whether to include context information in log messages (true).
 * @property {Theme} theme - The theme to use for styling log messages (DefaultTheme).
 * @memberOf @decaf-ts/utils
 */
exports.DefaultLoggingConfig = {
    verbose: 0,
    level: LogLevel.info,
    logLevel: true,
    style: false,
    separator: " - ",
    timestamp: true,
    timestampFormat: "HH:mm:ss.SSS",
    context: true,
    theme: exports.DefaultTheme,
};
exports.AbortCode = "Aborted";


/***/ }),

/***/ 7160:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

const color = __webpack_require__(1394);

const Prompt = __webpack_require__(4597);

const _require = __webpack_require__(723),
      erase = _require.erase,
      cursor = _require.cursor;

const _require2 = __webpack_require__(4586),
      style = _require2.style,
      clear = _require2.clear,
      lines = _require2.lines,
      figures = _require2.figures;
/**
 * TextPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {String} [opts.style='default'] Render style
 * @param {String} [opts.initial] Default value
 * @param {Function} [opts.validate] Validate function
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 * @param {String} [opts.error] The invalid error label
 */


class TextPrompt extends Prompt {
  constructor(opts = {}) {
    super(opts);
    this.transform = style.render(opts.style);
    this.scale = this.transform.scale;
    this.msg = opts.message;
    this.initial = opts.initial || ``;

    this.validator = opts.validate || (() => true);

    this.value = ``;
    this.errorMsg = opts.error || `Please Enter A Valid Value`;
    this.cursor = Number(!!this.initial);
    this.cursorOffset = 0;
    this.clear = clear(``, this.out.columns);
    this.render();
  }

  set value(v) {
    if (!v && this.initial) {
      this.placeholder = true;
      this.rendered = color.gray(this.transform.render(this.initial));
    } else {
      this.placeholder = false;
      this.rendered = this.transform.render(v);
    }

    this._value = v;
    this.fire();
  }

  get value() {
    return this._value;
  }

  reset() {
    this.value = ``;
    this.cursor = Number(!!this.initial);
    this.cursorOffset = 0;
    this.fire();
    this.render();
  }

  exit() {
    this.abort();
  }

  abort() {
    this.value = this.value || this.initial;
    this.done = this.aborted = true;
    this.error = false;
    this.red = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  validate() {
    var _this = this;

    return _asyncToGenerator(function* () {
      let valid = yield _this.validator(_this.value);

      if (typeof valid === `string`) {
        _this.errorMsg = valid;
        valid = false;
      }

      _this.error = !valid;
    })();
  }

  submit() {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      _this2.value = _this2.value || _this2.initial;
      _this2.cursorOffset = 0;
      _this2.cursor = _this2.rendered.length;
      yield _this2.validate();

      if (_this2.error) {
        _this2.red = true;

        _this2.fire();

        _this2.render();

        return;
      }

      _this2.done = true;
      _this2.aborted = false;

      _this2.fire();

      _this2.render();

      _this2.out.write('\n');

      _this2.close();
    })();
  }

  next() {
    if (!this.placeholder) return this.bell();
    this.value = this.initial;
    this.cursor = this.rendered.length;
    this.fire();
    this.render();
  }

  moveCursor(n) {
    if (this.placeholder) return;
    this.cursor = this.cursor + n;
    this.cursorOffset += n;
  }

  _(c, key) {
    let s1 = this.value.slice(0, this.cursor);
    let s2 = this.value.slice(this.cursor);
    this.value = `${s1}${c}${s2}`;
    this.red = false;
    this.cursor = this.placeholder ? 0 : s1.length + 1;
    this.render();
  }

  delete() {
    if (this.isCursorAtStart()) return this.bell();
    let s1 = this.value.slice(0, this.cursor - 1);
    let s2 = this.value.slice(this.cursor);
    this.value = `${s1}${s2}`;
    this.red = false;

    if (this.isCursorAtStart()) {
      this.cursorOffset = 0;
    } else {
      this.cursorOffset++;
      this.moveCursor(-1);
    }

    this.render();
  }

  deleteForward() {
    if (this.cursor * this.scale >= this.rendered.length || this.placeholder) return this.bell();
    let s1 = this.value.slice(0, this.cursor);
    let s2 = this.value.slice(this.cursor + 1);
    this.value = `${s1}${s2}`;
    this.red = false;

    if (this.isCursorAtEnd()) {
      this.cursorOffset = 0;
    } else {
      this.cursorOffset++;
    }

    this.render();
  }

  first() {
    this.cursor = 0;
    this.render();
  }

  last() {
    this.cursor = this.value.length;
    this.render();
  }

  left() {
    if (this.cursor <= 0 || this.placeholder) return this.bell();
    this.moveCursor(-1);
    this.render();
  }

  right() {
    if (this.cursor * this.scale >= this.rendered.length || this.placeholder) return this.bell();
    this.moveCursor(1);
    this.render();
  }

  isCursorAtStart() {
    return this.cursor === 0 || this.placeholder && this.cursor === 1;
  }

  isCursorAtEnd() {
    return this.cursor === this.rendered.length || this.placeholder && this.cursor === this.rendered.length + 1;
  }

  render() {
    if (this.closed) return;

    if (!this.firstRender) {
      if (this.outputError) this.out.write(cursor.down(lines(this.outputError, this.out.columns) - 1) + clear(this.outputError, this.out.columns));
      this.out.write(clear(this.outputText, this.out.columns));
    }

    super.render();
    this.outputError = '';
    this.outputText = [style.symbol(this.done, this.aborted), color.bold(this.msg), style.delimiter(this.done), this.red ? color.red(this.rendered) : this.rendered].join(` `);

    if (this.error) {
      this.outputError += this.errorMsg.split(`\n`).reduce((a, l, i) => a + `\n${i ? ' ' : figures.pointerSmall} ${color.red().italic(l)}`, ``);
    }

    this.out.write(erase.line + cursor.to(0) + this.outputText + cursor.save + this.outputError + cursor.restore + cursor.move(this.cursorOffset, 0));
  }

}

module.exports = TextPrompt;

/***/ }),

/***/ 7679:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const color = __webpack_require__(1394);
const Prompt = __webpack_require__(4872);
const { cursor, erase } = __webpack_require__(723);
const { style, figures, clear, lines } = __webpack_require__(1189);

const isNumber = /[0-9]/;
const isDef = any => any !== undefined;
const round = (number, precision) => {
  let factor = Math.pow(10, precision);
  return Math.round(number * factor) / factor;
}

/**
 * NumberPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {String} [opts.style='default'] Render style
 * @param {Number} [opts.initial] Default value
 * @param {Number} [opts.max=+Infinity] Max value
 * @param {Number} [opts.min=-Infinity] Min value
 * @param {Boolean} [opts.float=false] Parse input as floats
 * @param {Number} [opts.round=2] Round floats to x decimals
 * @param {Number} [opts.increment=1] Number to increment by when using arrow-keys
 * @param {Function} [opts.validate] Validate function
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 * @param {String} [opts.error] The invalid error label
 */
class NumberPrompt extends Prompt {
  constructor(opts={}) {
    super(opts);
    this.transform = style.render(opts.style);
    this.msg = opts.message;
    this.initial = isDef(opts.initial) ? opts.initial : '';
    this.float = !!opts.float;
    this.round = opts.round || 2;
    this.inc = opts.increment || 1;
    this.min = isDef(opts.min) ? opts.min : -Infinity;
    this.max = isDef(opts.max) ? opts.max : Infinity;
    this.errorMsg = opts.error || `Please Enter A Valid Value`;
    this.validator = opts.validate || (() => true);
    this.color = `cyan`;
    this.value = ``;
    this.typed = ``;
    this.lastHit = 0;
    this.render();
  }

  set value(v) {
    if (!v && v !== 0) {
      this.placeholder = true;
      this.rendered = color.gray(this.transform.render(`${this.initial}`));
      this._value = ``;
    } else {
      this.placeholder = false;
      this.rendered = this.transform.render(`${round(v, this.round)}`);
      this._value = round(v, this.round);
    }
    this.fire();
  }

  get value() {
    return this._value;
  }

  parse(x) {
    return this.float ? parseFloat(x) : parseInt(x);
  }

  valid(c) {
    return c === `-` || c === `.` && this.float || isNumber.test(c)
  }

  reset() {
    this.typed = ``;
    this.value = ``;
    this.fire();
    this.render();
  }

  exit() {
    this.abort();
  }

  abort() {
    let x = this.value;
    this.value = x !== `` ? x : this.initial;
    this.done = this.aborted = true;
    this.error = false;
    this.fire();
    this.render();
    this.out.write(`\n`);
    this.close();
  }

  async validate() {
    let valid = await this.validator(this.value);
    if (typeof valid === `string`) {
      this.errorMsg = valid;
      valid = false;
    }
    this.error = !valid;
  }

  async submit() {
    await this.validate();
    if (this.error) {
      this.color = `red`;
      this.fire();
      this.render();
      return;
    }
    let x = this.value;
    this.value = x !== `` ? x : this.initial;
    this.done = true;
    this.aborted = false;
    this.error = false;
    this.fire();
    this.render();
    this.out.write(`\n`);
    this.close();
  }

  up() {
    this.typed = ``;
    if(this.value === '') {
      this.value = this.min - this.inc;
    }
    if (this.value >= this.max) return this.bell();
    this.value += this.inc;
    this.color = `cyan`;
    this.fire();
    this.render();
  }

  down() {
    this.typed = ``;
    if(this.value === '') {
      this.value = this.min + this.inc;
    }
    if (this.value <= this.min) return this.bell();
    this.value -= this.inc;
    this.color = `cyan`;
    this.fire();
    this.render();
  }

  delete() {
    let val = this.value.toString();
    if (val.length === 0) return this.bell();
    this.value = this.parse((val = val.slice(0, -1))) || ``;
    if (this.value !== '' && this.value < this.min) {
      this.value = this.min;
    }
    this.color = `cyan`;
    this.fire();
    this.render();
  }

  next() {
    this.value = this.initial;
    this.fire();
    this.render();
  }

  _(c, key) {
    if (!this.valid(c)) return this.bell();

    const now = Date.now();
    if (now - this.lastHit > 1000) this.typed = ``; // 1s elapsed
    this.typed += c;
    this.lastHit = now;
    this.color = `cyan`;

    if (c === `.`) return this.fire();

    this.value = Math.min(this.parse(this.typed), this.max);
    if (this.value > this.max) this.value = this.max;
    if (this.value < this.min) this.value = this.min;
    this.fire();
    this.render();
  }

  render() {
    if (this.closed) return;
    if (!this.firstRender) {
      if (this.outputError)
        this.out.write(cursor.down(lines(this.outputError, this.out.columns) - 1) + clear(this.outputError, this.out.columns));
      this.out.write(clear(this.outputText, this.out.columns));
    }
    super.render();
    this.outputError = '';

    // Print prompt
    this.outputText = [
      style.symbol(this.done, this.aborted),
      color.bold(this.msg),
      style.delimiter(this.done),
      !this.done || (!this.done && !this.placeholder)
          ? color[this.color]().underline(this.rendered) : this.rendered
    ].join(` `);

    // Print error
    if (this.error) {
      this.outputError += this.errorMsg.split(`\n`)
          .reduce((a, l, i) => a + `\n${i ? ` ` : figures.pointerSmall} ${color.red().italic(l)}`, ``);
    }

    this.out.write(erase.line + cursor.to(0) + this.outputText + cursor.save + this.outputError + cursor.restore);
  }
}

module.exports = NumberPrompt;


/***/ }),

/***/ 7714:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UserInput = void 0;
const prompts_1 = __importDefault(__webpack_require__(9240));
const util_1 = __webpack_require__(1024);
const logging_1 = __webpack_require__(9834);
/**
 * @description Represents a user input prompt with various configuration options.
 * @summary This class provides a flexible interface for creating and managing user input prompts.
 * It implements the PromptObject interface from the 'prompts' library and offers methods to set
 * various properties of the prompt. The class also includes static methods for common input scenarios
 * and argument parsing.
 *
 * @template R - The type of the prompt name, extending string.
 *
 * @param name - The name of the prompt, used as the key in the returned answers object.
 *
 * @class
 */
class UserInput {
    static { this.logger = logging_1.Logging.for(UserInput); }
    /**
     * @description Creates a new UserInput instance.
     * @summary Initializes a new UserInput object with the given name.
     *
     * @param name - The name of the prompt.
     */
    constructor(name) {
        /**
         * @description The type of the prompt.
         * @summary Determines the input method (e.g., text, number, confirm).
         */
        this.type = "text";
        this.name = name;
    }
    /**
     * @description Sets the type of the prompt.
     * @summary Configures the input method for the prompt.
     *
     * @param type - The type of the prompt.
     * @returns This UserInput instance for method chaining.
     */
    setType(type) {
        UserInput.logger.verbose(`Setting type to: ${type}`);
        this.type = type;
        return this;
    }
    /**
     * @description Sets the message of the prompt.
     * @summary Configures the question or instruction presented to the user.
     *
     * @param value - The message to be displayed.
     * @returns This UserInput instance for method chaining.
     */
    setMessage(value) {
        UserInput.logger.verbose(`Setting message to: ${value}`);
        this.message = value;
        return this;
    }
    /**
     * @description Sets the initial value of the prompt.
     * @summary Configures the default value presented to the user.
     *
     * @param value - The initial value.
     * @returns This UserInput instance for method chaining.
     */
    setInitial(value) {
        UserInput.logger.verbose(`Setting initial value to: ${value}`);
        this.initial = value;
        return this;
    }
    /**
     * @description Sets the style of the prompt.
     * @summary Configures the visual style of the prompt.
     *
     * @param value - The style to be applied.
     * @returns This UserInput instance for method chaining.
     */
    setStyle(value) {
        UserInput.logger.verbose(`Setting style to: ${value}`);
        this.style = value;
        return this;
    }
    /**
     * @description Sets the format function of the prompt.
     * @summary Configures a function to format the user's input before it's returned.
     *
     * @param value - The format function.
     * @returns This UserInput instance for method chaining.
     */
    setFormat(value) {
        UserInput.logger.verbose(`Setting format function`);
        this.format = value;
        return this;
    }
    /**
     * @description Sets the validation function of the prompt.
     * @summary Configures a function to validate the user's input.
     *
     * @param value - The validation function.
     * @returns This UserInput instance for method chaining.
     */
    setValidate(value) {
        UserInput.logger.verbose(`Setting validate function`);
        this.validate = value;
        return this;
    }
    /**
     * @description Sets the onState callback of the prompt.
     * @summary Configures a function to be called when the state of the prompt changes.
     *
     * @param value - The onState callback function.
     * @returns This UserInput instance for method chaining.
     */
    setOnState(value) {
        UserInput.logger.verbose(`Setting onState callback`);
        this.onState = value;
        return this;
    }
    /**
     * @description Sets the onRender callback of the prompt.
     * @summary Configures a function to be called when the prompt is rendered.
     *
     * @param value - The onRender callback function.
     * @returns This UserInput instance for method chaining.
     */
    setOnRender(value) {
        UserInput.logger.verbose(`Setting onRender callback`);
        this.onRender = value;
        return this;
    }
    /**
     * @description Sets the minimum value for number inputs.
     * @summary Configures the lowest number the user can input.
     *
     * @param value - The minimum value.
     * @returns This UserInput instance for method chaining.
     */
    setMin(value) {
        UserInput.logger.verbose(`Setting min value to: ${value}`);
        this.min = value;
        return this;
    }
    /**
     * @description Sets the maximum value for number inputs.
     * @summary Configures the highest number the user can input.
     *
     * @param value - The maximum value.
     * @returns This UserInput instance for method chaining.
     */
    setMax(value) {
        UserInput.logger.verbose(`Setting max value to: ${value}`);
        this.max = value;
        return this;
    }
    /**
     * @description Sets whether to allow float values for number inputs.
     * @summary Configures whether decimal numbers are allowed.
     *
     * @param value - Whether to allow float values.
     * @returns This UserInput instance for method chaining.
     */
    setFloat(value) {
        UserInput.logger.verbose(`Setting float to: ${value}`);
        this.float = value;
        return this;
    }
    /**
     * @description Sets the number of decimal places to round to for float inputs.
     * @summary Configures the precision of float inputs.
     *
     * @param value - The number of decimal places.
     * @returns This UserInput instance for method chaining.
     */
    setRound(value) {
        UserInput.logger.verbose(`Setting round to: ${value}`);
        this.round = value;
        return this;
    }
    /**
     * @description Sets the instructions for the user.
     * @summary Configures additional guidance provided to the user.
     *
     * @param value - The instructions.
     * @returns This UserInput instance for method chaining.
     */
    setInstructions(value) {
        UserInput.logger.verbose(`Setting instructions to: ${value}`);
        this.instructions = value;
        return this;
    }
    /**
     * @description Sets the increment value for number inputs.
     * @summary Configures the step size when increasing or decreasing the number.
     *
     * @param value - The increment value.
     * @returns This UserInput instance for method chaining.
     */
    setIncrement(value) {
        UserInput.logger.verbose(`Setting increment to: ${value}`);
        this.increment = value;
        return this;
    }
    /**
     * @description Sets the separator for list inputs.
     * @summary Configures the character used to separate list items.
     *
     * @param value - The separator character.
     * @returns This UserInput instance for method chaining.
     */
    setSeparator(value) {
        UserInput.logger.verbose(`Setting separator to: ${value}`);
        this.separator = value;
        return this;
    }
    /**
     * @description Sets the active option style for select inputs.
     * @summary Configures the style applied to the currently selected option.
     *
     * @param value - The active option style.
     * @returns This UserInput instance for method chaining.
     */
    setActive(value) {
        UserInput.logger.verbose(`Setting active style to: ${value}`);
        this.active = value;
        return this;
    }
    /**
     * @description Sets the inactive option style for select inputs.
     * @summary Configures the style applied to non-selected options.
     *
     * @param value - The inactive option style.
     * @returns This UserInput instance for method chaining.
     */
    setInactive(value) {
        UserInput.logger.verbose(`Setting inactive style to: ${value}`);
        this.inactive = value;
        return this;
    }
    /**
     * @description Sets the choices for select inputs.
     * @summary Configures the list of options presented to the user.
     *
     * @param value - The list of choices.
     * @returns This UserInput instance for method chaining.
     */
    setChoices(value) {
        UserInput.logger.verbose(`Setting choices: ${JSON.stringify(value)}`);
        this.choices = value;
        return this;
    }
    /**
     * @description Sets the hint text for the prompt.
     * @summary Configures additional information displayed to the user.
     *
     * @param value - The hint text.
     * @returns This UserInput instance for method chaining.
     */
    setHint(value) {
        UserInput.logger.verbose(`Setting hint to: ${value}`);
        this.hint = value;
        return this;
    }
    /**
     * @description Sets the warning text for the prompt.
     * @summary Configures a warning message displayed to the user.
     *
     * @param value - The warning text.
     * @returns This UserInput instance for method chaining.
     */
    setWarn(value) {
        UserInput.logger.verbose(`Setting warn to: ${value}`);
        this.warn = value;
        return this;
    }
    /**
     * @description Sets the suggest function for autocomplete inputs.
     * @summary Configures a function to provide suggestions based on user input.
     *
     * @param value - The suggest function.
     * @returns This UserInput instance for method chaining.
     */
    setSuggest(value) {
        UserInput.logger.verbose(`Setting suggest function`);
        this.suggest = value;
        return this;
    }
    /**
     * @description Sets the limit for list inputs.
     * @summary Configures the maximum number of items that can be selected in list-type prompts.
     * @template R - The type of the prompt name, extending string.
     * @param value - The maximum number of items that can be selected, or a function to determine this value.
     * @return This UserInput instance for method chaining.
     */
    setLimit(value) {
        UserInput.logger.verbose(`Setting limit to: ${value}`);
        this.limit = value;
        return this;
    }
    /**
     * @description Sets the mask for password inputs.
     * @summary Configures the character used to hide the user's input in password-type prompts.
     * @template R - The type of the prompt name, extending string.
     * @param value - The character used to mask the input, or a function to determine this value.
     * @return This UserInput instance for method chaining.
     */
    setMask(value) {
        UserInput.logger.verbose(`Setting mask to: ${value}`);
        this.mask = value;
        return this;
    }
    /**
     * @description Sets the stdout stream for the prompt.
     * @summary Configures the output stream used by the prompt for displaying messages and results.
     * @param value - The Writable stream to be used as stdout.
     * @return This UserInput instance for method chaining.
     */
    setStdout(value) {
        UserInput.logger.verbose(`Setting stdout stream`);
        this.stdout = value;
        return this;
    }
    /**
     * @description Sets the stdin stream for the prompt.
     * @summary Configures the input stream used by the prompt for receiving user input.
     * @param value - The Readable stream to be used as stdin.
     * @return This UserInput instance for method chaining.
     */
    setStdin(value) {
        this.stdin = value;
        return this;
    }
    /**
     * @description Asks the user for input based on the current UserInput configuration.
     * @summary Prompts the user and returns their response as a single value.
     * @template R - The type of the prompt name, extending string.
     * @return A Promise that resolves to the user's answer.
     */
    async ask() {
        return (await UserInput.ask(this))[this.name];
    }
    /**
     * @description Asks the user one or more questions based on the provided UserInput configurations.
     * @summary Prompts the user with one or more questions and returns their answers as an object.
     * @template R - The type of the prompt name, extending string.
     * @param question - A single UserInput instance or an array of UserInput instances.
     * @return A Promise that resolves to an object containing the user's answers.
     * @mermaid
     * sequenceDiagram
     *   participant U as User
     *   participant A as ask method
     *   participant P as prompts library
     *   A->>P: Call prompts with question(s)
     *   P->>U: Display prompt(s)
     *   U->>P: Provide input
     *   P->>A: Return answers
     *   A->>A: Process answers
     *   A-->>Caller: Return processed answers
     */
    static async ask(question) {
        const log = UserInput.logger.for(this.ask);
        if (!Array.isArray(question)) {
            question = [question];
        }
        let answers;
        try {
            log.verbose(`Asking questions: ${question.map((q) => q.name).join(", ")}`);
            answers = await (0, prompts_1.default)(question);
            log.verbose(`Received answers: ${JSON.stringify(answers, null, 2)}`);
        }
        catch (error) {
            throw new Error(`Error while getting input: ${error}`);
        }
        return answers;
    }
    /**
     * @description Asks the user for a number input.
     * @summary Prompts the user to enter a number, with optional minimum, maximum, and initial values.
     * @param name - The name of the prompt, used as the key in the returned answers object.
     * @param question - The message displayed to the user.
     * @param min - The minimum allowed value (optional).
     * @param max - The maximum allowed value (optional).
     * @param initial - The initial value presented to the user (optional).
     * @return A Promise that resolves to the number entered by the user.
     */
    static async askNumber(name, question, min, max, initial) {
        const log = UserInput.logger.for(this.askNumber);
        log.verbose(`Asking number input: undefined, question: ${question}, min: ${min}, max: ${max}, initial: ${initial}`);
        const userInput = new UserInput(name)
            .setMessage(question)
            .setType("number");
        if (typeof min === "number")
            userInput.setMin(min);
        if (typeof max === "number")
            userInput.setMax(max);
        if (typeof initial === "number")
            userInput.setInitial(initial);
        return (await this.ask(userInput))[name];
    }
    /**
     * @description Asks the user for a text input.
     * @summary Prompts the user to enter text, with optional masking and initial value.
     * @param name - The name of the prompt, used as the key in the returned answers object.
     * @param question - The message displayed to the user.
     * @param mask - The character used to mask the input (optional, for password-like inputs).
     * @param initial - The initial value presented to the user (optional).
     * @return A Promise that resolves to the text entered by the user.
     */
    static async askText(name, question, mask = undefined, initial) {
        const log = UserInput.logger.for(this.askText);
        log.verbose(`Asking text input: undefined, question: ${question}, mask: ${mask}, initial: ${initial}`);
        const userInput = new UserInput(name).setMessage(question);
        if (mask)
            userInput.setMask(mask);
        if (typeof initial === "string")
            userInput.setInitial(initial);
        return (await this.ask(userInput))[name];
    }
    /**
     * @description Asks the user for a confirmation (yes/no).
     * @summary Prompts the user with a yes/no question and returns a boolean result.
     * @param name - The name of the prompt, used as the key in the returned answers object.
     * @param question - The message displayed to the user.
     * @param initial - The initial value presented to the user (optional).
     * @return A Promise that resolves to a boolean representing the user's answer.
     */
    static async askConfirmation(name, question, initial) {
        const log = UserInput.logger.for(this.askConfirmation);
        log.verbose(`Asking confirmation input: undefined, question: ${question}, initial: ${initial}`);
        const userInput = new UserInput(name)
            .setMessage(question)
            .setType("confirm");
        if (typeof initial !== "undefined")
            userInput.setInitial(initial);
        return (await this.ask(userInput))[name];
    }
    /**
     * @description Repeatedly asks for input until a valid response is given or the limit is reached.
     * @summary This method insists on getting a valid input from the user, allowing for a specified number of attempts.
     *
     * @template R - The type of the expected result.
     * @param input - The UserInput instance to use for prompting.
     * @param test - A function to validate the user's input.
     * @param limit - The maximum number of attempts allowed (default is 1).
     * @param defaultConfirmation
     * @return A Promise that resolves to the valid input or undefined if the limit is reached.
     *
     * @mermaid
     * sequenceDiagram
     *   participant U as User
     *   participant I as insist method
     *   participant A as ask method
     *   participant T as test function
     *   participant C as askConfirmation method
     *   loop Until valid input or limit reached
     *     I->>A: Call ask with input
     *     A->>U: Prompt user
     *     U->>A: Provide input
     *     A->>I: Return result
     *     I->>T: Test result
     *     alt Test passes
     *       I->>C: Ask for confirmation
     *       C->>U: Confirm input
     *       U->>C: Provide confirmation
     *       C->>I: Return confirmation
     *       alt Confirmed
     *         I-->>Caller: Return valid result
     *       else Not confirmed
     *         I->>I: Continue loop
     *       end
     *     else Test fails
     *       I->>I: Continue loop
     *     end
     *   end
     *   I-->>Caller: Return undefined if limit reached
     */
    static async insist(input, test, defaultConfirmation, limit = 1) {
        const log = UserInput.logger.for(this.insist);
        log.verbose(`Insisting on input: ${input.name}, test: ${test.toString()}, defaultConfirmation: ${defaultConfirmation}, limit: ${limit}`);
        let result = undefined;
        let count = 0;
        let confirmation;
        try {
            do {
                result = (await UserInput.ask(input))[input.name];
                if (!test(result)) {
                    result = undefined;
                    continue;
                }
                confirmation = await UserInput.askConfirmation(`${input.name}-confirm`, `Is the ${input.type} correct?`, defaultConfirmation);
                if (!confirmation)
                    result = undefined;
            } while (typeof result === "undefined" && limit > 1 && count++ < limit);
        }
        catch (e) {
            log.error(`Error while insisting: ${e}`);
            throw e;
        }
        if (typeof result === "undefined")
            log.info("no selection...");
        return result;
    }
    /**
     * @description Repeatedly asks for text input until a valid response is given or the limit is reached.
     * @summary This method insists on getting a valid text input from the user, allowing for a specified number of attempts.
     *
     * @param name - The name of the prompt, used as the key in the returned answers object.
     * @param question - The message displayed to the user.
     * @param test - A function to validate the user's input.
     * @param mask - The character used to mask the input (optional, for password-like inputs).
     * @param initial - The initial value presented to the user (optional).
     * @param defaultConfirmation
     * @param limit - The maximum number of attempts allowed (default is -1, meaning unlimited).
     * @return A Promise that resolves to the valid input or undefined if the limit is reached.
     */
    static async insistForText(name, question, test, mask = undefined, initial, defaultConfirmation = false, limit = -1) {
        const log = UserInput.logger.for(this.insistForText);
        log.verbose(`Insisting for text input: undefined, question: ${question}, test: ${test.toString()}, mask: ${mask}, initial: ${initial}, defaultConfirmation: ${defaultConfirmation}, limit: ${limit}`);
        const userInput = new UserInput(name).setMessage(question);
        if (mask)
            userInput.setMask(mask);
        if (typeof initial === "string")
            userInput.setInitial(initial);
        return (await this.insist(userInput, test, defaultConfirmation, limit));
    }
    /**
     * @description Repeatedly asks for number input until a valid response is given or the limit is reached.
     * @summary This method insists on getting a valid number input from the user, allowing for a specified number of attempts.
     *
     * @param name - The name of the prompt, used as the key in the returned answers object.
     * @param question - The message displayed to the user.
     * @param test - A function to validate the user's input.
     * @param min - The minimum allowed value (optional).
     * @param max - The maximum allowed value (optional).
     * @param initial - The initial value presented to the user (optional).
     * @param defaultConfirmation
     * @param limit - The maximum number of attempts allowed (default is -1, meaning unlimited).
     * @return A Promise that resolves to the valid input or undefined if the limit is reached.
     */
    static async insistForNumber(name, question, test, min, max, initial, defaultConfirmation = false, limit = -1) {
        const log = UserInput.logger.for(this.insistForNumber);
        log.verbose(`Insisting for number input: undefined, question: ${question}, test: ${test.toString()}, min: ${min}, max: ${max}, initial: ${initial}, defaultConfirmation: ${defaultConfirmation}, limit: ${limit}`);
        const userInput = new UserInput(name)
            .setMessage(question)
            .setType("number");
        if (typeof min === "number")
            userInput.setMin(min);
        if (typeof max === "number")
            userInput.setMax(max);
        if (typeof initial === "number")
            userInput.setInitial(initial);
        return (await this.insist(userInput, test, defaultConfirmation, limit));
    }
    /**
     * @description Parses command-line arguments based on the provided options.
     * @summary Uses Node.js's util.parseArgs to parse command-line arguments and return the result.
     * @param options - Configuration options for parsing arguments.
     * @return An object containing the parsed arguments.
     * @mermaid
     * sequenceDiagram
     *   participant C as Caller
     *   participant P as parseArgs method
     *   participant U as util.parseArgs
     *   C->>P: Call with options
     *   P->>P: Prepare args object
     *   P->>U: Call parseArgs with prepared args
     *   U->>P: Return parsed result
     *   P-->>C: Return ParseArgsResult
     */
    static parseArgs(options) {
        const log = UserInput.logger.for(this.parseArgs);
        const args = {
            args: process.argv.slice(2),
            options: options,
        };
        log.debug(`Parsing arguments: ${JSON.stringify(args, null, 2)}`);
        try {
            return (0, util_1.parseArgs)(args);
        }
        catch (error) {
            log.debug(`Error while parsing arguments:\n${JSON.stringify(args, null, 2)}\n | options\n${JSON.stringify(options, null, 2)}\n | ${error}`);
            throw new Error(`Error while parsing arguments: ${error}`);
        }
    }
}
exports.UserInput = UserInput;


/***/ }),

/***/ 7957:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


module.exports = {
  DatePart: __webpack_require__(5568),
  Meridiem: __webpack_require__(5135),
  Day: __webpack_require__(1715),
  Hours: __webpack_require__(6694),
  Milliseconds: __webpack_require__(1980),
  Minutes: __webpack_require__(2672),
  Month: __webpack_require__(2287),
  Seconds: __webpack_require__(2376),
  Year: __webpack_require__(2368),
}


/***/ }),

/***/ 8158:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

const color = __webpack_require__(1394);

const Prompt = __webpack_require__(4597);

const _require = __webpack_require__(723),
      cursor = _require.cursor,
      erase = _require.erase;

const _require2 = __webpack_require__(4586),
      style = _require2.style,
      figures = _require2.figures,
      clear = _require2.clear,
      lines = _require2.lines;

const isNumber = /[0-9]/;

const isDef = any => any !== undefined;

const round = (number, precision) => {
  let factor = Math.pow(10, precision);
  return Math.round(number * factor) / factor;
};
/**
 * NumberPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {String} [opts.style='default'] Render style
 * @param {Number} [opts.initial] Default value
 * @param {Number} [opts.max=+Infinity] Max value
 * @param {Number} [opts.min=-Infinity] Min value
 * @param {Boolean} [opts.float=false] Parse input as floats
 * @param {Number} [opts.round=2] Round floats to x decimals
 * @param {Number} [opts.increment=1] Number to increment by when using arrow-keys
 * @param {Function} [opts.validate] Validate function
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 * @param {String} [opts.error] The invalid error label
 */


class NumberPrompt extends Prompt {
  constructor(opts = {}) {
    super(opts);
    this.transform = style.render(opts.style);
    this.msg = opts.message;
    this.initial = isDef(opts.initial) ? opts.initial : '';
    this.float = !!opts.float;
    this.round = opts.round || 2;
    this.inc = opts.increment || 1;
    this.min = isDef(opts.min) ? opts.min : -Infinity;
    this.max = isDef(opts.max) ? opts.max : Infinity;
    this.errorMsg = opts.error || `Please Enter A Valid Value`;

    this.validator = opts.validate || (() => true);

    this.color = `cyan`;
    this.value = ``;
    this.typed = ``;
    this.lastHit = 0;
    this.render();
  }

  set value(v) {
    if (!v && v !== 0) {
      this.placeholder = true;
      this.rendered = color.gray(this.transform.render(`${this.initial}`));
      this._value = ``;
    } else {
      this.placeholder = false;
      this.rendered = this.transform.render(`${round(v, this.round)}`);
      this._value = round(v, this.round);
    }

    this.fire();
  }

  get value() {
    return this._value;
  }

  parse(x) {
    return this.float ? parseFloat(x) : parseInt(x);
  }

  valid(c) {
    return c === `-` || c === `.` && this.float || isNumber.test(c);
  }

  reset() {
    this.typed = ``;
    this.value = ``;
    this.fire();
    this.render();
  }

  exit() {
    this.abort();
  }

  abort() {
    let x = this.value;
    this.value = x !== `` ? x : this.initial;
    this.done = this.aborted = true;
    this.error = false;
    this.fire();
    this.render();
    this.out.write(`\n`);
    this.close();
  }

  validate() {
    var _this = this;

    return _asyncToGenerator(function* () {
      let valid = yield _this.validator(_this.value);

      if (typeof valid === `string`) {
        _this.errorMsg = valid;
        valid = false;
      }

      _this.error = !valid;
    })();
  }

  submit() {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      yield _this2.validate();

      if (_this2.error) {
        _this2.color = `red`;

        _this2.fire();

        _this2.render();

        return;
      }

      let x = _this2.value;
      _this2.value = x !== `` ? x : _this2.initial;
      _this2.done = true;
      _this2.aborted = false;
      _this2.error = false;

      _this2.fire();

      _this2.render();

      _this2.out.write(`\n`);

      _this2.close();
    })();
  }

  up() {
    this.typed = ``;

    if (this.value === '') {
      this.value = this.min - this.inc;
    }

    if (this.value >= this.max) return this.bell();
    this.value += this.inc;
    this.color = `cyan`;
    this.fire();
    this.render();
  }

  down() {
    this.typed = ``;

    if (this.value === '') {
      this.value = this.min + this.inc;
    }

    if (this.value <= this.min) return this.bell();
    this.value -= this.inc;
    this.color = `cyan`;
    this.fire();
    this.render();
  }

  delete() {
    let val = this.value.toString();
    if (val.length === 0) return this.bell();
    this.value = this.parse(val = val.slice(0, -1)) || ``;

    if (this.value !== '' && this.value < this.min) {
      this.value = this.min;
    }

    this.color = `cyan`;
    this.fire();
    this.render();
  }

  next() {
    this.value = this.initial;
    this.fire();
    this.render();
  }

  _(c, key) {
    if (!this.valid(c)) return this.bell();
    const now = Date.now();
    if (now - this.lastHit > 1000) this.typed = ``; // 1s elapsed

    this.typed += c;
    this.lastHit = now;
    this.color = `cyan`;
    if (c === `.`) return this.fire();
    this.value = Math.min(this.parse(this.typed), this.max);
    if (this.value > this.max) this.value = this.max;
    if (this.value < this.min) this.value = this.min;
    this.fire();
    this.render();
  }

  render() {
    if (this.closed) return;

    if (!this.firstRender) {
      if (this.outputError) this.out.write(cursor.down(lines(this.outputError, this.out.columns) - 1) + clear(this.outputError, this.out.columns));
      this.out.write(clear(this.outputText, this.out.columns));
    }

    super.render();
    this.outputError = ''; // Print prompt

    this.outputText = [style.symbol(this.done, this.aborted), color.bold(this.msg), style.delimiter(this.done), !this.done || !this.done && !this.placeholder ? color[this.color]().underline(this.rendered) : this.rendered].join(` `); // Print error

    if (this.error) {
      this.outputError += this.errorMsg.split(`\n`).reduce((a, l, i) => a + `\n${i ? ` ` : figures.pointerSmall} ${color.red().italic(l)}`, ``);
    }

    this.out.write(erase.line + cursor.to(0) + this.outputText + cursor.save + this.outputError + cursor.restore);
  }

}

module.exports = NumberPrompt;

/***/ }),

/***/ 8404:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const prompts = __webpack_require__(9083);

const passOn = ['suggest', 'format', 'onState', 'validate', 'onRender', 'type'];
const noop = () => {};

/**
 * Prompt for a series of questions
 * @param {Array|Object} questions Single question object or Array of question objects
 * @param {Function} [onSubmit] Callback function called on prompt submit
 * @param {Function} [onCancel] Callback function called on cancel/abort
 * @returns {Object} Object with values from user input
 */
async function prompt(questions=[], { onSubmit=noop, onCancel=noop }={}) {
  const answers = {};
  const override = prompt._override || {};
  questions = [].concat(questions);
  let answer, question, quit, name, type, lastPrompt;

  const getFormattedAnswer = async (question, answer, skipValidation = false) => {
    if (!skipValidation && question.validate && question.validate(answer) !== true) {
      return;
    }
    return question.format ? await question.format(answer, answers) : answer
  };

  for (question of questions) {
    ({ name, type } = question);

    // evaluate type first and skip if type is a falsy value
    if (typeof type === 'function') {
      type = await type(answer, { ...answers }, question)
      question['type'] = type
    }
    if (!type) continue;

    // if property is a function, invoke it unless it's a special function
    for (let key in question) {
      if (passOn.includes(key)) continue;
      let value = question[key];
      question[key] = typeof value === 'function' ? await value(answer, { ...answers }, lastPrompt) : value;
    }

    lastPrompt = question;

    if (typeof question.message !== 'string') {
      throw new Error('prompt message is required');
    }

    // update vars in case they changed
    ({ name, type } = question);

    if (prompts[type] === void 0) {
      throw new Error(`prompt type (${type}) is not defined`);
    }

    if (override[question.name] !== undefined) {
      answer = await getFormattedAnswer(question, override[question.name]);
      if (answer !== undefined) {
        answers[name] = answer;
        continue;
      }
    }

    try {
      // Get the injected answer if there is one or prompt the user
      answer = prompt._injected ? getInjectedAnswer(prompt._injected, question.initial) : await prompts[type](question);
      answers[name] = answer = await getFormattedAnswer(question, answer, true);
      quit = await onSubmit(question, answer, answers);
    } catch (err) {
      quit = !(await onCancel(question, answers));
    }

    if (quit) return answers;
  }

  return answers;
}

function getInjectedAnswer(injected, deafultValue) {
  const answer = injected.shift();
    if (answer instanceof Error) {
      throw answer;
    }

    return (answer === undefined) ? deafultValue : answer;
}

function inject(answers) {
  prompt._injected = (prompt._injected || []).concat(answers);
}

function override(answers) {
  prompt._override = Object.assign({}, answers);
}

module.exports = Object.assign(prompt, { prompt, prompts, inject, override });


/***/ }),

/***/ 8564:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.colorizeANSI = colorizeANSI;
exports.colorize256 = colorize256;
exports.colorizeRGB = colorizeRGB;
exports.applyStyle = applyStyle;
exports.clear = clear;
exports.raw = raw;
const constants_1 = __webpack_require__(6471);
/**
 * @description Applies a basic ANSI color code to text.
 * @summary This function takes a string, an ANSI color code number, and an optional background flag.
 * It returns the text wrapped in the appropriate ANSI escape codes for either foreground or background coloring.
 * This function is used for basic 16-color ANSI formatting.
 *
 * @param {string} text - The text to be colored.
 * @param {number} n - The ANSI color code number.
 * @param {boolean} [bg=false] - If true, applies the color to the background instead of the foreground.
 * @return {string} The text wrapped in ANSI color codes.
 *
 * @function colorizeANSI
 * @memberOf module:@StyledString
 */
function colorizeANSI(text, n, bg = false) {
    if (isNaN(n)) {
        console.warn(`Invalid color number on the ANSI scale: ${n}. ignoring...`);
        return text;
    }
    if (bg && ((n > 30 && n <= 40)
        || (n > 90 && n <= 100))) {
        n = n + 10;
    }
    return `\x1b[${n}m${text}${constants_1.AnsiReset}`;
}
/**
 * @description Applies a 256-color ANSI code to text.
 * @summary This function takes a string and a color number (0-255) and returns the text
 * wrapped in ANSI escape codes for either foreground or background coloring.
 *
 * @param {string} text - The text to be colored.
 * @param {number} n - The color number (0-255).
 * @param {boolean} [bg=false] - If true, applies the color to the background instead of the foreground.
 * @return {string} The text wrapped in ANSI color codes.
 *
 * @function colorize256
 * @memberOf module:@StyledString
 */
function colorize256(text, n, bg = false) {
    if (isNaN(n)) {
        console.warn(`Invalid color number on the 256 scale: ${n}. ignoring...`);
        return text;
    }
    if (n < 0 || n > 255) {
        console.warn(`Invalid color number on the 256 scale: ${n}. ignoring...`);
        return text;
    }
    return `\x1b[${bg ? 48 : 38};5;${n}m${text}${constants_1.AnsiReset}`;
}
/**
 * @description Applies an RGB color ANSI code to text.
 * @summary This function takes a string and RGB color values (0-255 for each component)
 * and returns the text wrapped in ANSI escape codes for either foreground or background coloring.
 *
 * @param {string} text - The text to be colored.
 * @param {number} r - The red component of the color (0-255).
 * @param {number} g - The green component of the color (0-255).
 * @param {number} b - The blue component of the color (0-255).
 * @param {boolean} [bg=false] - If true, applies the color to the background instead of the foreground.
 * @return {string} The text wrapped in ANSI color codes.
 *
 * @function colorizeRGB
 * @memberOf module:StyledString
 */
function colorizeRGB(text, r, g, b, bg = false) {
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
        console.warn(`Invalid RGB color values: r=${r}, g=${g}, b=${b}. Ignoring...`);
        return text;
    }
    if ([r, g, b].some(v => v < 0 || v > 255)) {
        console.warn(`Invalid RGB color values: r=${r}, g=${g}, b=${b}. Ignoring...`);
        return text;
    }
    return `\x1b[${bg ? 48 : 38};2;${r};${g};${b}m${text}${constants_1.AnsiReset}`;
}
/**
 * @description Applies an ANSI style code to text.
 * @summary This function takes a string and a style code (either a number or a key from the styles object)
 * and returns the text wrapped in the appropriate ANSI escape codes for that style.
 *
 * @param {string} text - The text to be styled.
 * @param {number | string} n - The style code or style name.
 * @return {string} The text wrapped in ANSI style codes.
 *
 * @function applyStyle
 * @memberOf module:StyledString
 */
function applyStyle(text, n) {
    const styleCode = typeof n === "number" ? n : constants_1.styles[n];
    return `\x1b[${styleCode}m${text}${constants_1.AnsiReset}`;
}
/**
 * @description Removes all ANSI formatting codes from text.
 * @summary This function takes a string that may contain ANSI escape codes for formatting
 * and returns a new string with all such codes removed, leaving only the plain text content.
 * It uses a regular expression to match and remove ANSI escape sequences.
 *
 * @param {string} text - The text potentially containing ANSI formatting codes.
 * @return {string} The input text with all ANSI formatting codes removed.
 *
 * @function clear
 * @memberOf module:StyledString
 */
function clear(text) {
    // Regular expression to match ANSI escape codes
    // eslint-disable-next-line no-control-regex
    const ansiRegex = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;
    return text.replace(ansiRegex, '');
}
/**
 * @description Applies raw ANSI escape codes to text.
 * @summary This function takes a string and a raw ANSI escape code, and returns the text
 * wrapped in the provided raw ANSI code and the reset code. This allows for applying custom
 * or complex ANSI formatting that may not be covered by other utility functions.
 *
 * @param {string} text - The text to be formatted.
 * @param {string} raw - The raw ANSI escape code to be applied.
 * @return {string} The text wrapped in the raw ANSI code and the reset code.
 *
 * @function raw
 * @memberOf module:StyledString
 */
function raw(text, raw) {
    return `${raw}${text}${constants_1.AnsiReset}`;
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9jb2xvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFpQkEsb0NBYUM7QUFnQkQsa0NBV0M7QUFpQkQsa0NBVUM7QUFjRCxnQ0FHQztBQWNELHNCQUtDO0FBZUQsa0JBRUM7QUF6SUQsMkNBQWdEO0FBR2hEOzs7Ozs7Ozs7Ozs7O0dBYUc7QUFDSCxTQUFnQixZQUFZLENBQUMsSUFBWSxFQUFFLENBQVMsRUFBRSxFQUFFLEdBQUcsS0FBSztJQUU5RCxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDO1FBQ1osT0FBTyxDQUFDLElBQUksQ0FBQywyQ0FBMkMsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUMxRSxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFDRCxJQUFJLEVBQUUsSUFBSSxDQUNSLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1dBQ2hCLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUUsRUFBQyxDQUFDO1FBQzNCLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFBO0lBQ1osQ0FBQztJQUNELE9BQU8sUUFBUSxDQUFDLElBQUksSUFBSSxHQUFHLHFCQUFTLEVBQUUsQ0FBQztBQUV6QyxDQUFDO0FBR0Q7Ozs7Ozs7Ozs7OztHQVlHO0FBQ0gsU0FBZ0IsV0FBVyxDQUFDLElBQVksRUFBRSxDQUFTLEVBQUUsRUFBRSxHQUFHLEtBQUs7SUFFN0QsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQztRQUNaLE9BQU8sQ0FBQyxJQUFJLENBQUMsMENBQTBDLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDekUsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBQ0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNyQixPQUFPLENBQUMsSUFBSSxDQUFDLDBDQUEwQyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ3pFLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUNELE9BQU8sUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsSUFBSSxJQUFJLEdBQUcscUJBQVMsRUFBRSxDQUFDO0FBQzNELENBQUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7R0FjRztBQUNILFNBQWdCLFdBQVcsQ0FBQyxJQUFZLEVBQUUsQ0FBUyxFQUFFLENBQVMsRUFBRSxDQUFTLEVBQUUsRUFBRSxHQUFHLEtBQUs7SUFDbkYsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDO1FBQ3BDLE9BQU8sQ0FBQyxJQUFJLENBQUMsK0JBQStCLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUM5RSxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFDRCxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQzFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsK0JBQStCLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUM5RSxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFDRCxPQUFPLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLEdBQUcscUJBQVMsRUFBRSxDQUFDO0FBQ3JFLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7R0FXRztBQUNILFNBQWdCLFVBQVUsQ0FBQyxJQUFZLEVBQUUsQ0FBK0I7SUFDdEUsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGtCQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDeEQsT0FBTyxRQUFRLFNBQVMsSUFBSSxJQUFJLEdBQUcscUJBQVMsRUFBRSxDQUFDO0FBQ2pELENBQUM7QUFFRDs7Ozs7Ozs7Ozs7R0FXRztBQUNILFNBQWdCLEtBQUssQ0FBQyxJQUFZO0lBQ2hDLGdEQUFnRDtJQUNoRCw0Q0FBNEM7SUFDNUMsTUFBTSxTQUFTLEdBQUcsd0NBQXdDLENBQUM7SUFDM0QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUNyQyxDQUFDO0FBRUQ7Ozs7Ozs7Ozs7OztHQVlHO0FBQ0gsU0FBZ0IsR0FBRyxDQUFDLElBQVksRUFBRSxHQUFXO0lBQzNDLE9BQU8sR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLHFCQUFTLEVBQUUsQ0FBQztBQUNyQyxDQUFDIiwiZmlsZSI6ImNvbG9ycy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFuc2lSZXNldCwgc3R5bGVzIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5cblxuLyoqXG4gKiBAZGVzY3JpcHRpb24gQXBwbGllcyBhIGJhc2ljIEFOU0kgY29sb3IgY29kZSB0byB0ZXh0LlxuICogQHN1bW1hcnkgVGhpcyBmdW5jdGlvbiB0YWtlcyBhIHN0cmluZywgYW4gQU5TSSBjb2xvciBjb2RlIG51bWJlciwgYW5kIGFuIG9wdGlvbmFsIGJhY2tncm91bmQgZmxhZy5cbiAqIEl0IHJldHVybnMgdGhlIHRleHQgd3JhcHBlZCBpbiB0aGUgYXBwcm9wcmlhdGUgQU5TSSBlc2NhcGUgY29kZXMgZm9yIGVpdGhlciBmb3JlZ3JvdW5kIG9yIGJhY2tncm91bmQgY29sb3JpbmcuXG4gKiBUaGlzIGZ1bmN0aW9uIGlzIHVzZWQgZm9yIGJhc2ljIDE2LWNvbG9yIEFOU0kgZm9ybWF0dGluZy5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRoZSB0ZXh0IHRvIGJlIGNvbG9yZWQuXG4gKiBAcGFyYW0ge251bWJlcn0gbiAtIFRoZSBBTlNJIGNvbG9yIGNvZGUgbnVtYmVyLlxuICogQHBhcmFtIHtib29sZWFufSBbYmc9ZmFsc2VdIC0gSWYgdHJ1ZSwgYXBwbGllcyB0aGUgY29sb3IgdG8gdGhlIGJhY2tncm91bmQgaW5zdGVhZCBvZiB0aGUgZm9yZWdyb3VuZC5cbiAqIEByZXR1cm4ge3N0cmluZ30gVGhlIHRleHQgd3JhcHBlZCBpbiBBTlNJIGNvbG9yIGNvZGVzLlxuICpcbiAqIEBmdW5jdGlvbiBjb2xvcml6ZUFOU0lcbiAqIEBtZW1iZXJPZiBtb2R1bGU6QFN0eWxlZFN0cmluZ1xuICovXG5leHBvcnQgZnVuY3Rpb24gY29sb3JpemVBTlNJKHRleHQ6IHN0cmluZywgbjogbnVtYmVyLCBiZyA9IGZhbHNlKSB7XG5cbiAgaWYgKGlzTmFOKG4pKXtcbiAgICBjb25zb2xlLndhcm4oYEludmFsaWQgY29sb3IgbnVtYmVyIG9uIHRoZSBBTlNJIHNjYWxlOiAke259LiBpZ25vcmluZy4uLmApO1xuICAgIHJldHVybiB0ZXh0O1xuICB9XG4gIGlmIChiZyAmJiAoXG4gICAgKG4gPiAzMCAmJiBuIDw9IDQwKVxuICAgIHx8IChuID4gOTAgJiYgbiA8PSAxMDApICkpe1xuICAgIG4gPSBuICsgMTBcbiAgfVxuICByZXR1cm4gYFxceDFiWyR7bn1tJHt0ZXh0fSR7QW5zaVJlc2V0fWA7XG5cbn1cblxuXG4vKipcbiAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIGEgMjU2LWNvbG9yIEFOU0kgY29kZSB0byB0ZXh0LlxuICogQHN1bW1hcnkgVGhpcyBmdW5jdGlvbiB0YWtlcyBhIHN0cmluZyBhbmQgYSBjb2xvciBudW1iZXIgKDAtMjU1KSBhbmQgcmV0dXJucyB0aGUgdGV4dFxuICogd3JhcHBlZCBpbiBBTlNJIGVzY2FwZSBjb2RlcyBmb3IgZWl0aGVyIGZvcmVncm91bmQgb3IgYmFja2dyb3VuZCBjb2xvcmluZy5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRoZSB0ZXh0IHRvIGJlIGNvbG9yZWQuXG4gKiBAcGFyYW0ge251bWJlcn0gbiAtIFRoZSBjb2xvciBudW1iZXIgKDAtMjU1KS5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW2JnPWZhbHNlXSAtIElmIHRydWUsIGFwcGxpZXMgdGhlIGNvbG9yIHRvIHRoZSBiYWNrZ3JvdW5kIGluc3RlYWQgb2YgdGhlIGZvcmVncm91bmQuXG4gKiBAcmV0dXJuIHtzdHJpbmd9IFRoZSB0ZXh0IHdyYXBwZWQgaW4gQU5TSSBjb2xvciBjb2Rlcy5cbiAqXG4gKiBAZnVuY3Rpb24gY29sb3JpemUyNTZcbiAqIEBtZW1iZXJPZiBtb2R1bGU6QFN0eWxlZFN0cmluZ1xuICovXG5leHBvcnQgZnVuY3Rpb24gY29sb3JpemUyNTYodGV4dDogc3RyaW5nLCBuOiBudW1iZXIsIGJnID0gZmFsc2UpIHtcblxuICBpZiAoaXNOYU4obikpe1xuICAgIGNvbnNvbGUud2FybihgSW52YWxpZCBjb2xvciBudW1iZXIgb24gdGhlIDI1NiBzY2FsZTogJHtufS4gaWdub3JpbmcuLi5gKTtcbiAgICByZXR1cm4gdGV4dDtcbiAgfVxuICBpZiAobiA8IDAgfHwgbiA+IDI1NSkge1xuICAgIGNvbnNvbGUud2FybihgSW52YWxpZCBjb2xvciBudW1iZXIgb24gdGhlIDI1NiBzY2FsZTogJHtufS4gaWdub3JpbmcuLi5gKTtcbiAgICByZXR1cm4gdGV4dDtcbiAgfVxuICByZXR1cm4gYFxceDFiWyR7YmcgPyA0OCA6IDM4fTs1OyR7bn1tJHt0ZXh0fSR7QW5zaVJlc2V0fWA7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uIEFwcGxpZXMgYW4gUkdCIGNvbG9yIEFOU0kgY29kZSB0byB0ZXh0LlxuICogQHN1bW1hcnkgVGhpcyBmdW5jdGlvbiB0YWtlcyBhIHN0cmluZyBhbmQgUkdCIGNvbG9yIHZhbHVlcyAoMC0yNTUgZm9yIGVhY2ggY29tcG9uZW50KVxuICogYW5kIHJldHVybnMgdGhlIHRleHQgd3JhcHBlZCBpbiBBTlNJIGVzY2FwZSBjb2RlcyBmb3IgZWl0aGVyIGZvcmVncm91bmQgb3IgYmFja2dyb3VuZCBjb2xvcmluZy5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRoZSB0ZXh0IHRvIGJlIGNvbG9yZWQuXG4gKiBAcGFyYW0ge251bWJlcn0gciAtIFRoZSByZWQgY29tcG9uZW50IG9mIHRoZSBjb2xvciAoMC0yNTUpLlxuICogQHBhcmFtIHtudW1iZXJ9IGcgLSBUaGUgZ3JlZW4gY29tcG9uZW50IG9mIHRoZSBjb2xvciAoMC0yNTUpLlxuICogQHBhcmFtIHtudW1iZXJ9IGIgLSBUaGUgYmx1ZSBjb21wb25lbnQgb2YgdGhlIGNvbG9yICgwLTI1NSkuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtiZz1mYWxzZV0gLSBJZiB0cnVlLCBhcHBsaWVzIHRoZSBjb2xvciB0byB0aGUgYmFja2dyb3VuZCBpbnN0ZWFkIG9mIHRoZSBmb3JlZ3JvdW5kLlxuICogQHJldHVybiB7c3RyaW5nfSBUaGUgdGV4dCB3cmFwcGVkIGluIEFOU0kgY29sb3IgY29kZXMuXG4gKlxuICogQGZ1bmN0aW9uIGNvbG9yaXplUkdCXG4gKiBAbWVtYmVyT2YgbW9kdWxlOlN0eWxlZFN0cmluZ1xuICovXG5leHBvcnQgZnVuY3Rpb24gY29sb3JpemVSR0IodGV4dDogc3RyaW5nLCByOiBudW1iZXIsIGc6IG51bWJlciwgYjogbnVtYmVyLCBiZyA9IGZhbHNlKSB7XG4gIGlmIChpc05hTihyKSB8fCBpc05hTihnKSB8fCBpc05hTihiKSl7XG4gICAgY29uc29sZS53YXJuKGBJbnZhbGlkIFJHQiBjb2xvciB2YWx1ZXM6IHI9JHtyfSwgZz0ke2d9LCBiPSR7Yn0uIElnbm9yaW5nLi4uYCk7XG4gICAgcmV0dXJuIHRleHQ7XG4gIH1cbiAgaWYgKFtyLCBnLCBiXS5zb21lKHYgPT4gdiA8IDAgfHwgdiA+IDI1NSkpIHtcbiAgICBjb25zb2xlLndhcm4oYEludmFsaWQgUkdCIGNvbG9yIHZhbHVlczogcj0ke3J9LCBnPSR7Z30sIGI9JHtifS4gSWdub3JpbmcuLi5gKTtcbiAgICByZXR1cm4gdGV4dDtcbiAgfVxuICByZXR1cm4gYFxceDFiWyR7YmcgPyA0OCA6IDM4fTsyOyR7cn07JHtnfTske2J9bSR7dGV4dH0ke0Fuc2lSZXNldH1gO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvbiBBcHBsaWVzIGFuIEFOU0kgc3R5bGUgY29kZSB0byB0ZXh0LlxuICogQHN1bW1hcnkgVGhpcyBmdW5jdGlvbiB0YWtlcyBhIHN0cmluZyBhbmQgYSBzdHlsZSBjb2RlIChlaXRoZXIgYSBudW1iZXIgb3IgYSBrZXkgZnJvbSB0aGUgc3R5bGVzIG9iamVjdClcbiAqIGFuZCByZXR1cm5zIHRoZSB0ZXh0IHdyYXBwZWQgaW4gdGhlIGFwcHJvcHJpYXRlIEFOU0kgZXNjYXBlIGNvZGVzIGZvciB0aGF0IHN0eWxlLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGhlIHRleHQgdG8gYmUgc3R5bGVkLlxuICogQHBhcmFtIHtudW1iZXIgfCBzdHJpbmd9IG4gLSBUaGUgc3R5bGUgY29kZSBvciBzdHlsZSBuYW1lLlxuICogQHJldHVybiB7c3RyaW5nfSBUaGUgdGV4dCB3cmFwcGVkIGluIEFOU0kgc3R5bGUgY29kZXMuXG4gKlxuICogQGZ1bmN0aW9uIGFwcGx5U3R5bGVcbiAqIEBtZW1iZXJPZiBtb2R1bGU6U3R5bGVkU3RyaW5nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcHBseVN0eWxlKHRleHQ6IHN0cmluZywgbjogbnVtYmVyIHwga2V5b2YgdHlwZW9mIHN0eWxlcyk6IHN0cmluZyB7XG4gIGNvbnN0IHN0eWxlQ29kZSA9IHR5cGVvZiBuID09PSBcIm51bWJlclwiID8gbiA6IHN0eWxlc1tuXTtcbiAgcmV0dXJuIGBcXHgxYlske3N0eWxlQ29kZX1tJHt0ZXh0fSR7QW5zaVJlc2V0fWA7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uIFJlbW92ZXMgYWxsIEFOU0kgZm9ybWF0dGluZyBjb2RlcyBmcm9tIHRleHQuXG4gKiBAc3VtbWFyeSBUaGlzIGZ1bmN0aW9uIHRha2VzIGEgc3RyaW5nIHRoYXQgbWF5IGNvbnRhaW4gQU5TSSBlc2NhcGUgY29kZXMgZm9yIGZvcm1hdHRpbmdcbiAqIGFuZCByZXR1cm5zIGEgbmV3IHN0cmluZyB3aXRoIGFsbCBzdWNoIGNvZGVzIHJlbW92ZWQsIGxlYXZpbmcgb25seSB0aGUgcGxhaW4gdGV4dCBjb250ZW50LlxuICogSXQgdXNlcyBhIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byBtYXRjaCBhbmQgcmVtb3ZlIEFOU0kgZXNjYXBlIHNlcXVlbmNlcy5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRoZSB0ZXh0IHBvdGVudGlhbGx5IGNvbnRhaW5pbmcgQU5TSSBmb3JtYXR0aW5nIGNvZGVzLlxuICogQHJldHVybiB7c3RyaW5nfSBUaGUgaW5wdXQgdGV4dCB3aXRoIGFsbCBBTlNJIGZvcm1hdHRpbmcgY29kZXMgcmVtb3ZlZC5cbiAqXG4gKiBAZnVuY3Rpb24gY2xlYXJcbiAqIEBtZW1iZXJPZiBtb2R1bGU6U3R5bGVkU3RyaW5nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGVhcih0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICAvLyBSZWd1bGFyIGV4cHJlc3Npb24gdG8gbWF0Y2ggQU5TSSBlc2NhcGUgY29kZXNcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnRyb2wtcmVnZXhcbiAgY29uc3QgYW5zaVJlZ2V4ID0gL1xceDFCKD86W0AtWlxcXFwtX118XFxbWzAtP10qWyAtL10qW0Atfl0pL2c7XG4gIHJldHVybiB0ZXh0LnJlcGxhY2UoYW5zaVJlZ2V4LCAnJyk7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uIEFwcGxpZXMgcmF3IEFOU0kgZXNjYXBlIGNvZGVzIHRvIHRleHQuXG4gKiBAc3VtbWFyeSBUaGlzIGZ1bmN0aW9uIHRha2VzIGEgc3RyaW5nIGFuZCBhIHJhdyBBTlNJIGVzY2FwZSBjb2RlLCBhbmQgcmV0dXJucyB0aGUgdGV4dFxuICogd3JhcHBlZCBpbiB0aGUgcHJvdmlkZWQgcmF3IEFOU0kgY29kZSBhbmQgdGhlIHJlc2V0IGNvZGUuIFRoaXMgYWxsb3dzIGZvciBhcHBseWluZyBjdXN0b21cbiAqIG9yIGNvbXBsZXggQU5TSSBmb3JtYXR0aW5nIHRoYXQgbWF5IG5vdCBiZSBjb3ZlcmVkIGJ5IG90aGVyIHV0aWxpdHkgZnVuY3Rpb25zLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGhlIHRleHQgdG8gYmUgZm9ybWF0dGVkLlxuICogQHBhcmFtIHtzdHJpbmd9IHJhdyAtIFRoZSByYXcgQU5TSSBlc2NhcGUgY29kZSB0byBiZSBhcHBsaWVkLlxuICogQHJldHVybiB7c3RyaW5nfSBUaGUgdGV4dCB3cmFwcGVkIGluIHRoZSByYXcgQU5TSSBjb2RlIGFuZCB0aGUgcmVzZXQgY29kZS5cbiAqXG4gKiBAZnVuY3Rpb24gcmF3XG4gKiBAbWVtYmVyT2YgbW9kdWxlOlN0eWxlZFN0cmluZ1xuICovXG5leHBvcnQgZnVuY3Rpb24gcmF3KHRleHQ6IHN0cmluZywgcmF3OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7cmF3fSR7dGV4dH0ke0Fuc2lSZXNldH1gO1xufSJdfQ==


/***/ }),

/***/ 8775:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const DatePart = __webpack_require__(323);

class Year extends DatePart {
  constructor(opts = {}) {
    super(opts);
  }

  up() {
    this.date.setFullYear(this.date.getFullYear() + 1);
  }

  down() {
    this.date.setFullYear(this.date.getFullYear() - 1);
  }

  setTo(val) {
    this.date.setFullYear(val.substr(-4));
  }

  toString() {
    let year = String(this.date.getFullYear()).padStart(4, '0');
    return this.token.length === 2 ? year.substr(-2) : year;
  }

}

module.exports = Year;

/***/ }),

/***/ 8868:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const strip = __webpack_require__(5815);
const { erase, cursor } = __webpack_require__(723);

const width = str => [...strip(str)].length;

/**
 * @param {string} prompt
 * @param {number} perLine
 */
module.exports = function(prompt, perLine) {
  if (!perLine) return erase.line + cursor.to(0);

  let rows = 0;
  const lines = prompt.split(/\r?\n/);
  for (let line of lines) {
    rows += 1 + Math.floor(Math.max(width(line) - 1, 0) / perLine);
  }

  return erase.lines(rows);
};


/***/ }),

/***/ 9083:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

const $ = exports;
const el = __webpack_require__(2064);
const noop = v => v;

function toPrompt(type, args, opts={}) {
  return new Promise((res, rej) => {
    const p = new el[type](args);
    const onAbort = opts.onAbort || noop;
    const onSubmit = opts.onSubmit || noop;
    const onExit = opts.onExit || noop;
    p.on('state', args.onState || noop);
    p.on('submit', x => res(onSubmit(x)));
    p.on('exit', x => res(onExit(x)));
    p.on('abort', x => rej(onAbort(x)));
  });
}

/**
 * Text prompt
 * @param {string} args.message Prompt message to display
 * @param {string} [args.initial] Default string value
 * @param {string} [args.style="default"] Render style ('default', 'password', 'invisible')
 * @param {function} [args.onState] On state change callback
 * @param {function} [args.validate] Function to validate user input
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
$.text = args => toPrompt('TextPrompt', args);

/**
 * Password prompt with masked input
 * @param {string} args.message Prompt message to display
 * @param {string} [args.initial] Default string value
 * @param {function} [args.onState] On state change callback
 * @param {function} [args.validate] Function to validate user input
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
$.password = args => {
  args.style = 'password';
  return $.text(args);
};

/**
 * Prompt where input is invisible, like sudo
 * @param {string} args.message Prompt message to display
 * @param {string} [args.initial] Default string value
 * @param {function} [args.onState] On state change callback
 * @param {function} [args.validate] Function to validate user input
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
$.invisible = args => {
  args.style = 'invisible';
  return $.text(args);
};

/**
 * Number prompt
 * @param {string} args.message Prompt message to display
 * @param {number} args.initial Default number value
 * @param {function} [args.onState] On state change callback
 * @param {number} [args.max] Max value
 * @param {number} [args.min] Min value
 * @param {string} [args.style="default"] Render style ('default', 'password', 'invisible')
 * @param {Boolean} [opts.float=false] Parse input as floats
 * @param {Number} [opts.round=2] Round floats to x decimals
 * @param {Number} [opts.increment=1] Number to increment by when using arrow-keys
 * @param {function} [args.validate] Function to validate user input
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
$.number = args => toPrompt('NumberPrompt', args);

/**
 * Date prompt
 * @param {string} args.message Prompt message to display
 * @param {number} args.initial Default number value
 * @param {function} [args.onState] On state change callback
 * @param {number} [args.max] Max value
 * @param {number} [args.min] Min value
 * @param {string} [args.style="default"] Render style ('default', 'password', 'invisible')
 * @param {Boolean} [opts.float=false] Parse input as floats
 * @param {Number} [opts.round=2] Round floats to x decimals
 * @param {Number} [opts.increment=1] Number to increment by when using arrow-keys
 * @param {function} [args.validate] Function to validate user input
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
$.date = args => toPrompt('DatePrompt', args);

/**
 * Classic yes/no prompt
 * @param {string} args.message Prompt message to display
 * @param {boolean} [args.initial=false] Default value
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
$.confirm = args => toPrompt('ConfirmPrompt', args);

/**
 * List prompt, split intput string by `seperator`
 * @param {string} args.message Prompt message to display
 * @param {string} [args.initial] Default string value
 * @param {string} [args.style="default"] Render style ('default', 'password', 'invisible')
 * @param {string} [args.separator] String separator
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input, in form of an `Array`
 */
$.list = args => {
  const sep = args.separator || ',';
  return toPrompt('TextPrompt', args, {
    onSubmit: str => str.split(sep).map(s => s.trim())
  });
};

/**
 * Toggle/switch prompt
 * @param {string} args.message Prompt message to display
 * @param {boolean} [args.initial=false] Default value
 * @param {string} [args.active="on"] Text for `active` state
 * @param {string} [args.inactive="off"] Text for `inactive` state
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
$.toggle = args => toPrompt('TogglePrompt', args);

/**
 * Interactive select prompt
 * @param {string} args.message Prompt message to display
 * @param {Array} args.choices Array of choices objects `[{ title, value }, ...]`
 * @param {number} [args.initial] Index of default value
 * @param {String} [args.hint] Hint to display
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
$.select = args => toPrompt('SelectPrompt', args);

/**
 * Interactive multi-select / autocompleteMultiselect prompt
 * @param {string} args.message Prompt message to display
 * @param {Array} args.choices Array of choices objects `[{ title, value, [selected] }, ...]`
 * @param {number} [args.max] Max select
 * @param {string} [args.hint] Hint to display user
 * @param {Number} [args.cursor=0] Cursor start position
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
$.multiselect = args => {
  args.choices = [].concat(args.choices || []);
  const toSelected = items => items.filter(item => item.selected).map(item => item.value);
  return toPrompt('MultiselectPrompt', args, {
    onAbort: toSelected,
    onSubmit: toSelected
  });
};

$.autocompleteMultiselect = args => {
  args.choices = [].concat(args.choices || []);
  const toSelected = items => items.filter(item => item.selected).map(item => item.value);
  return toPrompt('AutocompleteMultiselectPrompt', args, {
    onAbort: toSelected,
    onSubmit: toSelected
  });
};

const byTitle = (input, choices) => Promise.resolve(
  choices.filter(item => item.title.slice(0, input.length).toLowerCase() === input.toLowerCase())
);

/**
 * Interactive auto-complete prompt
 * @param {string} args.message Prompt message to display
 * @param {Array} args.choices Array of auto-complete choices objects `[{ title, value }, ...]`
 * @param {Function} [args.suggest] Function to filter results based on user input. Defaults to sort by `title`
 * @param {number} [args.limit=10] Max number of results to show
 * @param {string} [args.style="default"] Render style ('default', 'password', 'invisible')
 * @param {String} [args.initial] Index of the default value
 * @param {boolean} [opts.clearFirst] The first ESCAPE keypress will clear the input
 * @param {String} [args.fallback] Fallback message - defaults to initial value
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
$.autocomplete = args => {
  args.suggest = args.suggest || byTitle;
  args.choices = [].concat(args.choices || []);
  return toPrompt('AutocompletePrompt', args);
};


/***/ }),

/***/ 9199:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const DatePart = __webpack_require__(323);

class Hours extends DatePart {
  constructor(opts = {}) {
    super(opts);
  }

  up() {
    this.date.setHours(this.date.getHours() + 1);
  }

  down() {
    this.date.setHours(this.date.getHours() - 1);
  }

  setTo(val) {
    this.date.setHours(parseInt(val.substr(-2)));
  }

  toString() {
    let hours = this.date.getHours();
    if (/h/.test(this.token)) hours = hours % 12 || 12;
    return this.token.length > 1 ? String(hours).padStart(2, '0') : hours;
  }

}

module.exports = Hours;

/***/ }),

/***/ 9240:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

function isNodeLT(tar) {
  tar = (Array.isArray(tar) ? tar : tar.split('.')).map(Number);
  let i=0, src=process.versions.node.split('.').map(Number);
  for (; i < tar.length; i++) {
    if (src[i] > tar[i]) return false;
    if (tar[i] > src[i]) return true;
  }
  return false;
}

module.exports =
  isNodeLT('8.6.0')
    ? __webpack_require__(4409)
    : __webpack_require__(8404);


/***/ }),

/***/ 9331:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const color = __webpack_require__(1394);

const Prompt = __webpack_require__(4597);

const _require = __webpack_require__(4586),
      style = _require.style,
      clear = _require.clear;

const _require2 = __webpack_require__(723),
      erase = _require2.erase,
      cursor = _require2.cursor;
/**
 * ConfirmPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Boolean} [opts.initial] Default value (true/false)
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 * @param {String} [opts.yes] The "Yes" label
 * @param {String} [opts.yesOption] The "Yes" option when choosing between yes/no
 * @param {String} [opts.no] The "No" label
 * @param {String} [opts.noOption] The "No" option when choosing between yes/no
 */


class ConfirmPrompt extends Prompt {
  constructor(opts = {}) {
    super(opts);
    this.msg = opts.message;
    this.value = opts.initial;
    this.initialValue = !!opts.initial;
    this.yesMsg = opts.yes || 'yes';
    this.yesOption = opts.yesOption || '(Y/n)';
    this.noMsg = opts.no || 'no';
    this.noOption = opts.noOption || '(y/N)';
    this.render();
  }

  reset() {
    this.value = this.initialValue;
    this.fire();
    this.render();
  }

  exit() {
    this.abort();
  }

  abort() {
    this.done = this.aborted = true;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  submit() {
    this.value = this.value || false;
    this.done = true;
    this.aborted = false;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  _(c, key) {
    if (c.toLowerCase() === 'y') {
      this.value = true;
      return this.submit();
    }

    if (c.toLowerCase() === 'n') {
      this.value = false;
      return this.submit();
    }

    return this.bell();
  }

  render() {
    if (this.closed) return;
    if (this.firstRender) this.out.write(cursor.hide);else this.out.write(clear(this.outputText, this.out.columns));
    super.render();
    this.outputText = [style.symbol(this.done, this.aborted), color.bold(this.msg), style.delimiter(this.done), this.done ? this.value ? this.yesMsg : this.noMsg : color.gray(this.initialValue ? this.yesOption : this.noOption)].join(' ');
    this.out.write(erase.line + cursor.to(0) + this.outputText);
  }

}

module.exports = ConfirmPrompt;

/***/ }),

/***/ 9499:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.StandardOutputWriter = void 0;
const constants_1 = __webpack_require__(7154);
const logging_1 = __webpack_require__(9834);
const styled_string_builder_1 = __webpack_require__(1076);
/**
 * @description A standard output writer for handling command execution output.
 * @summary This class implements the OutputWriter interface and provides methods for
 * handling various types of output from command execution, including standard output,
 * error output, and exit codes. It also includes utility methods for parsing commands
 * and resolving or rejecting promises based on execution results.
 *
 * @template R - The type of the resolved value, defaulting to number.
 *
 * @param lock - A PromiseExecutor to control the asynchronous flow.
 * @param args - Additional arguments (unused in the current implementation).
 *
 * @class
 */
class StandardOutputWriter {
    /**
     * @description Initializes a new instance of StandardOutputWriter.
     * @summary Constructs the StandardOutputWriter with a lock mechanism and optional arguments.
     *
     * @param cmd
     * @param lock - A PromiseExecutor to control the asynchronous flow.
     * @param args - Additional arguments (currently unused).
     */
    constructor(cmd, lock, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ...args) {
        this.cmd = cmd;
        this.lock = lock;
        this.logger = logging_1.Logging.for(this.cmd);
    }
    /**
     * @description Logs output to the console.
     * @summary Formats and logs the given data with a timestamp and type indicator.
     *
     * @param type - The type of output (stdout or stderr).
     * @param data - The data to be logged.
     */
    log(type, data) {
        data = Buffer.isBuffer(data) ? data.toString(constants_1.Encoding) : data;
        const formatedType = type === "stderr" ? (0, styled_string_builder_1.style)("ERROR").red.text : type;
        const log = `${formatedType}: ${data}`;
        this.logger.info(log);
    }
    /**
     * @description Handles standard output data.
     * @summary Logs the given chunk as standard output.
     *
     * @param chunk - The data chunk to be logged.
     */
    data(chunk) {
        this.log("stdout", String(chunk));
    }
    /**
     * @description Handles error output data.
     * @summary Logs the given chunk as error output.
     *
     * @param chunk - The error data chunk to be logged.
     */
    error(chunk) {
        this.log("stderr", String(chunk));
    }
    /**
     * @description Handles error objects.
     * @summary Logs the error message from the given Error object.
     *
     * @param err - The Error object to be logged.
     */
    errors(err) {
        this.log("stderr", `Error executing command exited : ${err}`);
    }
    /**
     * @description Handles the exit of a command.
     * @summary Logs the exit code and resolves or rejects the promise based on the code.
     *
     * @param code - The exit code of the command.
     * @param logs
     */
    exit(code, logs) {
        this.log("stdout", `command exited code : ${code === 0 ? (0, styled_string_builder_1.style)(code.toString()).green.text : (0, styled_string_builder_1.style)(code === null ? "null" : code.toString()).red.text}`);
        if (code === 0) {
            this.resolve(logs.map((l) => l.trim()).join("\n"));
        }
        else {
            this.reject(new Error(logs.length ? logs.join("\n") : code.toString()));
        }
    }
    /**
     * @description Parses a command string or array into components.
     * @summary Converts the command into a consistent format and stores it, then returns it split into command and arguments.
     *
     * @param command - The command as a string or array of strings.
     * @return A tuple containing the command and its arguments as separate elements.
     */
    parseCommand(command) {
        command = typeof command === "string" ? command.split(" ") : command;
        this.cmd = command.join(" ");
        return [command[0], command.slice(1)];
    }
    /**
     * @description Resolves the promise with a success message.
     * @summary Logs a success message and resolves the promise with the given reason.
     *
     * @param reason - The reason for resolving the promise.
     */
    resolve(reason) {
        this.log("stdout", `${this.cmd} executed successfully: ${(0, styled_string_builder_1.style)(reason ? "ran to completion" : reason).green}`);
        this.lock.resolve(reason);
    }
    /**
     * @description Rejects the promise with an error message.
     * @summary Logs an error message and rejects the promise with the given reason.
     *
     * @param reason - The reason for rejecting the promise, either a number (exit code) or a string.
     */
    reject(reason) {
        if (!(reason instanceof Error)) {
            reason = new Error(typeof reason === "number" ? `Exit code ${reason}` : reason);
        }
        this.log("stderr", `${this.cmd} failed to execute: ${(0, styled_string_builder_1.style)(reason.message).red}`);
        this.lock.reject(reason);
    }
}
exports.StandardOutputWriter = StandardOutputWriter;


/***/ }),

/***/ 9529:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Command = void 0;
const logging_1 = __webpack_require__(9834);
const constants_1 = __webpack_require__(7154);
const input_1 = __webpack_require__(7714);
const constants_2 = __webpack_require__(6837);
const fs_1 = __webpack_require__(3340);
const common_1 = __webpack_require__(866);
const environment_1 = __webpack_require__(2030);
/**
 * @class Command
 * @abstract
 * @template I - The type of input options for the command.
 * @template R - The return type of the command execution.
 * @memberOf utils/cli
 * @description Abstract base class for command implementation.
 * @summary Provides a structure for creating command-line interface commands with input handling, logging, and execution flow.
 *
 * @param {string} name - The name of the command.
 * @param {CommandOptions<I>} [inputs] - The input options for the command.
 * @param {string[]} [requirements] - The list of required dependencies for the command.
 */
class Command {
    constructor(name, inputs = {}, requirements = []) {
        this.name = name;
        this.inputs = inputs;
        this.requirements = requirements;
        if (!Command.log) {
            Object.defineProperty(Command, "log", {
                writable: false,
                value: logging_1.Logging.for(Command.name),
            });
            this.log = Command.log;
        }
        this.log = Command.log.for(this.name);
        this.inputs = Object.assign({}, constants_2.DefaultCommandOptions, inputs);
    }
    /**
     * @protected
     * @async
     * @description Checks if all required dependencies are present.
     * @summary Retrieves the list of dependencies and compares it against the required dependencies for the command.
     * @returns {Promise<void>} A promise that resolves when the check is complete.
     *
     * @mermaid
     * sequenceDiagram
     *   participant Command
     *   participant getDependencies
     *   participant Set
     *   Command->>getDependencies: Call
     *   getDependencies-->>Command: Return {prod, dev, peer}
     *   Command->>Set: Create Set from prod, dev, peer
     *   Set-->>Command: Return unique dependencies
     *   Command->>Command: Compare against requirements
     *   alt Missing dependencies
     *     Command->>Command: Add to missing list
     *   end
     *   Note over Command: If missing.length > 0, handle missing dependencies
     */
    async checkRequirements() {
        const { prod, dev, peer } = await (0, fs_1.getDependencies)();
        const missing = [];
        const fullList = Array.from(new Set([...prod, ...dev, ...peer]).values()).map((d) => d.name);
        for (const dep of this.requirements)
            if (!fullList.includes(dep))
                missing.push(dep);
        if (!missing.length)
            return;
    }
    /**
     * @protected
     * @description Provides help information for the command.
     * @summary This method should be overridden in derived classes to provide specific help information.
     * @param {ParseArgsResult} args - The parsed command-line arguments.
     * @returns {void}
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    help(args) {
        return this.log.info(`This is help. I'm no use because I should have been overridden.`);
    }
    /**
     * @async
     * @description Executes the command.
     * @summary This method handles the overall execution flow of the command, including parsing arguments,
     * setting up logging, checking for version or help requests, and running the command.
     * @returns {Promise<R | string | void>} A promise that resolves with the command's result.
     *
     * @mermaid
     * sequenceDiagram
     *   participant Command
     *   participant UserInput
     *   participant Logging
     *   participant getPackageVersion
     *   participant printBanner
     *   Command->>UserInput: parseArgs(inputs)
     *   UserInput-->>Command: Return ParseArgsResult
     *   Command->>Command: Process options
     *   Command->>Logging: setConfig(options)
     *   alt version requested
     *     Command->>getPackageVersion: Call
     *     getPackageVersion-->>Command: Return version
     *   else help requested
     *     Command->>Command: help(args)
     *   else banner requested
     *     Command->>printBanner: Call
     *   end
     *   Command->>Command: run(args)
     *   alt error occurs
     *     Command->>Command: Log error
     *   end
     *   Command-->>Command: Return result
     */
    async execute() {
        const args = input_1.UserInput.parseArgs(this.inputs);
        const env = environment_1.Environment.accumulate(constants_1.DefaultLoggingConfig)
            .accumulate(constants_2.DefaultCommandValues)
            .accumulate(args.values);
        const { timestamp, verbose, version, help, logLevel, logStyle, banner } = env;
        this.log.setConfig({
            ...env,
            timestamp: !!timestamp,
            level: logLevel,
            style: !!logStyle,
            verbose: verbose || 0,
        });
        if (version) {
            return (0, fs_1.getPackageVersion)();
        }
        if (help) {
            return this.help(args);
        }
        if (banner)
            (0, common_1.printBanner)(this.log.for(common_1.printBanner, {
                timestamp: false,
                style: false,
                context: false,
                logLevel: false,
            }));
        let result;
        try {
            result = await this.run(env);
        }
        catch (e) {
            this.log.error(`Error while running provided cli function: ${e}`);
            throw e;
        }
        return result;
    }
}
exports.Command = Command;


/***/ }),

/***/ 9599:
/***/ ((module) => {

"use strict";


const main = {
  arrowUp: '↑',
  arrowDown: '↓',
  arrowLeft: '←',
  arrowRight: '→',
  radioOn: '◉',
  radioOff: '◯',
  tick: '✔',
  cross: '✖',
  ellipsis: '…',
  pointerSmall: '›',
  line: '─',
  pointer: '❯'
};
const win = {
  arrowUp: main.arrowUp,
  arrowDown: main.arrowDown,
  arrowLeft: main.arrowLeft,
  arrowRight: main.arrowRight,
  radioOn: '(*)',
  radioOff: '( )',
  tick: '√',
  cross: '×',
  ellipsis: '...',
  pointerSmall: '»',
  line: '─',
  pointer: '>'
};
const figures = process.platform === 'win32' ? win : main;
module.exports = figures;

/***/ }),

/***/ 9680:
/***/ ((module) => {

"use strict";
module.exports = /*#__PURE__*/JSON.parse('[{"Slogan":"No caffeine, no chaos. Just clean code.","Tags":"Coffee-themed, Calm, Tech"},{"Slogan":"Full flavor, no jitters. That\'s Decaf-TS.","Tags":"Coffee-themed, Cheerful"},{"Slogan":"Chill fullstack. Powered by Decaf.","Tags":"Coffee-themed, Fun, Tech"},{"Slogan":"Decaf-TS: Brewed for calm code.","Tags":"Coffee-themed, Branding"},{"Slogan":"Smooth as your morning Decaf.","Tags":"Coffee-themed, Chill"},{"Slogan":"All the kick, none of the crash.","Tags":"Coffee-themed, Energetic"},{"Slogan":"Sip back and ship faster.","Tags":"Coffee-themed, Fun"},{"Slogan":"Keep calm and code Decaf.","Tags":"Coffee-themed, Playful"},{"Slogan":"Code without the caffeine shakes.","Tags":"Coffee-themed, Humorous"},{"Slogan":"Your fullstack, decaffeinated.","Tags":"Coffee-themed, Technical"},{"Slogan":"No caffeine, no chaos. Just clean code.","Tags":"Coffee-themed, Calm, Tech"},{"Slogan":"Full flavor, no jitters. That’s Decaf-TS.","Tags":"Coffee-themed, Cheerful"},{"Slogan":"Chill fullstack. Powered by Decaf.","Tags":"Coffee-themed, Fun, Tech"},{"Slogan":"Decaf-TS: Brewed for calm code.","Tags":"Coffee-themed, Branding"},{"Slogan":"Smooth as your morning Decaf.","Tags":"Coffee-themed, Chill"},{"Slogan":"All the kick, none of the crash.","Tags":"Coffee-themed, Energetic"},{"Slogan":"Sip back and ship faster.","Tags":"Coffee-themed, Fun"},{"Slogan":"Keep calm and code Decaf.","Tags":"Coffee-themed, Playful"},{"Slogan":"Code without the caffeine shakes.","Tags":"Coffee-themed, Humorous"},{"Slogan":"Your fullstack, decaffeinated.","Tags":"Coffee-themed, Technical"},{"Slogan":"No caffeine, no chaos. Just clean code.","Tags":"Coffee-themed, Calm, Tech"},{"Slogan":"Full flavor, no jitters. That’s Decaf-TS.","Tags":"Coffee-themed, Cheerful"},{"Slogan":"Chill fullstack. Powered by Decaf.","Tags":"Coffee-themed, Fun, Tech"},{"Slogan":"Decaf-TS: Brewed for calm code.","Tags":"Coffee-themed, Branding"},{"Slogan":"Smooth as your morning Decaf.","Tags":"Coffee-themed, Chill"},{"Slogan":"All the kick, none of the crash.","Tags":"Coffee-themed, Energetic"},{"Slogan":"Sip back and ship faster.","Tags":"Coffee-themed, Fun"},{"Slogan":"Keep calm and code Decaf.","Tags":"Coffee-themed, Playful"},{"Slogan":"Code without the caffeine shakes.","Tags":"Coffee-themed, Humorous"},{"Slogan":"Your fullstack, decaffeinated.","Tags":"Coffee-themed, Technical"},{"Slogan":"No caffeine, no chaos. Just clean code.","Tags":"Coffee-themed, Calm, Tech"},{"Slogan":"Full flavor, no jitters. That’s Decaf-TS.","Tags":"Coffee-themed, Cheerful"},{"Slogan":"Chill fullstack. Powered by Decaf.","Tags":"Coffee-themed, Fun, Tech"},{"Slogan":"Decaf-TS: Brewed for calm code.","Tags":"Coffee-themed, Branding"},{"Slogan":"Smooth as your morning Decaf.","Tags":"Coffee-themed, Chill"},{"Slogan":"All the kick, none of the crash.","Tags":"Coffee-themed, Energetic"},{"Slogan":"Sip back and ship faster.","Tags":"Coffee-themed, Fun"},{"Slogan":"Keep calm and code Decaf.","Tags":"Coffee-themed, Playful"},{"Slogan":"Code without the caffeine shakes.","Tags":"Coffee-themed, Humorous"},{"Slogan":"Your fullstack, decaffeinated.","Tags":"Coffee-themed, Technical"},{"Slogan":"No caffeine, no chaos. Just clean code.","Tags":"Coffee-themed, Calm, Tech"},{"Slogan":"Full flavor, no jitters. That’s Decaf-TS.","Tags":"Coffee-themed, Cheerful"},{"Slogan":"Chill fullstack. Powered by Decaf.","Tags":"Coffee-themed, Fun, Tech"},{"Slogan":"Decaf-TS: Brewed for calm code.","Tags":"Coffee-themed, Branding"},{"Slogan":"Smooth as your morning Decaf.","Tags":"Coffee-themed, Chill"},{"Slogan":"All the kick, none of the crash.","Tags":"Coffee-themed, Energetic"},{"Slogan":"Sip back and ship faster.","Tags":"Coffee-themed, Fun"},{"Slogan":"Keep calm and code Decaf.","Tags":"Coffee-themed, Playful"},{"Slogan":"Code without the caffeine shakes.","Tags":"Coffee-themed, Humorous"},{"Slogan":"Your fullstack, decaffeinated.","Tags":"Coffee-themed, Technical"},{"Slogan":"No caffeine, no chaos. Just clean code.","Tags":"Coffee-themed, Calm, Tech"},{"Slogan":"Full flavor, no jitters. That’s Decaf-TS.","Tags":"Coffee-themed, Cheerful"},{"Slogan":"Chill fullstack. Powered by Decaf.","Tags":"Coffee-themed, Fun, Tech"},{"Slogan":"Decaf-TS: Brewed for calm code.","Tags":"Coffee-themed, Branding"},{"Slogan":"Smooth as your morning Decaf.","Tags":"Coffee-themed, Chill"},{"Slogan":"All the kick, none of the crash.","Tags":"Coffee-themed, Energetic"},{"Slogan":"Sip back and ship faster.","Tags":"Coffee-themed, Fun"},{"Slogan":"Keep calm and code Decaf.","Tags":"Coffee-themed, Playful"},{"Slogan":"Code without the caffeine shakes.","Tags":"Coffee-themed, Humorous"},{"Slogan":"Your fullstack, decaffeinated.","Tags":"Coffee-themed, Technical"},{"Slogan":"No caffeine, no chaos. Just clean code.","Tags":"Coffee-themed, Calm, Tech"},{"Slogan":"Full flavor, no jitters. That’s Decaf-TS.","Tags":"Coffee-themed, Cheerful"},{"Slogan":"Chill fullstack. Powered by Decaf.","Tags":"Coffee-themed, Fun, Tech"},{"Slogan":"Decaf-TS: Brewed for calm code.","Tags":"Coffee-themed, Branding"},{"Slogan":"Smooth as your morning Decaf.","Tags":"Coffee-themed, Chill"},{"Slogan":"All the kick, none of the crash.","Tags":"Coffee-themed, Energetic"},{"Slogan":"Sip back and ship faster.","Tags":"Coffee-themed, Fun"},{"Slogan":"Keep calm and code Decaf.","Tags":"Coffee-themed, Playful"},{"Slogan":"Code without the caffeine shakes.","Tags":"Coffee-themed, Humorous"},{"Slogan":"Your fullstack, decaffeinated.","Tags":"Coffee-themed, Technical"},{"Slogan":"No caffeine, no chaos. Just clean code.","Tags":"Coffee-themed, Calm, Tech"},{"Slogan":"Full flavor, no jitters. That’s Decaf-TS.","Tags":"Coffee-themed, Cheerful"},{"Slogan":"Chill fullstack. Powered by Decaf.","Tags":"Coffee-themed, Fun, Tech"},{"Slogan":"Decaf-TS: Brewed for calm code.","Tags":"Coffee-themed, Branding"},{"Slogan":"Smooth as your morning Decaf.","Tags":"Coffee-themed, Chill"},{"Slogan":"All the kick, none of the crash.","Tags":"Coffee-themed, Energetic"},{"Slogan":"Sip back and ship faster.","Tags":"Coffee-themed, Fun"},{"Slogan":"Keep calm and code Decaf.","Tags":"Coffee-themed, Playful"},{"Slogan":"Code without the caffeine shakes.","Tags":"Coffee-themed, Humorous"},{"Slogan":"Your fullstack, decaffeinated.","Tags":"Coffee-themed, Technical"},{"Slogan":"No caffeine, no chaos. Just clean code.","Tags":"Coffee-themed, Calm, Tech"},{"Slogan":"Full flavor, no jitters. That’s Decaf-TS.","Tags":"Coffee-themed, Cheerful"},{"Slogan":"Chill fullstack. Powered by Decaf.","Tags":"Coffee-themed, Fun, Tech"},{"Slogan":"Decaf-TS: Brewed for calm code.","Tags":"Coffee-themed, Branding"},{"Slogan":"Smooth as your morning Decaf.","Tags":"Coffee-themed, Chill"},{"Slogan":"All the kick, none of the crash.","Tags":"Coffee-themed, Energetic"},{"Slogan":"Sip back and ship faster.","Tags":"Coffee-themed, Fun"},{"Slogan":"Keep calm and code Decaf.","Tags":"Coffee-themed, Playful"},{"Slogan":"Code without the caffeine shakes.","Tags":"Coffee-themed, Humorous"},{"Slogan":"Your fullstack, decaffeinated.","Tags":"Coffee-themed, Technical"},{"Slogan":"No caffeine, no chaos. Just clean code.","Tags":"Coffee-themed, Calm, Tech"},{"Slogan":"Full flavor, no jitters. That’s Decaf-TS.","Tags":"Coffee-themed, Cheerful"},{"Slogan":"Chill fullstack. Powered by Decaf.","Tags":"Coffee-themed, Fun, Tech"},{"Slogan":"Decaf-TS: Brewed for calm code.","Tags":"Coffee-themed, Branding"},{"Slogan":"Smooth as your morning Decaf.","Tags":"Coffee-themed, Chill"},{"Slogan":"All the kick, none of the crash.","Tags":"Coffee-themed, Energetic"},{"Slogan":"Sip back and ship faster.","Tags":"Coffee-themed, Fun"},{"Slogan":"Keep calm and code Decaf.","Tags":"Coffee-themed, Playful"},{"Slogan":"Code without the caffeine shakes.","Tags":"Coffee-themed, Humorous"},{"Slogan":"Your fullstack, decaffeinated.","Tags":"Coffee-themed, Technical"},{"Slogan":"Decaf-TS: Where smart contracts meet smart interfaces.","Tags":"Blockchain, Smart Contracts, Tech"},{"Slogan":"Ship dApps without the stress.","Tags":"Blockchain, Cheerful, Developer"},{"Slogan":"No CRUD, no problem — Decaf your data.","Tags":"Data, No-CRUD, Chill"},{"Slogan":"From DID to UI, without breaking a sweat.","Tags":"DID, SSI, UI, Calm"},{"Slogan":"Decaf-TS: Your frontend already understands your smart contract.","Tags":"Smart Contracts, DX, Magic"},{"Slogan":"Self-sovereign by design. Productive by default.","Tags":"SSI, Developer, Calm"},{"Slogan":"Build once. Deploy everywhere. Decentralized and delightful.","Tags":"Blockchain, Multi-platform, Happy"},{"Slogan":"Data that defines its own destiny.","Tags":"SSI, Data-driven, Empowerment"},{"Slogan":"Goodbye CRUD, hello intent-based interfaces.","Tags":"No-CRUD, UI, Technical"},{"Slogan":"The smoothest path from DID to done.","Tags":"DID, Workflow, Chill"},{"Slogan":"Because your dApp deserves more than boilerplate.","Tags":"Blockchain, DevX, Efficiency"},{"Slogan":"Own your data. Own your flow.","Tags":"SSI, Control, Ownership"},{"Slogan":"Write logic like it belongs with the data — because it does.","Tags":"Data Logic, Developer, Smart"},{"Slogan":"From smart contracts to smarter frontends.","Tags":"Smart Contracts, UI, DX"},{"Slogan":"No caffeine. No CRUD. Just the future.","Tags":"No-CRUD, Coffee-themed, Futuristic"},{"Slogan":"The future of web3 UX is Decaf.","Tags":"Blockchain, UX, Vision"},{"Slogan":"Code with confidence. Govern with clarity.","Tags":"Blockchain, Governance, Calm"},{"Slogan":"Interfaces that obey the data, not the other way around.","Tags":"UI, Data Logic, Self-aware"},{"Slogan":"Brew business logic right into your bytes.","Tags":"Data Logic, Coffee-themed, Fun"},{"Slogan":"DIDs done differently — and delightfully.","Tags":"DID, Self-Sovereign, Playful"},{"Slogan":"Decaf-TS-TS: Where blockchain contracts meet smart interfaces.","Tags":"Blockchain, Smart Contracts, Tech"},{"Slogan":"Ship dApps without the stress.","Tags":"Blockchain, Cheerful, Developer"},{"Slogan":"No boilerplate, no problem — Decaf-TS your data.","Tags":"Data, No-CRUD, Chill"},{"Slogan":"From DID to UI, without breaking a sweat.","Tags":"DID, SSI, UI, Calm"},{"Slogan":"Decaf-TS-TS: Your frontend already understands your blockchain contract.","Tags":"Smart Contracts, DX, Magic"},{"Slogan":"Self-sovereign by design. Productive by default.","Tags":"SSI, Developer, Calm"},{"Slogan":"Build once. Deploy everywhere. Decentralized and delightful.","Tags":"Blockchain, Multi-platform, Happy"},{"Slogan":"Data that defines its own destiny.","Tags":"SSI, Data-driven, Empowerment"},{"Slogan":"Goodbye boilerplate, hello intent-based interfaces.","Tags":"No-CRUD, UI, Technical"},{"Slogan":"The smoothest path from DID to done.","Tags":"DID, Workflow, Chill"},{"Slogan":"Because your dApp deserves more than boilerplate.","Tags":"Blockchain, DevX, Efficiency"},{"Slogan":"Own your data. Own your flow.","Tags":"SSI, Control, Ownership"},{"Slogan":"Write logic like it belongs with the data — because it does.","Tags":"Data Logic, Developer, Smart"},{"Slogan":"From blockchain contracts to smarter frontends.","Tags":"Smart Contracts, UI, DX"},{"Slogan":"No caffeine. No boilerplate. Just the future.","Tags":"No-CRUD, Coffee-themed, Futuristic"},{"Slogan":"The future of web3 UX is Decaf-TS.","Tags":"Blockchain, UX, Vision"},{"Slogan":"Code with confidence. Govern with clarity.","Tags":"Blockchain, Governance, Calm"},{"Slogan":"Interfaces that obey the data, not the other way around.","Tags":"UI, Data Logic, Self-aware"},{"Slogan":"Brew business logic right into your bytes.","Tags":"Data Logic, Coffee-themed, Fun"},{"Slogan":"DIDs done differently — and delightfully.","Tags":"DID, Self-Sovereign, Playful"},{"Slogan":"Decaf-TS-TS: Where blockchain contracts meet smart interfaces.","Tags":"Blockchain, Smart Contracts, Tech"},{"Slogan":"Ship dApps without the stress.","Tags":"Blockchain, Cheerful, Developer"},{"Slogan":"No boilerplate, no problem — Decaf-TS your data.","Tags":"Data, No-CRUD, Chill"},{"Slogan":"From DID to UI, without breaking a sweat.","Tags":"DID, SSI, UI, Calm"},{"Slogan":"Decaf-TS-TS: Your frontend already understands your blockchain contract.","Tags":"Smart Contracts, DX, Magic"},{"Slogan":"Self-sovereign by design. Productive by default.","Tags":"SSI, Developer, Calm"},{"Slogan":"Build once. Deploy everywhere. Decentralized and delightful.","Tags":"Blockchain, Multi-platform, Happy"},{"Slogan":"Data that defines its own destiny.","Tags":"SSI, Data-driven, Empowerment"},{"Slogan":"Goodbye boilerplate, hello intent-based interfaces.","Tags":"No-CRUD, UI, Technical"},{"Slogan":"The smoothest path from DID to done.","Tags":"DID, Workflow, Chill"},{"Slogan":"Because your dApp deserves more than boilerplate.","Tags":"Blockchain, DevX, Efficiency"},{"Slogan":"Own your data. Own your flow.","Tags":"SSI, Control, Ownership"},{"Slogan":"Write logic like it belongs with the data — because it does.","Tags":"Data Logic, Developer, Smart"},{"Slogan":"From blockchain contracts to smarter frontends.","Tags":"Smart Contracts, UI, DX"},{"Slogan":"No caffeine. No boilerplate. Just the future.","Tags":"No-CRUD, Coffee-themed, Futuristic"},{"Slogan":"The future of web3 UX is Decaf-TS.","Tags":"Blockchain, UX, Vision"},{"Slogan":"Code with confidence. Govern with clarity.","Tags":"Blockchain, Governance, Calm"},{"Slogan":"Interfaces that obey the data, not the other way around.","Tags":"UI, Data Logic, Self-aware"},{"Slogan":"Brew business logic right into your bytes.","Tags":"Data Logic, Coffee-themed, Fun"},{"Slogan":"DIDs done differently — and delightfully.","Tags":"DID, Self-Sovereign, Playful"},{"Slogan":"Decaf-TS-TS: Where blockchain contracts meet smart interfaces.","Tags":"Blockchain, Smart Contracts, Tech"},{"Slogan":"Ship dApps without the stress.","Tags":"Blockchain, Cheerful, Developer"},{"Slogan":"No boilerplate, no problem — Decaf-TS your data.","Tags":"Data, No-CRUD, Chill"},{"Slogan":"From DID to UI, without breaking a sweat.","Tags":"DID, SSI, UI, Calm"},{"Slogan":"Decaf-TS-TS: Your frontend already understands your blockchain contract.","Tags":"Smart Contracts, DX, Magic"},{"Slogan":"Self-sovereign by design. Productive by default.","Tags":"SSI, Developer, Calm"},{"Slogan":"Build once. Deploy everywhere. Decentralized and delightful.","Tags":"Blockchain, Multi-platform, Happy"},{"Slogan":"Data that defines its own destiny.","Tags":"SSI, Data-driven, Empowerment"},{"Slogan":"Goodbye boilerplate, hello intent-based interfaces.","Tags":"No-CRUD, UI, Technical"},{"Slogan":"The smoothest path from DID to done.","Tags":"DID, Workflow, Chill"},{"Slogan":"Because your dApp deserves more than boilerplate.","Tags":"Blockchain, DevX, Efficiency"},{"Slogan":"Own your data. Own your flow.","Tags":"SSI, Control, Ownership"},{"Slogan":"Write logic like it belongs with the data — because it does.","Tags":"Data Logic, Developer, Smart"},{"Slogan":"From blockchain contracts to smarter frontends.","Tags":"Smart Contracts, UI, DX"},{"Slogan":"No caffeine. No boilerplate. Just the future.","Tags":"No-CRUD, Coffee-themed, Futuristic"},{"Slogan":"The future of web3 UX is Decaf-TS.","Tags":"Blockchain, UX, Vision"},{"Slogan":"Code with confidence. Govern with clarity.","Tags":"Blockchain, Governance, Calm"},{"Slogan":"Interfaces that obey the data, not the other way around.","Tags":"UI, Data Logic, Self-aware"},{"Slogan":"Brew business logic right into your bytes.","Tags":"Data Logic, Coffee-themed, Fun"},{"Slogan":"DIDs done differently — and delightfully.","Tags":"DID, Self-Sovereign, Playful"},{"Slogan":"Decaf-TS-TS: Where blockchain contracts meet smart interfaces.","Tags":"Blockchain, Smart Contracts, Tech"},{"Slogan":"Ship dApps without the stress.","Tags":"Blockchain, Cheerful, Developer"},{"Slogan":"No boilerplate, no problem — Decaf-TS your data.","Tags":"Data, No-CRUD, Chill"},{"Slogan":"From DID to UI, without breaking a sweat.","Tags":"DID, SSI, UI, Calm"},{"Slogan":"Decaf-TS-TS: Your frontend already understands your blockchain contract.","Tags":"Smart Contracts, DX, Magic"},{"Slogan":"Self-sovereign by design. Productive by default.","Tags":"SSI, Developer, Calm"},{"Slogan":"Build once. Deploy everywhere. Decentralized and delightful.","Tags":"Blockchain, Multi-platform, Happy"},{"Slogan":"Data that defines its own destiny.","Tags":"SSI, Data-driven, Empowerment"},{"Slogan":"Goodbye boilerplate, hello intent-based interfaces.","Tags":"No-CRUD, UI, Technical"},{"Slogan":"The smoothest path from DID to done.","Tags":"DID, Workflow, Chill"},{"Slogan":"Because your dApp deserves more than boilerplate.","Tags":"Blockchain, DevX, Efficiency"},{"Slogan":"Own your data. Own your flow.","Tags":"SSI, Control, Ownership"},{"Slogan":"Write logic like it belongs with the data — because it does.","Tags":"Data Logic, Developer, Smart"},{"Slogan":"From blockchain contracts to smarter frontends.","Tags":"Smart Contracts, UI, DX"},{"Slogan":"No caffeine. No boilerplate. Just the future.","Tags":"No-CRUD, Coffee-themed, Futuristic"},{"Slogan":"The future of web3 UX is Decaf-TS.","Tags":"Blockchain, UX, Vision"},{"Slogan":"Code with confidence. Govern with clarity.","Tags":"Blockchain, Governance, Calm"},{"Slogan":"Interfaces that obey the data, not the other way around.","Tags":"UI, Data Logic, Self-aware"},{"Slogan":"Brew business logic right into your bytes.","Tags":"Data Logic, Coffee-themed, Fun"},{"Slogan":"DIDs done differently — and delightfully.","Tags":"DID, Self-Sovereign, Playful"}]');

/***/ }),

/***/ 9834:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Logging = exports.MiniLogger = void 0;
const constants_1 = __webpack_require__(7154);
const styled_string_builder_1 = __webpack_require__(1076);
/**
 * @description A minimal logger implementation.
 * @summary MiniLogger is a lightweight logging class that implements the VerbosityLogger interface.
 * It provides basic logging functionality with support for different log levels and verbosity.
 *
 * @class
 */
class MiniLogger {
    /**
     * @description Creates a new MiniLogger instance.
     * @summary Initializes a MiniLogger with the given class name, optional configuration, and method name.
     *
     * @param context - The name of the class using this logger.
     * @param [conf] - Optional logging configuration. Defaults to Info level and verbosity 0.
     * @param [id] - Optional unique identifier for the logger instance.
     */
    constructor(context, conf, id) {
        this.context = context;
        this.conf = conf;
        this.id = id;
    }
    config(key) {
        if (this.conf && key in this.conf)
            return this.conf[key];
        return Logging.getConfig()[key];
    }
    for(method, config) {
        method = method
            ? typeof method === "string"
                ? method
                : method.name
            : undefined;
        return Logging.for([this.context, method].join("."), this.id, config);
    }
    /**
     * @description Creates a formatted log string.
     * @summary Generates a log string with timestamp, colored log level, and message.
     *
     * @param level - The log level as a string.
     * @param message
     * @param stack
     * @return A formatted log string.
     */
    createLog(level, message, stack) {
        const log = [];
        const style = this.config("style");
        if (this.config("timestamp")) {
            const date = new Date().toISOString();
            const timestamp = style ? Logging.theme(date, "timestamp", level) : date;
            log.push(timestamp);
        }
        if (this.config("logLevel")) {
            const lvl = style
                ? Logging.theme(level, "logLevel", level)
                : level;
            log.push(lvl);
        }
        if (this.config("context")) {
            const context = style
                ? Logging.theme(this.context, "class", level)
                : this.context;
            log.push(context);
        }
        const msg = style
            ? Logging.theme(typeof message === "string" ? message : message.message, "message", level)
            : typeof message === "string"
                ? message
                : message.message;
        log.push(msg);
        if (stack || message instanceof Error) {
            stack = style
                ? Logging.theme((stack || message.stack), "stack", level)
                : stack;
            log.push(`\nStack trace:\n${stack}`);
        }
        return log.join(this.config("separator"));
    }
    /**
     * @description Logs a message with the specified log level.
     * @summary Checks if the message should be logged based on the current log level,
     * then uses the appropriate console method to output the log.
     *
     * @param level - The log level of the message.
     * @param msg - The message to be logged.
     * @param stack
     */
    log(level, msg, stack) {
        if (constants_1.NumericLogLevels[this.config("level")] <
            constants_1.NumericLogLevels[level])
            return;
        let method;
        switch (level) {
            case constants_1.LogLevel.info:
                method = console.log;
                break;
            case constants_1.LogLevel.verbose:
            case constants_1.LogLevel.debug:
                method = console.debug;
                break;
            case constants_1.LogLevel.error:
                method = console.error;
                break;
            default:
                throw new Error("Invalid log level");
        }
        method(this.createLog(level, msg, stack));
    }
    /**
     * @description LLogs a `way too verbose` or a silly message.
     * @summary Logs a message at the Silly level if the current verbosity allows it.
     *
     * @param msg - The message to be logged.
     * @param verbosity - The verbosity level of the message (default: 0).
     */
    silly(msg, verbosity = 0) {
        if (this.config("verbose") >= verbosity)
            this.log(constants_1.LogLevel.verbose, msg);
    }
    /**
     * @description Logs a verbose message.
     * @summary Logs a message at the Verbose level if the current verbosity allows it.
     *
     * @param msg - The message to be logged.
     * @param verbosity - The verbosity level of the message (default: 0).
     */
    verbose(msg, verbosity = 0) {
        if (this.config("verbose") >= verbosity)
            this.log(constants_1.LogLevel.verbose, msg);
    }
    /**
     * @description Logs an info message.
     * @summary Logs a message at the Info level.
     *
     * @param msg - The message to be logged.
     */
    info(msg) {
        this.log(constants_1.LogLevel.info, msg);
    }
    /**
     * @description Logs a debug message.
     * @summary Logs a message at the Debug level.
     *
     * @param msg - The message to be logged.
     */
    debug(msg) {
        this.log(constants_1.LogLevel.debug, msg);
    }
    /**
     * @description Logs an error message.
     * @summary Logs a message at the Error level.
     *
     * @param msg - The message to be logged.
     */
    error(msg) {
        this.log(constants_1.LogLevel.error, msg);
    }
    setConfig(config) {
        this.conf = { ...(this.conf || {}), ...config };
    }
}
exports.MiniLogger = MiniLogger;
/**
 * @description A static class for managing logging operations.
 * @summary The Logging class provides a centralized logging mechanism with support for
 * different log levels and verbosity. It uses a singleton pattern to maintain a global
 * logger instance and allows creating specific loggers for different classes and methods.
 *
 * @class
 */
class Logging {
    /**
     * @description Factory function for creating logger instances.
     * @summary A function that creates new VerbosityLogger instances. By default, it creates a MiniLogger.
     */
    static { this._factory = (object, config, id) => {
        return new MiniLogger(object, config, id);
    }; }
    /**
     * @description Configuration for the logging system.
     * @summary Stores the global verbosity level and log level settings.
     */
    static { this._config = constants_1.DefaultLoggingConfig; }
    /**
     * @description Private constructor to prevent instantiation.
     * @summary Ensures that the Logging class cannot be instantiated as it's designed to be used statically.
     */
    constructor() { }
    /**
     * @description Setter for the logging configuration.
     * @summary Allows updating the global logging configuration.
     *
     * @param config - An object containing verbosity and log level settings.
     */
    static setConfig(config) {
        Object.assign(this._config, config);
    }
    static getConfig() {
        return Object.assign({}, this._config);
    }
    /**
     * @description Retrieves or creates the global logger instance.
     * @summary Returns the existing global logger or creates a new one if it doesn't exist.
     *
     * @return The global VerbosityLogger instance.
     */
    static get() {
        this.global = this.global ? this.global : this._factory("Logging");
        return this.global;
    }
    /**
     * @description Logs a verbose message.
     * @summary Delegates the verbose logging to the global logger instance.
     *
     * @param msg - The message to be logged.
     * @param verbosity - The verbosity level of the message (default: 0).
     */
    static verbose(msg, verbosity = 0) {
        return this.get().verbose(msg, verbosity);
    }
    /**
     * @description Logs an info message.
     * @summary Delegates the info logging to the global logger instance.
     *
     * @param msg - The message to be logged.
     */
    static info(msg) {
        return this.get().info(msg);
    }
    /**
     * @description Logs a debug message.
     * @summary Delegates the debug logging to the global logger instance.
     *
     * @param msg - The message to be logged.
     */
    static debug(msg) {
        return this.get().debug(msg);
    }
    /**
     * @description Logs a silly message.
     * @summary Delegates the debug logging to the global logger instance.
     *
     * @param msg - The message to be logged.
     */
    static silly(msg) {
        return this.get().silly(msg);
    }
    /**
     * @description Logs an error message.
     * @summary Delegates the error logging to the global logger instance.
     *
     * @param msg - The message to be logged.
     */
    static error(msg) {
        return this.get().error(msg);
    }
    static for(object, id, config) {
        object = typeof object === "string" ? object : object.name;
        id = typeof id === "string" ? id : undefined;
        config = typeof id === "object" ? id : config;
        return this._factory(object, config, id);
    }
    /**
     * @description Creates a logger for a specific reason or context.
     *
     * @summary This static method creates a new logger instance using the factory function,
     * based on a given reason or context.
     *
     * @param reason - A string describing the reason or context for creating this logger.
     * @param id
     * @returns A new VerbosityLogger or ClassLogger instance.
     */
    static because(reason, id) {
        return this._factory(reason, this._config, id);
    }
    static theme(text, type, loggerLevel, template = constants_1.DefaultTheme) {
        if (!this._config.style)
            return text;
        const logger = Logging.get().for(this.theme);
        function apply(txt, option, value) {
            try {
                const t = txt;
                let c = (0, styled_string_builder_1.style)(t);
                function applyColor(val, isBg = false) {
                    let f = isBg ? c.background : c.foreground;
                    if (!Array.isArray(val)) {
                        return f.call(c, value);
                    }
                    switch (val.length) {
                        case 1:
                            f = isBg ? c.bgColor256 : c.color256;
                            return f(val[0]);
                        case 3:
                            f = isBg ? c.bgRgb : c.rgb;
                            return c.rgb(val[0], val[1], val[2]);
                        default:
                            logger.error(`Not a valid color option: ${option}`);
                            return (0, styled_string_builder_1.style)(t);
                    }
                }
                function applyStyle(v) {
                    if (typeof v === "number") {
                        c = c.style(v);
                    }
                    else {
                        c = c[v];
                    }
                }
                switch (option) {
                    case "bg":
                    case "fg":
                        return applyColor(value).text;
                    case "style":
                        if (Array.isArray(value)) {
                            value.forEach(applyStyle);
                        }
                        else {
                            applyStyle(value);
                        }
                        return c.text;
                    default:
                        logger.error(`Not a valid theme option: ${option}`);
                        return t;
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            }
            catch (e) {
                logger.error(`Error applying style: ${option} with value ${value}`);
                return txt;
            }
        }
        const individualTheme = template[type];
        if (!individualTheme || !Object.keys(individualTheme).length) {
            return text;
        }
        let actualTheme = individualTheme;
        const logLevels = Object.assign({}, constants_1.LogLevel);
        if (Object.keys(individualTheme)[0] in logLevels)
            actualTheme =
                individualTheme[loggerLevel] || {};
        return Object.keys(actualTheme).reduce((acc, key) => {
            const val = actualTheme[key];
            if (val)
                return apply(acc, key, val);
            return acc;
        }, text);
    }
}
exports.Logging = Logging;


/***/ }),

/***/ 9939:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const c = __webpack_require__(1394);

const figures = __webpack_require__(9599); // rendering user input.


const styles = Object.freeze({
  password: {
    scale: 1,
    render: input => '*'.repeat(input.length)
  },
  emoji: {
    scale: 2,
    render: input => '😃'.repeat(input.length)
  },
  invisible: {
    scale: 0,
    render: input => ''
  },
  default: {
    scale: 1,
    render: input => `${input}`
  }
});

const render = type => styles[type] || styles.default; // icon to signalize a prompt.


const symbols = Object.freeze({
  aborted: c.red(figures.cross),
  done: c.green(figures.tick),
  exited: c.yellow(figures.cross),
  default: c.cyan('?')
});

const symbol = (done, aborted, exited) => aborted ? symbols.aborted : exited ? symbols.exited : done ? symbols.done : symbols.default; // between the question and the user's input.


const delimiter = completing => c.gray(completing ? figures.ellipsis : figures.pointerSmall);

const item = (expandable, expanded) => c.gray(expandable ? expanded ? figures.pointerSmall : '+' : figures.line);

module.exports = {
  styles,
  render,
  symbols,
  symbol,
  delimiter,
  item
};

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be in strict mode.
(() => {
"use strict";
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
const commands_1 = __webpack_require__(6487);
new commands_1.TemplateSync()
    .execute()
    .then(() => commands_1.TemplateSync.log.info("Template updated successfully. Please confirm all changes before commiting"))
    .catch((e) => {
    commands_1.TemplateSync.log.error(`Error preparing template: ${e}`);
    process.exit(1);
});

})();

/******/ 	return __webpack_exports__;
/******/ })()
;
});