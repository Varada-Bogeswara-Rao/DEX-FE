import { useState, useEffect, useMemo } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, formatEther, parseUnits } from 'viem'; // Imported parseUnits for general safety
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { RefreshCcw, Loader2, Minus, Plus } from 'lucide-react'; // Using Lucide icons for UI

// --- Contract ABIs (Assumed available) ---
import { ROUTER_ABI } from '../abi/RouterABI';
import { ERC20_ABI } from '../abi/ERC20ABI';
import { FactoryABI } from '../abi/FactoryABI';
import { LpABI } from '../abi/LpABI';

// --- Token Data (Assumed structure from your previous context) ---
import { TOKENS, Token } from '../lib/tokens';

// -----------------------------------------------------------------
// CONFIGURATION
// -----------------------------------------------------------------
const FACTORY_ADDRESS = '0x38CfF817498fcA61e9f71Eee195d546E13F3bB49';
const ROUTER_ADDRESS = '0x67e676F33852354F0Aa186528476903AD3Ba66cE';
// MAX_APPROVAL_AMOUNT is no longer needed
// -----------------------------------------------------------------

// ABI to read Reserves + Token0 + lpToken (Combined for fewer read calls)
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
// REUSABLE COMPONENTS
// -----------------------------------------------------------------

const Spinner = () => (
    <Loader2 className="animate-spin h-5 w-5 text-white" />
);

interface TokenSelectInputProps {
    token: Token;
    amount: string;
    label: string;
    isLP?: boolean;
    onChange: (value: string) => void;
    onTokenChange: (token: Token) => void;
}

const TokenSelectInput: React.FC<TokenSelectInputProps> = ({ token, amount, label, isLP = false, onChange, onTokenChange }) => (
    <div className="bg-gray-800 rounded-xl p-4 border border-transparent">
        <label className="text-sm font-medium text-gray-400 block mb-1">{label}</label>
        <div className="flex items-center space-x-3">
            <input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => onChange(e.target.value)}
                className="w-full text-2xl bg-transparent outline-none text-white placeholder-gray-600 font-mono"
                min="0"

            />
           
            {/* TOKEN SELECTOR (Dropdown) */}
            <select
                value={token.symbol}
                onChange={(e) => onTokenChange(TOKENS.find(t => t.symbol === e.target.value)!)}
                className="bg-gray-700 text-white font-bold px-3 py-2 rounded-full cursor-pointer appearance-none transition-colors hover:bg-gray-600 text-lg"
                disabled={isLP}
            >
                {TOKENS.map(t => (
                    <option key={t.address} value={t.symbol}>{t.symbol}</option>
                ))}
            </select>
        </div>
    </div>
);


// -----------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------

