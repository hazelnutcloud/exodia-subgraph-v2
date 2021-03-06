import { BigDecimal, Address, BigInt } from "@graphprotocol/graph-ts";
import { ProtocolMetric } from "../../generated/schema";
import { CirculatingSupply } from "../../generated/ExodiaERC20Token/CirculatingSupply";
import { EXODERC20 } from "../../generated/ExodiaERC20Token/EXODERC20";
import { ExodStaking } from "../../generated/ExodiaERC20Token/ExodStaking";
import { SEXODERC20 } from "../../generated/ExodiaERC20Token/SEXODERC20";
import {
  CIRCULATING_SUPPLY_CONTRACT,
  EXOD_ERC20_CONTRACT,
  EXOD_STAKING_CONTRACT,
  SEXOD_ERC20_CONTRACT,
} from "../utils/constants";
import { getExodPrice, toDecimal } from "../utils/helpers";
import { loadOrCreateAux } from "./Aux";
import { TokenValue } from "./TokenBalance";

export function updateProtocolMetric(
  dayTimestamp: string,
  treasuryValues: TokenValue
): void {
  const protocolMetric = loadOrCreateProtocolMetric(dayTimestamp);
  const exodPrice = getExodPrice();
  const index = getIndex();

  protocolMetric.circulatingSupply = getCirculatingSupply();
  protocolMetric.totalSupply = getTotalSupply();
  protocolMetric.exodPrice = exodPrice;
  protocolMetric.wsExodPrice = exodPrice.times(index);
  protocolMetric.backingPerExod = calculateBackingPerExod(
    protocolMetric.circulatingSupply,
    treasuryValues.backingValue
  );
  protocolMetric.marketCap = protocolMetric.totalSupply.times(
    protocolMetric.exodPrice
  );
  protocolMetric.tvl = getTVL(exodPrice);
  protocolMetric.runway = getRunway(treasuryValues.riskFreeValue);
  protocolMetric.timestamp = dayTimestamp;
  protocolMetric.dilution = getDilution(
    index,
    protocolMetric.circulatingSupply
  );
  protocolMetric.save();
}

export function loadOrCreateProtocolMetric(timestamp: string): ProtocolMetric {
  let protocolMetric = ProtocolMetric.load(timestamp);
  if (!protocolMetric) {
    protocolMetric = new ProtocolMetric(timestamp);

    protocolMetric.circulatingSupply = BigDecimal.zero();
    protocolMetric.totalSupply = BigDecimal.zero();
    protocolMetric.exodPrice = BigDecimal.zero();
    protocolMetric.marketCap = BigDecimal.zero();
    protocolMetric.tvl = BigDecimal.zero();
    protocolMetric.holders = BigInt.zero();
    protocolMetric.runway = BigDecimal.zero();
  }
  return protocolMetric;
}

function getRunway(rfv: BigDecimal): BigDecimal {
  const stakingContract = ExodStaking.bind(
    Address.fromString(EXOD_STAKING_CONTRACT)
  );
  const sExodContract = SEXODERC20.bind(
    Address.fromString(SEXOD_ERC20_CONTRACT)
  );
  const sExodSupply = toDecimal(sExodContract.circulatingSupply(), 9);
  if (sExodSupply.gt(BigDecimal.zero())) {
    const rebaseRate = toDecimal(stakingContract.epoch().value3, 9).div(
      sExodSupply
    );
    if (rebaseRate.le(BigDecimal.zero())) {
      return BigDecimal.zero();
    }
    const rebases =
      Math.log(parseFloat(rfv.div(sExodSupply).toString())) /
      Math.log(1 + parseFloat(rebaseRate.toString()));
    const runway = (rebases * 28800 * 0.9) / 86400;
    return BigDecimal.fromString(runway.toString());
  } else {
    return BigDecimal.zero();
  }
}

function getTVL(exodPrice: BigDecimal): BigDecimal {
  const sExodContract = SEXODERC20.bind(
    Address.fromString(SEXOD_ERC20_CONTRACT)
  );
  const sExodSupply = toDecimal(sExodContract.circulatingSupply(), 9);
  return sExodSupply.times(exodPrice);
}

function getTotalSupply(): BigDecimal {
  const exodContract = EXODERC20.bind(Address.fromString(EXOD_ERC20_CONTRACT));
  const totalSupply = exodContract.totalSupply();
  return toDecimal(totalSupply, 9);
}

export function getCirculatingSupply(): BigDecimal {
  const circulatingSupplyContract = CirculatingSupply.bind(
    Address.fromString(CIRCULATING_SUPPLY_CONTRACT)
  );
  const circulatingSupply = circulatingSupplyContract.OHMCirculatingSupply();
  return toDecimal(circulatingSupply, 9);
}

export function getIndex(): BigDecimal {
  const stakingContract = ExodStaking.bind(
    Address.fromString(EXOD_STAKING_CONTRACT)
  );
  const index = toDecimal(stakingContract.index(), 9);
  return index;
}

export function updateHolders(timestamp: string): void {
  const protocolMetric = loadOrCreateProtocolMetric(timestamp);
  protocolMetric.holders = loadOrCreateAux().totalHolders;
  protocolMetric.save();
}

function calculateBackingPerExod(
  circulatingSupply: BigDecimal,
  backingValue: BigDecimal
): BigDecimal {
  if (circulatingSupply.gt(BigDecimal.zero())) {
    return backingValue.div(circulatingSupply);
  } else {
    return BigDecimal.zero();
  }
}

function getDilution(
  index: BigDecimal,
  circulatingSupply: BigDecimal
): BigDecimal {
  if (circulatingSupply.gt(BigDecimal.zero())) {
    return index
      .div(circulatingSupply.div(BigDecimal.fromString("2000")))
      .times(BigDecimal.fromString("100"));
  } else {
    return BigDecimal.zero();
  }
}
