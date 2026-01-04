
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export default async function NewsPage() {
    const payload = await getPayload({ config })

    const posts = await payload.find({
        collection: 'posts',
        where: {
            category: {
                equals: 'news',
            },
        },
        limit: 10,
        sort: '-publishedDate',
    })

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />

            <section className="pt-40 pb-12 px-6 text-center">
                <h1 className="text-5xl md:text-7xl font-serif text-white mb-6">Latest Updates</h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    Stay informed about the mission and activities.
                </p>
            </section>

            <section className="py-12 px-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {posts.docs.map((post: any) => (
                        <Link
                            key={post.id}
                            href={`/news/${post.slug}`}
                            className="glass rounded-xl overflow-hidden hover:-translate-y-2 transition-transform duration-300 group flex flex-col h-full"
                        >
                            {/* Image Placeholder or Media Check */}
                            <div className="h-48 bg-neutral-800 relative group-hover:opacity-90 transition-opacity">
                                {/* Logic to show image if available would go here. For now, a placeholder style. */}
                                {post.featuredImage ? (
                                    // In a real app, use Next/Image with the media URL
                                    <div className="absolute inset-0 bg-neutral-700 flex items-center justify-center text-xs text-gray-500">Image Loaded</div>
                                ) : (
                                    <div className="absolute inset-0 bg-neutral-800 flex items-center justify-center text-4xl opacity-10">📰</div>
                                )}
                            </div>

                            <div className="p-6 flex flex-col flex-grow">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-gold text-xs uppercase tracking-wider font-medium">{post.category || 'News'}</span>
                                    <span className="text-gray-500 text-xs">
                                        {new Date(post.publishedDate).toLocaleDateString()}
                                    </span>
                                </div>
                                <h2 className="text-xl font-serif text-white mb-3 group-hover:text-gold transition-colors line-clamp-2">
                                    {post.title}
                                </h2>
                                <p className="text-gray-400 text-sm line-clamp-3 mb-4 flex-grow">
                                    {post.excerpt || 'Read more about this update...'}
                                </p>
                                <div className="text-gold text-sm font-medium pt-4 border-t border-white/5">
                                    Read Article &rarr;
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            <Footer />
        </div>
    )
}
