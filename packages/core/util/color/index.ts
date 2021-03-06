import {
  emphasize as muiEmphasize,
  getLuminance as muiGetLuminance,
} from '@material-ui/core/styles/colorManipulator'
import { namedColorToHex, isNamedColor } from './cssColorsLevel4'

export { namedColorToHex, isNamedColor }

/**
 * Algorithmically pick a contrasting text color that will
 * be visible on top of the given background color. Either
 * black or white.
 *
 * @param {string} color - CSS color, i.e. one of: #nnn, #nnnnnn, rgb(), rgba(),
 *  hsl(), hsla(), or named color
 * @returns {string} 'black' or 'white'
 */
export function contrastingTextColor(color: string): string {
  const luminance = getLuminance(color)
  return luminance > 0.5 ? 'black' : 'white'
}

/**
 * The relative brightness of any point in a color space,
 * normalized to 0 for darkest black and 1 for lightest white.
 * Uses MUI's `getLuminance`, but adds support for named colors
 *
 * Formula: https://www.w3.org/TR/WCAG20-TECHS/G17.html#G17-tests
 *
 * @param {string} color - CSS color, i.e. one of: #nnn, #nnnnnn, rgb(), rgba(),
 *  hsl(), hsla(), or named color
 * @returns {number} The relative brightness of the color in the range 0 - 1
 */
function getLuminance(color: string): number {
  const convertedColor = namedColorToHex(color)
  return muiGetLuminance(convertedColor || color)
}

/**
 * Darken or lighten a color, depending on its luminance.
 * Light colors are darkened, dark colors are lightened.
 * Uses MUI's `emphasize`, but adds support for named colors
 *
 * @param {string} color - CSS color, i.e. one of: #nnn, #nnnnnn, rgb(), rgba(),
 * hsl(), hsla(), or named color
 * @param {number} coefficient=0.15 - multiplier in the range 0 - 1
 * @returns {string} A CSS color string. Hex input values are returned as rgb
 */
export function emphasize(color: string, coefficient = 0.15): string {
  const convertedColor = namedColorToHex(color)
  return muiEmphasize(convertedColor || color, coefficient)
}
