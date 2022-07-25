import {CloudFrontHeaders, CloudFrontRequest} from 'aws-lambda'

/**
 * Appends a custom header to a passed CloudFront header map
 * @param headers - CloudFront headers map
 * @param headerName - Custom header name
 * @param headerValue - Custom header value
 * @param options.merge - Should the current header value be merged with the new one (e.g. for cookies)
 * @returns A new, modified CloudFront header maps
 */
export function setHeader(
    headers: CloudFrontHeaders,
    headerName: string,
    headerValue: string,
    options: {merge?: boolean} = {}
): CloudFrontHeaders {
    const headerKey = headerName.toLowerCase()
    const previousHeader = options.merge ? headers[headerKey] ?? [] : []
    return {
        ...headers,
        [headerKey]: [...previousHeader, {key: headerName, value: headerValue}]
    }
}

/**
 * Retrieve a header value (first if multiple values set) for a passed CloudFront request
 * @param request - CloudFront request
 * @param headerName - Header name to retrieve
 * @returns The first found value of the specified header, if available
 */
export function getHeader(request: CloudFrontRequest, headerName: string): string | undefined {
    return request.headers?.[headerName.toLowerCase()]?.[0]?.value
}

export const TRANSLATION_CURSOR_HEADER = 'X-Translation-Cursor'
export const TREE_HASH_HEADER = 'X-Tree-Hash'

// If something goes wrong in any of the step for retrieving latest translation cursor, the value will be defaulted to 'default'
// If translation cursor is 'default', on the client side only english will available and messages will be get from the file deployed during app deploy
export const DEFAULT_TRANSLATION_CURSOR = 'default'

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
