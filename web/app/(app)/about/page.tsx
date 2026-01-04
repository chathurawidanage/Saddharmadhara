import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function AboutPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />

            {/* Hero */}
            <section className="pt-40 pb-20 px-6 text-center">
                <h1 className="text-5xl md:text-7xl font-serif text-white mb-6">About The Mission</h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    A journey of faith, dedication, and the preservation of the pristine Dhamma.
                </p>
            </section>

            {/* Content: The Founder */}
            <section className="py-20 px-6 max-w-4xl mx-auto space-y-20">
                <div className="glass p-8 md:p-12 rounded-2xl">
                    <h2 className="text-3xl font-serif text-gold mb-6">The Founder: Ven. Bambalapitiye Gnanaloka Thero</h2>
                    <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed space-y-4">
                        <p>
                            Most Venerable Bambalapitiye Gnanaloka Thero was born in Sri Lanka in 1971 and spent his youth in Lesotho, South Africa.
                            Gifted in academics, he pursued studies in astrophysics and business management, but a deeper calling towards the spiritual path led him away from the secular world.
                        </p>
                        <p>
                            In 1989, he met his teacher, the Most Venerable Ñāṇavimala Mahāthera, a German monk of the forest tradition.
                            Under his guidance, he ordained as a novice in 1999 and received full ordination in 2001.
                        </p>
                        <h3 className="text-xl text-white pt-4">A Journey of Ascetcism</h3>
                        <p>
                            Ven. Gnanaloka Thero is renowned for his rigorous practice. He undertook a solitary walking pilgrimage (cārikā) of over 1,000 km across Sri Lanka, often traversing conflict zones during the war, relying solely on alms and the protection of the Dhamma.
                        </p>
                        <p>
                            Following a near-death experience in 2015, he dedicated his life to teaching the Suttas directly, reviving the ancient and authentic practices of the Buddha for the modern world.
                        </p>
                    </div>
                </div>

                {/* Content: The Trust */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                    <div>
                        <h2 className="text-3xl font-serif text-white mb-6">The Charitable Trust</h2>
                        <div className="space-y-4 text-gray-400">
                            <p>
                                Established in 2017 under Deed of Trust No. 95, the <strong>Sri Sambuddha Mission Charitable Trust</strong> serves as the administrative backbone for the mission.
                            </p>
                            <p>
                                Its primary role is to provide spiritual and material support to the <em>Sri Sambuddha Ramneeya Ashramaya</em> forest monastery in Dunumala, Sri Lanka, and to facilitate the global propagation of the Dhamma.
                            </p>
                        </div>
                    </div>
                    <div className="glass p-8 rounded-xl border-l-2 border-gold">
                        <h3 className="text-xl font-serif text-gold mb-4">Our Objectives</h3>
                        <ul className="space-y-3 text-gray-300">
                            <li className="flex gap-3">
                                <span className="text-gold">•</span>
                                <span>Propagate the original teachings of the Buddha (Sutta Dhamma).</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-gold">•</span>
                                <span>Establish and support forest monasteries for meditative practice.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-gold">•</span>
                                <span>Translate and publish authentic Dhamma literature.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-gold">•</span>
                                <span>Conduct retreats and workshops to cultivate mindfulness and wisdom.</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
