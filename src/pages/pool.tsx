import { useState, useEffect, useMemo } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { RefreshCcw, Loader2, Minus, Plus, ChevronDown, Info, AlertOctagon } from 'lucide-react';

import { ROUTER_ABI } from '../abi/RouterABI';
import { ERC20_ABI } from '../abi/ERC20ABI';
import { FactoryABI } from '../abi/FactoryABI';
import { TOKENS, Token } from '../lib/tokens';
import TokenModal from '../components/TokenModal';

// -----------------------------------------------------------------
// CONFIG
// -----------------------------------------------------------------
const FACTORY_ADDRESS = '0x38CfF817498fcA61e9f71Eee195d546E13F3bB49';
const ROUTER_ADDRESS = '0x67e676F33852354F0Aa186528476903AD3Ba66cE';

const PAIR_RESERVES_ABI = [
    {
        "constant": true, "inputs": [], "name": "getReserves",
        "outputs": [
            { "internalType": "uint112", "name": "_reserve0", "type": "uint112" },
            { "internalType": "uint112", "name": "_reserve1", "type": "uint112" }
        ],
        "stateMutability": "view", "type": "function"
    },
    {
        "constant": true, "inputs": [], "name": "token0",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view", "type": "function"
    },
    {
        "constant": true, "inputs": [], "name": "lpToken",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view", "type": "function"
    }
] as const;

// -----------------------------------------------------------------
// COMPONENTS
// -----------------------------------------------------------------

const Spinner = () => <Loader2 className="animate-spin h-5 w-5 text-white/50" />;

const TokenSelectInput: React.FC<{
    token: Token;
    amount: string;
    label: string;
    isLP?: boolean;
    onChange: (value: string) => void;
    onTokenClick?: () => void;
}> = ({ token, amount, label, isLP = false, onChange, onTokenClick }) => (
    <div className="bg-black/20 hover:bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-white/5 transition-all group focus-within:border-white/10 focus-within:bg-black/40">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 block px-1 group-focus-within:text-gray-400 transition-colors">{label}</label>
        <div className="flex items-center gap-4">
            <input
                type="text"
                pattern="^[0-9]*[.,]?[0-9]*$"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                    if (e.target.value === '' || /^[0-9]*[.,]?[0-9]*$/.test(e.target.value)) {
                        onChange(e.target.value);
                    }
                }}
                className="w-full text-3xl bg-transparent outline-none text-white placeholder-gray-700 font-light"
            />

            {onTokenClick ? (
                <button
                    onClick={onTokenClick}
                    className="flex-shrink-0 flex items-center gap-2 bg-black/40 hover:bg-white/5 text-white font-medium px-4 py-2 rounded-xl cursor-pointer transition-all border border-white/5 hover:border-white/10"
                >
                    <div className="w-5 h-5 rounded-full bg-indigo-500/50 flex items-center justify-center text-[10px]">{token.symbol[0]}</div>
                    {token.symbol} <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
            ) : (
                <div className="flex-shrink-0 flex items-center gap-2 bg-white/5 text-gray-400 font-medium px-4 py-2 rounded-xl border border-white/5 cursor-default">
                    {token.symbol}
                </div>
            )}
        </div>
    </div>
);

// -----------------------------------------------------------------
// PAGE
// -----------------------------------------------------------------

