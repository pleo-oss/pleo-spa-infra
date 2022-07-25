import {CloudFrontResponseEvent} from 'aws-lambda'
import {getHandler} from './viewer-response'

describe(`Viewer response Lambda@Edge`, () => {
    test(`Adds security and cache control custom headers to a response object for prod`, async () => {
        const handler = getHandler({
            originBucketName: 'test-cursor-bucket-prod',
            originBucketRegion: 'eu-west-1'
        })

        const event = mockResponseEvent({host: 'app.example.com'})
        expect(await handler(event, {} as any, () => {})).toEqual({
            headers: {
                ...securityHeaders,
                ...cacheControlHeaders,
                ...defaultHeaders,
                ...getHeaderBasedOnHash()
            },
            status: '200',
            statusDescription: 'OK'
        })
    })

    test(`Adds robots custom headers to a response object if configured`, async () => {
        const handler = getHandler({
            originBucketName: 'test-origin-bucket-staging',
            originBucketRegion: 'eu-west-1',
            previewDeploymentPostfix: '.app.staging.example.com',
            blockRobots: 'true'
        })

        const event = mockResponseEvent({host: 'app.staging.example.com'})

        expect(await handler(event, {} as any, () => {})).toEqual({
            headers: {
                ...securityHeaders,
                ...defaultHeaders,
                ...cacheControlHeaders,
                ...getHeaderBasedOnHash(),
                'x-robots-tag': [{key: 'X-Robots-Tag', value: 'noindex, nofollow'}]
            },
            status: '200',
            statusDescription: 'OK'
        })
    })

    test(`Adds security with frame blocking custom header to a response if configured`, async () => {
        const handler = getHandler({
            originBucketName: 'test-origin-bucket',
            originBucketRegion: 'eu-west-1',
            previewDeploymentPostfix: '.app.example.com',
            blockIframes: 'true'
        })

        const event = mockResponseEvent({host: 'app.staging.example.com'})

        expect(await handler(event, {} as any, () => {})).toEqual({
            headers: {
                ...securityHeaders,
                'x-frame-options': [{key: 'X-Frame-Options', value: 'DENY'}],
                ...defaultHeaders,
                ...cacheControlHeaders,
                ...getHeaderBasedOnHash()
            },
            status: '200',
            statusDescription: 'OK'
        })
    })

    test(`Add preload headers and update hash value for 'translation-hash' cookie`, async () => {
        const hash = '123123'
        const handler = getHandler({
            originBucketName: 'test-origin-bucket',
            originBucketRegion: 'eu-west-1',
            previewDeploymentPostfix: '.app.example.com',
            blockIframes: 'true'
        })

        const event = mockResponseEvent({host: 'app.staging.example.com', hash})

        expect(await handler(event, {} as any, () => {})).toEqual({
            headers: {
                ...securityHeaders,
                'x-frame-options': [{key: 'X-Frame-Options', value: 'DENY'}],
                ...defaultHeaders,
                ...cacheControlHeaders,
                ...getHeaderBasedOnHash(hash)
            },
            status: '200',
            statusDescription: 'OK'
        })
    })

    test(`Add preload headers and update hash value from tree hash for en instead of 'translation-hash'`, async () => {
        const hash = '123123'
        const translationHash = '456456'
        const handler = getHandler({
            originBucketName: 'test-origin-bucket',
            originBucketRegion: 'eu-west-1',
            previewDeploymentPostfix: '.app.example.com',
            blockIframes: 'true'
        })

        const event = mockResponseEvent({host: 'app.staging.example.com', hash, translationHash})

        expect(await handler(event, {} as any, () => {})).toEqual({
            headers: {
                ...securityHeaders,
                'x-frame-options': [{key: 'X-Frame-Options', value: 'DENY'}],
                ...defaultHeaders,
                ...cacheControlHeaders,
                ...getHeaderBasedOnHash(hash, translationHash)
            },
            status: '200',
            statusDescription: 'OK'
        })
    })

    test(`Add preload headers and update hash value for 'translation-hash' cookie with da language from cookie 'x-pleo-language'`, async () => {
        const hash = '123123'
        const handler = getHandler({
            originBucketName: 'test-origin-bucket',
            originBucketRegion: 'eu-west-1',
            previewDeploymentPostfix: '.app.example.com',
            blockIframes: 'true'
        })

        const event = mockResponseEvent({host: 'app.staging.example.com', hash, language: 'da'})

        expect(await handler(event, {} as any, () => {})).toEqual({
            headers: {
                ...securityHeaders,
                'x-frame-options': [{key: 'X-Frame-Options', value: 'DENY'}],
                ...defaultHeaders,
                ...cacheControlHeaders,
                ...getHeaderBasedOnHash(hash, hash, 'da')
            },
            status: '200',
            statusDescription: 'OK'
        })
    })

    test(`Add preload headers and update hash value for 'translation-hash' cookie with da language from url param 'lang'`, async () => {
        const hash = '123123'
        const handler = getHandler({
            originBucketName: 'test-origin-bucket',
            originBucketRegion: 'eu-west-1',
            previewDeploymentPostfix: '.app.example.com',
            blockIframes: 'true'
        })

        const event = mockResponseEvent({
            host: 'app.staging.example.com',
            hash,
            language: 'da',
            isCookieForLanguage: false
        })

        expect(await handler(event, {} as any, () => {})).toEqual({
            headers: {
                ...securityHeaders,
                'x-frame-options': [{key: 'X-Frame-Options', value: 'DENY'}],
                ...defaultHeaders,
                ...cacheControlHeaders,
                ...getHeaderBasedOnHash(hash, hash, 'da')
            },
            status: '200',
            statusDescription: 'OK'
        })
    })
})

