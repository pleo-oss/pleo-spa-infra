import {
    CloudFrontResponse,
    CloudFrontResponseHandler,
    CloudFrontHeaders,
    CloudFrontRequest
} from 'aws-lambda'
import {Config} from '../config'
import {setHeader, getHeader, TRANSLATION_CURSOR_HEADER} from '../utils'

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

        console.log('response', response)
        console.log('request', request)
        const translationCursor = getHeader(request, TRANSLATION_CURSOR_HEADER) || 'default'
        console.log('translationCursor', translationCursor)

        response = addSecurityHeaders(response, config)
        response = addCacheHeader(response)
        response = addRobotsHeader(response, config)
        response = addCookieHeaders(response, translationCursor)
        response = addPreloadHeaders(response, request, translationCursor)

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

    if (config.environment === 'staging') {
        headers = setHeader(headers, 'X-Robots-Tag', 'noindex, nofollow')
    }

    return {...response, headers}
}

/**
 * Adds cookie HTTP header to the response to prevent indexing by bots (only in staging)
 */
export const addCookieHeaders = (response: CloudFrontResponse, translationCursor: string) => {
    let headers = response.headers

    headers = setHeader(headers, 'Set-Cookie', `translation-hash=${translationCursor}`)

    return {...response, headers}
}

/**
 * Adds cookie HTTP header to the response to prevent indexing by bots (only in staging)
 */
export const addPreloadHeaders = (
    response: CloudFrontResponse,
    request: CloudFrontRequest,
    translationCursor: string
) => {
    let headers = response.headers
    const urlParams = new URLSearchParams(request.querystring)
    const language = urlParams.get('lang') || extractCookie(request.headers, 'x-pleo-language')
    console.log('language', language)
    headers = setHeader(
        headers,
        'Link',
        ` </static/translations/${language}/messages.${translationCursor}.js>; rel="preload"; as="script"`
    )

    return {...response, headers}
}

const extractCookie = (headers: CloudFrontHeaders, cname: string) => {
    const cookies = headers['cookie']
    if (!cookies) {
        console.log("extract_cookie(): no 'Cookie:' headers in request")
        return null
    }

    for (let n = cookies.length; n--; ) {
        const cval = cookies[n].value.split(/;\ /)
        const vlen = cval.length

        for (var m = vlen; m--; ) {
            const cookie_kv = cval[m].split('=')
            if (cookie_kv[0] === cname) {
                return cookie_kv[1]
            }
        }
    }

    return null
}
