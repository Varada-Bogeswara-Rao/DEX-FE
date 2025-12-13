import { useState, useEffect } from 'react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ChevronDown, RefreshCcw, Loader2 } from 'lucide-react'; // Using lucide icons for modern look

import { ROUTER_ABI } from '../abi/RouterABI';
import { ERC20_ABI } from '../abi/ERC20ABI';
import { TOKENS, Token } from '../lib/tokens'; // Assuming tokens.ts structure is {address, symbol, icon?}

// --------------------------------------------------
// CONFIGURATION
// --------------------------------------------------
const ROUTER_ADDRESS = '0x67e676F33852354F0Aa186528476903AD3Ba66cE';
const MAX_APPROVAL_AMOUNT = parseEther('1000000000'); // Approving a large amount

// --------------------------------------------------
// COMPONENTS (Refined Spinner & Token Selector)
// --------------------------------------------------

interface TokenSelectorProps {
  label: string;
  token: Token;
  amount: string;
  isInput: boolean;
  onAmountChange: (value: string) => void;
  onTokenChange: (token: Token) => void;
  disabled: boolean;
  isFetchingPrice: boolean;
}

const TokenSelector: React.FC<TokenSelectorProps> = ({
  label,
  token,
  amount,
  isInput,
  onAmountChange,
  onTokenChange,
  disabled,
  isFetchingPrice,
}) => (
  <div className="bg-gray-800 rounded-xl p-4 transition-colors duration-200 hover:border-blue-500/50 border border-transparent">
    <div className="flex justify-between items-center mb-1">
      <label className="text-sm font-medium text-gray-400">{label}</label>
      <span className="text-xs text-gray-500">
        Balance: {/* Placeholder for future balance integration */} 0.00
      </span>
    </div>

    <div className="flex items-center space-x-3">
      {/* AMOUNT INPUT/DISPLAY */}
      <div className="grow">
        {isInput ? (
          <input
            type="number"
            placeholder="0.0"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            className="w-full text-3xl bg-transparent outline-none text-white placeholder-gray-600 font-mono"
            min="0"
          />
        ) : (
          <div className="text-3xl text-gray-300 font-mono min-h-10 flex items-center">
            {isFetchingPrice ? (
              <Loader2 className="animate-spin h-5 w-5 text-gray-500" />
            ) : (
              // Ensure output is displayed cleanly, maybe with fewer decimals if large
              Number(amount).toFixed(6)
            )}
          </div>
        )}
      </div>

      {/* TOKEN SELECTOR */}
      <select
        value={token.symbol}
        onChange={(e) =>
          onTokenChange(TOKENS.find((t) => t.symbol === e.target.value)!)
        }
        className="bg-gray-700 text-white font-bold px-3 py-2 rounded-full cursor-pointer appearance-none pr-8 transition-colors hover:bg-gray-600 text-lg"
        style={{ backgroundImage: 'none' }} // Remove default select arrow
        disabled={disabled}
      >
        {TOKENS.map((t) => (
          <option key={t.address} value={t.symbol}>
            {t.symbol}
          </option>
        ))}
      </select>
      {/* Custom arrow for select */}
      <ChevronDown className="h-4 w-4 text-gray-400 absolute right-6 top-1/2 -mt-2 pointer-events-none" />
    </div>
  </div>
);

// --------------------------------------------------
// MAIN SWAP COMPONENT
// --------------------------------------------------

