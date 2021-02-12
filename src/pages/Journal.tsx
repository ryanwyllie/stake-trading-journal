import React, { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { Transaction, User } from "../types";
import { loadTrades } from "../libs/clients/stake";
import { useAsyncState } from "../libs/hooks/general";

import H2 from "../components/headings/H2";
import H3 from "../components/headings/H3";
import H4 from "../components/headings/H4";
import InternalLink from "../components/links/Internal";
import LoaderIcon from "../components/icons/Loader";
import ErrorAlert from "../components/alerts/Error";

const TABLE_WIDTH = 1000;
const CELL_WIDTH = 150;

interface BuySellEntry {
  orderId: string;
  unitPrice: number;
  unitQuantity: number;
  totalPrice: number;
  date: string;
}

interface LogEntry {
  instrument: {
    id: string;
    symbol: string;
    name: string;
  };
  buys: BuySellEntry[];
  sells: BuySellEntry[];
  holdingUnitCount: number;
  profitRaw: number;
  profitPercent: number;
  spent: number;
  earned: number;
}

interface DayLog {
  symbols: {
    [symbol: string]: LogEntry;
  };
  profitRaw: number;
  profitPercent: number;
  spent: number;
  earned: number;
  date: string;
}

type DayLogs = Array<DayLog | null>;

interface WeekLog {
  date: DateTime;
  weekOfMonth: number;
  profitRaw: number;
  profitPercent: number;
  spent: number;
  earned: number;
  dayLogs: DayLogs;
}

type WeekLogs = WeekLog[];

interface MonthLog {
  date: DateTime;
  profitRaw: number;
  profitPercent: number;
  spent: number;
  earned: number;
  weekLogs: WeekLogs;
}

type MonthLogs = MonthLog[];

function sortTransactionsAsc(a: Transaction, b: Transaction) {
  if (a.tranWhen < b.tranWhen) {
    return -1;
  } else if (a.tranWhen > b.tranWhen) {
    return 1;
  } else {
    return 0;
  }
}

function sortBuySell(a: BuySellEntry, b: BuySellEntry) {
  if (a.date < b.date) {
    return -1;
  } else if (a.date > b.date) {
    return 1;
  } else {
    return 0;
  }
}

function sortLogEntries(a: LogEntry, b: LogEntry) {
  const aEarliestBuyDate = a.buys[0].date;
  const bEarliestBuyDate = b.buys[0].date;

  if (aEarliestBuyDate < bEarliestBuyDate) {
    return -1;
  } else if (aEarliestBuyDate > bEarliestBuyDate) {
    return 1;
  } else {
    return 0;
  }
}

function fillDataArrayWithBuys(
  from: DateTime,
  data: DayLogs,
  transactions: Transaction[]
) {
  let newData = data.slice();

  transactions.forEach((transaction) => {
    if (transaction.finTranTypeID === "SPUR") {
      const symbol = transaction.instrument.symbol;
      const date = DateTime.fromISO(transaction.tranWhen);
      const dataIndex = Math.floor(date.diff(from).as("days"));

      let dayLog = newData[dataIndex];

      if (!dayLog) {
        dayLog = {
          symbols: {},
          profitRaw: 0,
          profitPercent: 0,
          spent: 0,
          earned: 0,
          date: date.startOf("day").toISO(),
        };
      }

      let symbolEntry = dayLog.symbols[symbol];

      if (!symbolEntry) {
        symbolEntry = {
          instrument: transaction.instrument,
          buys: [],
          sells: [],
          holdingUnitCount: 0,
          profitRaw: 0,
          profitPercent: 0,
          spent: 0,
          earned: 0,
        };
      }

      let buyIndex = symbolEntry.buys.findIndex(
        (candidate) => candidate.orderId === transaction.orderID
      );

      if (buyIndex >= 0) {
        // Merge it with the other order.
        const existingBuy = symbolEntry.buys[buyIndex];
        symbolEntry.buys[buyIndex] = {
          ...existingBuy,
          unitQuantity: existingBuy.unitQuantity + transaction.fillQty,
          totalPrice: existingBuy.totalPrice + transaction.tranAmount,
        };
      } else {
        symbolEntry.buys = symbolEntry.buys.concat({
          orderId: transaction.orderID,
          unitPrice: transaction.fillPx,
          unitQuantity: transaction.fillQty,
          totalPrice: transaction.tranAmount,
          date: transaction.tranWhen,
        });
      }

      symbolEntry.holdingUnitCount += transaction.fillQty;

      dayLog.symbols = {
        ...dayLog.symbols,
        [symbol]: { ...symbolEntry },
      };
      newData[dataIndex] = { ...dayLog };
    }
  });

  return newData;
}

function fillDataArrayWithSells(data: DayLogs, transactions: Transaction[]) {
  let newData = data.slice();
  let unmatchedTransactions: Transaction[] = [];

  transactions.forEach((transaction) => {
    if (transaction.finTranTypeID === "SSAL") {
      const symbol = transaction.instrument.symbol;
      let remainingQuantity = transaction.fillQty;
      let searchIndex = 0;

      while (remainingQuantity > 0 && searchIndex < newData.length) {
        const dayLog = newData[searchIndex];
        const symbolEntry = dayLog ? dayLog.symbols[symbol] : undefined;

        if (symbolEntry && symbolEntry.holdingUnitCount >= 0) {
          const fillQuantity =
            symbolEntry.holdingUnitCount >= remainingQuantity
              ? remainingQuantity
              : remainingQuantity - symbolEntry.holdingUnitCount;
          newData[searchIndex] = {
            ...newData[searchIndex],
            symbols: {
              ...newData[searchIndex]!.symbols,
              [symbol]: {
                ...symbolEntry,
                holdingUnitCount: symbolEntry.holdingUnitCount - fillQuantity,
                sells: symbolEntry.sells.concat({
                  orderId: transaction.orderID,
                  unitPrice: transaction.fillPx,
                  unitQuantity: fillQuantity,
                  totalPrice: transaction.tranAmount,
                  date: transaction.tranWhen,
                }),
              },
            },
          } as DayLog;

          remainingQuantity -= fillQuantity;
        }

        searchIndex++;
      }

      if (remainingQuantity > 0) {
        unmatchedTransactions.push({
          ...transaction,
          fillQty: remainingQuantity,
        });
      }
    }
  });

  return [newData, unmatchedTransactions] as [DayLogs, Transaction[]];
}

function calculateProfits(data: DayLogs) {
  return data.map((dayLog) => {
    if (!dayLog) {
      return null;
    }

    let dayAmountSpent = 0;
    let dayAmountEarned = 0;
    const symbols = Object.keys(dayLog.symbols).reduce<DayLog["symbols"]>(
      (carry, symbol) => {
        const logEntry = dayLog.symbols[symbol];
        let quantitySold = 0;

        logEntry.sells.sort(sortBuySell);
        logEntry.buys.sort(sortBuySell);

        const symbolAmountEarned = logEntry.sells.reduce((total, sell) => {
          quantitySold += sell.unitQuantity;
          return (total += sell.unitQuantity * sell.unitPrice);
        }, 0);
        const symbolAmountSpent = logEntry.buys.reduce((total, buy) => {
          if (quantitySold > 0) {
            const consumedAmount =
              buy.unitQuantity > quantitySold ? quantitySold : buy.unitQuantity;
            quantitySold -= consumedAmount;
            return (total += consumedAmount * buy.unitPrice);
          } else {
            return total;
          }
        }, 0);
        const profitRaw = symbolAmountEarned - symbolAmountSpent;
        const profitPercent =
          profitRaw === 0
            ? 0
            : (Math.abs(profitRaw) / symbolAmountSpent) *
              100 *
              (profitRaw < 0 ? -1 : 1);

        dayAmountSpent += symbolAmountSpent;
        dayAmountEarned += symbolAmountEarned;

        carry[symbol] = {
          ...logEntry,
          profitRaw,
          profitPercent,
          spent: symbolAmountSpent,
          earned: symbolAmountEarned,
        };

        return carry;
      },
      {}
    );

    const profitRaw = dayAmountEarned - dayAmountSpent;
    const profitPercent =
      profitRaw === 0
        ? 0
        : (Math.abs(profitRaw) / dayAmountSpent) *
          100 *
          (profitRaw < 0 ? -1 : 1);

    return {
      ...dayLog,
      symbols,
      profitRaw,
      profitPercent,
      spent: dayAmountSpent,
      earned: dayAmountEarned,
    };
  });
}

function getDisplayProfit(raw: number, percent: number) {
  const isProfit = raw >= 0;
  const displayProfitRaw = `${isProfit ? "+" : "-"}$${Math.abs(raw).toPrecision(
    3
  )}`;
  const displayProfitPercent = `${isProfit ? "+" : "-"}${Math.abs(
    percent
  ).toPrecision(3)}%`;

  return [displayProfitRaw, displayProfitPercent];
}

interface JournalPageProps {
  user: User;
}
const JournalPage: React.FC<JournalPageProps> = ({ user }) => {
  const cachedData = window.localStorage.getItem("journalData");
  const { loading, setLoading, error, setError } = useAsyncState();
  const [initialised, setInitialised] = useState(false);
  const [data, setData] = useState<DayLogs>(
    cachedData ? JSON.parse(cachedData) : []
  );
  const [showUnmatchedAlert, setShowUnmatchedAlert] = useState(false);
  const [unmatchedTransactionCount, setUnmatchedTransactionCount] = useState(0);
  const monthLogs = useMemo(() => {
    const newMonthLogs = data.reduce<MonthLogs>((carry, dayLog) => {
      if (!dayLog) {
        return carry;
      }

      const dayDate = DateTime.fromISO(dayLog.date);
      const startOfMonth = dayDate.startOf("month");
      const startOfWeek = dayDate.startOf("week");
      let monthLog = carry.find((candidate) =>
        candidate.date.equals(startOfMonth)
      );

      if (!monthLog) {
        monthLog = {
          date: startOfMonth,
          profitRaw: 0,
          profitPercent: 0,
          spent: 0,
          earned: 0,
          weekLogs: [],
        };

        carry.push(monthLog);
      }

      let weekLog = monthLog.weekLogs.find((candidate) =>
        candidate.date.equals(startOfWeek)
      );

      if (!weekLog) {
        let weekNumber = 1;
        let endOfWeek = startOfMonth.endOf("week");

        while (startOfWeek > endOfWeek) {
          weekNumber++;
          endOfWeek = endOfWeek.plus({ week: 1 });
        }

        weekLog = {
          date: startOfWeek,
          weekOfMonth: weekNumber,
          profitRaw: 0,
          profitPercent: 0,
          spent: 0,
          earned: 0,
          dayLogs: [],
        };

        monthLog.weekLogs.push(weekLog);
      }

      monthLog.spent += dayLog.spent;
      monthLog.earned += dayLog.earned;
      monthLog.profitRaw = monthLog.earned - monthLog.spent;
      monthLog.profitPercent =
        monthLog.profitRaw === 0
          ? 0
          : (Math.abs(monthLog.profitRaw) / monthLog.spent) *
            100 *
            (monthLog.profitRaw < 0 ? -1 : 1);

      weekLog.spent += dayLog.spent;
      weekLog.earned += dayLog.earned;
      weekLog.profitRaw = weekLog.earned - weekLog.spent;
      weekLog.profitPercent =
        weekLog.profitRaw === 0
          ? 0
          : (Math.abs(weekLog.profitRaw) / weekLog.spent) *
            100 *
            (weekLog.profitRaw < 0 ? -1 : 1);

      weekLog.dayLogs.push(dayLog);

      return carry;
    }, []);

    newMonthLogs.forEach((monthLog) => {
      monthLog.weekLogs.forEach((weekLog) => {
        weekLog.dayLogs.reverse();
      });

      monthLog.weekLogs.reverse();
    });
    newMonthLogs.reverse();

    return newMonthLogs;
  }, [data]);

  useEffect(() => {
    const startFetchingTrades = async () => {
      const lastFetchDate = window.localStorage.getItem("journalLastFetchDate");
      const from = lastFetchDate
        ? DateTime.fromISO(lastFetchDate)
        : DateTime.local().startOf("year");
      const to = DateTime.local();
      const limit = 100;
      let offset = 0;
      let fetching = true;
      let newData = data.slice();
      let unmatchedTransactions: Transaction[] = [];
      let buyTransactions: Transaction[] = [];
      let sellTransactions: Transaction[] = [];
      setLoading(true);

      try {
        do {
          const transactions = await loadTrades(
            user,
            from,
            to,
            limit,
            offset,
            true
          );
          offset += limit;

          buyTransactions = buyTransactions.concat(
            transactions.filter(
              (transaction) => transaction.finTranTypeID === "SPUR"
            )
          );
          sellTransactions = sellTransactions.concat(
            transactions.filter(
              (transaction) => transaction.finTranTypeID === "SSAL"
            )
          );

          if (transactions.length < limit) {
            fetching = false;
          }
        } while (fetching);
      } catch (e) {
        setError({
          title: "Fetching trades failed",
          message: e.message,
        });
      }

      buyTransactions.sort(sortTransactionsAsc);
      sellTransactions.sort(sortTransactionsAsc);

      newData = fillDataArrayWithBuys(from, newData, buyTransactions);
      [newData, unmatchedTransactions] = fillDataArrayWithSells(
        newData,
        sellTransactions
      );
      newData = calculateProfits(newData);

      window.localStorage.setItem("journalData", JSON.stringify(newData));
      window.localStorage.setItem("journalLastFetchDate", to.toISO());

      setData(newData);
      setUnmatchedTransactionCount(unmatchedTransactions.length);
      setShowUnmatchedAlert(unmatchedTransactions.length > 0);
      setLoading(false);
    };

    if (!initialised) {
      setInitialised(true);
      startFetchingTrades();
    }
  }, [initialised, data]);

  return (
    <div className="w-full">
      <header className="px-4 py-2 w-full flex items-center">
        <H2>{`${user.firstName}'s trade journal`}</H2>
        {loading && <LoaderIcon className="ml-2" />}
        <InternalLink className="ml-auto" to="/logout">
          Log out
        </InternalLink>
      </header>
      <main className="mt-8 p-4 flex flex-col items-center">
        <div style={{ width: 400 }}>{error()}</div>
        {showUnmatchedAlert && (
          <div style={{ width: 400 }}>
            <ErrorAlert
              message={`Found ${unmatchedTransactionCount} unmatched sell transactions`}
              dismissable={true}
              onDismiss={() => setShowUnmatchedAlert(false)}
            />
          </div>
        )}
        <div style={{ width: TABLE_WIDTH }}>
          {monthLogs.map((monthLog) => {
            const monthProfitRaw = monthLog.profitRaw;
            const isMonthProfit = monthProfitRaw >= 0;
            const [displayRaw, displayPercent] = getDisplayProfit(
              monthProfitRaw,
              monthLog.profitPercent
            );
            const hasMonthEarnings = monthLog.earned !== 0;

            return (
              <div key={monthLog.date.toISO()}>
                <div className="flex items-center">
                  <H2>{monthLog.date.toFormat("MMMM yyyy")}</H2>
                  {hasMonthEarnings && (
                    <span
                      className={`ml-auto text-2xl text-center ${
                        isMonthProfit ? "text-green-500" : "text-red-500"
                      }`}
                      style={{ width: CELL_WIDTH }}
                    >
                      {displayRaw}
                    </span>
                  )}
                  {hasMonthEarnings && (
                    <span
                      className={`text-2xl text-center ${
                        isMonthProfit ? "text-green-500" : "text-red-500"
                      }`}
                      style={{ width: CELL_WIDTH }}
                    >
                      {displayPercent}
                    </span>
                  )}
                </div>
                {monthLog.weekLogs.map((weekLog, weekIndex) => {
                  const weekProfitRaw = weekLog.profitRaw;
                  const isWeekProfit = weekProfitRaw >= 0;
                  const [displayRaw, displayPercent] = getDisplayProfit(
                    weekProfitRaw,
                    weekLog.profitPercent
                  );
                  const hasWeekEarnings = weekLog.earned !== 0;

                  return (
                    <div
                      key={weekLog.date.toISO()}
                      className={`${weekIndex === 0 ? "mt-4" : "mt-16"}`}
                    >
                      <div className="flex items-center">
                        <H3>{`Week ${weekLog.weekOfMonth}`}</H3>
                        {hasWeekEarnings && (
                          <span
                            className={`ml-auto text-xl text-center ${
                              isWeekProfit ? "text-green-500" : "text-red-500"
                            }`}
                            style={{ width: CELL_WIDTH }}
                          >
                            {displayRaw}
                          </span>
                        )}
                        {hasWeekEarnings && (
                          <span
                            className={`text-xl text-center ${
                              isWeekProfit ? "text-green-500" : "text-red-500"
                            }`}
                            style={{ width: CELL_WIDTH }}
                          >
                            {displayPercent}
                          </span>
                        )}
                      </div>
                      {weekLog.dayLogs.map((dayLog) => {
                        if (!dayLog) {
                          return null;
                        }

                        const dayDate = DateTime.fromISO(dayLog.date);
                        const dayProfitRaw = dayLog.profitRaw;
                        const isProfit = dayProfitRaw >= 0;
                        const [displayRaw, displayPercent] = getDisplayProfit(
                          dayProfitRaw,
                          dayLog.profitPercent
                        );
                        const hasDayEarnings = dayLog.earned !== 0;
                        const symbolEntries = Object.values(dayLog.symbols);
                        symbolEntries.sort(sortLogEntries);

                        return (
                          <div
                            key={dayLog.date}
                            className="mt-4 p-2 border border-gray-100 shadow rounded-lg"
                          >
                            <div className="flex items-center">
                              <H4>{dayDate.toFormat("EEEE")}</H4>
                              <span className="ml-auto text-gray-300">
                                {dayDate.toFormat("dd/MM")}
                              </span>
                            </div>
                            <div className="my-3 flex items-center">
                              <div
                                className="text-center text-gray-300"
                                style={{ width: CELL_WIDTH }}
                              >
                                Code
                              </div>
                              <div
                                className="text-center text-gray-300"
                                style={{ width: CELL_WIDTH }}
                              >
                                Buy
                              </div>
                              <div
                                className="text-center text-gray-300"
                                style={{ width: CELL_WIDTH }}
                              >
                                Sell
                              </div>
                              <div
                                className="text-center text-gray-300"
                                style={{ width: CELL_WIDTH }}
                              >
                                Holding
                              </div>
                              <div
                                className="ml-auto text-center text-gray-300"
                                style={{ width: CELL_WIDTH }}
                              >
                                Return ($)
                              </div>
                              <div
                                className="text-center text-gray-300"
                                style={{ width: CELL_WIDTH }}
                              >
                                Return (%)
                              </div>
                            </div>
                            {symbolEntries.map((logEntry) => {
                              const hasHoldings = logEntry.holdingUnitCount > 0;
                              const hasSold = logEntry.sells.length > 0;
                              const symbolProfitRaw = logEntry.profitRaw;
                              const isProfit = symbolProfitRaw >= 0;
                              const [
                                displayRaw,
                                displayPercent,
                              ] = getDisplayProfit(
                                symbolProfitRaw,
                                logEntry.profitPercent
                              );

                              return (
                                <div
                                  key={logEntry.instrument.symbol}
                                  className="my-3 flex items-center"
                                >
                                  <div
                                    className="text-center"
                                    style={{ width: CELL_WIDTH }}
                                  >
                                    {logEntry.instrument.symbol}
                                  </div>
                                  <div
                                    className="flex flex-col"
                                    style={{ width: CELL_WIDTH }}
                                  >
                                    {logEntry.buys.map((buy, index) => {
                                      return (
                                        <div
                                          key={index}
                                          className="text-center"
                                        >
                                          {`${
                                            buy.unitQuantity
                                          } @ $${buy.unitPrice.toPrecision(4)}`}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div
                                    className="flex flex-col"
                                    style={{ width: CELL_WIDTH }}
                                  >
                                    {logEntry.sells.map((sell, index) => {
                                      return (
                                        <div
                                          key={index}
                                          className="text-center"
                                        >
                                          {`${
                                            sell.unitQuantity
                                          } @ $${sell.unitPrice.toPrecision(
                                            4
                                          )}`}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div
                                    className="text-center text-yellow-500"
                                    style={{ width: CELL_WIDTH }}
                                  >
                                    {hasHoldings
                                      ? `${logEntry.holdingUnitCount}`
                                      : ""}
                                  </div>
                                  {hasSold && (
                                    <div
                                      className={`ml-auto text-center ${
                                        isProfit
                                          ? "text-green-500"
                                          : "text-red-500"
                                      }`}
                                      style={{ width: CELL_WIDTH }}
                                    >
                                      {displayRaw}
                                    </div>
                                  )}
                                  {hasSold && (
                                    <div
                                      className={`text-center ${
                                        isProfit
                                          ? "text-green-500"
                                          : "text-red-500"
                                      }`}
                                      style={{ width: CELL_WIDTH }}
                                    >
                                      {displayPercent}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {hasDayEarnings && (
                              <div className="py-3 flex items-center border-t border-gray-200">
                                <span
                                  className={`ml-auto text-lg text-center ${
                                    isProfit ? "text-green-500" : "text-red-500"
                                  }`}
                                  style={{ width: CELL_WIDTH }}
                                >
                                  {displayRaw}
                                </span>
                                <span
                                  className={`text-lg text-center ${
                                    isProfit ? "text-green-500" : "text-red-500"
                                  }`}
                                  style={{ width: CELL_WIDTH }}
                                >
                                  {displayPercent}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default JournalPage;
