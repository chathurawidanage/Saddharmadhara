import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";

export default function MadihePannasihaPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />

            <section className="pt-40 pb-12 px-6 text-center">
                <span className="text-gold uppercase tracking-widest text-sm font-bold mb-4 block">The Lineage</span>
                <h1 className="text-4xl md:text-6xl font-serif text-white mb-6">Most Ven. Madihe Pannasiha Mahanayake Thero</h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto italic">
                    (1913–2003)
                </p>
            </section>

            <section className="pb-24 px-6 max-w-4xl mx-auto space-y-12">
                <div className="glass p-10 rounded-2xl">
                    <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed text-lg space-y-6">
                        <p className="first-letter:text-4xl first-letter:text-gold first-letter:mr-2 first-letter:float-left first-letter:font-serif">
                            Most Venerable Madihe Pannasiha Mahanayake Thero was a towering figure in 20th-century Sri Lankan Buddhism.
                            As the first Supreme Patriarch of the United Amarapura Nikaya, he was a leader of immense wisdom and compassion.
                        </p>

                        <h3 className="text-2xl font-serif text-white mt-8 mb-4">A Life of Service</h3>
                        <p>
                            His contributions to the Sāsana (dispensation) were vast. He co-founded the <strong>Maharagama Bhikkhu Training Center</strong>,
                            dedicated to educating and disciplining young monks to be exemplary leaders.
                            He also established the Washington Buddhist Vihara, the first Theravāda temple in the United States, marking a key moment in the global spread of Buddhism.
                        </p>

                        <h3 className="text-2xl font-serif text-white mt-8 mb-4">Role in the Lineage</h3>
                        <p>
                            He played a pivotal role as the preceptor (Upajjhāya) for both Ven. Ñāṇavimala Mahāthera and Ven. Bambalapitiye Gnanaloka Thero,
                            linking the strict forest practice with the established monastic hierarchy and ensure the continuity of valid ordination.
                        </p>
                    </div>
                </div>

                <div className="flex justify-between border-t border-white/10 pt-8">
                    <div></div>
                    <Link href="/about/lineage/nanatiloka" className="text-sm text-gray-500 hover:text-gold transition-colors">
                        Ven. Ñāṇatiloka Mahāthera &rarr;
                    </Link>
                </div>
            </section>

            <Footer />
        </div>
    );
}