const defaultHeaders = {
    'last-modified': [{key: 'Last-Modified', value: '2016-11-25'}],
    'x-amz-meta-last-modified': [{key: 'X-Amz-Meta-Last-Modified', value: '2016-01-01'}]
}

const securityHeaders = {
    'x-content-type-options': [{key: 'X-Content-Type-Options', value: 'nosniff'}],
    'referrer-policy': [{key: 'Referrer-Policy', value: 'same-origin'}],
    'x-xss-protection': [{key: 'X-XSS-Protection', value: '1; mode=block'}]
}

const cacheControlHeaders = {
    'cache-control': [
        {
            key: 'Cache-Control',
            value: 'max-age=0,no-cache,no-store,must-revalidate'
        }
    ]
}

const getHeaderBasedOnHash = (hash = undefined, translationHash = hash, language = 'en') => {
    return {
        'set-cookie': [
            {
                key: 'Set-Cookie',
                value: `translation-hash=${translationHash}`
            }
        ],
        link: Boolean(hash)
            ? [
                  {
                      key: 'Link',
                      value: `</static/translations/${language}/messages.${hash}.js>; rel="preload"; as="script"`
                  }
              ]
            : undefined
    }
}

// Returns a mock Cloudfront viewer response event with the specified host and URI. See
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html#lambda-event-structure-response-viewer for
// more info on the shape of the response events for Edge Lambdas
export const mockResponseEvent = ({
    host,
    hash,
    translationHash = hash,
    uri = '/',
    language,
    isCookieForLanguage = true
}: {
    host: string
    hash?: string
    translationHash?: string
    uri?: string
    language?: string
    isCookieForLanguage?: boolean
}): CloudFrontResponseEvent => ({
    Records: [
        {
            cf: {
                config: {
                    distributionDomainName: 'd111111abcdef8.cloudfront.net',
                    distributionId: 'EDFDVBD6EXAMPLE',
                    eventType: 'viewer-response' as const,
                    requestId: '4TyzHTaYWb1GX1qTfsHhEqV6HUDd_BzoBZnwfnvQc_1oF26ClkoUSEQ=='
                },
                request: {
                    uri,
                    headers: {
                        host: [
                            {
                                key: 'Host',
                                value: host
                            }
                        ],
                        'x-translation-cursor': [
                            {
                                key: 'X-Translation-Cursor',
                                value: translationHash
                            }
                        ],
                        'x-tree-hash': [
                            {
                                key: 'X-Translation-Cursor',
                                value: hash
                            }
                        ],
                        cookie:
                            language && isCookieForLanguage
                                ? [
                                      {
                                          key: 'Cookie',
                                          value: `x-pleo-language=${language}`
                                      }
                                  ]
                                : undefined
                    },
                    querystring: language && !isCookieForLanguage ? `?lang=${language}` : '',
                    clientIp: '203.0.113.178',
                    method: 'GET'
                },
                response: {
                    status: '200',
                    statusDescription: 'OK',
                    headers: defaultHeaders
                }
            }
        }
    ]
})
