import { useState, useEffect } from 'react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ChevronDown, ArrowDown, Settings, Loader2 } from 'lucide-react';

import { ROUTER_ABI } from '../abi/RouterABI';
import { ERC20_ABI } from '../abi/ERC20ABI';
import { TOKENS, Token } from '../lib/tokens';
import TokenModal from '../components/TokenModal';

// --------------------------------------------------
// CONFIGURATION
// --------------------------------------------------
const ROUTER_ADDRESS = '0x67e676F33852354F0Aa186528476903AD3Ba66cE';
const MAX_APPROVAL_AMOUNT = parseEther('1000000000');

// --------------------------------------------------
// COMPONENTS 
// --------------------------------------------------

interface TokenInputProps {
  label: string;
  token: Token;
  amount: string;
  onAmountChange: (value: string) => void;
  onTokenClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

const TokenInput = ({
  label,
  token,
  amount,
  onAmountChange,
  onTokenClick,
  disabled = false,
  loading = false,
}: TokenInputProps) => {
  return (
    <div className="bg-black/20 hover:bg-black/40 transition-colors rounded-[20px] p-4 border border-transparent hover:border-white/5 group">
      <div className="flex justify-between mb-1">
        <span className="text-gray-400 text-sm font-medium group-focus-within:text-gray-200 transition-colors">{label}</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        {/* Input Field */}
        <input
          type="text"
          pattern="^[0-9]*[.,]?[0-9]*$"
          placeholder="0"
          value={amount}
          onChange={(e) => {
            // Only allow numbers and decimals
            if (e.target.value === '' || /^[0-9]*[.,]?[0-9]*$/.test(e.target.value)) {
              onAmountChange(e.target.value.replace(',', '.'));
            }
          }}
          className="w-full bg-transparent text-4xl text-white placeholder-gray-600 outline-none font-normal"
          disabled={disabled}
        />

        {/* Token Selector Pill (BUTTON-STYLE) */}
        <button
          onClick={onTokenClick}
          className="flex-shrink-0 flex items-center gap-2 bg-black/40 hover:bg-black/60 text-white font-semibold text-xl pl-3 pr-2 py-1.5 rounded-full cursor-pointer transition-all shadow-sm border border-white/5 hover:border-white/20 hover:scale-105 active:scale-95"
        >
          {/* Fake Icon Placeholder using first letter */}
          <div className="w-6 h-6 rounded-full bg-indigo-500/80 flex items-center justify-center text-[10px] font-bold shadow-inner">
            {token.symbol[0]}
          </div>
          <span>{token.symbol}</span>
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="flex justify-between mt-2 h-5">
        <span className="text-gray-500 text-sm">
          {amount ? `$${(Number(amount) * (token.symbol === 'USDC' ? 1 : 1.05)).toFixed(2)}` : ''}
          {/* Use a fake price multiplier for demo */}
        </span>
        {loading && <div className="animate-pulse h-4 w-20 bg-gray-800 rounded"></div>}
      </div>
    </div>
  );
};


// --------------------------------------------------
// MAIN SWAP COMPONENT
// --------------------------------------------------

export default function SwapPage() {
  const { isConnected, address } = useAccount();

  // TOKENS
  const [tokenIn, setTokenIn] = useState<Token>(TOKENS[0]);
  const [tokenOut, setTokenOut] = useState<Token>(TOKENS[1]);

  // MODAL STATE
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectingMode, setSelectingMode] = useState<'in' | 'out'>('in');

