import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function ContactPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />

            <section className="pt-40 pb-20 px-6 text-center">
                <h1 className="text-5xl md:text-7xl font-serif text-white mb-6">Contact Us</h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    Get in touch with the Sri Sambuddha Mission.
                </p>
            </section>

            <section className="pb-24 px-6 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Contact Info */}
                <div className="glass p-10 rounded-2xl flex flex-col justify-between">
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-gold uppercase tracking-widest text-sm mb-2">Address</h3>
                            <p className="text-white text-lg leading-relaxed">
                                Sri Sambuddha Ramaneeya Ashramaya,<br />
                                Ethaudakanda, Thalawathura,<br />
                                Dunumala, Galapitamada, Sri Lanka.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-gold uppercase tracking-widest text-sm mb-2">Email</h3>
                            <a href="mailto:info@srisambuddhamission.org" className="text-white text-lg hover:text-gold transition-colors">
                                info@srisambuddhamission.org
                            </a>
                        </div>

                        <div>
                            <h3 className="text-gold uppercase tracking-widest text-sm mb-2">Phone</h3>
                            <p className="text-white text-lg">
                                +94 77 738 7842
                            </p>
                        </div>
                    </div>

                    <div className="mt-12 pt-8 border-t border-white/10">
                        <h4 className="text-white font-serif mb-4">Follow Us</h4>
                        <div className="flex gap-4">
                            {/* Social Icons Placeholder */}
                            <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-gold hover:text-dark transition-all">YT</a>
                            <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-gold hover:text-dark transition-all">FB</a>
                        </div>
                    </div>
                </div>

                {/* Contact Form Placeholder - To be connected to Payload later or use an external service */}
                <div className="p-10 bg-surface rounded-2xl border border-white/5">
                    <h3 className="text-2xl font-serif text-white mb-6">Send a Message</h3>
                    <form className="space-y-6">
                        <div>
                            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Name</label>
                            <input type="text" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors" placeholder="Your Name" />
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Email</label>
                            <input type="email" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors" placeholder="your@email.com" />
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Message</label>
                            <textarea rows={5} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors" placeholder="How can we help?"></textarea>
                        </div>
                        <button type="button" className="w-full bg-gold text-dark font-medium py-3 rounded-lg hover:bg-gold-light transition-colors">
                            Send Message
                        </button>
                    </form>
                </div>
            </section>

            <Footer />
        </div>
    );
}
