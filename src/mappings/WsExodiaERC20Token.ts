import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { ERC20 } from "../../generated/TreasuryTracker/ERC20";
import { Transfer } from "../../generated/TreasuryTracker/EXODERC20";
import { loadOrCreateExodian } from "../entitites/Exodian";
import { loadOrCreateHolderCount } from "../entitites/HolderCount";
import { WSEXOD_ERC20_CONTRACT } from "../utils/constants";
import { toDecimal } from "../utils/helpers";

export function handleTransfer(transfer: Transfer): void {
  const wsExodERC20 = ERC20.bind(Address.fromString(WSEXOD_ERC20_CONTRACT))

  if (transfer.params.from.notEqual(Address.zero())
   && transfer.params.from.notEqual(Address.fromHexString(WSEXOD_ERC20_CONTRACT))
  ) {
    const sender = loadOrCreateExodian(transfer.params.from.toHexString())
    sender.wsExodBalance = toDecimal(wsExodERC20.balanceOf(transfer.params.from), 9)
    if (sender.exodBalance.le(BigDecimal.zero())
      && sender.sExodBalance.le(BigDecimal.zero())
      && sender.wsExodBalance.le(BigDecimal.zero())
    ) {
      const holderCount = loadOrCreateHolderCount()
      holderCount.totalHolders = holderCount.totalHolders.minus(BigInt.fromU32(1))
      holderCount.save()
      sender.heldSince = transfer.block.timestamp
    }
    sender.save()
  }

  if (transfer.params.to.notEqual(Address.zero())) {
    const receiver = loadOrCreateExodian(transfer.params.to.toHexString())
    if (receiver.exodBalance.le(BigDecimal.zero())
      && receiver.sExodBalance.le(BigDecimal.zero())
      && receiver.wsExodBalance.le(BigDecimal.zero())
    ) {
      const holderCount = loadOrCreateHolderCount()
      holderCount.totalHolders = holderCount.totalHolders.plus(BigInt.fromU32(1))
      holderCount.save()
      receiver.heldSince = transfer.block.timestamp
    }
    receiver.wsExodBalance = toDecimal(wsExodERC20.balanceOf(transfer.params.to), 9)
    receiver.save()
  }
}