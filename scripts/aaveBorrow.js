const { getNamedAccounts, ethers } = require("hardhat")
const { getWeth, AMOUNT } = require("./getWeth")

async function main() {
    await getWeth()
    const { deployer } = await getNamedAccounts()

    // getting the lending pool contract to interact with.
    // lendingpool addres provider 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
    const lendingpool = await getLendingPool(deployer)
    console.log(`LendingPool Address is ${lendingpool.address}`)

    //Deposinting
    //Frist we have to approve the weth token address
    const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    await approveERC20(wethTokenAddress, lendingpool.address, AMOUNT, deployer)
    console.log("Depositing...")
    await lendingpool.deposit(wethTokenAddress, AMOUNT, deployer, 0)
    console.log("Deposited!")

    // Borrow time
    let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(lendingpool, deployer)
    const daiPrice = await getDaiPrice()
    const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber())
    console.log(`You can Borrow ${amountDaiToBorrow} DAI`)
    // get dai price and the amount of dai to borrow
    const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString())
    //Lets borrow some dai
    const DaiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
    await borrowDai(DaiTokenAddress, lendingpool, amountDaiToBorrowWei, deployer)
    await getBorrowUserData(lendingpool, deployer)
    await repay(amountDaiToBorrowWei, DaiTokenAddress, lendingpool, deployer)
    await getBorrowUserData(lendingpool, deployer)

    //https://youtu.be/gyMwXuJrbJQ?t=72283
}

async function borrowDai(daiAddress, lendingpool, amountDaiToBorrowWei, account) {
    const borrowTx = await lendingpool.borrow(daiAddress, amountDaiToBorrowWei, 1, 0, account)
    await borrowTx.wait(1)
    console.log("Yous just have borrowed")
}

async function repay(amount, daiAddress, lendingpool, account) {
    await approveERC20(daiAddress, lendingpool.address, amount, account)
    const repayTx = await lendingpool.repay(daiAddress, amount, 1, account)
    await repayTx.wait(1)
    console.log("Repayed!")
}

async function getDaiPrice() {
    const daiEthPricedFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        "0x773616E4d11A78F511299002da57A0a94577F1f4"
    )
    const daiPrice = (await daiEthPricedFeed.latestRoundData())[1]
    console.log(`The DAI/ETH price is: ${daiPrice.toString()}`)
    return daiPrice
}

async function getBorrowUserData(lendingpool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
        await lendingpool.getUserAccountData(account)
    console.log(`You have ${totalCollateralETH} worth of ETH deposited`)
    console.log(`You have ${totalDebtETH} worth of eth borrowed`)
    console.log(`You have ${availableBorrowsETH} available to borrow`)
    return { availableBorrowsETH, totalDebtETH }
}

async function getLendingPool(account) {
    const ILendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
        account
    )
    const lendingpoolAddress = await ILendingPoolAddressesProvider.getLendingPool()
    const lendingpool = await ethers.getContractAt("ILendingPool", lendingpoolAddress, account)
    return lendingpool
}

async function approveERC20(erc20address, spenderAddress, amountToSpend, account) {
    const erc20Token = await ethers.getContractAt("IERC20", erc20address, account)
    const tx = await erc20Token.approve(spenderAddress, amountToSpend)
    await tx.wait(1)
    console.log("Transaction approved!")
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
