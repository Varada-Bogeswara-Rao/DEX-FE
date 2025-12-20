// lib/wagmi.ts
import '@rainbow-me/rainbowkit/styles.css';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { sepolia, mainnet } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'DEx',

  // WalletConnect Cloud Project ID
  // 👉 https://cloud.walletconnect.com
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,

  // Put Sepolia FIRST → default network
  chains: [sepolia, mainnet],

  // REQUIRED for Next.js (prevents hydration issues)
  ssr: true,

  // Explicit transports (fixes random RPC & gas estimation issues)
  transports: {
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
});
