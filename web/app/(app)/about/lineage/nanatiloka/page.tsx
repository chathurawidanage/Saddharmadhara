import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";

export default function NanatilokaPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />

            <section className="pt-40 pb-12 px-6 text-center">
                <span className="text-gold uppercase tracking-widest text-sm font-bold mb-4 block">The Lineage</span>
                <h1 className="text-4xl md:text-6xl font-serif text-white mb-6">Most Ven. Ñāṇatiloka Mahāthera</h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto italic">
                    "The Father of Western Theravāda Monasticism"
                </p>
            </section>

            <section className="pb-24 px-6 max-w-4xl mx-auto space-y-12">
                <div className="glass p-10 rounded-2xl">
                    <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed text-lg space-y-6">
                        <p className="first-letter:text-4xl first-letter:text-gold first-letter:mr-2 first-letter:float-left first-letter:font-serif">
                            Born in Germany in 1878, Venerable Ñāṇatiloka Mahāthera (Anton Gueth) was a pioneer of Buddhism in the West.
                            He was one of the very first Westerners to join the Theravāda order and dedicated his life to scholarship and practice.
                        </p>

                        <h3 className="text-2xl font-serif text-white mt-8 mb-4">Legacy & The Island Hermitage</h3>
                        <p>
                            In 1911, he founded the <strong>Island Hermitage (Polgasduwa)</strong> in Dodanduwa, Sri Lanka.
                            This secluded jungle monastery became a beacon for Westerners seeking ordination and a rigorous meditative life.
                            It fostered a generation of great scholar-monks.
                        </p>

                        <h3 className="text-2xl font-serif text-white mt-8 mb-4">Scholarship</h3>
                        <p>
                            His contributions to Pali scholarship are immeasurable.
                            He authored seminal works such as <em>The Word of the Buddha</em> (a systematic arrangement of Sutta passages)
                            and the <em>Buddhist Dictionary</em>, which remain essential references for students of Theravāda Buddhism today.
                        </p>
                        <p>
                            He notably participated in the Sixth Buddhist Council (Chaṭṭha Saṅgāyana) in Burma, a testament to his high standing in the Theravāda world.
                        </p>
                    </div>
                </div>

                <div className="flex justify-between border-t border-white/10 pt-8">
                    <Link href="/about/lineage/madihe-pannasiha" className="text-sm text-gray-500 hover:text-gold transition-colors">
                        &larr; Ven. Madihe Pannasiha
                    </Link>
                    <Link href="/about/lineage/nanavimala" className="text-sm text-gray-500 hover:text-gold transition-colors">
                        Ven. Ñāṇavimala Mahāthera &rarr;
                    </Link>
                </div>
            </section>

            <Footer />
        </div>
    );
}
