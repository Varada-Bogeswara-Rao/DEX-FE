import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useRouter } from 'next/router';
import { Search, MoreHorizontal } from 'lucide-react';

export default function Navbar() {
    const router = useRouter();

    const isActive = (path: string) => router.pathname === path;

    const navLinks = [
        { name: 'Trade', path: '/' },
        { name: 'Pool', path: '/pool' },
        { name: 'Analytics', path: '/dashboard' },
    ];

    return (
        <nav className="w-full flex items-center justify-between px-4 py-4 sticky top-0 z-50 backdrop-blur-2xl bg-black/5 border-b border-white/5 shadow-sm transition-all duration-300">
            {/* LEFT SIDEIcon + Links */}
            <div className="flex items-center gap-8">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <span className="text-white font-bold text-2xl tracking-tighter flex items-center gap-2 hover:text-gray-300 transition-colors">
                        DEX
                    </span>
                </Link>

                {/* Navigation Links */}
                <div className="hidden md:flex items-center gap-1">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.path}
                            className={`px-3 py-2 rounded-xl text-[16px] font-medium transition-all duration-200 ${isActive(link.path)
                                ? 'text-white bg-white/10'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {link.name}
                        </Link>
                    ))}
                </div>
            </div>

            {/* MIDDLE: Search Bar */}
            <div className="hidden lg:flex flex-1 max-w-lg mx-4">
                <div className="relative w-full group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-500 group-focus-within:text-pink-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2.5 border border-white/10 rounded-2xl leading-5 bg-white/5 text-gray-200 placeholder-gray-500 focus:outline-none focus:bg-black/40 focus:border-pink-500/30 focus:ring-1 focus:ring-pink-500/20 sm:text-sm transition-all shadow-inner backdrop-blur-sm"
                        placeholder="Search tokens and pools"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-xs bg-white/5 px-1.5 py-0.5 rounded border border-white/10">/</span>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE: Connect + Options */}
            <div className="flex items-center gap-3">
                <button className="hidden sm:block px-3 py-2 text-sm font-semibold text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all backdrop-blur-md">
                    Get the app
                </button>

                <ConnectButton
                    showBalance={{ smallScreen: false, largeScreen: true }}
                    accountStatus={{
                        smallScreen: 'avatar',
                        largeScreen: 'full',
                    }}
                    chainStatus="icon"
                />

                <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                    <MoreHorizontal className="h-5 w-5" />
                </button>
            </div>
        </nav>
    );
}