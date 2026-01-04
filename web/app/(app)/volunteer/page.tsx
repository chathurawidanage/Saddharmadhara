import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function VolunteerPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />

            <section className="pt-40 pb-20 px-6 text-center">
                <h1 className="text-5xl md:text-7xl font-serif text-white mb-6">Volunteer With Us</h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    Offer your skills and time to support the mission.
                </p>
            </section>

            <section className="pb-24 px-6 max-w-3xl mx-auto">
                <div className="glass p-8 rounded-xl text-center space-y-6">
                    <p className="text-gray-300 leading-relaxed text-lg">
                        We are always looking for dedicated individuals to assist with various aspects of the mission,
                        whether it be organizing retreats, technical support, translation work, or general administration.
                    </p>
                    <p className="text-gray-300">
                        If you wish to volunteer, please reach out to us directly via email.
                    </p>

                    <div className="pt-6">
                        <a href="mailto:info@srisambuddhamission.org" className="inline-block px-8 py-3 bg-white/5 border border-white/10 rounded-full hover:bg-gold hover:text-dark hover:border-gold transition-all">
                            Email Us to Volunteer
                        </a>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
