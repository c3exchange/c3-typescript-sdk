# C3 Exchange SDK

[![Website shields.io](https://img.shields.io/website-up-down-green-red/http/shields.io.svg)](https://c3.io)
[![Discord](https://badgen.net/badge/icon/discord?icon=discord&label)](https://discord.com/invite/ebn5jR39te)
[![Twitter](https://badgen.net/badge/icon/twitter?icon=twitter&label)](https://twitter.com/C3protocol)

- [Overview](#Overview)
- [Installation](#Installation)
- [API Usage](#API-Usage)
  - [Quick start](#Quick-start)
  - [Obtain instruments and markets](#Obtain-instruments-and-markets)
  - [Login your account to C3](#Login-your-account-to-C3)
  - [Sign deposit operation](#Sign-deposit-operation)
  - [Sign lend operation](#Sign-lend-operation)
- [Copyright and License](#Copyright-and-License)

## Overview

C3SDK is the javascript package needed to interact with C3.

## Installation

The package can be installed via npm:

```sh
npm install @c3exchange/sdk
```

## API Usage

### Quick start

```js
import { C3SDK } from "@c3exchange/sdk";
const c3Sdk = new C3SDK();
```

### Obtain instruments and markets

```js
import { Instrument, MarketInfo } from "@c3exchange/sdk";

async function getInfoFromC3API(c3Sdk: C3SDK) {
  const instruments: Instrument[] = await c3Sdk.getInstruments();
  const markets: MarketInfo[] = await c3Sdk.getMarkets().getAll();
}
```

### Login your account to C3

```js
import { C3SDK, EVMSigner, CHAIN_ID_ETH } from "@c3exchange/sdk";
import * as ethers from "ethers";

async function loginToC3(c3Sdk: C3SDK) {
  const ethereumAccount = ethers.Wallet.createRandom();

  const signer = new EVMSigner(
    ethereumAccount.address,
    CHAIN_ID_ETH,
    ethereumAccount
  );

  const c3Account = await c3Sdk.login(signer);

  return c3Account;
}
```

### Sign deposit operation

```js
import {
  InstrumentAmount,
  Account,
  EVMSigner,
  toChainName,
} from "@c3exchange/sdk";

async function depositToC3(
  c3Account: Account<EVMSigner>,
  amount: InstrumentAmount
) {
  const originChain = "ethereum";

  const wormholeDeposit = await c3Account.deposit(amount, originChain);
  await wormholeDeposit.waitForWormholeVAA();
}
```

### Sign lend operation

```js
import {
  InstrumentAmount,
  Account,
  EVMSigner,
  toChainName,
} from "@c3exchange/sdk";

async function lendInC3(
  c3Account: Account<EVMSigner>,
  amount: InstrumentAmount
) {
  const txid = await c3resultAccount.lend(amount);
  console.log(txid);
}
```

## Copyright and License

See [LICENSE](LICENSE.md) file.
