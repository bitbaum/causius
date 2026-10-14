/** Where the reader's light/dark choice is kept. */
export const THEME_KEY = "causius.theme";

/**
 * Runs before the first paint, so a reader who prefers dark never sees a flash
 * of light. The reader's own choice wins; without one, the device's does. It is
 * an inline script, so it carries the response's CSP nonce (see the layout).
 */
export const THEME_BOOT = `(function(){try{var s=localStorage.getItem(${JSON.stringify(THEME_KEY)});var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;
