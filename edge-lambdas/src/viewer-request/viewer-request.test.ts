import {CloudFrontRequestEvent} from 'aws-lambda'
import S3 from 'aws-sdk/clients/s3'
import {DEFAULT_TRANSLATION_CURSOR} from '../utils'
import {getHandler} from './viewer-request'

jest.mock('aws-sdk/clients/s3', () => jest.fn().mockReturnValue({getObject: jest.fn()}))
const MockedS3 = S3 as jest.MockedClass<typeof S3>

beforeEach(() => jest.resetAllMocks())

describe(`Viewer request Lambda@Edge`, () => {
    test(`
        When requesting app.example.com
        it modifies the request to fetch the latest master branch HTML
    `, async () => {
        const treeHash = '3b6197b16baa26057a25fcd5d60a64c4c0765d18'
        const translationHash = '123456'
        const s3 = mockGetObject(treeHash, translationHash)

        const handler = getHandler(
            {
                originBucketName: 'test-origin-bucket-prod',
                originBucketRegion: 'eu-west-1'
            },
            s3
        )
        const event = mockRequestEvent({
            host: 'app.example.com',
            translationHash,
            treeHash
        })

        const response = await handler(event, {} as any, () => {})

        expect(s3.getObject).toHaveBeenCalledTimes(2)

        expect(s3.getObject).toHaveBeenCalledWith({
            Bucket: 'test-origin-bucket-prod',
            Key: `deploys/master`
        })

        expect(s3.getObject).toHaveBeenLastCalledWith({
            Bucket: 'test-origin-bucket-prod',
            Key: 'translation-deploy/latest'
        })

        expect(response).toEqual(
            requestFromEvent(
                mockRequestEvent({
                    host: 'app.example.com',
                    translationHash,
                    treeHash,
                    uri: `/html/${treeHash}/index.html`
                })
            )
        )
    })

    test(`
        When requesting app.example.com
        and a custom default branch name is configured
        it modifies the request to fetch the latest default branch HTML
    `, async () => {
        const treeHash = '3b6197b16baa26057a25fcd5d60a64c4c0765d18'
        const translationHash = '123456'
        const s3 = mockGetObject(treeHash, translationHash)

        const handler = getHandler(
            {
                originBucketName: 'test-origin-bucket-prod',
                originBucketRegion: 'eu-west-1',
                defaultBranchName: 'main'
            },
            s3
        )
        const event = mockRequestEvent({
            host: 'app.example.com',
            translationHash,
            treeHash
        })

        const response = await handler(event, {} as any, () => {})

        expect(s3.getObject).toHaveBeenCalledTimes(2)

        expect(s3.getObject).toHaveBeenCalledWith({
            Bucket: 'test-origin-bucket-prod',
            Key: `deploys/main`
        })

        expect(s3.getObject).toHaveBeenLastCalledWith({
            Bucket: 'test-origin-bucket-prod',
            Key: 'translation-deploy/latest'
        })

        expect(response).toEqual(
            requestFromEvent(
                mockRequestEvent({
                    host: 'app.example.com',
                    translationHash,
                    treeHash,
                    uri: `/html/${treeHash}/index.html`
                })
            )
        )
    })

    test(`
        When requesting app.staging.example.com
        and preview deployment postfix is set
        it modifies the request to fetch the latest default branch HTML
    `, async () => {
        const treeHash = '75703e9524292bfa57c259e0621c3ed6b53bfcf2'
        const translationHash = '123456'
        const s3 = mockGetObject(treeHash, translationHash)
        const handler = getHandler(
            {
                originBucketName: 'test-origin-bucket-staging',
                originBucketRegion: 'eu-west-1',
                previewDeploymentPostfix: '.app.staging.example.com'
            },
            s3
        )
        const event = mockRequestEvent({
            host: 'app.staging.example.com',
            translationHash,
            treeHash
        })

        const response = await handler(event, {} as any, () => {})

        expect(s3.getObject).toHaveBeenCalledTimes(2)

        expect(s3.getObject).toHaveBeenCalledWith({
            Bucket: 'test-origin-bucket-staging',
            Key: `deploys/master`
        })

        expect(s3.getObject).toHaveBeenLastCalledWith({
            Bucket: 'test-origin-bucket-staging',
            Key: 'translation-deploy/latest'
        })

        expect(response).toEqual(
            requestFromEvent(
                mockRequestEvent({
                    host: 'app.staging.example.com',
                    translationHash,
                    treeHash,
                    uri: `/html/${treeHash}/index.html`
                })
            )
        )
    })

    test(`
        When requesting e.g. my-feature.app.staging.example.com
        it modifies the request to fetch the latest HTML for my-feature branch
    `, async () => {
        const treeHash = '75703e9524292bfa57c259e0621c3ed6b53bfcf2'
        const translationHash = '123456'
        const s3 = mockGetObject(treeHash, translationHash)

        const handler = getHandler(
            {
                originBucketName: 'test-origin-bucket-staging',
                originBucketRegion: 'eu-west-1',
                previewDeploymentPostfix: '.app.staging.example.com'
            },
            s3
        )
        const event = mockRequestEvent({
            host: 'my-feature.app.staging.example.com',
            translationHash,
            treeHash
        })

        const response = await handler(event, {} as any, () => {})

        expect(s3.getObject).toHaveBeenCalledTimes(2)

        expect(s3.getObject).toHaveBeenCalledWith({
            Bucket: 'test-origin-bucket-staging',
            Key: `deploys/my-feature`
        })

        expect(s3.getObject).toHaveBeenLastCalledWith({
            Bucket: 'test-origin-bucket-staging',
            Key: 'translation-deploy/latest'
        })

        expect(response).toEqual(
            requestFromEvent(
                mockRequestEvent({
                    host: 'my-feature.app.staging.example.com',
                    translationHash,
                    treeHash,
                    uri: `/html/${treeHash}/index.html`
                })
            )
        )
    })

    test(`Handles requests for specific html files`, async () => {
        const treeHash = 'ce4a66492551f1cd2fad5296ee94b8ea2667eac3'
        const translationHash = '123456'
        const s3 = mockGetObject(treeHash, translationHash)
        const handler = getHandler(
            {
                originBucketName: 'test-origin-bucket-staging',
                originBucketRegion: 'eu-west-1',
                previewDeploymentPostfix: '.app.staging.example.com'
            },
            s3
        )
        const event = mockRequestEvent({
            host: 'my-feature.app.staging.example.com',
            translationHash,
            treeHash,
            uri: '/iframe.html'
        })

        const response = await handler(event, {} as any, () => {})

        expect(s3.getObject).toHaveBeenCalledTimes(2)

        expect(s3.getObject).toHaveBeenCalledWith({
            Bucket: 'test-origin-bucket-staging',
            Key: `deploys/my-feature`
        })

        expect(s3.getObject).toHaveBeenLastCalledWith({
            Bucket: 'test-origin-bucket-staging',
            Key: 'translation-deploy/latest'
        })

        expect(response).toEqual(
            requestFromEvent(
                mockRequestEvent({
                    host: 'my-feature.app.staging.example.com',
                    translationHash,
                    treeHash,
                    uri: `/html/${treeHash}/iframe.html`
                })
            )
        )
    })

    test(`Handles requests for well known files`, async () => {
        const treeHash = 'ce4a66492551f1cd2fad5296ee94b8ea2667eac3'
        const translationHash = '123456'
        const s3 = mockGetObject(treeHash, translationHash)
        const handler = getHandler(
            {
                originBucketName: 'test-origin-bucket-staging',
                originBucketRegion: 'eu-west-1',
                previewDeploymentPostfix: '.app.staging.example.com'
            },
            s3
        )
        const event = mockRequestEvent({
            host: 'my-feature.app.staging.example.com',
            treeHash,
            translationHash,
            uri: '/.well-known/apple-app-site-association'
        })

        const response = await handler(event, {} as any, () => {})

        expect(s3.getObject).toHaveBeenCalledTimes(2)

        expect(s3.getObject).toHaveBeenCalledWith({
            Bucket: 'test-origin-bucket-staging',
            Key: `deploys/my-feature`
        })

        expect(s3.getObject).toHaveBeenLastCalledWith({
            Bucket: 'test-origin-bucket-staging',
            Key: 'translation-deploy/latest'
        })

        expect(response).toEqual(
            requestFromEvent(
                mockRequestEvent({
                    host: 'my-feature.app.staging.example.com',
                    treeHash,
                    translationHash,
                    uri: `/html/${treeHash}/.well-known/apple-app-site-association`
                })
            )
        )
    })

    test(`
        When requesting a specific version i.e. preview-{treeHash}.app.staging.example.com
        it modifies the request to fetch the HTML for that tree hash
    `, async () => {
        const treeHash = 'treebe8eaa4f0bb422d1c171769f674c5a1dd1c'
        const requestedTreeHash = 'reques72715537da0ee129412de8df6bc1287500'
        const translationHash = '123456'
        const s3 = new MockedS3()

        s3.getObject = jest.fn().mockReturnValue({
            promise: jest.fn().mockReturnValueOnce({Body: translationHash})
        })
        const handler = getHandler(
            {
                originBucketName: 'test-origin-bucket-staging',
                originBucketRegion: 'eu-west-1',
                previewDeploymentPostfix: '.app.staging.example.com'
            },
            s3
        )

        const event = mockRequestEvent({
            host: `preview-${requestedTreeHash}.app.staging.example.com`,
            translationHash,
            treeHash
        })

        const response = await handler(event, {} as any, () => {})
        console.log(event['Records'][0]['cf']['request']['headers'])
        expect(s3.getObject).toHaveBeenCalledTimes(1)

        expect(s3.getObject).toHaveBeenCalledWith({
            Bucket: 'test-origin-bucket-staging',
            Key: 'translation-deploy/latest'
        })
        expect(response).toEqual(
            requestFromEvent(
                mockRequestEvent({
                    host: `preview-${requestedTreeHash}.app.staging.example.com`,
                    translationHash,
                    treeHash: requestedTreeHash,
                    uri: `/html/${requestedTreeHash}/index.html`
                })
            )
        )
    })

    test(`
        When requesting a preview of an unknown branch,
        it requests the non-existing file to trigger a 404 error
    `, async () => {
        const treeHash = 'treebe8eaa4f0bb422d1c171769f674c5a1dd1c'
        const translationHash = '123456'
        const s3 = new MockedS3()
        s3.getObject = jest.fn().mockReturnValue({
            promise: jest
                .fn()
                .mockReturnValueOnce(new Error('network error, yo'))
                .mockReturnValueOnce({Body: translationHash})
        })
        jest.spyOn(console, 'error').mockImplementation(() => {})

        const handler = getHandler(
            {
                originBucketName: 'test-origin-bucket-staging',
                originBucketRegion: 'eu-west-1',
                previewDeploymentPostfix: '.app.staging.example.com'
            },
            s3
        )
        const event = mockRequestEvent({
            host: 'what-is-this-branch.app.staging.example.com',
            treeHash,
            translationHash
        })

        const response = await handler(event, {} as any, () => {})

        expect(s3.getObject).toHaveBeenCalledTimes(2)

        expect(s3.getObject).toHaveBeenCalledWith({
            Bucket: 'test-origin-bucket-staging',
            Key: `deploys/what-is-this-branch`
        })

        expect(s3.getObject).toHaveBeenLastCalledWith({
            Bucket: 'test-origin-bucket-staging',
            Key: 'translation-deploy/latest'
        })

        expect(response).toEqual(
            requestFromEvent(
                mockRequestEvent({
                    host: `what-is-this-branch.app.staging.example.com`,
                    uri: `/404`,
                    treeHash,
                    translationHash
                })
            )
        )
        expect(console.error).toHaveBeenCalledTimes(1)
    })

    test(`
        When receive an error for the request getting translation hash,
        translation hash value is defauted to the 'default' value
    `, async () => {
        const treeHash = 'treebe8eaa4f0bb422d1c171769f674c5a1dd1c'
        const translationHash = '123456'
        const s3 = new MockedS3()
        s3.getObject = jest.fn().mockReturnValue({
            promise: jest
                .fn()
                .mockReturnValueOnce({Body: treeHash})
                .mockReturnValueOnce(new Error('network error, yo'))
        })
        jest.spyOn(console, 'error').mockImplementation(() => {})

        const handler = getHandler(
            {
                originBucketName: 'test-origin-bucket-prod',
                originBucketRegion: 'eu-west-1'
            },
            s3
        )
        const event = mockRequestEvent({
            host: 'app.example.com',
            translationHash,
            treeHash
        })

        const response = await handler(event, {} as any, () => {})

        expect(s3.getObject).toHaveBeenCalledTimes(2)

        expect(s3.getObject).toHaveBeenCalledWith({
            Bucket: 'test-origin-bucket-prod',
            Key: `deploys/master`
        })

        expect(s3.getObject).toHaveBeenLastCalledWith({
            Bucket: 'test-origin-bucket-prod',
            Key: 'translation-deploy/latest'
        })

        expect(response).toEqual(
            requestFromEvent(
                mockRequestEvent({
                    host: 'app.example.com',
                    translationHash: DEFAULT_TRANSLATION_CURSOR,
                    treeHash,
                    uri: `/html/${treeHash}/index.html`
                })
            )
        )
        expect(console.error).toHaveBeenCalledTimes(1)
    })
})

