import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ROUTER_ABI } from '../abi/RouterABI';

// -----------------------------------------------------------------
// CONFIGURATION (Replace these with your actual values!)
// -----------------------------------------------------------------
const ROUTER_ADDRESS = '0x6E58d0EfC0DC9D99b42e542b81969269b3C5fFeD'; // <--- PASTE YOUR ROUTER ADDRESS HERE

// Mock Token Addresses on Sepolia (WETH and UNI)
// You can change these to whatever tokens you want to test with
// KEEP WETH (TOKEN A) BY
const TOKEN_A = '0xd9d534fe8B60F4b22eB2aBfF2Cbf7B9566773c2A';
// UPDATE TOKEN B (Your New BunnyToken) B
const TOKEN_B = '0x9AAb99fc4F512DF1b35940cA5d0bE50A31ec11C5';
// -----------------------------------------------------------------

export default function SwapPage() {
  const { isConnected, address } = useAccount();
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('0');

  // 1. Setup Write Hook (To send the Swap Transaction)
  const { data: hash, writeContract, isPending } = useWriteContract();

  // 2. Setup Wait Hook (To show "Success" message)
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // 3. Setup Read Hook (To calculate price automatically)
  // We only run this if the user has typed a number > 0
  const { data: amountsOutData } = useReadContract({
    address: ROUTER_ADDRESS,
    abi: ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: [
      amountIn ? parseEther(amountIn) : 0n, // Convert string to BigInt (Wei)
      [TOKEN_A, TOKEN_B] // The Path
    ],
    query: {
      enabled: !!amountIn && Number(amountIn) > 0, // Only run if input exists
    },
  });

  // When the contract returns the price, update the UI
  useEffect(() => {
    if (amountsOutData) {
      // amountsOutData returns an array [amountIn, amountOut]
      // We want the second item (index 1)
      const data = amountsOutData as bigint[];

      const out = data[1];
      setAmountOut(formatEther(out));
    }
  }, [amountsOutData]);

  // 4. Handle the Swap Button Click
  const handleSwap = () => {
    if (!amountIn) return;

    writeContract({
      address: ROUTER_ADDRESS,
      abi: ROUTER_ABI,
      functionName: 'swapExactTokensForTokens',
      args: [
        parseEther(amountIn), // Amount In
        0n, // Min Amount Out (0 for testing - strictly risky in prod!)
        [TOKEN_A, TOKEN_B], // Path
        address!, // To (Your Wallet)
        BigInt(Math.floor(Date.now() / 1000) + 60 * 20), // Deadline (20 mins)
      ],
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-gray-950 text-white px-4">

      {/* THE SWAP CARD */}
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-xl">

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Swap</h2>
          <span className="text-gray-400 text-sm">Slippage: Auto</span>
        </div>

        {/* INPUT BOX (YOU PAY) */}
        <div className="bg-gray-800 rounded-xl p-4 mb-2">
          <label className="text-gray-400 text-sm mb-2 block">You Pay</label>
          <div className="flex justify-between items-center">
            <input
              type="number"
              placeholder="0.0"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              className="bg-transparent text-3xl outline-none text-white w-full placeholder-gray-600"
            />
            <div className="bg-gray-700 px-3 py-1 rounded-full flex items-center gap-2">
              <span className="font-bold">BY</span>
            </div>
          </div>
        </div>

        {/* ARROW ICON */}
        <div className="flex justify-center -my-3 relative z-10">
          <div className="bg-gray-900 p-2 rounded-lg border border-gray-800">
            ⬇️
          </div>
        </div>

        {/* OUTPUT BOX (YOU RECEIVE) */}
        <div className="bg-gray-800 rounded-xl p-4 mt-2 mb-6">
          <label className="text-gray-400 text-sm mb-2 block">You Receive</label>
          <div className="flex justify-between items-center">
            <input
              type="text"
              placeholder="0.0"
              value={amountOut}
              disabled // Read-only
              className="bg-transparent text-3xl outline-none text-gray-400 w-full cursor-not-allowed"
            />
            <div className="bg-gray-700 px-3 py-1 rounded-full flex items-center gap-2">
              <span className="font-bold">BYN</span>
            </div>
          </div>
        </div>

        {/* ACTION BUTTON */}
        {!isConnected ? (
          <div className="w-full flex justify-center">
            <ConnectButton />
          </div>
        ) : (
          <button
            onClick={handleSwap}
            disabled={isPending || isConfirming || !amountIn}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${isPending || isConfirming
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
          >
            {isPending ? 'Confirm in Wallet...' : isConfirming ? 'Swapping...' : 'Swap'}
          </button>
        )}

        {/* SUCCESS MESSAGE */}
        {isConfirmed && (
          <div className="mt-4 p-3 bg-green-900/50 border border-green-800 text-green-200 rounded-lg text-center text-sm">
            ✅ Swap Successful!
            <a
              href={`https://sepolia.etherscan.io/tx/${hash}`}
              target="_blank"
              rel="noreferrer"
              className="underline ml-2 font-bold"
            >
              View on Etherscan
            </a>
          </div>
        )}

      </div>
    </div>
  );
}