import { Address, BigInt, BigDecimal } from "@graphprotocol/graph-ts"
import { ERC20 } from "../../generated/TreasuryTracker/ERC20"
import { UniswapV2Pair } from "../../generated/TreasuryTracker/UniswapV2Pair"
import { SLP_EXODDAI_PAIR } from "./constants"

export function getDecimals(token: Address): number {
  const erc20Contract = ERC20.bind(token)
  const decimals = erc20Contract.decimals()
  return decimals
}

export function toDecimal(value: BigInt, decimals: number): BigDecimal {
  const precision = BigInt.fromI32(10)
    .pow(<u8>decimals)
    .toBigDecimal();
  return value.divDecimal(precision);
}

export function dayFromTimestamp(timestamp: BigInt): string {
  const dayTs = timestamp.toI32() - (timestamp.toI32() % 86400)
  return dayTs.toString()
}

export function getExodPrice(): BigDecimal {
  const pair = UniswapV2Pair.bind(Address.fromString(SLP_EXODDAI_PAIR))

  const reserves = pair.getReserves()
  const reserve0 = reserves.value0.toBigDecimal()
  const reserve1 = reserves.value1.toBigDecimal()

  const exodPrice = reserve1.div(reserve0).div(BigDecimal.fromString('1e9'))

  return exodPrice
}

export function getVestingTokenBalance(vestingToken: Address, address: Address, tokenBalance: BigDecimal): BigDecimal {
  const vestingTokenERC20 = ERC20.bind(vestingToken)
  const vestingTokenDecimals = vestingTokenERC20.decimals()
  const totalVestingTokens = toDecimal(vestingTokenERC20.totalSupply(), vestingTokenDecimals)
  
  const tokenERC20 = ERC20.bind(address)
  const tokenDecimals = tokenERC20.decimals()
  const totalTokens = toDecimal(tokenERC20.totalSupply(), tokenDecimals)

  const exchangeRate = totalVestingTokens.div(totalTokens)

  const vestingTokenBalance = tokenBalance.times(exchangeRate)
  return vestingTokenBalance
}