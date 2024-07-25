const ethers = require('ethers');
const MultiSendProxyABI = require('./MultiSendProxyABI.json');


class BatchTransactionSDK {
  constructor(provider, multiSendProxyAddress) {
    this.provider = provider;
    this.multiSendProxyContract = new ethers.Contract(multiSendProxyAddress, MultiSendProxyABI, provider);
    this.transactions = [];
  }

  addETHTransaction(to, value) {
    this.transactions.push({
      to,
      value: ethers.utils.parseEther(value.toString()),
      data: '0x'
    });
  }

  addERC20Transaction(tokenAddress, to, value) {
    const erc20Interface = new ethers.utils.Interface([
      'function transfer(address to, uint256 value)'
    ]);
    const data = erc20Interface.encodeFunctionData('transfer', [to, value]);

    this.transactions.push({
      to: tokenAddress,
      value: 0,
      data
    });
  }

  encodeMultiSend() {
    return ethers.utils.hexConcat(
      this.transactions.map(tx => 
        ethers.utils.solidityPack(
          ['uint8', 'address', 'uint256', 'uint256', 'bytes'],
          [0, tx.to, tx.value, ethers.utils.hexDataLength(tx.data), tx.data]
        )
      )
    );
  }

  async estimateGas(signer) {
    const encodedMultiSend = this.encodeMultiSend();
    const totalValue = this.transactions.reduce((sum, tx) => sum.add(tx.value), ethers.BigNumber.from(0));

    try {
      const gasEstimate = await this.multiSendProxyContract.connect(signer).estimateGas.multiSend(encodedMultiSend, {
        value: totalValue
      });
      return gasEstimate;
    } catch (error) {
      console.error('Gas estimation failed:', error);
      throw error;
    }
  }

  async getGasPrices() {
    // could be replaced with a different API
    const averagePrice = await this.provider.getGasPrice();
    return {
      slow: averagePrice.mul(90).div(100),
      average: averagePrice,
      fast: averagePrice.mul(110).div(100)
    };
  }

  async getGasEstimatePreview(signer) {
    const gasEstimate = await this.estimateGas(signer);
    const gasPrices = await this.getGasPrices();
    
    return {
      estimatedGas: gasEstimate.toString(),
      slow: {
        price: gasPrices.slow.toString(),
        cost: ethers.utils.formatEther(gasEstimate.mul(gasPrices.slow))
      },
      average: {
        price: gasPrices.average.toString(),
        cost: ethers.utils.formatEther(gasEstimate.mul(gasPrices.average))
      },
      fast: {
        price: gasPrices.fast.toString(),
        cost: ethers.utils.formatEther(gasEstimate.mul(gasPrices.fast))
      }
    };
  }
  

  async getNetworkCongestion() {
    /**
      This is a simplified approach to estimating network congestion to better estimate the gas 
      for executing batch transactions. We can also:
      1. Consider an average over several recent blocks instead of just the latest one.
      2. Adjust the thresholds based on historical data or specific network characteristics.
      3. Include other factors like the number of pending transactions in the mempool.
     */
    const latestBlock = await this.provider.getBlock('latest');
    const gasLimit = latestBlock.gasLimit;
    const gasUsed = latestBlock.gasUsed;
    const utilizationRatio = gasUsed.mul(100).div(gasLimit).toNumber();

    if (utilizationRatio < 50) return 'low';
    if (utilizationRatio < 80) return 'medium';
    return 'high';
  }

  async suggestOptimalGasSettings(signer) {
    const preview = await this.getGasEstimatePreview(signer);
    const networkCongestion = await this.getNetworkCongestion();

    let suggestedStrategy;
    if (networkCongestion === 'low') {
      suggestedStrategy = 'slow';
    } else if (networkCongestion === 'medium') {
      suggestedStrategy = 'average';
    } else {
      suggestedStrategy = 'fast';
    }

    return {
      gasLimit: ethers.BigNumber.from(preview.estimatedGas).mul(120).div(100), // 20% buffer
      gasPrice: ethers.BigNumber.from(preview[suggestedStrategy].price),
      estimatedCost: preview[suggestedStrategy].cost,
      suggestedStrategy
    };
  }

  async executeBatch(signer, gasSettings = null) {
    const encodedMultiSend = this.encodeMultiSend();
    const totalValue = this.transactions.reduce((sum, tx) => sum.add(tx.value), ethers.BigNumber.from(0));
    
    if (!gasSettings) {
      gasSettings = await this.suggestOptimalGasSettings(signer);
    }

    try {
      const tx = await this.multiSendProxyContract.connect(signer).multiSend(encodedMultiSend, {
        value: totalValue,
        gasLimit: gasSettings.gasLimit,
        gasPrice: gasSettings.gasPrice
      });
      
      const receipt = await tx.wait();
      this.clearTransactions();
      return {
        transactionHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice.toString(),
        status: receipt.status === 1 ? 'Success' : 'Failed'
      };
    } catch (error) {
      console.error('Transaction execution failed:', error);
      throw error;
    }
  }

  clearTransactions() {
    this.transactions = [];
  }

  getTransactionCount() {
    return this.transactions.length;
  }
}

module.exports = BatchTransactionSDK;