export default function SwapPage() {
  const { isConnected, address } = useAccount();

  // TOKENS
  const [tokenIn, setTokenIn] = useState<Token>(TOKENS[0]);
  const [tokenOut, setTokenOut] = useState<Token>(TOKENS[1]);

  // AMOUNTS
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('0');
  const [isApproved, setIsApproved] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // WAGMI HOOKS
  const { data: hash, writeContract, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, isError: isTxError } =
    useWaitForTransactionReceipt({ hash });

  // 1. ALLOWANCE CHECK
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenIn.address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address!, ROUTER_ADDRESS],
    query: { enabled: !!address, refetchInterval: 5000 }, // Refetch every 5s
  });

  // 2. PRICE QUOTE (getAmountsOut)
  const { data: amountsOutData, isLoading: isFetchingPrice } = useReadContract({
    address: ROUTER_ADDRESS,
    abi: ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: [
      amountIn ? parseEther(amountIn) : 0n,
      [tokenIn.address, tokenOut.address],
    ],
    query: {
      enabled: !!amountIn && Number(amountIn) > 0 && tokenIn.address !== tokenOut.address,
      refetchInterval: 8000 // Refetch price every 8s
    },
  });

  // --- EFFECTS ---

  // Update amountOut when amountsOutData changes
  useEffect(() => {
    if (amountsOutData) {
      const out = (amountsOutData as bigint[])[1];
      // Format to a more readable string
      setAmountOut(Number(formatEther(out)).toFixed(6));
    } else {
      setAmountOut('0');
    }
  }, [amountsOutData]);

  // Check Approval Status
  useEffect(() => {
    if (!allowance || !amountIn) {
      setIsApproved(false);
      return;
    }
    try {
      setIsApproved((allowance as bigint) >= parseEther(amountIn));
    } catch {
      setIsApproved(false); // Handle invalid amountIn state
    }

  }, [allowance, amountIn]);

  // Show Success Message and clear input on success
  useEffect(() => {
    if (isSuccess) {
      setShowSuccess(true);
      setAmountIn(''); // Clear input after successful swap
      refetchAllowance(); // Re-check allowance immediately
      setTimeout(() => setShowSuccess(false), 3000);
      reset(); // Clear useWriteContract state
    }
  }, [isSuccess, refetchAllowance, reset]);

  // --- HANDLERS ---

  const switchTokens = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn('');
    setAmountOut('0');
  };

  const approve = () => {
    writeContract({
      address: tokenIn.address,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [ROUTER_ADDRESS, MAX_APPROVAL_AMOUNT],
    });
  };

  const handleSwap = () => {
    // SECURITY: Calculate minimum output with 0.5% slippage
    if (!amountsOutData || Number(amountIn) <= 0) return;

    const calculatedAmountOut = (amountsOutData as bigint[])[1];
    // 0.5% slippage: 995/1000
    const slippageNumerator = 995n;
    const slippageDenominator = 1000n;
    const amountOutMin = (calculatedAmountOut * slippageNumerator) / slippageDenominator;

    writeContract({
      address: ROUTER_ADDRESS,
      abi: ROUTER_ABI,
      functionName: 'swapExactTokensForTokens',
      args: [
        parseEther(amountIn),
        amountOutMin, // Using calculated slippage
        [tokenIn.address, tokenOut.address],
        address!,
        BigInt(Math.floor(Date.now() / 1000) + 1200),
      ],
    });
  };

  const isButtonDisabled = !amountIn || Number(amountIn) <= 0 || isPending || isConfirming || tokenIn.address === tokenOut.address;
  const isApproving = isPending || (isConfirming && hash);

  // --- UI RENDER ---

  return (
    <div className="flex justify-center min-h-[80vh] items-center bg-gray-950 text-white p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-2xl">

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Token Swap</h2>
          <RefreshCcw className="h-5 w-5 text-gray-500 cursor-pointer hover:text-white transition-colors" />
        </div>

        {/* 1. INPUT TOKEN SELECTOR */}
        <TokenSelector
          label="You pay"
          token={tokenIn}
          amount={amountIn}
          isInput={true}
          onAmountChange={setAmountIn}
          onTokenChange={setTokenIn}
          disabled={false}
          isFetchingPrice={false}
        />

        {/* SWITCH BUTTON */}
        <div className="flex justify-center -my-3 relative z-10">
          <button
            onClick={switchTokens}
            className="bg-gray-950 p-3 rounded-full border-4 border-gray-900 text-white hover:bg-gray-800 transition-colors shadow-lg"
            title="Switch Tokens"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-down-up h-5 w-5"><polyline points="10 13 15 18 20 13" /><path d="M15 18V6" /><polyline points="4 11 9 6 14 11" /><path d="M9 6v12" /></svg>
          </button>
        </div>

        {/* 2. OUTPUT TOKEN SELECTOR */}
        <TokenSelector
          label="You receive (estimated)"
          token={tokenOut}
          amount={amountOut}
          isInput={false}
          onAmountChange={() => { }} // Disabled for output
          onTokenChange={setTokenOut}
          disabled={false}
          isFetchingPrice={isFetchingPrice}
        />

        {/* PRICE INFORMATION/DETAILS */}
        {amountsOutData && (
          <div className="mt-4 p-3 bg-gray-800 rounded-xl text-sm text-gray-400">
            <div className="flex justify-between">
              <span>Price</span>
              <span className="font-mono">1 {tokenIn.symbol} ≈ {Number(amountIn) > 0 && Number(amountOut) > 0 ? (Number(amountOut) / Number(amountIn)).toFixed(6) : 'N/A'} {tokenOut.symbol}</span>
            </div>
          </div>
        )}

        {/* ACTION BUTTON */}
        <div className="mt-6">
          {!isConnected ? (
            <div className="w-full flex justify-center">
              <ConnectButton />
            </div>
          ) : !isApproved ? (
            <button
              onClick={approve}
              disabled={isButtonDisabled}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-colors flex justify-center items-center gap-2 ${isButtonDisabled
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
            >
              {isApproving && <Loader2 className="animate-spin h-5 w-5" />}
              {isApproving ? 'Confirming Approval...' : `Approve ${tokenIn.symbol}`}
            </button>
          ) : (
            <button
              onClick={handleSwap}
              disabled={isButtonDisabled}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-colors flex justify-center items-center gap-2 ${isButtonDisabled
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-pink-600 hover:bg-pink-500 text-white'
                }`}
            >
              {isApproving && <Loader2 className="animate-spin h-5 w-5" />}
              {isApproving ? 'Confirming Swap...' : 'Swap'}
            </button>
          )}
        </div>

        {/* STATUS MESSAGES */}
        {showSuccess && <div className="mt-4 p-3 bg-green-900/50 border border-green-700 text-green-300 rounded-lg text-center text-sm animate-pulse">✅ Transaction Successful!</div>}
        {(error || isTxError) && (
          <div className="mt-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-sm wrap-break-word">
            Error: {error ? error.message.split('\n')[0] : 'Transaction failed.'}
          </div>
        )}
      </div>
    </div>
  );
}