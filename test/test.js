const { expect } = require("chai");
const { ethers } = require("hardhat");
const BatchTransactionSDK = require("../sdk");

describe("BatchTransactionSDK", function () {
  let multiSend;
  let multiSendProxy;
  let sdk;
  let owner;
  let addr1;
  let addr2;
  let token;

  beforeEach(async function () {
    console.log("Starting test setup");
    [owner, addr1, addr2] = await ethers.getSigners();
    console.log("Signers obtained");

    const MultiSend = await ethers.getContractFactory("MultiSend");
    multiSend = await MultiSend.deploy();
    await multiSend.deployed();
    console.log("MultiSend deployed at:", multiSend.address);

    const MultiSendProxy = await ethers.getContractFactory("MultiSendProxy");
    multiSendProxy = await MultiSendProxy.deploy(multiSend.address);
    await multiSendProxy.deployed();
    console.log("MultiSendProxy deployed at:", multiSendProxy.address);

    sdk = new BatchTransactionSDK(ethers.provider, multiSendProxy.address);
    console.log("SDK created");

    // Deploy ERC20 token in beforeEach to make it available for all tests
    const Token = await ethers.getContractFactory("SimpleToken");
    token = await Token.deploy("TestToken", "TT", ethers.utils.parseEther("1000"));
    await token.deployed();
    console.log("SimpleToken deployed at:", token.address);

    // Transfer some tokens to the owner
    await token.transfer(owner.address, ethers.utils.parseEther("500"));
    console.log("Tokens transferred to owner");
  });

  it("Should execute ETH transfers", async function () {
    console.log("Starting ETH transfer test");
    const initialBalance = await addr1.getBalance();
    console.log("Initial balance of addr1:", ethers.utils.formatEther(initialBalance));
    
    sdk.addETHTransaction(addr1.address, "1.0");
    console.log("ETH transaction added to SDK");
    
    await sdk.executeBatch(owner);
    
    const finalBalance = await addr1.getBalance();
    console.log("Final balance of addr1:", ethers.utils.formatEther(finalBalance));

    const balanceChange = finalBalance.sub(initialBalance);
    console.log("Balance change:", ethers.utils.formatEther(balanceChange));

    expect(balanceChange).to.be.closeTo(
      ethers.utils.parseEther("1.0"),
      ethers.utils.parseEther("0.01") // Allow for small gas cost variations
    );
    console.log("ETH transfer test passed");
  });

    it("Should execute ERC20 transfers", async function () {
        const initialBalance = await token.balanceOf(addr1.address);
        console.log("Initial ERC20 balance of addr1:", ethers.utils.formatEther(initialBalance));
    
        // Transfer tokens to the MultiSendProxy contract first
        await token.transfer(multiSendProxy.address, ethers.utils.parseEther("100"));
    
        // Add ERC20 transfer to the batch
        sdk.addERC20Transaction(token.address, addr1.address, ethers.utils.parseEther("50"));
        
        // Execute the batch
        await sdk.executeBatch(owner);
    
        const finalBalance = await token.balanceOf(addr1.address);
        console.log("Final ERC20 balance of addr1:", ethers.utils.formatEther(finalBalance));
    
        expect(finalBalance.sub(initialBalance)).to.equal(ethers.utils.parseEther("50"));
        console.log("ERC20 transfer test passed");
    });

  it("Should clear transactions after execution", async function () {
    sdk.addETHTransaction(addr1.address, "1.0");
    expect(sdk.getTransactionCount()).to.equal(1);
    
    await sdk.executeBatch(owner);
    
    expect(sdk.getTransactionCount()).to.equal(0);
    console.log("Transaction clearing test passed");
  });

  it("Should estimate gas correctly", async function () {
    sdk.addETHTransaction(addr1.address, "1.0");

    const gasEstimate = await sdk.estimateGas(owner);
    console.log("Gas Estimated:", gasEstimate.toString());
    expect(gasEstimate).to.be.gt(0);
    console.log("Gas estimation test passed");
  });
});