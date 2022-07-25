/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __nccwpck_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__nccwpck_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__nccwpck_require__.o(definition, key) && !__nccwpck_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__nccwpck_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__nccwpck_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// ESM COMPAT FLAG
__nccwpck_require__.r(__webpack_exports__);

// EXPORTS
__nccwpck_require__.d(__webpack_exports__, {
  "handler": () => (/* binding */ handler)
});

;// CONCATENATED MODULE: external "fs"
const external_fs_namespaceObject = require("fs");
;// CONCATENATED MODULE: ./src/config.ts

/**
 * Retrieve config from a JSON config file. Since we can't use Lambda environment variables
 * we upload a JSON file containing env-specific configuration together with the lambda source file
 *
 * @returns The configuration object loaded from the file
 */
function getConfig() {
    return JSON.parse((0,external_fs_namespaceObject.readFileSync)('./config.json', { encoding: 'utf8' }));
}

;// CONCATENATED MODULE: ./src/utils.ts
/**
 * Appends a custom header to a passed CloudFront header map
 * @param headers - CloudFront headers map
 * @param headerName - Custom header name
 * @param headerValue - Custom header value
 * @param options.merge - Should the current header value be merged with the new one (e.g. for cookies)
 * @returns A new, modified CloudFront header maps
 */
function setHeader(headers, headerName, headerValue, options = {}) {
    var _a;
    const headerKey = headerName.toLowerCase();
    const previousHeader = options.merge ? (_a = headers[headerKey]) !== null && _a !== void 0 ? _a : [] : [];
    return Object.assign(Object.assign({}, headers), { [headerKey]: [...previousHeader, { key: headerName, value: headerValue }] });
}
/**
 * Retrieve a header value (first if multiple values set) for a passed CloudFront request
 * @param request - CloudFront request
 * @param headerName - Header name to retrieve
 * @returns The first found value of the specified header, if available
 */
function getHeader(request, headerName) {
    var _a, _b, _c;
    return (_c = (_b = (_a = request.headers) === null || _a === void 0 ? void 0 : _a[headerName.toLowerCase()]) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.value;
}
const TRANSLATION_CURSOR_HEADER = 'X-Translation-Cursor';
const TREE_HASH_HEADER = 'X-Tree-Hash';
/**
 * Extract the value of a specific cookie from CloudFront headers map, if present
 * @param headers - CloudFront headers map
 * @param cookieName - The key of the cookie to extract the value for
 * @returns The string value of the cookie if present, otherwise null
 */
function getCookie(headers, cookieName) {
    const cookieHeader = headers.cookie;
    if (!cookieHeader) {
        return null;
    }
    for (const cookieSet of cookieHeader) {
        const cookies = cookieSet.value.split(/; /);
        for (const cookie of cookies) {
            const cookieKeyValue = cookie.split('=');
            if (cookieKeyValue[0] === cookieName) {
                return cookieKeyValue[1];
            }
        }
    }
    return null;
}

;// CONCATENATED MODULE: ./src/viewer-response/viewer-response.ts
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

/**
 * Edge Lambda handler triggered on "viewer-response" event, on the default CF behavior of the web app CF distribution.
 * The default CF behaviour only handles requests for HTML documents and requests for static files (e.g. /, /bills, /settings/accounting etc.)
 *
 * This lambda runs for every request and modifies the response object just before the fetched resource is returned to the user's browser.
 * It's currently used to add various HTTP headers to the responses.
 *
 * We're going via a getHandler method to aid testing with dependency injection
 */
function getHandler(config) {
    const handler = (event) => __awaiter(this, void 0, void 0, function* () {
        let response = event.Records[0].cf.response;
        const request = event.Records[0].cf.request;
        response = addSecurityHeaders(response, config);
        response = addCacheHeader(response);
        response = addRobotsHeader(response, config);
        if (config.isLocalised === 'true') {
            const translationCursor = getHeader(request, TRANSLATION_CURSOR_HEADER);
            const treeHash = getHeader(request, TREE_HASH_HEADER);
            response = setTranslationHashCookie(response, translationCursor);
            if (Boolean(translationCursor)) {
                response = addPreloadHeader(response, request, translationCursor, treeHash);
            }
        }
        return response;
    });
    return handler;
}
/**
 * Handles adding of security-related HTTP headers to the response
 */
const addSecurityHeaders = (response, config) => {
    let headers = response.headers;
    if (config.blockIframes === 'true') {
        // prevent embedding inside an iframe
        headers = setHeader(headers, 'X-Frame-Options', 'DENY');
    }
    // prevent mime type sniffing
    headers = setHeader(headers, 'X-Content-Type-Options', 'nosniff');
    // prevent exposing referer information outside of the origin
    headers = setHeader(headers, 'Referrer-Policy', 'same-origin');
    // prevent rendering of page if XSS attack is detected
    headers = setHeader(headers, 'X-XSS-Protection', '1; mode=block');
    return Object.assign(Object.assign({}, response), { headers });
};
/**
 * Adds cache control HTTP headers to the response to remove any caching
 * Since we're only handling skeleton HTML files in this behaviour, disabling
 * caching has little performance overhead. All static assets are cached aggressively
 * in another behaviour.
 */
const addCacheHeader = (response) => {
    let headers = response.headers;
    headers = setHeader(headers, 'Cache-Control', 'max-age=0,no-cache,no-store,must-revalidate');
    return Object.assign(Object.assign({}, response), { headers });
};
/**
 * Adds robots tag HTTP header to the response to prevent indexing by bots (only in staging)
 */
const addRobotsHeader = (response, config) => {
    let headers = response.headers;
    if (config.blockRobots === 'true') {
        headers = setHeader(headers, 'X-Robots-Tag', 'noindex, nofollow');
    }
    return Object.assign(Object.assign({}, response), { headers });
};
/**
 * Adds cookie 'translation-hash' with value of latest translation cursor
 */
const setTranslationHashCookie = (response, translationCursor) => {
    let headers = response.headers;
    headers = setHeader(headers, 'Set-Cookie', `translation-hash=${translationCursor}`);
    return Object.assign(Object.assign({}, response), { headers });
};
/**
 * Adds preload header for translation file to speed up rendering of the app,
 * since translation file is the required for it.
 * We get the language from the 'x-pleo-language' cookie
 * which is in sync with the user language to preload translation file with the language of the app.
 * But it is possible to override user&app language with the 'lang' url param,
 * since this overriding won't be refltected in the cookie yet, we get the language from this param 'lang'
 * If both, url param & cookie are empty, it means that language is not chosen by any form, which means that the app will be in 'en'
 */
const addPreloadHeader = (response, request, translationCursor, treeHash) => {
    let headers = response.headers;
    const urlParams = new URLSearchParams(request.querystring);
    const language = urlParams.get('lang') || getCookie(request.headers, 'x-pleo-language') || 'en';
    const hash = language === 'en' ? treeHash : translationCursor;
    headers = setHeader(headers, 'Link', `</static/translations/${language}/messages.${hash}.js>; rel="preload"; as="script"`);
    return Object.assign(Object.assign({}, response), { headers });
};

;// CONCATENATED MODULE: ./src/viewer-response/index.ts


const config = getConfig();
const handler = getHandler(config);

module.exports = __webpack_exports__;
/******/ })()
;