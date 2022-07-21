import {
    CloudFrontResponse,
    CloudFrontResponseHandler,
    CloudFrontHeaders,
    CloudFrontRequest
} from 'aws-lambda'
import {Config} from '../config'
import {
    setHeader,
    getHeader,
    TRANSLATION_CURSOR_HEADER,
    DEFAULT_TRANSLATION_CURSOR,
    TREE_HASH_HEADER
} from '../utils'

/**
 * Edge Lambda handler triggered on "viewer-response" event, on the default CF behavior of the web app CF distribution.
 * The default CF behaviour only handles requests for HTML documents and requests for static files (e.g. /, /bills, /settings/accounting etc.)
 *
 * This lambda runs for every request and modifies the response object just before the fetched resource is returned to the user's browser.
 * It's currently used to add various HTTP headers to the responses.
 *
 * We're going via a getHandler method to aid testing with dependency injection
 */
export function getHandler(config: Config) {
    const handler: CloudFrontResponseHandler = async (event) => {
        let response = event.Records[0].cf.response
        const request = event.Records[0].cf.request

        const translationCursor =
            getHeader(request, TRANSLATION_CURSOR_HEADER) || DEFAULT_TRANSLATION_CURSOR

        const treeHash = getHeader(request, TREE_HASH_HEADER)

        response = addSecurityHeaders(response, config)
        response = addCacheHeader(response)
        response = addRobotsHeader(response, config)
        response = addCookieHeader(response, translationCursor)
        if (translationCursor !== DEFAULT_TRANSLATION_CURSOR) {
            response = addPreloadHeader(response, request, translationCursor, treeHash)
        }

        return response
    }
    return handler
}

/**
 * Handles adding of security-related HTTP headers to the response
 */
export const addSecurityHeaders = (response: CloudFrontResponse, config: Config) => {
    let headers = response.headers

    if (config.blockIframes === 'true') {
        // prevent embedding inside an iframe
        headers = setHeader(headers, 'X-Frame-Options', 'DENY')
    }

    // prevent mime type sniffing
    headers = setHeader(headers, 'X-Content-Type-Options', 'nosniff')

    // prevent exposing referer information outside of the origin
    headers = setHeader(headers, 'Referrer-Policy', 'same-origin')

    // prevent rendering of page if XSS attack is detected
    headers = setHeader(headers, 'X-XSS-Protection', '1; mode=block')

    return {...response, headers}
}

/**
 * Adds cache control HTTP headers to the response to remove any caching
 * Since we're only handling skeleton HTML files in this behaviour, disabling
 * caching has little performance overhead. All static assets are cached aggressively
 * in another behaviour.
 */
export const addCacheHeader = (response: CloudFrontResponse) => {
    let headers = response.headers
    headers = setHeader(headers, 'Cache-Control', 'max-age=0,no-cache,no-store,must-revalidate')
    return {...response, headers}
}

/**
 * Adds robots tag HTTP header to the response to prevent indexing by bots (only in staging)
 */
export const addRobotsHeader = (response: CloudFrontResponse, config: Config) => {
    let headers = response.headers

    if (config.blockRobots === 'true') {
        headers = setHeader(headers, 'X-Robots-Tag', 'noindex, nofollow')
    }

    return {...response, headers}
}

/**
 * Adds cookie 'translation-hash' with value of latest translation cursor
 */
export const addCookieHeader = (response: CloudFrontResponse, translationCursor: string) => {
    let headers = response.headers

    headers = setHeader(headers, 'Set-Cookie', `translation-hash=${translationCursor}`)

    return {...response, headers}
}

/**
 * Adds preload header for translation file to speed up rendering of the app,
 * since translation file is the required for it.
 * We get the language from the 'x-pleo-language' cookie
 * which is in sync with the user language to preload translation file with the language of the app.
 * But it is possible to override user&app language with the 'lang' url param,
 * since this overriding won't be refltected in the cookie yet, we get the language from this param 'lang'
 * If both, url param & cookie are empty, it means that language is not chosen by any form, which means that the app will be in 'en'
 */
export const addPreloadHeader = (
    response: CloudFrontResponse,
    request: CloudFrontRequest,
    translationCursor: string,
    treeHash: string
) => {
    let headers = response.headers
    const urlParams = new URLSearchParams(request.querystring)
    const language = urlParams.get('lang') || getCookie(request.headers, 'x-pleo-language') || 'en'
    const hash = language === 'en' ? treeHash : translationCursor

    headers = setHeader(
        headers,
        'Link',
        `</static/translations/${language}/messages.${hash}.js>; rel="preload"; as="script"`
    )

    return {...response, headers}
}

/**
 * Extract the value of a specific cookie from CloudFront headers map, if present
 * @param headers - CloudFront headers map
 * @param cookieName - The key of the cookie to extract the value for
 * @returns The string value of the cookie if present, otherwise null
 */
export function getCookie(headers: CloudFrontHeaders, cookieName: string) {
    const cookieHeader = headers.cookie

    if (!cookieHeader) {
        return null
    }

    for (const cookieSet of cookieHeader) {
        const cookies = cookieSet.value.split(/; /)

        for (const cookie of cookies) {
            const cookieKeyValue = cookie.split('=')

            if (cookieKeyValue[0] === cookieName) {
                return cookieKeyValue[1]
            }
        }
    }

    return null
}
