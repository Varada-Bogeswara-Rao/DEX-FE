// src/abis/factoryAbi.ts

export const FactoryABI = [
  {
    type: "function",
    name: "allPairs",
    stateMutability: "view",
    inputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
      },
    ],
  },
  {
    type: "function",
    name: "allPairsLength",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },
  {
    type: "function",
    name: "createPair",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "tokenA",
        type: "address",
      },
      {
        name: "tokenB",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "pair",
        type: "address",
      },
    ],
  },
  {
    type: "function",
    name: "getPair",
    stateMutability: "view",
    inputs: [
      {
        name: "",
        type: "address",
      },
      {
        name: "",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
      },
    ],
  },
  {
    type: "event",
    name: "PairCreated",
    anonymous: false,
    inputs: [
      {
        name: "token0",
        type: "address",
        indexed: true,
      },
      {
        name: "token1",
        type: "address",
        indexed: true,
      },
      {
        name: "pair",
        type: "address",
        indexed: false,
      },
      {
        name: "",
        type: "uint256",
        indexed: false,
      },
    ],
  },
] as const;