export default function PoolPage() {
    const { isConnected, address } = useAccount();

    // --- STATE ---
    const [isAddMode, setIsAddMode] = useState(true);
    const [tokenA, setTokenA] = useState<Token>(TOKENS[0]);
    const [tokenB, setTokenB] = useState<Token>(TOKENS[1]);
    // FIX 2: amountA/B/LP are NOT cleared in useEffect, they are cleared in handler functions
    const [amountA, setAmountA] = useState('');
    const [amountB, setAmountB] = useState('');
    const [amountLPRemove, setAmountLPRemove] = useState('');
    const [currentStep, setCurrentStep] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    // --- WRITE HOOKS ---
    const { data: hash, writeContract, isPending, error, reset } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isTxError } = useWaitForTransactionReceipt({ hash });

    // --- SORT TOKENS & DERIVE PAIR ADDRESS ---
    const [token0, token1] = useMemo(() =>
        tokenA.address.toLowerCase() < tokenB.address.toLowerCase()
            ? [tokenA, tokenB]
            : [tokenB, tokenA]
        , [tokenA, tokenB]);

    const { data: pairAddress, refetch: refetchPairAddress } = useReadContract({
        address: FACTORY_ADDRESS,
        abi: FactoryABI,
        functionName: 'getPair',
        args: [token0.address, token1.address],
    });

    const poolExists = pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000';

    // --- READ HOOKS ---
    // Using PAIR_RESERVES_ABI to read lpToken, which must be public in Pair.sol
    const { data: lpTokenAddress, refetch: refetchLpTokenAddress } = useReadContract({
        address: pairAddress as `0x${string}`,
        abi: PAIR_RESERVES_ABI, // Corrected ABI
        functionName: 'lpToken',
        query: { enabled: !!pairAddress && poolExists },
    });

    const { data: lpBalance, isLoading: isBalanceLoading, refetch: refetchLpBalance } = useReadContract({
        address: lpTokenAddress! as `0x${string}`, // Safe assertion
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

    // --- AUTO-CALCULATE LOGIC ---
    const calculateOtherAmount = (value: string, isFieldA: boolean) => {
        if (!value || !reserves || !token0Address) return '';

        const [reserve0, reserve1] = reserves as [bigint, bigint];
        let reserveIn = 0n;
        let reserveOut = 0n;

        // Determine which reserve is for tokenA/In and tokenB/Out
        const tokenInAddress = isFieldA ? tokenA.address : tokenB.address;
        const tokenOutAddress = isFieldA ? tokenB.address : tokenA.address;

        if (token0Address.toLowerCase() === tokenInAddress.toLowerCase()) {
            reserveIn = reserve0;
            reserveOut = reserve1;
        } else {
            reserveIn = reserve1;
            reserveOut = reserve0;
        }

        if (reserveIn === 0n || reserveOut === 0n) return '';

        try {
            // Assuming 18 decimals for simplicity, but in a multi-decimal scenario, use parseUnits
            const valBig = parseEther(value);
            // Quote logic: amountOut = (amountIn * reserveOut) / reserveIn
            const calculatedOut = (valBig * reserveOut) / reserveIn;
            return formatEther(calculatedOut);
        } catch (e) {
            return '';
        }
    };

    // --- EVENT HANDLERS ---
    const handleAmountAChange = (val: string) => {
        setAmountA(val);
        if (isAddMode && poolExists) {
            const autoB = calculateOtherAmount(val, true);
            setAmountB(autoB);
        } else if (!poolExists) {
            // If pool doesn't exist, user is setting the initial ratio, so no auto-fill
            setAmountB(amountB);
        }
    };

    const handleAmountBChange = (val: string) => {
        setAmountB(val);
        if (isAddMode && poolExists) {
            setAmountA('');
        }
    };

    // --- CONTRACT CALLS ---
    // FIX 1: Accepts dynamic amount instead of using MAX_APPROVAL_AMOUNT
    const handleApprove = (tokenAddr: `0x${string}`, amount: string, stepName: string) => {
        if (!amount || Number(amount) <= 0) return;
        setCurrentStep(stepName);

        // Approve the exact amount the user wants to deposit/burn
        const amountToApprove = parseEther(amount);

        writeContract({
            address: tokenAddr,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [ROUTER_ADDRESS, amountToApprove], // Dynamic Approval
        });
    };

    const handleAddLiquidity = () => {
        if (!amountA || !amountB || Number(amountA) <= 0 || Number(amountB) <= 0) return;
        setCurrentStep('add');

        // SAFETY: Calculate min amounts with 0.5% slippage (995/1000)
        const slippageNumerator = 995n;
        const slippageDenominator = 1000n;

        const amountA_bn = parseEther(amountA);
        const amountB_bn = parseEther(amountB);

        const amountAMin = (amountA_bn * slippageNumerator) / slippageDenominator;
        const amountBMin = (amountB_bn * slippageNumerator) / slippageDenominator;

        writeContract({
            address: ROUTER_ADDRESS,
            abi: ROUTER_ABI,
            functionName: 'addLiquidity',
            args: [
                tokenA.address,
                tokenB.address,
                amountA_bn,
                amountB_bn,
                amountAMin, // With slippage
                amountBMin, // With slippage
                address!,
                BigInt(Math.floor(Date.now() / 1000) + 1200)
            ],
        });
        // FIX 2: Clear state immediately after submission
        setAmountA('');
        setAmountB('');
    };

    const handleRemoveLiquidity = () => {
        if (!amountLPRemove || Number(amountLPRemove) <= 0) return;
        setCurrentStep('remove');

        // NOTE: Still using 0n for min returns. For production, a quote function is needed.
        writeContract({
            address: ROUTER_ADDRESS,
            abi: ROUTER_ABI,
            functionName: 'removeLiquidity',
            args: [
                tokenA.address,
                tokenB.address,
                parseEther(amountLPRemove),
                0n,
                0n,
                address!,
                BigInt(Math.floor(Date.now() / 1000) + 1200)
            ],
        });
        // FIX 2: Clear state immediately after submission
        setAmountLPRemove('');
    };

    // --- EFFECTS ---
    useEffect(() => {
        if (isConfirmed) {
            setShowSuccess(true);
            // No need to clear A/B/LP here anymore, done in the handlers
            refetchLpBalance();
            refetchReserves();
            refetchPairAddress();
            refetchLpTokenAddress();
            setTimeout(() => setShowSuccess(false), 3000);
            reset(); // Clear useWriteContract state
        }
    }, [isConfirmed, refetchLpBalance, refetchReserves, refetchPairAddress, refetchLpTokenAddress, reset]);

    // --- UI RENDER VARS ---
    const isActionPending = isPending || isConfirming;
    const isButtonDisabled = !isConnected || isActionPending || tokenA.address === tokenB.address;
    const formattedLPBalance = lpBalance ? Number(formatEther(lpBalance as bigint)).toFixed(4) : '0.0000';
    const pairSymbol = `${tokenA.symbol}-${tokenB.symbol}`;

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] bg-gray-950 text-white px-4">
            <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Liquidity Pool</h2>
                    <RefreshCcw className="h-5 w-5 text-gray-500 cursor-pointer hover:text-white transition-colors" />
                </div>

                {/* TABS */}
                <div className="flex bg-gray-800 p-1 rounded-xl mb-6">
                    <button onClick={() => setIsAddMode(true)} className={`flex-1 py-2 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2 ${isAddMode ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
                        <Plus className='h-4 w-4' /> Add
                    </button>
                    <button onClick={() => setIsAddMode(false)} className={`flex-1 py-2 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2 ${!isAddMode ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
                        <Minus className='h-4 w-4' /> Remove
                    </button>
                </div>

                {/* LP BALANCE */}
                {poolExists && (
                    <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-3 mb-6 text-center">
                        <p className="text-gray-400 text-sm">Your {pairSymbol} LP Share</p>
                        <p className="text-2xl font-bold text-blue-200 min-h-8">
                            {formattedLPBalance} <span className="text-sm ml-1 text-blue-400">LP Tokens</span>
                        </p>
                    </div>
                )}


                {/* TOKEN SELECTORS */}
                <div className="flex gap-4 mb-4">
                    <div className="w-1/2">
                        <label className="text-xs text-gray-400 block mb-1">Token A</label>
                        <select
                            value={tokenA.symbol}
                            onChange={(e) => setTokenA(TOKENS.find(t => t.symbol === e.target.value)!)}
                            className="w-full bg-gray-800 p-2 rounded-lg font-bold text-white cursor-pointer"
                        >
                            {TOKENS.map(t => <option key={t.address} value={t.symbol}>{t.symbol}</option>)}
                        </select>
                    </div>
                    <div className="w-1/2">
                        <label className="text-xs text-gray-400 block mb-1">Token B</label>
                        <select
                            value={tokenB.symbol}
                            onChange={(e) => setTokenB(TOKENS.find(t => t.symbol === e.target.value)!)}
                            className="w-full bg-gray-800 p-2 rounded-lg font-bold text-white cursor-pointer"
                        >
                            {TOKENS.map(t => <option key={t.address} value={t.symbol}>{t.symbol}</option>)}
                        </select>
                    </div>
                </div>

                {tokenA.address === tokenB.address && (
                    <div className="bg-red-900/30 border border-red-700 text-red-300 p-3 rounded-lg text-sm mb-4">
                        ❌ Cannot create a pool with identical tokens.
                    </div>
                )}

                {!poolExists && tokenA.address !== tokenB.address && isAddMode && (
                    <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-300 p-3 rounded-lg text-sm mb-4">
                        ⚠️ No pool found for {pairSymbol}. The first deposit will initialize it.
                    </div>
                )}

                {!isConnected ? <div className="flex justify-center"><ConnectButton /></div> : (
                    <>
                        {/* ADD LIQUIDITY MODE */}
                        {isAddMode && (
                            <div className="space-y-4">
                                <TokenSelectInput
                                    token={tokenA}
                                    amount={amountA}
                                    onChange={handleAmountAChange}
                                    onTokenChange={setTokenA}
                                    label={`Amount of ${tokenA.symbol}`}
                                />
                                <TokenSelectInput
                                    token={tokenB}
                                    amount={amountB}
                                    onChange={handleAmountBChange}
                                    onTokenChange={setTokenB}
                                    label={`Amount of ${tokenB.symbol} (Calculated: ${poolExists ? 'Balanced' : 'Manual'})`}
                                />

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button
                                        onClick={() => handleApprove(tokenA.address, amountA, 'approveA')}
                                        disabled={isButtonDisabled || !amountA || Number(amountA) <= 0}
                                        className={`py-3 rounded-xl font-bold text-sm transition flex justify-center items-center gap-2 ${isButtonDisabled || !amountA ? 'bg-gray-700 text-gray-400' : 'bg-blue-600 hover:bg-blue-500'}`}
                                    >
                                        {isActionPending && currentStep === 'approveA' && <Spinner />} Approve {tokenA.symbol}
                                    </button>
                                    <button
                                        onClick={() => handleApprove(tokenB.address, amountB, 'approveB')}
                                        disabled={isButtonDisabled || !amountB || Number(amountB) <= 0}
                                        className={`py-3 rounded-xl font-bold text-sm transition flex justify-center items-center gap-2 ${isButtonDisabled || !amountB ? 'bg-gray-700 text-gray-400' : 'bg-blue-600 hover:bg-blue-500'}`}
                                    >
                                        {isActionPending && currentStep === 'approveB' && <Spinner />} Approve {tokenB.symbol}
                                    </button>
                                </div>
                                <button
                                    onClick={handleAddLiquidity}
                                    disabled={isButtonDisabled || !amountA || !amountB || Number(amountA) <= 0 || Number(amountB) <= 0}
                                    className={`w-full py-4 rounded-xl font-bold text-lg transition-colors flex justify-center items-center gap-2 ${isButtonDisabled || !amountA || !amountB ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-pink-600 hover:bg-pink-500 text-white'}`}
                                >
                                    {isActionPending && currentStep === 'add' && <Spinner />} Add Liquidity
                                </button>
                            </div>
                        )}

                        {/* REMOVE LIQUIDITY MODE */}
                        {!isAddMode && (
                            <div className="space-y-4">
                                {poolExists ? (
                                    <>
                                        <TokenSelectInput
                                            token={{ chainId: tokenA.chainId, address: lpTokenAddress! as `0x${string}`, symbol: pairSymbol, decimals: 18, name: `${pairSymbol} LP` }}
                                            amount={amountLPRemove}
                                            onChange={setAmountLPRemove}
                                            onTokenChange={() => { }}
                                           label={`LP Tokens to Burn (Your Balance: ${formattedLPBalance})`}
                                            isLP={true}
                                        />

                                        <button
                                            onClick={() => handleApprove(lpTokenAddress! as `0x${string}`, amountLPRemove, 'approveLP')}
                                            disabled={isButtonDisabled || !amountLPRemove || Number(amountLPRemove) <= 0 || !lpTokenAddress}
                                            className={`w-full py-3 rounded-xl font-bold text-sm transition flex justify-center items-center gap-2 ${isButtonDisabled || !amountLPRemove ? 'bg-gray-700 text-gray-400' : 'bg-blue-600 hover:bg-blue-500'}`}
                                        >
                                            {isActionPending && currentStep === 'approveLP' && <Spinner />} Approve LP Token
                                        </button>
                                        <button
                                            onClick={handleRemoveLiquidity}
                                            disabled={isButtonDisabled || !amountLPRemove || Number(amountLPRemove) <= 0 || !lpTokenAddress}
                                            className={`w-full py-4 rounded-xl font-bold text-lg transition-colors flex justify-center items-center gap-2 ${isButtonDisabled || !amountLPRemove ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 text-white'}`}
                                        >
                                            {isActionPending && currentStep === 'remove' && <Spinner />} Remove Liquidity
                                        </button>
                                    </>
                                ) : (
                                    <div className="bg-gray-800/50 p-6 rounded-xl text-center text-gray-400">
                                        No active {pairSymbol} pool to remove liquidity from.
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* STATUS MESSAGES */}
                {showSuccess && (
                    <div className="mt-4 p-3 bg-green-900/50 border border-green-800 text-green-200 rounded-lg text-center text-sm animate-pulse">
                        {currentStep === 'add' && `✅ Liquidity Added! Received ${pairSymbol} LP tokens.`}
                        {currentStep === 'remove' && "🔥 Liquidity Removed! Tokens returned."}
                        {currentStep.includes('approve') && "✅ Approved! Now continue."}
                    </div>
                )}
                {(error || isTxError) && <div className="mt-4 p-3 bg-red-900/50 border border-red-800 text-red-200 rounded-lg text-sm wrap-break-word">Error: {error?.message.split('\n')[0] || 'Transaction failed.'}</div>}
            </div>
        </div>
    );
}