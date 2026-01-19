# DEX Frontend

A Decentralized Exchange (DEX) frontend built with [RainbowKit](https://rainbowkit.com), [wagmi](https://wagmi.sh), and [Next.js](https://nextjs.org/).

## Overview

This application interacts with a set of custom smart contracts (Factory, Router, Pair, LPToken) to enable decentralized trading and liquidity provision. The contracts follow a Uniswap V2-style architecture.

### Core Contracts
- **Factory**: Manages pair creation and tracking.
- **Router**: Handles trade routing, adding/removing liquidity, and slippage checks.
- **Pair**: AMM pools holding token reserves and managing swaps.

## Features

- **Wallet Connection**: Seamless wallet integration via RainbowKit.
- **Token Swapping**: Exchange ERC20 tokens using the AMM protocol.
- **Liquidity Provision**: Add and remove liquidity to earn fees.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about this stack, take a look at the following resources:

- [RainbowKit Documentation](https://rainbowkit.com) - Learn how to customize your wallet connection flow.
- [wagmi Documentation](https://wagmi.sh) - Learn how to interact with Ethereum.
- [Next.js Documentation](https://nextjs.org/docs) - Learn how to build a Next.js application.

You can check out [the RainbowKit GitHub repository](https://github.com/rainbow-me/rainbowkit) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.
