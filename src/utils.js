/**
 * Parses a string with potentially comma decimal separator to a float.
 * @param {string|number} str 
 * @returns {number}
 */
export function parseLocalFloat(str) {
    return parseFloat(String(str).replace(",", "."));
}

/**
 * Formats a number with comma decimal separator.
 * @param {number} num 
 * @param {number} decimals 
 * @returns {string}
 */
export function formatLocalFloat(num, decimals) {
    return num.toFixed(decimals).replace(".", ",");
}

/**
 * Gets internal dimension by subtracting wall thickness.
 * @param {number} ext_mm 
 * @param {number} wallThickness 
 * @returns {number}
 */
export function getInternalDim(ext_mm, wallThickness = 0.5) {
    return Math.max(0, ext_mm - 2 * wallThickness);
}
