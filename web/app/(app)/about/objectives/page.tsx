import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function ObjectivesPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />

            <section className="pt-40 pb-20 px-6 text-center">
                <h1 className="text-5xl md:text-7xl font-serif text-white mb-6">Objects of the Trust</h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    The guiding principles of the Sri Sambuddha Mission Charitable Trust.
                </p>
            </section>

            <section className="pb-24 px-6 max-w-4xl mx-auto">
                <div className="glass p-10 rounded-2xl">
                    <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed text-lg space-y-6">
                        <p>
                            The Sri Sambuddha Mission Charitable Trust was established with the noble aim of preserving and propagating the pristine teachings of the Buddha. Our core objectives include:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 marker:text-gold">
                            <li>To propagate the original teachings of the Buddha (Sutta Dhamma) locally and internationally.</li>
                            <li>To establish, maintain, and support forest monasteries and ashramayas for monks and lay practitioners dedicated to the path of fabrication-less practice.</li>
                            <li>To translate, print, and distribute authentic Dhamma books and literature to make the teachings accessible to all.</li>
                            <li>To conduct retreats, Dhamma discussions, and workshops that foster the cultivation of Sīla (Morality), Samādhi (Concentration), and Paññā (Wisdom).</li>
                            <li>To provide necessary requisites (food, robes, shelter, medicine) to the Sangha practicing in our affiliated monasteries.</li>
                            <li>To engage in social welfare activities based on compassionate action, supporting the needy where appropriate within the scope of our resources.</li>
                        </ul>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
