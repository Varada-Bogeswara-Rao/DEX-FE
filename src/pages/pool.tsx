import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ROUTER_ABI } from '../abi/RouterABI';
import { ERC20_ABI } from '../abi/ERC20ABI';

// -----------------------------------------------------------------
// CONFIGURATION (Replace with your addresses)
// -----------------------------------------------------------------
const ROUTER_ADDRESS = '0x6E58d0EfC0DC9D99b42e542b81969269b3C5fFeD';
// KEEP WETH (TOKEN A)
const TOKEN_A = '0x9AAb99fc4F512DF1b35940cA5d0bE50A31ec11C5';

// UPDATE TOKEN B (Your New BunnyToken) B
const TOKEN_B = '0xd9d534fe8B60F4b22eB2aBfF2Cbf7B9566773c2A';
// -----------------------------------------------------------------

export default function PoolPage() {
    const { isConnected, address } = useAccount();

    const [amountA, setAmountA] = useState('');
    const [amountB, setAmountB] = useState('');

    // Track which button was clicked ('approveA', 'approveB', or 'add')
    const [currentStep, setCurrentStep] = useState('');

    const { data: hash, writeContract, isPending, error } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    // 1. Approve Token A
    const handleApproveA = () => {
        setCurrentStep('approveA'); // Set state BEFORE writing
        writeContract({
            address: TOKEN_A,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [ROUTER_ADDRESS, parseEther('10000')], // Huge approval
        });
    };

    // 2. Approve Token B
    const handleApproveB = () => {
        setCurrentStep('approveB');
        writeContract({
            address: TOKEN_B,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [ROUTER_ADDRESS, parseEther('10000')],
        });
    };

    // 3. Add Liquidity
    const handleAddLiquidity = () => {
        if (!amountA || !amountB) return;
        setCurrentStep('add');

        writeContract({
            address: ROUTER_ADDRESS,
            abi: ROUTER_ABI,
            functionName: 'addLiquidity',
            args: [
                TOKEN_A,
                TOKEN_B,
                parseEther(amountA),
                parseEther(amountB),
                0n, // Min A (0 for testing)
                0n, // Min B (0 for testing)
                address!, // LP Tokens go to you
                BigInt(Math.floor(Date.now() / 1000) + 60 * 20), // Deadline
            ],
        });
    };

  return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] bg-gray-950 text-white px-4">

            <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
                <h2 className="text-2xl font-bold mb-6 text-center">Add Liquidity</h2>

                {/* INPUT A */}
                <div className="bg-gray-800 rounded-xl p-4 mb-4">
                    <label className="text-gray-400 text-sm mb-2 block">Deposit WETH</label>
                    <div className="flex justify-between items-center">
                        <input
                            type="number"
                            placeholder="0.0"
                            value={amountA}
                            onChange={(e) => setAmountA(e.target.value)}
                            className="bg-transparent text-2xl outline-none text-white w-full"
                        />
                        <span className="font-bold text-gray-300">WETH</span>
                    </div>
                </div>

                {/* INPUT B */}
                <div className="bg-gray-800 rounded-xl p-4 mb-6">
                    <label className="text-gray-400 text-sm mb-2 block">Deposit UNI</label>
                    <div className="flex justify-between items-center">
                        <input
                            type="number"
                            placeholder="0.0"
                            value={amountB}
                            onChange={(e) => setAmountB(e.target.value)}
                            className="bg-transparent text-2xl outline-none text-white w-full"
                        />
                        <span className="font-bold text-gray-300">UNI</span>
                    </div>
                </div>

                {/* ACTION BUTTONS */}
                {!isConnected ? (
                    <div className="flex justify-center">
                        <ConnectButton />
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleApproveA}
                                disabled={isPending || isConfirming}
                                className={`py-3 rounded-lg font-bold text-sm transition ${
                                    isConfirmed && currentStep === 'approveA'
                                    ? 'bg-green-800 text-green-200'
                                    : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                            >
                                {isPending && currentStep === 'approveA' ? 'Approving...' : '1. Approve WETH'}
                            </button>
                            <button
                                onClick={handleApproveB}
                                disabled={isPending || isConfirming}
                                className={`py-3 rounded-lg font-bold text-sm transition ${
                                    isConfirmed && currentStep === 'approveB'
                                    ? 'bg-green-800 text-green-200'
                                    : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                            >
                                {isPending && currentStep === 'approveB' ? 'Approving...' : '2. Approve UNI'}
                            </button>
                        </div>

                        <button
                            onClick={handleAddLiquidity}
                            disabled={isPending || isConfirming}
                            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                                isPending ? 'bg-gray-600' : 'bg-pink-600 hover:bg-pink-500'
                            }`}
                        >
                            {isPending && currentStep === 'add' ? 'Confirming...' : '3. Add Liquidity'}
                        </button>
                    </div>
                )}

                {/* SMART STATUS MESSAGES */}
                {/* 1. SUCCESS MESSAGE */}
                {isConfirmed && (
                    <div className={`mt-4 p-3 rounded-lg text-center text-sm border ${currentStep === 'add'
                        ? 'bg-green-900/50 border-green-800 text-green-200'
                        : 'bg-blue-900/50 border-blue-800 text-blue-200'
                        }`}>
                        {currentStep === 'add' && "✅ Liquidity Successfully Added!"}
                        {currentStep === 'approveA' && "✅ WETH Approved! Now approve UNI."}
                        {currentStep === 'approveB' && "✅ UNI Approved! Now click Add Liquidity."}
                    </div>
                )}
                
                {/* 2. ERROR MESSAGE (Now separated correctly) */}
                {error && (
                    <div className="mt-4 p-3 bg-red-900/50 border border-red-800 text-red-200 rounded-lg text-sm break-words">
                        <strong>Error:</strong> {error.message}
                    </div>
                )}
            </div>
        </div>
    );
}