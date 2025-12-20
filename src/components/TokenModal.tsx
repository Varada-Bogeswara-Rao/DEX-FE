import React, { useState } from 'react';
import { X, Search, Check } from 'lucide-react';
import { TOKENS, Token } from '../lib/tokens';

interface TokenModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (token: Token) => void;
    selectedToken?: Token;
}

export default function TokenModal({ isOpen, onClose, onSelect, selectedToken }: TokenModalProps) {
    const [searchQuery, setSearchQuery] = useState('');

    if (!isOpen) return null;

    const filteredTokens = TOKENS.filter(t =>
        t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Helper to generate consistent colors for placeholders
    const getPlaceholderColor = (symbol: string) => {
        const colors = [
            'bg-pink-500', 'bg-purple-500', 'bg-blue-500', 'bg-indigo-500',
            'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500', 'bg-orange-500'
        ];
        const index = symbol.charCodeAt(0) % colors.length;
        return colors[index];
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
            {/* BACKDROP */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />

            {/* MODAL CONTENT */}
            <div className="relative w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-scale-in">

                {/* HEADER */}
                <div className="p-5 border-b border-white/5">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-white">Select a token</h3>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <X className="h-5 w-5 text-gray-400" />
                        </button>
                    </div>

                    {/* SEARCH INPUT */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or symbol"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#1b1b1b] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:bg-black/40 transition-all font-medium"
                            autoFocus
                        />
                    </div>
                </div>

                {/* TOKEN LIST */}
                <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                    <div className="flex flex-col gap-1">
                        {filteredTokens.map((token) => {
                            const isSelected = selectedToken?.address === token.address;
                            return (
                                <button
                                    key={token.address}
                                    onClick={() => {
                                        onSelect(token);
                                        onClose();
                                    }}
                                    className={`flex items-center justify-between p-3 rounded-xl transition-all group ${isSelected ? 'bg-white/10 opacity-50 cursor-default' : 'hover:bg-white/5 cursor-pointer'}`}
                                    disabled={isSelected}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* ICON PLACEHOLDER */}
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-inner ${getPlaceholderColor(token.symbol)}`}>
                                            {token.symbol.slice(0, 2)}
                                        </div>

                                        <div className="flex flex-col items-start">
                                            <span className="text-white font-semibold text-lg leading-tight">{token.symbol}</span>
                                            <span className="text-gray-500 text-xs font-medium">{token.name}</span>
                                        </div>
                                    </div>

                                    {isSelected && <Check className="text-pink-500 h-5 w-5" />}
                                </button>
                            );
                        })}
                        {filteredTokens.length === 0 && (
                            <div className="p-8 text-center text-gray-500 text-sm">
                                No tokens found.
                            </div>
                        )}
                    </div>
                </div>

                {/* FOOTER (Optional) */}
                <div className="p-4 border-t border-white/5 bg-[#121212]">
                    <div className="text-center text-xs text-gray-600 font-medium hover:text-gray-400 transition-colors cursor-pointer">
                        Manage Token Lists
                    </div>
                </div>

            </div>
        </div>
    );
}
