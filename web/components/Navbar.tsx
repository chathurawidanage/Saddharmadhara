"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <nav className="fixed w-full z-50 glass-nav transition-all duration-300">
            <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-transparent group-hover:border-gold transition-colors duration-300 bg-white/10">
                        <Image src="/logo.jpg" alt="Sri Sambuddha Mission Logo" fill className="object-cover" />
                    </div>
                    <span className="font-serif text-xl tracking-wide text-white group-hover:text-gold transition-colors">
                        Sri Sambuddha Mission
                    </span>
                </Link>

                {/* Desktop Menu */}
                <div className="hidden md:flex gap-8 items-center text-sm tracking-widest uppercase text-gray-300">
                    <Link href="/" className={`hover:text-gold transition-colors ${isActive('/') ? 'text-gold' : ''}`}>Home</Link>

                    <div className="relative group/dropdown">
                        <button className={`hover:text-gold transition-colors flex items-center gap-1 ${pathname.startsWith('/about') ? 'text-gold' : ''}`}>
                            About
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                        </button>
                        <div className="absolute top-full left-0 w-64 py-2 bg-surface border border-white/5 rounded-lg shadow-xl opacity-0 invisible group-hover/dropdown:opacity-100 group-hover/dropdown:visible transition-all duration-200 transform translate-y-2 group-hover/dropdown:translate-y-0 text-left">
                            <div className="px-4 py-2 text-xs text-gold/70 font-bold border-b border-white/5 uppercase">The Mission</div>
                            <Link href="/about" className="block px-4 py-2 hover:bg-white/5 hover:text-gold">The Founders & Mission</Link>
                            <Link href="/about/objectives" className="block px-4 py-2 hover:bg-white/5 hover:text-gold">Objectives</Link>

                            <div className="px-4 py-2 text-xs text-gold/70 font-bold border-b border-white/5 border-t mt-2 uppercase">The Lineage</div>
                            <Link href="/about/lineage/madihe-pannasiha" className="block px-4 py-2 hover:bg-white/5 hover:text-gold normal-case tracking-normal">Ven. Madihe Pannasiha</Link>
                            <Link href="/about/lineage/nanatiloka" className="block px-4 py-2 hover:bg-white/5 hover:text-gold normal-case tracking-normal">Ven. Ñāṇatiloka Mahāthera</Link>
                            <Link href="/about/lineage/nanavimala" className="block px-4 py-2 hover:bg-white/5 hover:text-gold normal-case tracking-normal">Ven. Ñāṇavimala Mahāthera</Link>
                        </div>
                    </div>

                    <div className="relative group/dropdown">
                        <button className={`hover:text-gold transition-colors flex items-center gap-1 ${pathname.startsWith('/retreats') ? 'text-gold' : ''}`}>
                            Retreats
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                        </button>
                        <div className="absolute top-full left-0 w-48 py-2 bg-surface border border-white/5 rounded-lg shadow-xl opacity-0 invisible group-hover/dropdown:opacity-100 group-hover/dropdown:visible transition-all duration-200 transform translate-y-2 group-hover/dropdown:translate-y-0">
                            <Link href="/retreats" className="block px-4 py-2 hover:bg-white/5 hover:text-gold">Saddharmadhara</Link>
                            <a href="https://retreats.srisambuddhamission.org/" target="_blank" className="block px-4 py-2 hover:bg-white/5 hover:text-gold">Apply Now ↗</a>
                        </div>
                    </div>

                    <Link href="/news" className={`hover:text-gold transition-colors ${isActive('/news') ? 'text-gold' : ''}`}>News</Link>

                    <div className="relative group/dropdown">
                        <span className="cursor-pointer hover:text-gold transition-colors flex items-center gap-1">
                            Take Action
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                        </span>
                        <div className="absolute top-full right-0 w-64 py-2 bg-surface border border-white/5 rounded-lg shadow-xl opacity-0 invisible group-hover/dropdown:opacity-100 group-hover/dropdown:visible transition-all duration-200 transform translate-y-2 group-hover/dropdown:translate-y-0">
                            <Link href="/donate" className="block px-4 py-2 hover:bg-white/5 hover:text-gold">Donate</Link>
                            <Link href="/volunteer" className="block px-4 py-2 hover:bg-white/5 hover:text-gold">Volunteer</Link>
                            <Link href="/action/host" className="block px-4 py-2 hover:bg-white/5 hover:text-gold">Host an Event</Link>
                        </div>
                    </div>

                    <Link href="/contact" className="px-6 py-2 border border-gold text-gold hover:bg-maroon hover:border-maroon hover:text-white transition-all rounded-full">
                        Contact
                    </Link>
                </div>

                {/* Mobile Menu Button */}
                <button className="md:hidden text-white hover:text-gold" onClick={() => setIsOpen(!isOpen)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isOpen && (
                <div className="md:hidden absolute top-full left-0 w-full bg-surface border-b border-white/5 p-6 animate-fade-in max-h-[80vh] overflow-y-auto">
                    <div className="flex flex-col gap-4 text-center text-sm tracking-widest uppercase">
                        <Link href="/" className="hover:text-gold py-2" onClick={() => setIsOpen(false)}>Home</Link>

                        <div className="space-y-2 border-y border-white/5 py-4">
                            <div className="text-gold text-xs font-bold">About</div>
                            <Link href="/about" className="block hover:text-gold py-1" onClick={() => setIsOpen(false)}>Mission</Link>
                            <Link href="/about/lineage/madihe-pannasiha" className="block hover:text-gold py-1" onClick={() => setIsOpen(false)}>Lineage</Link>
                        </div>

                        <Link href="/retreats" className="hover:text-gold py-2" onClick={() => setIsOpen(false)}>Retreats</Link>
                        <Link href="/news" className="hover:text-gold py-2" onClick={() => setIsOpen(false)}>News</Link>

                        <div className="space-y-2 border-y border-white/5 py-4">
                            <div className="text-gold text-xs font-bold">Action</div>
                            <Link href="/donate" className="block hover:text-gold py-1" onClick={() => setIsOpen(false)}>Donate</Link>
                            <Link href="/volunteer" className="block hover:text-gold py-1" onClick={() => setIsOpen(false)}>Volunteer</Link>
                            <Link href="/action/host" className="block hover:text-gold py-1" onClick={() => setIsOpen(false)}>Host Event</Link>
                        </div>

                        <Link href="/contact" className="hover:text-gold py-2 text-gold font-bold" onClick={() => setIsOpen(false)}>Contact</Link>
                    </div>
                </div>
            )}
        </nav>
    );
}