  // AMOUNTS
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
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
    query: { enabled: !!address, refetchInterval: 5000 },
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
      refetchInterval: 8000
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
      // Only clear output if input is cleared
      if (!amountIn) setAmountOut('');
    }
  }, [amountsOutData, amountIn]);

  // Check Approval Status
  useEffect(() => {
    if (!allowance || !amountIn) {
      setIsApproved(false);
      return;
    }
    try {
      setIsApproved((allowance as bigint) >= parseEther(amountIn));
    } catch {
      setIsApproved(false);
    }

  }, [allowance, amountIn]);

  // Show Success Message
  useEffect(() => {
    if (isSuccess) {
      setShowSuccess(true);
      setAmountIn('');
      refetchAllowance();
      setTimeout(() => setShowSuccess(false), 3000);
      reset();
    }
  }, [isSuccess, refetchAllowance, reset]);

  // --- HANDLERS ---

  const switchTokens = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn('');
    setAmountOut('');
  };

  const openTokenModal = (mode: 'in' | 'out') => {
    setSelectingMode(mode);
    setIsModalOpen(true);
  };

  const handleTokenSelect = (token: Token) => {
    if (selectingMode === 'in') {
      if (token.address === tokenOut.address) {
        setTokenOut(tokenIn); // Swap if selecting same
      }
      setTokenIn(token);
    } else {
      if (token.address === tokenIn.address) {
        setTokenIn(tokenOut); // Swap if selecting same
      }
      setTokenOut(token);
    }
    setIsModalOpen(false);
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
    if (!amountsOutData || Number(amountIn) <= 0) return;

    const calculatedAmountOut = (amountsOutData as bigint[])[1];
    const slippageNumerator = 995n;
    const slippageDenominator = 1000n;
    const amountOutMin = (calculatedAmountOut * slippageNumerator) / slippageDenominator;

    writeContract({
      address: ROUTER_ADDRESS,
      abi: ROUTER_ABI,
      functionName: 'swapExactTokensForTokens',
      args: [
        parseEther(amountIn),
        amountOutMin,
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
    <div className="flex flex-col items-center justify-center pt-24 pb-12 px-4 gap-12">

      {/* HERO TEXT */}
      <h1 className="text-5xl md:text-6xl text-white text-center font-normal tracking-tight">
        Swap anytime, anywhere.
      </h1>

      {/* SWAP CARD */}
      <div className="w-full max-w-[480px] relative">

        <div className="backdrop-blur-3xl bg-black/40 p-2 rounded-3xl border border-white/10 shadow-2xl relative z-10">

          {/* Header inside card (Settings etc) */}
          <div className="flex justify-between items-center px-4 py-2 mb-2">
            <span className="text-gray-200 font-medium">Swap</span>
            <Settings className="text-gray-400 w-5 h-5 cursor-pointer hover:text-white transition-colors" />
          </div>

          <div className="flex flex-col gap-1 relative">

            {/* SELL INPUT */}
            <TokenInput
              label="Sell"
              token={tokenIn}
              amount={amountIn}
              onAmountChange={setAmountIn}
              onTokenClick={() => openTokenModal('in')}
            />

            {/* SWITCHER - Absolute positioned between inputs */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <button
                onClick={switchTokens}
                className="bg-black/60 backdrop-blur-md border-[4px] border-black/20 p-2 rounded-xl text-gray-400 hover:text-white transition-all hover:scale-110 shadow-lg"
              >
                <ArrowDown size={20} />
              </button>
            </div>

            {/* BUY INPUT */}
            <TokenInput
              label="Buy"
              token={tokenOut}
              amount={amountOut}
              onAmountChange={() => { }} // Read only basically
              onTokenClick={() => openTokenModal('out')}
              disabled={true}
              loading={isFetchingPrice}
            />

          </div>

          {/* ACTION BUTTON */}
          <div className="mt-2">
            {!isConnected ? (
              <div className="w-full [&>button]:w-full [&>button]:!bg-[#311c31]/80 [&>button]:!backdrop-blur-sm [&>button]:!text-[#fc72ff] [&>button]:!font-bold [&>button]:!h-14 [&>button]:!rounded-2xl">
                <ConnectButton.Custom>
                  {({ openConnectModal }) => (
                    <button onClick={openConnectModal} className="w-full bg-[#311c31]/80 backdrop-blur-sm text-[#fc72ff] h-14 rounded-2xl font-bold text-xl hover:opacity-90 transition-opacity">
                      Connect Wallet
                    </button>
                  )}
                </ConnectButton.Custom>
              </div>
            ) : !isApproved && amountIn ? (
              <button
                onClick={approve}
                disabled={isButtonDisabled}
                className="w-full bg-[#311c31]/80 backdrop-blur-sm hover:bg-[#311c31] text-[#fc72ff] h-14 rounded-2xl font-bold text-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {isApproving && <Loader2 className="animate-spin h-5 w-5" />}
                {isApproving ? 'Approving...' : `Approve ${tokenIn.symbol}`}
              </button>
            ) : (
              <button
                onClick={handleSwap}
                disabled={isButtonDisabled}
                className={`w-full h-14 rounded-2xl font-bold text-xl transition-all flex justify-center items-center gap-2 ${isButtonDisabled
                    ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                    : 'bg-[#fc72ff] hover:bg-[#fc72ff]/90 text-white shadow-[0_0_30px_rgba(252,114,255,0.4)]'
                  }`}
              >
                {isApproving && <Loader2 className="animate-spin h-5 w-5" />}
                {Number(amountIn) > 0 ? (isApproving ? 'Swapping...' : 'Swap') : 'Enter an amount'}
              </button>
            )}
          </div>

          {/* Output Info */}
          {amountsOutData && (
            <div className="mt-3 px-2 flex justify-between text-xs text-gray-500 font-medium">
              <span>1 {tokenIn.symbol} = {Number(amountIn) > 0 && Number(amountOut) > 0 ? (Number(amountOut) / Number(amountIn)).toFixed(5) : '-'} {tokenOut.symbol}</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                $0 gas
              </span>
            </div>
          )}

        </div>

        {/* STATUS TOAST */}
        {showSuccess && (
          <div className="absolute -bottom-16 left-0 right-0 mx-auto w-max bg-green-500/20 text-green-400 border border-green-500/50 px-4 py-2 rounded-xl flex items-center gap-2 backdrop-blur-md animate-fade-in-up shadow-lg shadow-green-900/20">
            ✅ Swap Successful!
          </div>
        )}

        {(error || isTxError) && (
          <div className="absolute -bottom-20 left-0 right-0 mx-auto w-full bg-red-500/10 text-red-400 border border-red-500/50 px-4 py-3 rounded-xl backdrop-blur-md text-sm shadow-lg shadow-red-900/20">
            Error: {error ? error.message.split('\n')[0].slice(0, 60) + '...' : 'Transaction failed'}
          </div>
        )}

      </div>

      <div className="text-gray-500 text-sm font-medium mt-8 max-w-lg text-center leading-relaxed">
        Buy and sell crypto on 16+ networks including Ethereum, Unichain, and Base.
      </div>

      {/* GLOBAL MODAL */}
      <TokenModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleTokenSelect}
        selectedToken={selectingMode === 'in' ? tokenIn : tokenOut}
      />

    </div>
  );
}