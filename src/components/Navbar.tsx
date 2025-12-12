import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useRouter } from 'next/router';

export default function Navbar() {
    const router = useRouter();

    // Helper: Checks if the path is active to apply distinct styling
    const isActive = (path: string) => router.pathname === path;

    return (
        <nav className="w-full flex items-center justify-between px-8 py-5 bg-gray-900 border-b border-gray-800 shadow-md">

            {/* LEFT SIDE: Logo + Nav Links */}
            <div className="flex items-center gap-12">

                {/* 1. Large Logo */}
                <Link href="/" className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-linear-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 transition-opacity cursor-pointer">
                    BunnyDEX
                </Link>

                {/* 2. Navigation Links (Now next to logo) */}
                <div className="flex items-center gap-6">
                    <Link
                        href="/"
                        className={`px-4 py-2 rounded-lg text-lg font-semibold transition-all duration-200 ${isActive('/')
                                ? 'bg-gray-800 text-white shadow-sm' // Active State
                                : 'text-gray-400 hover:text-white hover:bg-gray-800/50' // Hover Effect
                            }`}
                    >
                        Swap
                    </Link>

                    <Link
                        href="/pool"
                        className={`px-4 py-2 rounded-lg text-lg font-semibold transition-all duration-200 ${isActive('/pool')
                                ? 'bg-gray-800 text-white shadow-sm'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                            }`}
                    >
                        Pool
                    </Link>
                </div>
            </div>

            {/* RIGHT SIDE: Connect Wallet */}
            <div className="flex items-center">
                <ConnectButton
                    showBalance={{ smallScreen: false, largeScreen: true }}
                    accountStatus={{
                        smallScreen: 'avatar',
                        largeScreen: 'full',
                    }}
                />
            </div>
        </nav>
    );
}