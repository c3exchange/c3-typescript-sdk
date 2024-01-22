[![Website shields.io](https://img.shields.io/website-up-down-green-red/http/shields.io.svg)](https://c3.io)
[![Discord](https://badgen.net/badge/icon/discord?icon=discord&label)](https://discord.com/invite/ebn5jR39te)
[![Twitter](https://badgen.net/badge/icon/twitter?icon=twitter&label)](https://twitter.com/C3protocol)

# C3 Exchange Typescript SDK

Welcome to the official TypeScript SDK of C3 Exchange 



## Example Repository

Scripts with examples are provided to help you understand how to use the SDK to build your own bot. [Examples Folder] (examples/src/)

## API Documentation

For detailed information about the API and its capabilities, please refer to the official [C3 Exchange API Documentation](https://docs.c3.io/).

## Dependencies
NOTE: if signing using an EVM Wallet, ethers.js version 5 is supported 

```
npm install @c3exchange/sdk@0.4.0-alpha.3 ethers@5
```
## Quick Start

_Init c3sdk_

```javascript

import { Signer } from "@c3exchange/common";
import { C3SDK, OrderParams } from "@c3exchange/sdk";


const c3sdk = new C3SDK({
  c3_api: {
    server: "https://api.test.c3.io", // Mainnet api: "https://api.c3.io" 
    wormhole_network: "TESTNET",
  },
  algorand_node: {
    server: "https://algolite.test.c3.io", // Mainnet node: "https://node.algoexplorerapi.io" 
  },
```

_Authentification_

```javascript
  const signerClass = new Signer();
  const signer = signerClass.addFromMnemonic(Algorand_MNEMONIC); //signer can also be an EVM signer, check examples folder

  console.log("Authenticating account");
  const accountSdk = await c3sdk.login(signer);

```

_Create an order_

```javascript


async function createOrders(): Promise<void> {
  console.log("Submitting 1 order");

  const firsOrder: OrderParams = {
    type: ORDER_TYPE,
    side: ORDER_SIDE,
    marketId: MARKET,
    amount: ORDER_AMOUNT,
    price: ORDER_PRICE,
    // maxBorrow: "2.5", // Optional, used for margin orders
    // maxRepay:"2.5", // Optional, used to pay back loans
    // expiresOn: // Optional, UnixTimestampInSeconds;
  };

  const orderResult = await accountSdk.createOrder(firsOrder);

}

createOrders().catch((error) => console.log("Error in execution.", error));

});

```


### Note
This SDK is provided "as is", without warranty of any kind, express or implied. C3 Exchange does not take responsibility for any harm that might be caused by the use or misuse of this SDK.