import Image from 'next/image';

export function Footer() {
    return (
        <footer className="py-16 border-t border-white/5 bg-surface/50 text-gray-500 text-sm">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
                {/* Column 1: Brand */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/10">
                            <Image src="/logo.jpg" alt="Logo" fill className="object-cover" />
                        </div>
                        <h4 className="text-white font-serif text-lg">Sri Sambuddha Mission</h4>
                    </div>
                    <p className="leading-relaxed">
                        Dedicated to the preservation and dissemination of the pure teachings of the Buddha for the welfare of all beings.
                    </p>
                </div>

                {/* Column 2: Quick Links */}
                <div className="space-y-4">
                    <h4 className="text-white font-serif text-lg">Quick Links</h4>
                    <div className="flex flex-col gap-2">
                        <a href="/about" className="hover:text-gold transition-colors">About Us</a>
                        <a href="/retreats" className="hover:text-gold transition-colors">Retreats</a>
                        <a href="/news" className="hover:text-gold transition-colors">Latest News</a>
                        <a href="/contact" className="hover:text-gold transition-colors">Contact</a>
                    </div>
                </div>

                {/* Column 3: Contact */}
                <div className="space-y-4">
                    <h4 className="text-white font-serif text-lg">Contact Us</h4>
                    <p className="leading-relaxed">
                        Sri Sambuddha Ramaneeya Ashramaya,<br />
                        Ethaudakanda, Thalawathura,<br />
                        Dunumala, Galapitamada, Sri Lanka.
                    </p>
                    <p className="hover:text-gold transition-colors cursor-pointer">
                        <a href="mailto:info@srisambuddhamission.org">info@srisambuddhamission.org</a>
                    </p>
                    <p>+94 77 738 7842</p>
                </div>
            </div>
            <div className="mt-12 pt-8 border-t border-white/5 text-center text-xs tracking-widest uppercase opacity-60">
                &copy; {new Date().getFullYear()} Sri Sambuddha Mission. All rights reserved.
            </div>
        </footer>
    );
}
