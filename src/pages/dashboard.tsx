import { useState, useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { ArrowUpRight, ArrowDownRight, RefreshCcw, ChevronDown } from 'lucide-react'; // Minimal icons

import { FactoryABI } from '../abi/FactoryABI';
import { TOKENS, Token } from '../lib/tokens';
import TokenModal from '../components/TokenModal';

// --------------------------------------------------
// CONFIGURATION
// --------------------------------------------------
const FACTORY_ADDRESS = '0x38CfF817498fcA61e9f71Eee195d546E13F3bB49';
const PAIR_REFETCH_INTERVAL = 15000;

// --------------------------------------------------

// Pair ABI 
const PAIR_ABI = [
    { name: 'getReserves', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint112', name: 'reserve0' }, { type: 'uint112', name: 'reserve1' }] },
    { name: 'token0', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
    { name: 'lpToken', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
] as const;

const LP_ABI = [
    { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const;

// --------------------------------------------------
// COMPONENTS
// --------------------------------------------------

const StatTile = ({ label, value, subValue, trend }: { label: string, value: string, subValue?: string, trend?: 'up' | 'down' }) => (
    <div className="flex flex-col p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm transition hover:bg-white/10 group">
        <span className="text-sm font-medium text-gray-400 mb-2 group-hover:text-gray-300 transition-colors">{label}</span>
        <div className="flex items-baseline gap-3">
            <span className="text-3xl font-light text-white tracking-tight">{value}</span>
            {trend === 'up' && <ArrowUpRight className="h-4 w-4 text-green-400" />}
            {trend === 'down' && <ArrowDownRight className="h-4 w-4 text-red-400" />}
        </div>
        {subValue && <span className="text-xs font-mono text-gray-500 mt-2">{subValue}</span>}
    </div>
);

// --------------------------------------------------
// MAIN COMPONENT
// --------------------------------------------------

export default function DashboardPage() {
    // STATE
    const [tokenA, setTokenA] = useState<Token>(TOKENS[0]);
    const [tokenB, setTokenB] = useState<Token>(TOKENS[1]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectingMode, setSelectingMode] = useState<'A' | 'B'>('A');

    // ON-CHAIN IO
    const [token0, token1] = useMemo(() =>
        tokenA.address.toLowerCase() < tokenB.address.toLowerCase()
            ? [tokenA, tokenB]
            : [tokenB, tokenA], [tokenA, tokenB]);

    const pairSymbol = `${tokenA.symbol} / ${tokenB.symbol}`;

    const { data: pairAddress, isLoading: isLoadingPair } = useReadContract({
        address: FACTORY_ADDRESS,
        abi: FactoryABI,
        functionName: 'getPair',
        args: [token0.address, token1.address],
    });
    const enabled = !!pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000';
    const queryConfig = { query: { enabled, refetchInterval: PAIR_REFETCH_INTERVAL } };

    const { data: reserves, isLoading: isLoadingReserves, refetch: refetchReserves } = useReadContract({
        address: pairAddress as `0x${string}`,
        abi: PAIR_ABI,
        functionName: 'getReserves',
        ...queryConfig,
    });

    const { data: pairToken0 } = useReadContract({
        address: pairAddress as `0x${string}`,
        abi: PAIR_ABI,
        functionName: 'token0',
        ...queryConfig,
    });

    const { data: lpToken } = useReadContract({
        address: pairAddress as `0x${string}`,
        abi: PAIR_ABI,
        functionName: 'lpToken',
        ...queryConfig,
    });

    const { data: totalSupply, isLoading: isLoadingSupply } = useReadContract({
        address: lpToken as `0x${string}`,
        abi: LP_ABI,
        functionName: 'totalSupply',
        query: { enabled: !!lpToken, refetchInterval: PAIR_REFETCH_INTERVAL },
    });

    // COMPUTATION
    let reserveA = '0';
    let reserveB = '0';
    let priceA = '0';
    let priceB = '0';
    let totalLiquidity = '0.00';
    let totalLPSupply = '0.00';

    if (reserves && pairToken0) {
        const [r0, r1] = reserves as [bigint, bigint];
        if (pairToken0.toLowerCase() === tokenA.address.toLowerCase()) {
            reserveA = formatEther(r0);
            reserveB = formatEther(r1);
        } else {
            reserveA = formatEther(r1);
            reserveB = formatEther(r0);
        }

        const numA = Number(reserveA);
        const numB = Number(reserveB);

        if (numA > 0 && numB > 0) {
            priceA = (numB / numA).toFixed(6);
            priceB = (numA / numB).toFixed(6);
            totalLiquidity = (numA + numB).toFixed(2);
        } else if (numA > 0 || numB > 0) {
            totalLiquidity = (numA + numB).toFixed(2);
        }
    }

    if (totalSupply) {
        totalLPSupply = Number(formatEther(totalSupply as bigint)).toFixed(4);
    }

    const isLoading = isLoadingPair || isLoadingReserves || isLoadingSupply;

    // HANDLERS
    const openTokenModal = (mode: 'A' | 'B') => {
        setSelectingMode(mode);
        setIsModalOpen(true);
    };

    const handleTokenSelect = (token: Token) => {
        if (selectingMode === 'A') {
            if (token.address === tokenB.address) setTokenB(tokenA);
            setTokenA(token);
        } else {
            if (token.address === tokenA.address) setTokenA(tokenB);
            setTokenB(token);
        }
        setIsModalOpen(false);
    };

    return (
        <div className="flex flex-col items-center min-h-[80vh] text-white p-6 md:p-12 w-full max-w-7xl mx-auto">

            {/* HEADER SECTION */}
            <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6 border-b border-white/5 pb-8">
                <div>
                    <h1 className="text-5xl font-light tracking-tight text-white mb-2">Metrics</h1>
                    <p className="text-gray-500 font-light text-lg">Detailed liquidity and price data.</p>
                </div>

                {/* PAIR SELECTOR */}
                <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md p-2 rounded-2xl border border-white/5">
                    <button
                        onClick={() => openTokenModal('A')}
                        className="flex items-center gap-2 bg-black/40 hover:bg-black/60 px-4 py-2 rounded-xl transition-all text-sm font-bold border border-white/5"
                    >
                        {tokenA.symbol} <ChevronDown className="h-3 w-3 text-gray-500" />
                    </button>
                    <span className="text-gray-600">/</span>
                    <button
                        onClick={() => openTokenModal('B')}
                        className="flex items-center gap-2 bg-black/40 hover:bg-black/60 px-4 py-2 rounded-xl transition-all text-sm font-bold border border-white/5"
                    >
                        {tokenB.symbol} <ChevronDown className="h-3 w-3 text-gray-500" />
                    </button>
                    <button onClick={() => refetchReserves()} className="p-2.5 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white">
                        <RefreshCcw className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* CONTENT GRID */}
            {isLoading ? (
                <div className="w-full h-64 flex items-center justify-center text-gray-500 animate-pulse">
                    Loading market data...
                </div>
            ) : !enabled ? (
                <div className="w-full h-64 flex flex-col items-center justify-center text-gray-500 bg-white/5 rounded-3xl border border-white/5 border-dashed">
                    <span className="text-2xl font-light mb-2">No active pool</span>
                    <span className="text-sm">Create a pool in the Trade section to see analytics.</span>
                </div>
            ) : (
                <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* KEY STATS */}
                    <StatTile
                        label="Total Liquidity"
                        value={totalLiquidity}
                        subValue={`Combined ${tokenA.symbol} + ${tokenB.symbol}`}
                    />
                    <StatTile
                        label="LP Supply"
                        value={totalLPSupply}
                        subValue="Total tokens minted"
                    />
                    <StatTile
                        label={`Price (${tokenB.symbol})`}
                        value={priceA}
                        trend="up"
                        subValue={`1 ${tokenA.symbol} = ${priceA} ${tokenB.symbol}`}
                    />

                    {/* RESERVES SECTION (Table-like look) */}
                    <div className="md:col-span-2 lg:col-span-3 bg-black/20 backdrop-blur-xl border border-white/5 rounded-3xl p-8 mt-6">
                        <h3 className="text-lg font-medium text-gray-300 mb-6">Pool Composition</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            {/* Asset A */}
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-end border-b border-white/5 pb-2">
                                    <span className="text-3xl font-light text-white">{Number(reserveA).toFixed(4)}</span>
                                    <span className="text-xl font-medium text-gray-500 mb-1">{tokenA.symbol}</span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-600 uppercase tracking-widest mt-1">
                                    <span>Reserve Asset</span>
                                    <span>50% Weight</span>
                                </div>
                            </div>

                            {/* Asset B */}
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-end border-b border-white/5 pb-2">
                                    <span className="text-3xl font-light text-white">{Number(reserveB).toFixed(4)}</span>
                                    <span className="text-xl font-medium text-gray-500 mb-1">{tokenB.symbol}</span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-600 uppercase tracking-widest mt-1">
                                    <span>Reserve Asset</span>
                                    <span>50% Weight</span>
                                </div>
                            </div>
                        </div>

                        {/* Contract Info Footer */}
                        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-xs text-gray-600 font-mono">
                            <span>Pair Contract: {pairAddress}</span>
                            <span>Factory: {FACTORY_ADDRESS}</span>
                        </div>
                    </div>

                </div>
            )}

            <TokenModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSelect={handleTokenSelect}
                selectedToken={selectingMode === 'A' ? tokenA : tokenB}
            />
        </div>
    );
}