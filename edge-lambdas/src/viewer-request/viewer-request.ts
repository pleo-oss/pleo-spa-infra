import * as path from 'path'

import {CloudFrontRequest, CloudFrontRequestHandler} from 'aws-lambda'
import S3 from 'aws-sdk/clients/s3'

import {getHeader, setHeader, TRANSLATION_CURSOR_HEADER, TREE_HASH_HEADER} from '../utils'
import {Config} from '../config'

const DEFAULT_BRANCH_DEFAULT_NAME = 'master'

/**
 * Edge Lambda handler triggered on "viewer-request" event, on the default CF behavior of the web app CF distribution.
 * The default CF behaviour only handles requests for HTML documents and requests for static files (e.g. /, /bills, /settings/accounting etc.)
 * Since our app is client side routed, all these requests return the same HTML index file.
 *
 * This lambda runs for every request and modifies the request object before it's used to fetch the resource from the origin (S3 bucket).
 * It calculates which HTML file the request should respond with based on the host name specified by the request, and sets that file as the URI of the request.
 * The options are:
 * - HTML for latest tree hash on the main branch - e.g. app.staging.example.com and app.example.com
 * - HTML for latest tree hash on a feature branch (branch preview deployment) - e.g. my-branch.staging.example.com
 * - HTML for a specific tree hash (hash preview deployment) - e.g. preview-b104213fc39ecca4f237a7bd6544d428ad46ec7e.app.staging.example.com
 */
export function getHandler(config: Config, s3: S3) {
    const handler: CloudFrontRequestHandler = async (event) => {
        const request = event.Records[0].cf.request

        try {
            // Get tree hash and translation cursor in parralel to avoid the double network penalty
            const [treeHash, translationCursor] = await Promise.all(
                [
                    getTreeHash(request, config, s3),
                    config.isLocalised === 'true'
                        ? fetchDeploymentTranslationHash(s3, config)
                        : undefined
                ].filter((val) => Boolean(val))
            )

            const uri = getUri(request, treeHash)

            // We instruct the CDN to return a file that corresponds to the tree hash requested
            request.uri = uri

            if (config.isLocalised === 'true') {
                request.headers = setHeader(
                    request.headers,
                    TRANSLATION_CURSOR_HEADER,
                    translationCursor
                )

                request.headers = setHeader(request.headers, TREE_HASH_HEADER, treeHash)
            }
        } catch (e) {
            console.error(e)
            // On failure, we're requesting a non-existent file on purpose, to allow CF to serve
            // the configured custom error page
            request.uri = '/404'
        }

        return request
    }

    return handler
}

// We respond with a requested file, but prefix it with the hash of the current active deployment
function getUri(request: CloudFrontRequest, treeHash: string) {
    // If the
    // - request uri is for a specific file (e.g. "/iframe.html")
    // - or is a request on one of the .well-known paths (like .well-known/apple-app-site-association)
    // we serve the requested file.
    // Otherwise, for requests uris like "/" or "my-page" we serve the top-level index.html file,
    // which assumes the routing is handled client-side.
    const isFileRequest = request.uri.split('/').pop().includes('.')
    const isWellKnownRequest = request.uri.startsWith('/.well-known/')
    const filePath = isFileRequest || isWellKnownRequest ? request.uri : '/index.html'

    return path.join('/html', treeHash, filePath)
}

// We use repository tree hash to identify the version of the HTML served.
// It can be either a specific tree hash requested via preview link with a hash, or the latest
// tree hash for a branch requested (preview or main), which we fetch from cursor files stored in S3
async function getTreeHash(request: CloudFrontRequest, config: Config, s3: S3) {
    const host = getHeader(request, 'host')

    if (!host) {
        throw new Error('Missing Host header')
    }

    // Preview name is the first segment of the url e.g. my-branch for my-branch.app.staging.example.com
    // Preview name is either a sanitized branch name or it follows the preview-[treeHash] pattern
    let previewName

    if (config.previewDeploymentPostfix && host.includes(config.previewDeploymentPostfix)) {
        previewName = host.split('.')[0]

        // If the request is for a specific tree hash preview deployment, we use that hash
        const previewHash = getPreviewHash(previewName)
        if (previewHash) {
            return previewHash
        }
    }

    const defaultBranchName = config.defaultBranchName ?? DEFAULT_BRANCH_DEFAULT_NAME

    // Otherwise we fetch the current tree hash for requested branch from S3
    const branchName = previewName || defaultBranchName
    return fetchDeploymentTreeHash(branchName, config, s3)
}

// We serve a preview for each repo tree hash at e.g.preview-[treeHash].app.staging.example.com
// If the preview name matches that pattern, we assume it's a tree hash preview
function getPreviewHash(previewName?: string) {
    const matchHash = /^preview-(?<hash>[a-z0-9]{40})$/.exec(previewName || '')
    return matchHash?.groups?.hash
}

/**
 * Fetches a file from the S3 origin bucket and returns its content
 * @param key key for the S3 bucket
 * @param onEmpty function will be called if file doesn't exist
 * @param config config object
 * @param s3 S3 instance
 * @returns content of the file
 */
async function fetchFileFromOriginBucket(key: string, config: Config, s3: S3) {
    const s3Params = {
        Bucket: config.originBucketName,
        Key: key
    }
    const response = await s3.getObject(s3Params).promise()
    if (!response.Body) {
        throw new Error()
    }

    return response.Body.toString('utf-8').trim()
}

/**
 * Fetches a cursor deploy file from the S3 bucket and returns its content (i.e. the current active tree hash
 * for that branch).
 */
async function fetchDeploymentTreeHash(branch: string, config: Config, s3: S3) {
    try {
        const response = await fetchFileFromOriginBucket(`deploys/${branch}`, config, s3)
        return response
    } catch {
        throw new Error(`Cursor file not found for branch=${branch}`)
    }
}

// Get the latest translation cursor file from S3 bucket
export const fetchDeploymentTranslationHash = async (s3: S3, config: Config) => {
    try {
        const response = await fetchFileFromOriginBucket(`translation-deploy/latest`, config, s3)
        return response
    } catch {
        throw new Error(`Latest translation cursor file not found`)
    }
}