// const mockGetObject = (returnValue: string) => {
//     const s3 = new MockedS3()
//     s3.getObject = jest.fn().mockReturnValue({
//         promise: jest.fn().mockReturnValue({Body: returnValue})
//     })
//     return s3
// }

const mockGetObject = (firstValue: string, secondValue) => {
    const s3 = new MockedS3()
    s3.getObject = jest.fn().mockReturnValue({
        promise: jest
            .fn()
            .mockReturnValueOnce({Body: firstValue})
            .mockReturnValueOnce({Body: secondValue})
    })
    return s3
}

// Returns a mock Cloudfront viewer request event with the specified host and URI. See
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html#example-viewer-request for
// more info on the shape of the request events for Edge Lambdas
const mockRequestEvent = ({
    host,
    translationHash,
    treeHash,
    uri = '/'
}: {
    host: string
    treeHash: string
    translationHash: string
    uri?: string
}): CloudFrontRequestEvent => ({
    Records: [
        {
            cf: {
                config: {
                    distributionDomainName: 'd111111abcdef8.cloudfront.net',
                    distributionId: 'EDFDVBD6EXAMPLE',
                    eventType: 'viewer-request' as const,
                    requestId: '4TyzHTaYWb1GX1qTfsHhEqV6HUDd_BzoBZnwfnvQc_1oF26ClkoUSEQ=='
                },
                request: {
                    clientIp: '203.0.113.178',
                    headers: {
                        host: [
                            {
                                key: 'Host',
                                value: host
                            }
                        ],
                        'user-agent': [
                            {
                                key: 'User-Agent',
                                value: 'curl/7.66.0'
                            }
                        ],
                        accept: [
                            {
                                key: 'accept',
                                value: '*/*'
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
                                key: 'X-Tree-Hash',
                                value: treeHash
                            }
                        ]
                    },
                    method: 'GET',
                    querystring: '',
                    uri
                }
            }
        }
    ]
})

const requestFromEvent = (event: CloudFrontRequestEvent) => event.Records[0].cf.request
