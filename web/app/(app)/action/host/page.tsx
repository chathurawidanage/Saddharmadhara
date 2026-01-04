import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function HostEventPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />

            <section className="pt-40 pb-20 px-6 text-center">
                <h1 className="text-5xl md:text-7xl font-serif text-white mb-6">Host an Event</h1>
                <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                    Create opportunities for others to experience the Dhamma through special programs or meditation retreats.
                </p>
            </section>

            <section className="pb-24 px-6 max-w-4xl mx-auto">
                <div className="glass p-10 rounded-2xl space-y-12">
                    <div>
                        <h2 className="text-3xl font-serif text-gold mb-6">Guidelines for Event Organizers</h2>
                        <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed text-lg space-y-4">
                            <p>
                                We welcome supporters to invite Ven. Bambalapitiye Gnanaloka Thero to conduct Dhamma programs or retreats in your area.
                                However, to ensure consistency with the Mission's core ethos, we request organizers to adhere to specific guidelines.
                            </p>

                            <h3 className="text-xl text-white font-medium border-l-4 border-gold pl-4 mt-8">1. Authenticity & Sutta Basis</h3>
                            <p>
                                All teachings must be firmly rooted in the original words of the Buddha as found in the Suttas (e.g., Majjhima and Samyutta Nikāya).
                                We emphasize direct study rather than derivative interpretations.
                            </p>

                            <h3 className="text-xl text-white font-medium border-l-4 border-gold pl-4 mt-8">2. Simplicity & Humility</h3>
                            <p>
                                Events should be organized with simplicity. Avoid extravagance, commercialization, or excessive ritualism.
                                The environment should remain conducive to quiet contemplation and renunciation.
                            </p>

                            <h3 className="text-xl text-white font-medium border-l-4 border-gold pl-4 mt-8">3. Ethical Standards</h3>
                            <p>
                                Organizers and key volunteers are expected to observe the Five Precepts (or Eight Precepts during retreats) and maintain a high standard of conduct.
                                Celibacy is encouraged for organizers during the immediate preparation and duration of retreats to maintain spiritual purity.
                            </p>
                        </div>
                    </div>

                    <div className="bg-surface/50 p-8 rounded-xl border border-white/5 text-center">
                        <h3 className="text-2xl font-serif text-white mb-4">Interested in Hosting?</h3>
                        <p className="text-gray-400 mb-6">
                            If you agree with these guidelines and wish to proceed, please contact us with your proposal.
                        </p>
                        <a href="/contact" className="inline-block px-8 py-3 bg-gold text-dark font-medium rounded-full hover:bg-gold-light transition-all">
                            Contact Us to Propose an Event
                        </a>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
