
import { getPayload } from 'payload'
import config from '@payload-config'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { notFound } from 'next/navigation'

type Args = {
    params: Promise<{
        slug: string
    }>
}

export default async function PostPage({ params }: Args) {
    const { slug } = await params
    const payload = await getPayload({ config })

    // Debug slug
    console.log(`[PostPage] Fetching post with slug: ${slug}, encoded: ${encodeURIComponent(slug)}`);

    const result = await payload.find({
        collection: 'posts',
        where: {
            or: [
                {
                    slug: {
                        equals: slug,
                    },
                },
                {
                    slug: {
                        equals: decodeURIComponent(slug),
                    },
                },
                {
                    slug: {
                        equals: decodeURIComponent(slug).normalize('NFC'),
                    },
                }
            ]
        },
    })

    const post = result.docs[0]

    if (!post) {
        return notFound()
    }

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />

            <article className="pt-40 pb-24 px-6 max-w-4xl mx-auto w-full">
                <header className="mb-12 text-center">
                    <div className="flex justify-center gap-4 text-sm text-gold uppercase tracking-widest mb-4">
                        <span>{post.category as string || 'News'}</span>
                        <span>•</span>
                        <span>{new Date(post.publishedDate as string).toLocaleDateString()}</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white mb-8 leading-tight">
                        {post.title}
                    </h1>
                </header>

                {/* Content Render - Simplified for now since we just dumped raw structure or simple blocks */}
                <div className="prose prose-invert prose-lg max-w-none text-gray-300">
                    {/* 
                Warning: This is a simplified render. 
                Ideally, use @payloadcms/richtext-lexical/react to render the rich text state properly.
                For the "HTML to Rich Text" migration we did, we might just have simple paragraphs.
                A robust implementation would require the RichText renderer.
                
                For this iteration, I'll attempt to just JSON stringify if I can't render easily, 
                OR assume the migration created a 'root' with 'children'. 
             */}

                    {/* Temporary text render of paragraphs if structure matches standard Lexical */}
                    {post.content && (post.content as any).root && (post.content as any).root.children ? (
                        (post.content as any).root.children.map((block: any, i: number) => {
                            if (block.type === 'paragraph') {
                                return <p key={i}>{block.children.map((c: any) => c.text).join('')}</p>
                            }
                            return null
                        })
                    ) : (
                        <p>Content format not supported for direct preview.</p>
                    )}
                </div>
            </article>

            <Footer />
        </div>
    )
}