export default function PoolPage() {
    const { isConnected, address } = useAccount();

    const [isAddMode, setIsAddMode] = useState(true);
    const [tokenA, setTokenA] = useState<Token>(TOKENS[0]);
    const [tokenB, setTokenB] = useState<Token>(TOKENS[1]);

    // MODAL
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectingMode, setSelectingMode] = useState<'A' | 'B'>('A');

    // STATES
    const [amountA, setAmountA] = useState('');
    const [amountB, setAmountB] = useState('');
    const [amountLPRemove, setAmountLPRemove] = useState('');
    const [currentStep, setCurrentStep] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    const { data: hash, writeContract, isPending, error, reset } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isTxError } = useWaitForTransactionReceipt({ hash });

    // SORTED TOKENS
    const [token0, token1] = useMemo(() =>
        tokenA.address.toLowerCase() < tokenB.address.toLowerCase()
            ? [tokenA, tokenB]
            : [tokenB, tokenA]
        , [tokenA, tokenB]);

    // WAAGMI READS
    const { data: pairAddress, refetch: refetchPairAddress } = useReadContract({
        address: FACTORY_ADDRESS,
        abi: FactoryABI,
        functionName: 'getPair',
        args: [token0.address, token1.address],
    });

    const poolExists = pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000';

    const { data: lpTokenAddress, refetch: refetchLpTokenAddress } = useReadContract({
        address: pairAddress as `0x${string}`,
        abi: PAIR_RESERVES_ABI,
        functionName: 'lpToken',
        query: { enabled: !!pairAddress && poolExists },
    });

    const { data: lpBalance, refetch: refetchLpBalance } = useReadContract({
        address: lpTokenAddress! as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address!],
        query: { enabled: !!lpTokenAddress && !!address, refetchInterval: 5000 }
    });

    const { data: reserves, refetch: refetchReserves } = useReadContract({
        address: pairAddress as `0x${string}`,
        abi: PAIR_RESERVES_ABI,
        functionName: 'getReserves',
        query: { enabled: poolExists, refetchInterval: 5000 }
    });

    const { data: token0Address } = useReadContract({
        address: pairAddress as `0x${string}`,
        abi: PAIR_RESERVES_ABI,
        functionName: 'token0',
        query: { enabled: poolExists }
    });

    // HELPERS
    const calculateOtherAmount = (value: string, isFieldA: boolean) => {
        if (!value || !reserves || !token0Address) return '';
        const [reserve0, reserve1] = reserves as [bigint, bigint];
        let reserveIn = 0n, reserveOut = 0n;
        const tokenInAddress = isFieldA ? tokenA.address : tokenB.address;

        if (token0Address.toLowerCase() === tokenInAddress.toLowerCase()) {
            reserveIn = reserve0; reserveOut = reserve1;
        } else {
            reserveIn = reserve1; reserveOut = reserve0;
        }
        if (reserveIn === 0n || reserveOut === 0n) return '';
        try {
            const valBig = parseEther(value);
            return formatEther((valBig * reserveOut) / reserveIn);
        } catch { return ''; }
    };

    const handleAmountAChange = (val: string) => {
        setAmountA(val);
        if (isAddMode && poolExists) {
            setAmountB(calculateOtherAmount(val, true));
        }
    };

    const handleAmountBChange = (val: string) => {
        setAmountB(val);
        if (isAddMode && poolExists) {
            setAmountA('');
        }
    };

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

    const handleApprove = (tokenAddr: `0x${string}`, amount: string, stepName: string) => {
        if (!amount || Number(amount) <= 0) return;
        setCurrentStep(stepName);
        writeContract({
            address: tokenAddr, abi: ERC20_ABI, functionName: 'approve', args: [ROUTER_ADDRESS, parseEther(amount)],
        });
    };

    const handleAddLiquidity = () => {
        if (!amountA || !amountB) return;
        setCurrentStep('add');
        const aBN = parseEther(amountA), bBN = parseEther(amountB);
        writeContract({
            address: ROUTER_ADDRESS, abi: ROUTER_ABI, functionName: 'addLiquidity',
            args: [tokenA.address, tokenB.address, aBN, bBN, (aBN * 995n) / 1000n, (bBN * 995n) / 1000n, address!, BigInt(Math.floor(Date.now() / 1000) + 1200)],
        });
        setAmountA(''); setAmountB('');
    };

    const handleRemoveLiquidity = () => {
        if (!amountLPRemove) return;
        setCurrentStep('remove');
        writeContract({
            address: ROUTER_ADDRESS, abi: ROUTER_ABI, functionName: 'removeLiquidity',
            args: [tokenA.address, tokenB.address, parseEther(amountLPRemove), 0n, 0n, address!, BigInt(Math.floor(Date.now() / 1000) + 1200)],
        });
        setAmountLPRemove('');
    };

    useEffect(() => {
        if (isConfirmed) {
            setShowSuccess(true);
            refetchLpBalance(); refetchReserves(); refetchPairAddress(); refetchLpTokenAddress();
            setTimeout(() => setShowSuccess(false), 3000);
            reset();
        }
    }, [isConfirmed, refetchLpBalance, refetchReserves, refetchPairAddress, refetchLpTokenAddress, reset]);

    const isActionPending = isPending || isConfirming;
    const isButtonDisabled = !isConnected || isActionPending || tokenA.address === tokenB.address;
    const pairSymbol = `${tokenA.symbol}/${tokenB.symbol}`;
    const formattedLPBalance = lpBalance ? Number(formatEther(lpBalance as bigint)).toFixed(4) : '0.00';

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-white px-4">

            {/* MAIN CARD */}
            <div className="w-full max-w-[500px] bg-black/40 backdrop-blur-2xl border border-white/5 rounded-[32px] p-6 shadow-2xl relative">

                {/* HEADER */}
                <div className="flex justify-between items-center mb-8 px-2">
                    <div>
                        <h2 className="text-xl font-medium text-white">Pool Management</h2>
                        <span className="text-xs text-gray-500 font-mono">V2 LIQUIDITY</span>
                    </div>
                    <button onClick={() => { refetchReserves(); refetchLpBalance(); }} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white">
                        <RefreshCcw className="h-4 w-4" />
                    </button>
                </div>

                {/* TABS */}
                <div className="flex bg-black/30 p-1.5 rounded-2xl mb-8 border border-white/5">
                    <button onClick={() => setIsAddMode(true)} className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 ${isAddMode ? 'bg-[#1a1a1a] text-white shadow-lg border border-white/5' : 'text-gray-500 hover:text-white'}`}>
                        <Plus className='h-4 w-4' /> Deposit
                    </button>
                    <button onClick={() => setIsAddMode(false)} className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 ${!isAddMode ? 'bg-[#1a1a1a] text-white shadow-lg border border-white/5' : 'text-gray-500 hover:text-white'}`}>
                        <Minus className='h-4 w-4' /> Withdraw
                    </button>
                </div>

                {/* WARNINGS */}
                {tokenA.address === tokenB.address && (
                    <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400 text-sm">
                        <AlertOctagon className="h-5 w-5" /> Select different tokens.
                    </div>
                )}
                {!poolExists && tokenA.address !== tokenB.address && isAddMode && (
                    <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-blue-500/5 border border-blue-500/10 text-blue-400 text-sm">
                        <Info className="h-5 w-5" /> You are creating a new pool.
                    </div>
                )}


                {!isConnected ? (
                    <div className="flex justify-center w-full py-8 [&>button]:!w-full [&>button]:!h-14 [&>button]:!bg-[#311c31]/80 [&>button]:!text-[#fc72ff] [&>button]:!font-bold [&>button]:!rounded-2xl">
                        <ConnectButton />
                    </div>
                ) : (
                    <div className="space-y-4">

                        {/* ADD MODE */}
                        {isAddMode && (
                            <>
                                <TokenSelectInput token={tokenA} amount={amountA} onChange={handleAmountAChange} onTokenClick={() => openTokenModal('A')} label="Token 01" />
                                <div className="flex justify-center -my-3 relative z-10"><div className="bg-[#1a1a1a] p-1.5 rounded-lg border border-white/5"><Plus className="w-4 h-4 text-gray-500" /></div></div>
                                <TokenSelectInput token={tokenB} amount={amountB} onChange={handleAmountBChange} onTokenClick={() => openTokenModal('B')} label="Token 02" />

                                <div className="pt-4 grid grid-cols-2 gap-3">
                                    <button disabled={isButtonDisabled || !amountA} onClick={() => handleApprove(tokenA.address, amountA, 'approveA')} className="h-12 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed">
                                        {isActionPending && currentStep === 'approveA' ? <Spinner /> : `Approve ${tokenA.symbol}`}
                                    </button>
                                    <button disabled={isButtonDisabled || !amountB} onClick={() => handleApprove(tokenB.address, amountB, 'approveB')} className="h-12 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed">
                                        {isActionPending && currentStep === 'approveB' ? <Spinner /> : `Approve ${tokenB.symbol}`}
                                    </button>
                                </div>
                                <button onClick={handleAddLiquidity} disabled={isButtonDisabled || !amountA || !amountB} className="w-full h-14 mt-2 rounded-xl bg-[#fc72ff] hover:opacity-90 text-white font-bold text-lg shadow-[0_0_20px_rgba(252,114,255,0.3)] disabled:opacity-50 disabled:shadow-none disabled:bg-white/5 disabled:text-gray-500 transition-all">
                                    {isActionPending && currentStep === 'add' ? 'Supplying...' : 'Add Liquidity'}
                                </button>
                            </>
                        )}

                        {/* REMOVE MODE */}
                        {!isAddMode && poolExists && (
                            <>
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 mb-4 flex justify-between items-center px-6">
                                    <span className="text-gray-400 text-sm">Your Position</span>
                                    <span className="text-2xl font-light text-white">{formattedLPBalance} <span className="text-sm text-gray-600 font-bold">LP</span></span>
                                </div>

                                <TokenSelectInput token={{ ...tokenA, symbol: 'LP Tokens' }} amount={amountLPRemove} label="Amount to Remove" isLP onChange={setAmountLPRemove} />

                                <button onClick={() => handleApprove(lpTokenAddress! as `0x${string}`, amountLPRemove, 'approveLP')} disabled={isButtonDisabled || !amountLPRemove} className="w-full h-12 mt-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-sm disabled:opacity-30">
                                    {isActionPending && currentStep === 'approveLP' ? 'Approving...' : 'Approve Spend'}
                                </button>

                                <button onClick={handleRemoveLiquidity} disabled={isButtonDisabled || !amountLPRemove} className="w-full h-14 mt-2 rounded-xl bg-red-500/80 hover:bg-red-500 text-white font-bold text-lg shadow-[0_0_20px_rgba(220,38,38,0.3)] disabled:opacity-50 disabled:shadow-none disabled:bg-white/5 disabled:text-gray-500 transition-all">
                                    {isActionPending && currentStep === 'remove' ? 'Burning...' : 'Remove Liquidity'}
                                </button>
                            </>
                        )}
                        {!isAddMode && !poolExists && (
                            <div className="text-center py-12 text-gray-500">No active pool found.</div>
                        )}

                    </div>
                )}
            </div>

            {/* NOTIFICATIONS */}
            {showSuccess && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 bg-[#1a1a1a] border border-green-500/30 text-green-400 rounded-full shadow-2xl flex items-center gap-3 backdrop-blur-xl animate-fade-in-up z-50">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Transaction confirmed successfully.</span>
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