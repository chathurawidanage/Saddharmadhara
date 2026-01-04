import { getPayload } from 'payload'
import config from '../payload.config'
import axios from 'axios'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { JSDOM } from 'jsdom'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

interface InfoLog {
    type: 'info';
    message: string;
}

interface ErrorLog {
    type: 'error';
    message: string;
    error: unknown;
}

type Log = InfoLog | ErrorLog;

const IMPORT_LOG: Log[] = [];

// WordPress API URL
const WP_API_URL = 'https://srisambuddhamission.org/wp-json/wp/v2/posts';

async function importPosts() {
    const payload = await getPayload({ config })

    let page = 1;
    let totalPages = 1;

    console.log('Starting posts import...');

    do {
        try {
            console.log(`Fetching page ${page}...`);
            const response = await axios.get(WP_API_URL, {
                params: {
                    page,
                    per_page: 20,
                    _embed: true // Include featured media embedded
                }
            });

            totalPages = parseInt(response.headers['x-wp-totalpages'] || '1', 10);
            const posts = response.data;

            for (const post of posts) {
                // Normalize slug: decode WP's encoded slug to get clean Unicode
                let cleanSlug = post.slug;
                try {
                    cleanSlug = decodeURIComponent(post.slug).normalize('NFC');
                } catch (e) {
                    console.warn(`Could not decode slug: ${post.slug}`, e);
                }

                console.log(`Processing post: ${post.title.rendered} (Slug: ${cleanSlug})`);

                // Map Categories
                let category = 'article';
                if (post.categories && post.categories.length > 0) {
                    if (post.categories.includes(69) || post.categories.includes(185)) {
                        category = 'news';
                    } else if (post.categories.includes(74) || post.categories.includes(91) || post.categories.includes(79)) {
                        category = 'event';
                    }
                }

                // Check if post already exists (check both original and clean to catch duplicates/migrations)
                const existing = await payload.find({
                    collection: 'posts',
                    where: {
                        or: [
                            { slug: { equals: cleanSlug } },
                            { slug: { equals: post.slug } }
                        ]
                    },
                });

                if (existing.totalDocs > 0) {
                    console.log(`Updating existing post: ${cleanSlug}`);
                    await payload.update({
                        collection: 'posts',
                        id: existing.docs[0].id,
                        data: {
                            slug: cleanSlug, // Ensure slug is updated to clean version
                            category: category,
                        }
                    });
                    continue;
                }

                // Handle Featured Media
                let featuredImageId = null;
                if (post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0]) {
                    const media = post._embedded['wp:featuredmedia'][0];
                    const mediaUrl = media.source_url;
                    const mediaAlt = media.alt_text || post.title.rendered;

                    if (mediaUrl) {
                        try {
                            console.log(`Downloading image: ${mediaUrl}`);
                            const imageResponse = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
                            const buffer = Buffer.from(imageResponse.data);

                            // Determine mime type and filename
                            const mimeType = media.mime_type;
                            const originalFilename = path.basename(mediaUrl.split('?')[0]); // Simple filename extraction

                            const uploadResult = await payload.create({
                                collection: 'media',
                                data: {
                                    alt: mediaAlt,
                                },
                                file: {
                                    data: buffer,
                                    mimetype: mimeType,
                                    name: originalFilename,
                                    size: buffer.length,
                                },
                            });
                            featuredImageId = uploadResult.id;
                        } catch (e) {
                            console.error(`Failed to download/upload image for post ${post.slug}`, e);
                            IMPORT_LOG.push({
                                type: 'error',
                                message: `Failed to download/upload image for post ${post.slug}`,
                                error: e
                            })
                        }
                    }
                }

                // Convert HTML Content to Lexical (Simplified: Wrapping in a RichText structure)
                // Payload's lexical editor saves data as a distinct JSON structure. 
                // Importing HTML directly into Lexical is complex without using the headless editor.
                // For now, we will create a basic lexical state with one HTML block or just the text if simple.
                // A better strategy for a robust import is often simply saving the raw HTML in a separate 'htmlContent' field 
                // if we don't need to edit it in block-style immediately, OR using a converter.

                // Since I didn't verify if I can easily convert, and the prompt asks for a "revamp", 
                // maybe importing as much text as possible is key.
                // Let's try to construct a simple paragraph block for each paragraph in the HTML.

                const dom = new JSDOM(post.content.rendered);
                const doc = dom.window.document;
                const paragraphs = Array.from(doc.querySelectorAll('p')).map(p => p.textContent).filter(Boolean);

                // Construct a basic Lexical state
                // This is a minimal valid structure for Payload's default lexical editor.
                const serializedContent = {
                    root: {
                        type: 'root',
                        format: '',
                        indent: 0,
                        version: 1,
                        children: paragraphs.map(text => ({
                            type: 'paragraph',
                            format: '',
                            indent: 0,
                            version: 1,
                            children: [{
                                mode: 'normal',
                                text: text || '',
                                type: 'text',
                                style: '',
                                detail: 0,
                                format: 0,
                                version: 1
                            }]
                        }))
                    }
                };

                // Map Categories
                // WP returns categories as IDs. We might need to fetch them or just assume. 
                // For now, I'll default to 'article' if unknown or map if I had the category map.
                // Simplification: Just set 'article' or use the first if I could resolve it.
                // Let's default to 'article' for this valid MVP.

                await payload.create({
                    collection: 'posts',
                    data: {
                        title: post.title.rendered,
                        slug: cleanSlug, // Use clean slug
                        publishedDate: post.date,
                        content: serializedContent as any, // Bypass TS check for custom structure
                        category: category,
                        featuredImage: featuredImageId,
                        excerpt: post.excerpt.rendered.replace(/<[^>]*>?/gm, ''), // Strip HTML from excerpt
                        originalUrl: post.link,
                    },
                });

                console.log(`Imported post: ${post.title.rendered}`);
                IMPORT_LOG.push({
                    type: 'info',
                    message: `Imported post: ${post.title.rendered}`
                });
            }

            page++;
        } catch (error) {
            console.error(`Error on page ${page}:`, error);
            IMPORT_LOG.push({
                type: 'error',
                message: `Error on page ${page}`,
                error: error
            });
            break; // Stop on error
        }

    } while (page <= totalPages);

    console.log('Import finished.');
    process.exit(0);
}

importPosts();
