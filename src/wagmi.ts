import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia, mainnet } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'BunnyDEX',
  projectId: 'YOUR_PROJECT_ID', // Get one from cloud.walletconnect.com if needed
  chains: [
    sepolia, // <--- Putting this FIRST makes it the default network!
    mainnet,
  ],
  ssr: true,
});