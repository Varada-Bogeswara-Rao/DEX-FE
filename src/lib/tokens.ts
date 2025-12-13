// src/lib/tokens.ts

export type Token = {
  chainId: number;
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
};

// -----------------------------
// CHAIN IDS
// -----------------------------
export const CHAINS = {
  SEPOLIA: 11155111,
};

// -----------------------------
// COMMON SEPOLIA TOKENS
// -----------------------------
export const TOKENS: Token[] = [
  // Wrapped ETH (Sepolia)
  {
    chainId: CHAINS.SEPOLIA,
    address: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', // Sepolia WETH (example)
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
  },

  // Your custom tokens
 
 {
    chainId: CHAINS.SEPOLIA,
    address: '0x0E6eE20e2dA3C3c019bFCb1826f39f09a07d2FF5',
    symbol: 'GOLD',
    name: 'Bunny GOLD',
    decimals: 18,
  },
 {
    chainId: CHAINS.SEPOLIA,
    address: '0xEF477832117f0a07139c38515bE63607236ABE54',
    symbol: 'SILVER',
    name: 'Bunny Silver',
    decimals: 18,
  },

  
  {
    chainId: CHAINS.SEPOLIA,
    address: '0x8b0042b56726f98f96fc578aA4956eD6702124D7', // Sepolia USDC (example)
    symbol: 'BETH',
    name: 'Bunny ETH',
    decimals: 18,
  },
  {
    chainId: CHAINS.SEPOLIA,
    address: '0x6E229189a1327a4b6D1818593323387Dd00c96e8', 
    symbol: 'BSOL',
    name: 'Bunny Solana',
    decimals: 18,
  },
];
