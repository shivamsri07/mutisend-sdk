Here's a comprehensive markdown for your README.md file:

```markdown
# BatchTransactionSDK

BatchTransactionSDK is a powerful tool for executing multiple Ethereum transactions in a single batch. It supports both ETH and ERC20 token transfers, provides gas estimation, and offers optimal gas settings based on network congestion.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
  - [Constructor](#constructor)
  - [Methods](#methods)
- [Examples](#examples)
- [Gas Optimization](#gas-optimization)
- [Error Handling](#error-handling)
- [Notes](#notes)

## Installation

```bash
npm install batch-transaction-sdk
```

## Usage

```javascript
const { ethers } = require('ethers');
const BatchTransactionSDK = require('batch-transaction-sdk');

const provider = new ethers.providers.JsonRpcProvider('YOUR_RPC_URL');
const sdk = new BatchTransactionSDK(provider, 'MULTI_SEND_PROXY_ADDRESS');
```

## API Reference

### Constructor

#### `new BatchTransactionSDK(provider, multiSendProxyAddress)`

Creates a new instance of the BatchTransactionSDK.

- `provider`: An Ethereum provider (e.g., `ethers.providers.JsonRpcProvider`)
- `multiSendProxyAddress`: The address of the deployed MultiSendProxy contract

### Methods

#### `addETHTransaction(to: string, value: string)`

Adds an ETH transfer transaction to the batch.

- `to`: Recipient address
- `value`: Amount of ETH to send (in ether, not wei)

#### `addERC20Transaction(tokenAddress: string, to: string, value: string)`

Adds an ERC20 token transfer transaction to the batch.

- `tokenAddress`: Address of the ERC20 token contract
- `to`: Recipient address
- `value`: Amount of tokens to send

#### `async estimateGas(signer: Signer)`

Estimates the gas required for the entire batch transaction.

- `signer`: The signer to use for the estimation

#### `async getGasPrices()`

Retrieves current gas prices (slow, average, fast).

#### `async getGasEstimatePreview(signer: Signer)`

Provides a detailed preview of gas costs for different speed options.

- `signer`: The signer to use for the estimation

#### `async getNetworkCongestion()`

Estimates the current network congestion level (low, medium, high).

#### `async suggestOptimalGasSettings(signer: Signer)`

Suggests optimal gas settings based on current network conditions.

- `signer`: The signer to use for the estimation

#### `async executeBatch(signer: Signer, gasSettings?: GasSettings)`

Executes the batch of transactions.

- `signer`: The signer to execute the transactions
- `gasSettings`: (Optional) Custom gas settings to use

#### `clearTransactions()`

Clears all transactions from the batch.

#### `getTransactionCount()`

Returns the number of transactions in the current batch.

## Examples

### Basic Usage

```javascript
const { ethers } = require('ethers');
const BatchTransactionSDK = require('batch-transaction-sdk');

async function main() {
  const provider = new ethers.providers.JsonRpcProvider('YOUR_RPC_URL');
  const signer = new ethers.Wallet('YOUR_PRIVATE_KEY', provider);
  const sdk = new BatchTransactionSDK(provider, 'MULTI_SEND_PROXY_ADDRESS');

  // Add transactions to the batch
  sdk.addETHTransaction('0x123...', '1.0');  // Send 1 ETH
  sdk.addERC20Transaction('0xTOKEN_ADDRESS', '0x456...', '100');  // Send 100 tokens

  // Execute the batch
  const result = await sdk.executeBatch(signer);
  console.log('Batch execution result:', result);
}

main().catch(console.error);
```

### Gas Estimation and Optimization

```javascript
async function optimizedExecution() {
  // ... (setup code as in the previous example)

  // Get gas estimate preview
  const gasPreview = await sdk.getGasEstimatePreview(signer);
  console.log('Gas estimate preview:', gasPreview);

  // Get suggested optimal gas settings
  const optimalSettings = await sdk.suggestOptimalGasSettings(signer);
  console.log('Suggested optimal gas settings:', optimalSettings);

  // Execute with optimal settings
  const result = await sdk.executeBatch(signer, optimalSettings);
  console.log('Optimized batch execution result:', result);
}
```

## Gas Optimization

The SDK provides methods to estimate and optimize gas usage:

- Use `getGasEstimatePreview()` to get a detailed breakdown of potential gas costs.
- Use `suggestOptimalGasSettings()` to get recommended gas settings based on current network conditions.
- When calling `executeBatch()`, you can provide custom gas settings or let the SDK use its optimal suggestions.

## Error Handling

The SDK throws errors for failed gas estimations and transaction executions. Always wrap SDK method calls in try-catch blocks for proper error handling:

```javascript
try {
  const result = await sdk.executeBatch(signer);
  console.log('Success:', result);
} catch (error) {
  console.error('Error executing batch:', error);
}
```

## Notes

- Ensure that you have sufficient ETH and ERC20 token balances before executing batches.
- For ERC20 transfers, make sure to approve the MultiSendProxy contract to spend your tokens before execution.
- The gas estimation and network congestion features provide estimates based on current network conditions. Actual gas usage may vary.
- Always test thoroughly on testnets before using on mainnet.
