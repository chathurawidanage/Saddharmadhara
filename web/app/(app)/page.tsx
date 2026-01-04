import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image Placeholder - using CSS gradient for now */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background z-10"></div>
        {/* Placeholder: ideally use next/image with a real asset later */}
        <div className="absolute inset-0 bg-[linear-gradient(45deg,#1a1a1a_25%,transparent_25%,transparent_50%,#1a1a1a_50%,#1a1a1a_75%,transparent_75%,transparent)] bg-[length:64px_64px] opacity-5 animate-fade-in"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-gold-light)_0%,_transparent_40%)] opacity-10 blur-3xl"></div>

        <div className="relative z-20 text-center px-4 max-w-4xl mx-auto">
          <h2 className="text-gold tracking-[0.2em] text-sm md:text-base mb-6 uppercase animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Preserving the Dhamma
          </h2>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif text-white mb-8 leading-tight animate-slide-up" style={{ animationDelay: '0.4s' }}>
            Sri Sambuddha Mission
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-light animate-slide-up" style={{ animationDelay: '0.6s' }}>
            Dedicated to the preservation and dissemination of the pure teachings of the Buddha for the welfare of all beings.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.8s' }}>
            <Link href="/about" className="px-8 py-3 bg-gold text-dark font-medium rounded-full hover:bg-gold-light transition-all transform hover:scale-105">
              Our Mission
            </Link>
            <Link href="/retreats" className="px-8 py-3 glass text-white font-medium rounded-full hover:bg-white/10 transition-all">
              Join a Retreat
            </Link>
          </div>
        </div>
      </section>

      {/* Content Section: Founder */}
      <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div className="space-y-6">
          <h3 className="text-gold uppercase tracking-widest text-sm">The Founder</h3>
          <h2 className="text-4xl md:text-5xl font-serif text-white leading-tight">Most Ven. Bambalapitiye Gnanaloka Thero</h2>
          <p className="text-gray-400 leading-relaxed text-lg">
            Following the path of the ancient sages, Ven. Gnanaloka Thero established this mission to revive the authentic practice of meditation and mindfulness. His journey from the material world to the homeless life is an inspiring testament to the power of the Dhamma.
          </p>
          <Link href="/about" className="inline-block text-gold border-b border-gold pb-1 hover:text-white hover:border-white transition-all pt-4">
            Read Full Biography &rarr;
          </Link>
        </div>
        <div className="relative h-[600px] w-full glass rounded-2xl overflow-hidden group">
          {/* Placeholder for image - in real app upload the screenshot/image to public/ */}
          <div className="absolute inset-0 bg-neutral-800/50 flex flex-col items-center justify-center text-neutral-500 font-serif">
            <span className="text-6xl mb-4 opacity-20">☸</span>
            <span>Founder Image</span>
          </div>
        </div>
      </section>

      {/* Featured Events/News */}
      <section className="py-24 bg-surface/30 max-w-full">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h3 className="text-gold uppercase tracking-widest text-sm mb-2">Latest Updates</h3>
              <h2 className="text-3xl md:text-4xl font-serif text-white">News & Events</h2>
            </div>
            <Link href="/news" className="text-sm text-gray-400 hover:text-white transition-colors">View All &rarr;</Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Simplified News Cards */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass rounded-xl overflow-hidden hover:-translate-y-2 transition-transform duration-300 cursor-pointer group">
                <div className="h-48 bg-neutral-800 group-hover:bg-neutral-700 transition-colors relative flex items-center justify-center">
                  <span className="opacity-10 text-4xl">📰</span>
                </div>
                <div className="p-8 space-y-4">
                  <span className="text-gold text-xs uppercase tracking-wider font-medium">News</span>
                  <h3 className="text-xl font-serif text-white leading-snug group-hover:text-gold transition-colors">Upcoming Pindapatha Program details for 2026</h3>
                  <p className="text-gray-400 text-sm line-clamp-2">Join us for the generous offering of alms and support the Sangha in their practice...</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
