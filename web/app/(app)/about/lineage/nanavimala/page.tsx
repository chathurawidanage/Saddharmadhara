import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";

export default function NanavimalaPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />

            <section className="pt-40 pb-12 px-6 text-center">
                <span className="text-gold uppercase tracking-widest text-sm font-bold mb-4 block">The Lineage</span>
                <h1 className="text-4xl md:text-6xl font-serif text-white mb-6">Most Ven. Ñāṇavimala Mahāthera</h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto italic">
                    (1911–2005)
                </p>
            </section>

            <section className="pb-24 px-6 max-w-4xl mx-auto space-y-12">
                <div className="glass p-10 rounded-2xl">
                    <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed text-lg space-y-6">
                        <p className="first-letter:text-4xl first-letter:text-gold first-letter:mr-2 first-letter:float-left first-letter:font-serif">
                            Venerable Ñāṇavimala Mahāthera was a German-born disciple of Ven. Ñāṇatiloka, widely revered for his extraordinary renunciation and commitment to the ascetic practices (dhutanga).
                        </p>

                        <h3 className="text-2xl font-serif text-white mt-8 mb-4">The Wandering Monk</h3>
                        <p>
                            For over 25 years, he lived as a <strong>cārikā bhikkhu</strong> (wandering monk), walking the length and breadth of Sri Lanka barefoot.
                            Carrying only his alms bowl and robes, he had no fixed abode, sleeping in forests, parks, or simple shelters.
                        </p>

                        <h3 className="text-2xl font-serif text-white mt-8 mb-4">Influence on the Mission</h3>
                        <p>
                            His radical simplicity and unwavering mindfulness deeply influenced the modern forest tradition in Sri Lanka.
                            He was a direct mentor to many, including Ven. Bambalapitiye Gnanaloka Thero, inspiring the ethos of "Saddharmadhara" – preserving the Dhamma through living it fully.
                        </p>
                    </div>
                </div>

                <div className="flex justify-between border-t border-white/10 pt-8">
                    <Link href="/about/lineage/nanatiloka" className="text-sm text-gray-500 hover:text-gold transition-colors">
                        &larr; Ven. Ñāṇatiloka Mahāthera
                    </Link>
                    <div></div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
