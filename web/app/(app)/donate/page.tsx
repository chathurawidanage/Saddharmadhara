import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function DonatePage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />

            <section className="pt-40 pb-20 px-6 text-center">
                <h1 className="text-5xl md:text-7xl font-serif text-white mb-6">Support The Mission</h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    Your generous contributions help preserve the Dhamma for future generations.
                </p>
            </section>

            <section className="pb-24 px-6 max-w-2xl mx-auto">
                <div className="glass p-8 md:p-12 rounded-2xl border border-gold/20 shadow-[0_0_50px_rgba(197,160,89,0.1)]">
                    <h2 className="text-2xl font-serif text-white mb-8 text-center border-b border-white/10 pb-6">Bank Transfer Details</h2>

                    <div className="space-y-6 text-lg">
                        <div className="flex flex-col md:flex-row justify-between md:items-center py-2 border-b border-dashed border-white/10">
                            <span className="text-gray-500 text-sm uppercase tracking-widest">Account Name</span>
                            <span className="text-gold font-medium text-right mt-1 md:mt-0">Sri Sambuddha Mission Charitable Trust</span>
                        </div>

                        <div className="flex flex-col md:flex-row justify-between md:items-center py-2 border-b border-dashed border-white/10">
                            <span className="text-gray-500 text-sm uppercase tracking-widest">Account Number</span>
                            <span className="text-white font-mono text-xl text-right mt-1 md:mt-0 tracking-wider">1101009309</span>
                        </div>

                        <div className="flex flex-col md:flex-row justify-between md:items-center py-2 border-b border-dashed border-white/10">
                            <span className="text-gray-500 text-sm uppercase tracking-widest">Bank</span>
                            <span className="text-white text-right mt-1 md:mt-0">Commercial Bank of Ceylon PLC</span>
                        </div>

                        <div className="flex flex-col md:flex-row justify-between md:items-center py-2 border-b border-dashed border-white/10">
                            <span className="text-gray-500 text-sm uppercase tracking-widest">Branch</span>
                            <span className="text-white text-right mt-1 md:mt-0">Nawala</span>
                        </div>

                        <div className="flex flex-col md:flex-row justify-between md:items-center py-2 border-b border-dashed border-white/10">
                            <span className="text-gray-500 text-sm uppercase tracking-widest">Swift Code</span>
                            <span className="text-white font-mono text-right mt-1 md:mt-0">CCEYLKLX</span>
                        </div>

                        <div className="flex flex-col md:flex-row justify-between md:items-start py-2">
                            <span className="text-gray-500 text-sm uppercase tracking-widest whitespace-nowrap">Address</span>
                            <span className="text-gray-300 text-right mt-1 md:mt-0 max-w-xs">No. 157, Nawala Road, Nugegoda, Sri Lanka</span>
                        </div>
                    </div>

                    <div className="mt-10 p-4 bg-gold/10 rounded-lg text-center">
                        <p className="text-gold text-sm">
                            Please communicate your transfer details to <strong className="text-white">info@srisambuddhamission.org</strong> so we may acknowledge your receipt.
                        </p>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
