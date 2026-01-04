import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function RetreatsPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />

            {/* Hero */}
            <section className="pt-40 pb-20 px-6 text-center">
                <h1 className="text-5xl md:text-7xl font-serif text-white mb-6">Saddharmadhara Retreats</h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    Experience the transformative power of silence and the pure Dhamma.
                </p>
            </section>

            <section className="py-12 px-6 max-w-4xl mx-auto space-y-12">
                <div className="glass p-10 rounded-2xl">
                    <h2 className="text-3xl font-serif text-gold mb-6">About The Retreats</h2>
                    <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed text-lg">
                        <p>
                            Our "Saddharmadhara" retreats are designed to take you back to the roots of Buddhist practice.
                            Unlike modern retreats heavily focused on techniques, our approach emphasizes <strong>direct engagement with the Buddha's words (Suttas)</strong>.
                        </p>
                        <p className="mt-4">
                            In a serene forest environment, participants practice noble silence, engage in deep study of the Suttas, and cultivate natural insight.
                            This immersive experience is an invitation to explore the monastic way of life—a potential stepping stone towards full renunciation and liberation.
                        </p>
                    </div>

                    <div className="mt-10 flex justify-center">
                        <a
                            href="https://retreats.srisambuddhamission.org/"
                            target="_blank"
                            className="px-10 py-4 bg-gold text-dark font-bold rounded-full hover:bg-gold-light hover:scale-105 transition-all shadow-lg shadow-gold/20"
                        >
                            Apply for a Retreat ↗
                        </a>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    <div className="p-6 border border-white/5 rounded-xl bg-surface/50">
                        <div className="text-4xl mb-4">🤫</div>
                        <h3 className="text-lg font-serif text-white mb-2">Noble Silence</h3>
                        <p className="text-gray-400 text-sm">Disconnect from the world to connect with the truth within.</p>
                    </div>
                    <div className="p-6 border border-white/5 rounded-xl bg-surface/50">
                        <div className="text-4xl mb-4">📖</div>
                        <h3 className="text-lg font-serif text-white mb-2">Sutta Study</h3>
                        <p className="text-gray-400 text-sm">Direct learning from the original discourses of the Buddha.</p>
                    </div>
                    <div className="p-6 border border-white/5 rounded-xl bg-surface/50">
                        <div className="text-4xl mb-4">🌳</div>
                        <h3 className="text-lg font-serif text-white mb-2">Forest Living</h3>
                        <p className="text-gray-400 text-sm">Simple, grounded living in harmony with nature.</p>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
