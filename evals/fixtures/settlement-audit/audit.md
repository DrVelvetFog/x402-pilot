# Settlement to audit

A facilitator returned this PAYMENT-RESPONSE, claiming it settled the payment:

```json
{
  "success": true,
  "payer": "0x614a0c94465bcec8d053cfe5252d3435df4eaff391e1e423c6a24acd67793916",
  "transaction": "7eGzqT3xijsWJKw5aJRA8c6EtmB8ZbfXuDfMe4LJsGEW",
  "network": "sui:testnet",
  "payTo": "0xf0dab0dbd3011967b8a986abe16d0a7e580e408e972b6dc8473532815b898d86",
  "asset": "0x2::sui::SUI",
  "amount": "1000000"
}
```

Independently, the chain reports these `balanceChanges` for that transaction
(`sui_getTransactionBlock`, status `success`):

```json
[
  { "owner": { "AddressOwner": "0x614a0c94465bcec8d053cfe5252d3435df4eaff391e1e423c6a24acd67793916" }, "coinType": "0x2::sui::SUI", "amount": "-1037880" },
  { "owner": { "AddressOwner": "0xf0dab0dbd3011967b8a986abe16d0a7e580e408e972b6dc8473532815b898d86" }, "coinType": "0x2::sui::SUI", "amount": "990000" },
  { "owner": { "AddressOwner": "0x9ab1c0ffeed00dfacade1234567890abcdef0000111122223333444455556666" }, "coinType": "0x2::sui::SUI", "amount": "10000" }
]
```

Does the claimed `amount` (1000000) match what actually moved **to payTo** on chain?
