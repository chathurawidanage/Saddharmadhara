import type { CollectionConfig } from 'payload'

export const Posts: CollectionConfig = {
    slug: 'posts',
    admin: {
        useAsTitle: 'title',
        defaultColumns: ['title', 'publishedDate', 'category'],
    },
    access: {
        read: () => true,
    },
    fields: [
        {
            name: 'title',
            type: 'text',
            required: true,
        },
        {
            name: 'slug',
            type: 'text',
            required: true,
            admin: {
                position: 'sidebar',
            },
        },
        {
            name: 'publishedDate',
            type: 'date',
            admin: {
                position: 'sidebar',
            },
        },
        {
            name: 'category',
            type: 'select',
            options: [
                { label: 'News', value: 'news' },
                { label: 'Event', value: 'event' },
                { label: 'Article', value: 'article' },
            ],
            admin: {
                position: 'sidebar',
            },
        },
        {
            name: 'content',
            type: 'richText',
        },
        {
            name: 'excerpt',
            type: 'textarea',
        },
        {
            name: 'featuredImage',
            type: 'upload',
            relationTo: 'media',
        },
        {
            name: 'originalUrl',
            type: 'text',
            admin: {
                readOnly: true,
                description: 'URL from the imported WordPress site',
            },
        },
    ],
}
