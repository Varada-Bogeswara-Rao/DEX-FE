import { useState, useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { Layers, Zap, TrendingUp, RefreshCcw, HandCoins } from 'lucide-react';

import { FactoryABI } from '../abi/FactoryABI';
import { TOKENS, Token } from '../lib/tokens';

// --------------------------------------------------
// CONFIGURATION
// --------------------------------------------------
const FACTORY_ADDRESS = '0x38CfF817498fcA61e9f71Eee195d546E13F3bB49';
const PAIR_REFETCH_INTERVAL = 15000; // Refetch data every 15 seconds
// --------------------------------------------------

// Pair ABI (Defined locally for convenience and clarity)
const PAIR_ABI = [
    { name: 'getReserves', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint112', name: 'reserve0' }, { type: 'uint112', name: 'reserve1' }] },
    { name: 'token0', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
    { name: 'lpToken', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
] as const;

// LP token ABI
const LP_ABI = [
    { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const;

// --------------------------------------------------
// REUSABLE COMPONENTS
// --------------------------------------------------

interface StatCardProps {
    title: string;
    value: string | number;
    unit?: string;
    icon: React.ElementType;
    color: string;
    smallText?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, unit, icon: Icon, color, smallText }) => (
    <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-lg transition duration-300 hover:shadow-xl hover:border-blue-500/50">
        <div className="flex justify-between items-start mb-3">
            <h3 className="text-sm font-semibold text-gray-400">{title}</h3>
            <div className={`p-2 rounded-full ${color}`}>
                <Icon className="h-5 w-5 text-white" />
            </div>
        </div>
        <div className="text-3xl font-extrabold text-white leading-none">
            {value}
            {unit && <span className="text-lg font-medium ml-2 text-gray-400">{unit}</span>}
        </div>
        {smallText && <p className="text-xs text-gray-500 mt-2">{smallText}</p>}
    </div>
);

// --------------------------------------------------
// MAIN COMPONENT
// --------------------------------------------------

export default function DashboardPage() {
    const [tokenA, setTokenA] = useState<Token>(TOKENS[0]);
    const [tokenB, setTokenB] = useState<Token>(TOKENS[1]);

    // Ensure tokens are sorted canonically for getPair lookup
    const [token0, token1] = useMemo(() =>
        tokenA.address.toLowerCase() < tokenB.address.toLowerCase()
            ? [tokenA, tokenB]
            : [tokenB, tokenA], [tokenA, tokenB]);

    const pairSymbol = `${tokenA.symbol}/${tokenB.symbol}`;

    // --- ON-CHAIN READS ---

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

    // --- DATA PROCESSING ---

    let reserveA = '0';
    let reserveB = '0';
    let priceA = '0';
    let priceB = '0';
    let totalLiquidity = 'N/A';
    let totalLPSupply = 'N/A';

    if (reserves && pairToken0) {
        const [r0, r1] = reserves as [bigint, bigint];

        // 1. Sort Reserves to match tokenA and tokenB
        if (pairToken0.toLowerCase() === tokenA.address.toLowerCase()) {
            reserveA = formatEther(r0);
            reserveB = formatEther(r1);
        } else {
            reserveA = formatEther(r1);
            reserveB = formatEther(r0);
        }

        const numA = Number(reserveA);
        const numB = Number(reserveB);

        // 2. Calculate Prices and Total Liquidity
        if (numA > 0 && numB > 0) {
            priceA = (numB / numA).toFixed(6); // A in terms of B
            priceB = (numA / numB).toFixed(6); // B in terms of A
            totalLiquidity = (numA + numB).toFixed(2);
        } else if (numA > 0 || numB > 0) {
            // Handle initial, asymmetric liquidity case (though V2 requires symmetrical deposits)
            totalLiquidity = (numA + numB).toFixed(2);
        }
    }

    if (totalSupply) {
        totalLPSupply = Number(formatEther(totalSupply as bigint)).toFixed(4);
    }

    const isLoading = isLoadingPair || isLoadingReserves || isLoadingSupply;

    // --- RENDER ---
    return (
        <div className="flex flex-col items-center min-h-[80vh] bg-gray-950 text-white p-4 sm:p-8">

            <header className="w-full max-w-4xl text-center mb-10">
                <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-600">
                    {pairSymbol} Pool Analytics
                </h1>
                <p className="text-gray-500 mt-2">Real-time data for the Constant Product Market</p>
            </header>

            {/* TOKEN SELECTORS (Styled) */}
            <div className="flex items-center space-x-4 mb-10 bg-gray-900 p-4 rounded-xl border border-gray-700 shadow-md">
                <select
                    value={tokenA.symbol}
                    onChange={(e) => setTokenA(TOKENS.find(t => t.symbol === e.target.value)!)}
                    className="bg-gray-800 text-white font-bold px-4 py-2 rounded-lg cursor-pointer appearance-none focus:ring-2 focus:ring-blue-500"
                >
                    {TOKENS.map(t => <option key={t.address}>{t.symbol}</option>)}
                </select>

                <Zap className="h-6 w-6 text-pink-500 animate-pulse" />

                <select
                    value={tokenB.symbol}
                    onChange={(e) => setTokenB(TOKENS.find(t => t.symbol === e.target.value)!)}
                    className="bg-gray-800 text-white font-bold px-4 py-2 rounded-lg cursor-pointer appearance-none focus:ring-2 focus:ring-blue-500"
                >
                    {TOKENS.map(t => <option key={t.address}>{t.symbol}</option>)}
                </select>
                <button
                    onClick={() => refetchReserves()}
                    className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                    title="Refresh Data"
                >
                    <RefreshCcw className="h-5 w-5 text-gray-500" />
                </button>
            </div>

            {/* LOADING / PAIR NOT FOUND STATE */}
            {isLoading && (
                <div className="text-xl text-blue-400 flex items-center gap-3">
                    <Zap className="h-6 w-6 animate-spin" /> Fetching Pool Data...
                </div>
            )}

            {!enabled && !isLoading && (
                <div className="text-xl text-yellow-400 bg-gray-800 p-6 rounded-lg">
                    ⚠️ Pair {pairSymbol} not yet created on the factory.
                </div>
            )}

            {/* KEY PERFORMANCE INDICATORS (KPIs) */}
            {enabled && !isLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl">

                    <StatCard
                        title="Total Liquidity (Combined)"
                        value={totalLiquidity}
                        unit="Tokens"
                        icon={Layers}
                        color="bg-purple-600"
                        smallText={`Based on ${tokenA.symbol} and ${tokenB.symbol} reserves.`}
                    />

                    <StatCard
                        title={`1 ${tokenA.symbol} Price`}
                        value={priceA}
                        unit={tokenB.symbol}
                        icon={TrendingUp}
                        color="bg-green-600"
                        smallText={`1 ${tokenB.symbol} ≈ ${priceB} ${tokenA.symbol}`}
                    />

                    <StatCard
                        title="LP Total Supply"
                        value={totalLPSupply}
                        unit="LP Tokens"
                        icon={HandCoins}
                        color="bg-yellow-600"
                        smallText={`Total pool shares issued for ${pairSymbol}.`}
                    />

                    <StatCard
                        title="Pair Contract Address"
                        value={pairAddress ? `${pairAddress.slice(0, 6)}...${pairAddress.slice(-4)}` : 'N/A'}
                        unit=""
                        icon={Layers}
                        color="bg-blue-600"
                        smallText="Click swap/pool to interact."
                    />
                </div>
            )}

            {/* DETAILED RESERVES */}
            {enabled && !isLoading && (
                <div className="w-full max-w-4xl mt-12">
                    <h2 className="text-3xl font-bold mb-6 text-gray-300 border-b border-gray-700 pb-2">
                        Detailed Reserves
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                            <h3 className="text-xl font-bold text-cyan-400 flex items-center gap-2 mb-4">
                                Reserve A: {tokenA.symbol}
                            </h3>
                            <p className="text-4xl font-mono text-white">{Number(reserveA).toFixed(4)}</p>
                        </div>

                        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                            <h3 className="text-xl font-bold text-pink-400 flex items-center gap-2 mb-4">
                                Reserve B: {tokenB.symbol}
                            </h3>
                            <p className="text-4xl font-mono text-white">{Number(reserveB).toFixed(4)}</p>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}