import { getPublicKeyByAddress } from "../../chains"
import { UnixTimestampInSeconds, UserAddress } from "../../interfaces"
import { createDelegation } from "./operation"
import { getDataToSign } from "./signer"

const buildDelegationOperation = (ownerUserAddress: UserAddress, delegateToUserAddress: UserAddress, expiresOn: UnixTimestampInSeconds, nonce: number) => {
    const encodedOperation = createDelegation(delegateToUserAddress, nonce, expiresOn)
    const dataToSign = getDataToSign(encodedOperation, getPublicKeyByAddress(ownerUserAddress), new Uint8Array(32), 0)

    return {
        nonce,
        encodedOperation,
        dataToSign,
    }
}

export {
    buildDelegationOperation,
}