export interface User {
  firstName: string;
  lastName: string;
  regionIdentifier: string;
  sessionKey: string;
  userID: string;
  username: string;
}

export interface Transaction {
  orderID: string;
  accountAmount: number; // Change to account balance.
  accountBalance: number; // Account balance after transaction.
  fillPx: number; // Fill price - price per quantity.
  fillQty: number; // Quantity of stock moved
  finTranTypeID: "SPUR" | "SSAL" | string; // SPUR is a buy, SSAL is a sell.
  instrument: {
    id: string;
    symbol: string;
    name: string;
  };
  tranAmount: number; // Cost/profit of transaction.
  tranWhen: string; // When the transaction occurred. ISO8601 string e.g. "2021-02-03T14:30:18.032Z"
}
