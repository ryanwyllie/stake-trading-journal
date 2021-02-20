import React, { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { Transaction, User } from "../types";
import { loadMarketData, loadTrades } from "../libs/clients/stake";
import { useAsyncState } from "../libs/hooks/general";

import H2 from "../components/headings/H2";
import H3 from "../components/headings/H3";
import H4 from "../components/headings/H4";
import InternalLink from "../components/links/Internal";
import LoaderIcon from "../components/icons/Loader";
import ErrorAlert from "../components/alerts/Error";

const TABLE_WIDTH = 1300;
const CELL_WIDTH = 125;

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
  realisedProfitRaw: number;
  realisedProfitPercent: number;
  unrealisedProfitRaw: number;
  unrealisedProfitPercent: number;
  combinedProfitRaw: number;
  combinedProfitPercent: number;
  realisedCost: number;
  unrealisedCost: number;
}

interface DayLog {
  symbols: {
    [symbol: string]: LogEntry;
  };
  realisedProfitRaw: number;
  realisedProfitPercent: number;
  unrealisedProfitRaw: number;
  unrealisedProfitPercent: number;
  combinedProfitRaw: number;
  combinedProfitPercent: number;
  realisedCost: number;
  unrealisedCost: number;
  date: string;
}

type DayLogs = Array<DayLog | null>;

interface WeekLog {
  date: DateTime;
  weekOfMonth: number;
  realisedProfitRaw: number;
  realisedProfitPercent: number;
  unrealisedProfitRaw: number;
  unrealisedProfitPercent: number;
  combinedProfitRaw: number;
  combinedProfitPercent: number;
  realisedCost: number;
  unrealisedCost: number;
  dayLogs: DayLogs;
}

type WeekLogs = WeekLog[];

interface MonthLog {
  date: DateTime;
  realisedProfitRaw: number;
  realisedProfitPercent: number;
  unrealisedProfitRaw: number;
  unrealisedProfitPercent: number;
  combinedProfitRaw: number;
  combinedProfitPercent: number;
  realisedCost: number;
  unrealisedCost: number;
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
          realisedProfitRaw: 0,
          realisedProfitPercent: 0,
          unrealisedProfitRaw: 0,
          unrealisedProfitPercent: 0,
          combinedProfitRaw: 0,
          combinedProfitPercent: 0,
          realisedCost: 0,
          unrealisedCost: 0,
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
          realisedProfitRaw: 0,
          realisedProfitPercent: 0,
          unrealisedProfitRaw: 0,
          unrealisedProfitPercent: 0,
          combinedProfitRaw: 0,
          combinedProfitPercent: 0,
          realisedCost: 0,
          unrealisedCost: 0,
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

function calculateProfits(
  data: DayLogs,
  symbolPrices: { [symbol: string]: number }
) {
  return data.map((dayLog) => {
    if (!dayLog) {
      return null;
    }

    let dayRealisedCost = 0;
    let dayRealisedGain = 0;
    let dayUnrealisedCost = 0;
    let dayUnrealisedGain = 0;

    const symbols = Object.keys(dayLog.symbols).reduce<DayLog["symbols"]>(
      (carry, symbol) => {
        const logEntry = dayLog.symbols[symbol];
        let quantitySold = 0;

        logEntry.sells.sort(sortBuySell);
        logEntry.buys.sort(sortBuySell);

        const realisedGain = logEntry.sells.reduce((total, sell) => {
          quantitySold += sell.unitQuantity;
          return (total += sell.unitQuantity * sell.unitPrice);
        }, 0);
        const [realisedCost, unrealisedCost] = logEntry.buys.reduce(
          (carry, buy) => {
            let buyQuantity = buy.unitQuantity;

            if (quantitySold > 0) {
              if (buyQuantity > quantitySold) {
                carry[0] = carry[0] + quantitySold * buy.unitPrice;
                buyQuantity -= quantitySold;
                quantitySold = 0;
              } else {
                carry[0] = carry[0] + buyQuantity * buy.unitPrice;
                quantitySold -= buyQuantity;
                buyQuantity = 0;
              }
            }

            if (buyQuantity > 0) {
              carry[1] = carry[1] + buyQuantity * buy.unitPrice;
            }

            return carry;
          },
          [0, 0]
        );
        const realisedProfitRaw = realisedGain - realisedCost;
        const realisedProfitPercent =
          realisedProfitRaw === 0
            ? 0
            : (Math.abs(realisedProfitRaw) / realisedCost) *
              100 *
              (realisedProfitRaw < 0 ? -1 : 1);

        const symbolPrice = symbolPrices[symbol] || 0;
        const unrealisedGain = logEntry.holdingUnitCount * symbolPrice;
        const unrealisedProfitRaw =
          symbolPrice && logEntry.holdingUnitCount
            ? unrealisedGain - unrealisedCost
            : 0;

        const unrealisedProfitPercent =
          unrealisedProfitRaw === 0
            ? 0
            : (Math.abs(unrealisedProfitRaw) / unrealisedCost) *
              100 *
              (unrealisedProfitRaw < 0 ? -1 : 1);

        const combinedProfitRaw =
          realisedGain + unrealisedGain - (realisedCost + unrealisedCost);
        const combinedProfitPercent =
          combinedProfitRaw === 0
            ? 0
            : (Math.abs(realisedProfitRaw + unrealisedProfitRaw) /
                (realisedCost + unrealisedCost)) *
              100 *
              (combinedProfitRaw < 0 ? -1 : 1);

        dayRealisedCost += realisedCost;
        dayRealisedGain += realisedGain;
        dayUnrealisedCost += unrealisedCost;
        dayUnrealisedGain += unrealisedGain;

        carry[symbol] = {
          ...logEntry,
          realisedProfitRaw,
          realisedProfitPercent,
          unrealisedProfitRaw,
          unrealisedProfitPercent,
          combinedProfitRaw,
          combinedProfitPercent,
          realisedCost,
          unrealisedCost,
        };

        return carry;
      },
      {}
    );

    const realisedProfitRaw = dayRealisedGain - dayRealisedCost;
    const realisedProfitPercent =
      realisedProfitRaw === 0
        ? 0
        : (Math.abs(realisedProfitRaw) / dayRealisedCost) *
          100 *
          (realisedProfitRaw < 0 ? -1 : 1);
    const unrealisedProfitRaw = dayUnrealisedGain - dayUnrealisedCost;
    const unrealisedProfitPercent =
      unrealisedProfitRaw === 0
        ? 0
        : (Math.abs(unrealisedProfitRaw) / dayUnrealisedCost) *
          100 *
          (unrealisedProfitRaw < 0 ? -1 : 1);
    const combinedProfitRaw =
      dayRealisedGain +
      dayUnrealisedGain -
      (dayRealisedCost + dayUnrealisedCost);
    const combinedProfitPercent =
      combinedProfitRaw === 0
        ? 0
        : (Math.abs(realisedProfitRaw + unrealisedProfitRaw) /
            (dayRealisedCost + dayUnrealisedCost)) *
          100 *
          (combinedProfitRaw < 0 ? -1 : 1);

    return {
      ...dayLog,
      symbols,
      realisedProfitRaw,
      realisedProfitPercent,
      unrealisedProfitRaw,
      unrealisedProfitPercent,
      combinedProfitRaw,
      combinedProfitPercent,
      realisedCost: dayRealisedCost,
      unrealisedCost: dayUnrealisedCost,
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

function getDisplayProfits(data: {
  realisedProfitRaw: number;
  realisedProfitPercent: number;
  unrealisedProfitRaw: number;
  unrealisedProfitPercent: number;
  combinedProfitRaw: number;
  combinedProfitPercent: number;
}) {
  const [realisedRaw, realisedPercent] = getDisplayProfit(
    data.realisedProfitRaw,
    data.realisedProfitPercent
  );
  const [unrealisedRaw, unrealisedPercent] = getDisplayProfit(
    data.unrealisedProfitRaw,
    data.unrealisedProfitPercent
  );
  const [combinedRaw, combinedPercent] = getDisplayProfit(
    data.combinedProfitRaw,
    data.combinedProfitPercent
  );

  return {
    displayRealisedRaw: realisedRaw,
    displayRealisedPercent: realisedPercent,
    displayUnrealisedRaw: unrealisedRaw,
    displayUnrealisedPercent: unrealisedPercent,
    displayCombinedRaw: combinedRaw,
    displayCombinedPercent: combinedPercent,
  };
}

interface JournalPageProps {
  user: User;
}
const JournalPage: React.FC<JournalPageProps> = ({ user }) => {
  const cachedData = window.localStorage.getItem("journalData");
  const { loading, setLoading, error, setError } = useAsyncState();
  const [startLoadTrades, setStartLoadTrades] = useState(false);
  const [endLoadTrades, setEndLoadTrades] = useState(false);
  const [startLoadMarketData, setStartLoadMarketData] = useState(false);
  const [data, setData] = useState<DayLogs>(
    cachedData ? JSON.parse(cachedData) : []
  );
  const [showUnmatchedAlert, setShowUnmatchedAlert] = useState(false);
  const [unmatchedTransactionCount, setUnmatchedTransactionCount] = useState(0);
  const holdingSymbols = useMemo(() => {
    const symbols = data.reduce<{ [symbol: string]: boolean }>(
      (carry, dayLog) => {
        if (dayLog) {
          Object.values(dayLog.symbols).forEach((dayLogSymbol) => {
            if (dayLogSymbol.holdingUnitCount > 0) {
              carry[dayLogSymbol.instrument.symbol] = true;
            }
          });
        }
        return carry;
      },
      {}
    );

    return Object.keys(symbols);
  }, [data]);
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
          realisedProfitRaw: 0,
          realisedProfitPercent: 0,
          unrealisedProfitRaw: 0,
          unrealisedProfitPercent: 0,
          combinedProfitRaw: 0,
          combinedProfitPercent: 0,
          realisedCost: 0,
          unrealisedCost: 0,
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
          realisedProfitRaw: 0,
          realisedProfitPercent: 0,
          unrealisedProfitRaw: 0,
          unrealisedProfitPercent: 0,
          combinedProfitRaw: 0,
          combinedProfitPercent: 0,
          realisedCost: 0,
          unrealisedCost: 0,
          dayLogs: [],
        };

        monthLog.weekLogs.push(weekLog);
      }

      monthLog.realisedCost += dayLog.realisedCost;
      monthLog.unrealisedCost += dayLog.unrealisedCost;
      monthLog.realisedProfitRaw += dayLog.realisedProfitRaw;
      monthLog.unrealisedProfitRaw += dayLog.unrealisedProfitRaw;
      monthLog.combinedProfitRaw +=
        dayLog.realisedProfitRaw + dayLog.unrealisedProfitRaw;
      monthLog.realisedProfitPercent =
        monthLog.realisedProfitRaw === 0
          ? 0
          : (Math.abs(monthLog.realisedProfitRaw) / monthLog.realisedCost) *
            100 *
            (monthLog.realisedProfitRaw < 0 ? -1 : 1);
      monthLog.unrealisedProfitPercent =
        monthLog.unrealisedProfitRaw === 0
          ? 0
          : (Math.abs(monthLog.unrealisedProfitRaw) / monthLog.unrealisedCost) *
            100 *
            (monthLog.unrealisedProfitRaw < 0 ? -1 : 1);
      monthLog.combinedProfitPercent =
        monthLog.combinedProfitRaw === 0
          ? 0
          : (Math.abs(monthLog.combinedProfitRaw) /
              (monthLog.realisedCost + monthLog.unrealisedCost)) *
            100 *
            (monthLog.combinedProfitRaw < 0 ? -1 : 1);

      weekLog.realisedCost += dayLog.realisedCost;
      weekLog.unrealisedCost += dayLog.unrealisedCost;
      weekLog.realisedProfitRaw += dayLog.realisedProfitRaw;
      weekLog.unrealisedProfitRaw += dayLog.unrealisedProfitRaw;
      weekLog.combinedProfitRaw +=
        dayLog.realisedProfitRaw + dayLog.unrealisedProfitRaw;
      weekLog.realisedProfitPercent =
        weekLog.realisedProfitRaw === 0
          ? 0
          : (Math.abs(weekLog.realisedProfitRaw) / weekLog.realisedCost) *
            100 *
            (weekLog.realisedProfitRaw < 0 ? -1 : 1);
      weekLog.unrealisedProfitPercent =
        weekLog.unrealisedProfitRaw === 0
          ? 0
          : (Math.abs(weekLog.unrealisedProfitRaw) / weekLog.unrealisedCost) *
            100 *
            (weekLog.unrealisedProfitRaw < 0 ? -1 : 1);
      weekLog.combinedProfitPercent =
        weekLog.combinedProfitRaw === 0
          ? 0
          : (Math.abs(weekLog.combinedProfitRaw) /
              (weekLog.realisedCost + weekLog.unrealisedCost)) *
            100 *
            (weekLog.combinedProfitRaw < 0 ? -1 : 1);

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
      const startOfYear = DateTime.local().startOf("year");
      const lastFetchDate = window.localStorage.getItem("journalLastFetchDate");
      const fetchFrom = lastFetchDate
        ? DateTime.fromISO(lastFetchDate)
        : startOfYear;
      const fetchTo = DateTime.local();
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
            fetchFrom,
            fetchTo,
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

      newData = fillDataArrayWithBuys(startOfYear, newData, buyTransactions);
      [newData, unmatchedTransactions] = fillDataArrayWithSells(
        newData,
        sellTransactions
      );

      newData = calculateProfits(newData, {});

      window.localStorage.setItem("journalData", JSON.stringify(newData));
      window.localStorage.setItem("journalLastFetchDate", fetchTo.toISO());

      setData(newData);
      setUnmatchedTransactionCount(unmatchedTransactions.length);
      setShowUnmatchedAlert(unmatchedTransactions.length > 0);
      setLoading(false);
      setEndLoadTrades(true);
    };

    if (!startLoadTrades) {
      setStartLoadTrades(true);
      startFetchingTrades();
    }
  }, [startLoadTrades, data, setLoading, user, setError]);

  useEffect(() => {
    const fetchMarketData = async () => {
      setLoading(true);

      try {
        const marketDataList = await loadMarketData(user, holdingSymbols);
        const symbolPrices = marketDataList.reduce<{
          [symbol: string]: number;
        }>((carry, marketData) => {
          carry[marketData.symbol] = marketData.lastTrade;
          return carry;
        }, {});

        setData(calculateProfits(data, symbolPrices));
      } catch (e) {
        setError({
          title: "Fetching market data failed",
          message: e.message,
        });
      }

      setLoading(false);
    };

    if (endLoadTrades && !startLoadMarketData && holdingSymbols.length) {
      setStartLoadMarketData(true);
      fetchMarketData();
    }
  }, [
    data,
    holdingSymbols,
    endLoadTrades,
    startLoadMarketData,
    setError,
    setLoading,
    user,
  ]);

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
            const {
              displayRealisedRaw,
              displayRealisedPercent,
              displayUnrealisedRaw,
              displayUnrealisedPercent,
              displayCombinedRaw,
              displayCombinedPercent,
            } = getDisplayProfits(monthLog);

            return (
              <div key={monthLog.date.toISO()}>
                <div className="flex items-center">
                  <H2>{monthLog.date.toFormat("MMMM yyyy")}</H2>

                  <span
                    className={`ml-auto flex-shrink-0 text-2xl text-center ${
                      monthLog.realisedProfitRaw >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                    style={{ width: CELL_WIDTH }}
                  >
                    {displayRealisedRaw}
                  </span>
                  <span
                    className={`flex-shrink-0 text-2xl text-center ${
                      monthLog.realisedProfitRaw >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                    style={{ width: CELL_WIDTH }}
                  >
                    {displayRealisedPercent}
                  </span>
                  <span
                    className={`flex-shrink-0 text-2xl text-center ${
                      monthLog.unrealisedProfitRaw >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                    style={{ width: CELL_WIDTH }}
                  >
                    {displayUnrealisedRaw}
                  </span>
                  <span
                    className={`flex-shrink-0 text-2xl text-center ${
                      monthLog.unrealisedProfitRaw >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                    style={{ width: CELL_WIDTH }}
                  >
                    {displayUnrealisedPercent}
                  </span>
                  <span
                    className={`flex-shrink-0 text-2xl text-center ${
                      monthLog.combinedProfitRaw >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                    style={{ width: CELL_WIDTH }}
                  >
                    {displayCombinedRaw}
                  </span>
                  <span
                    className={`flex-shrink-0 text-2xl text-center ${
                      monthLog.combinedProfitRaw >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                    style={{ width: CELL_WIDTH }}
                  >
                    {displayCombinedPercent}
                  </span>
                </div>
                {monthLog.weekLogs.map((weekLog, weekIndex) => {
                  const {
                    displayRealisedRaw,
                    displayRealisedPercent,
                    displayUnrealisedRaw,
                    displayUnrealisedPercent,
                    displayCombinedRaw,
                    displayCombinedPercent,
                  } = getDisplayProfits(weekLog);

                  return (
                    <div
                      key={weekLog.date.toISO()}
                      className={`${weekIndex === 0 ? "mt-4" : "mt-16"}`}
                    >
                      <div className="flex items-center">
                        <H3>{`Week ${weekLog.weekOfMonth}`}</H3>
                        <span
                          className={`ml-auto flex-shrink-0 text-xl text-center ${
                            weekLog.realisedProfitRaw >= 0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                          style={{ width: CELL_WIDTH }}
                        >
                          {displayRealisedRaw}
                        </span>
                        <span
                          className={`flex-shrink-0 text-xl text-center ${
                            weekLog.realisedProfitRaw >= 0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                          style={{ width: CELL_WIDTH }}
                        >
                          {displayRealisedPercent}
                        </span>
                        <span
                          className={`flex-shrink-0 text-xl text-center ${
                            weekLog.unrealisedProfitRaw >= 0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                          style={{ width: CELL_WIDTH }}
                        >
                          {displayUnrealisedRaw}
                        </span>
                        <span
                          className={`flex-shrink-0 text-xl text-center ${
                            weekLog.unrealisedProfitRaw >= 0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                          style={{ width: CELL_WIDTH }}
                        >
                          {displayUnrealisedPercent}
                        </span>
                        <span
                          className={`flex-shrink-0 text-xl text-center ${
                            weekLog.combinedProfitRaw >= 0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                          style={{ width: CELL_WIDTH }}
                        >
                          {displayCombinedRaw}
                        </span>
                        <span
                          className={`flex-shrink-0 text-xl text-center ${
                            weekLog.combinedProfitRaw >= 0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                          style={{ width: CELL_WIDTH }}
                        >
                          {displayCombinedPercent}
                        </span>
                      </div>
                      {weekLog.dayLogs.map((dayLog) => {
                        if (!dayLog) {
                          return null;
                        }

                        const dayDate = DateTime.fromISO(dayLog.date);
                        const {
                          displayRealisedRaw,
                          displayRealisedPercent,
                          displayUnrealisedRaw,
                          displayUnrealisedPercent,
                          displayCombinedRaw,
                          displayCombinedPercent,
                        } = getDisplayProfits(dayLog);
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
                                className="flex-shrink-0 text-center text-gray-300"
                                style={{ width: CELL_WIDTH }}
                              >
                                Code
                              </div>
                              <div
                                className="flex-shrink-0 text-center text-gray-300"
                                style={{ width: CELL_WIDTH }}
                              >
                                Buy
                              </div>
                              <div
                                className="flex-shrink-0 text-center text-gray-300"
                                style={{ width: CELL_WIDTH }}
                              >
                                Sell
                              </div>
                              <div
                                className="flex-shrink-0 text-center text-gray-300"
                                style={{ width: CELL_WIDTH }}
                              >
                                Hold
                              </div>
                              <div
                                className="ml-auto flex-shrink-0 text-center text-gray-300"
                                style={{ width: CELL_WIDTH }}
                              >
                                Realised ($)
                              </div>
                              <div
                                className="flex-shrink-0 text-center text-gray-300"
                                style={{ width: CELL_WIDTH }}
                              >
                                Realised (%)
                              </div>
                              <div
                                className="flex-shrink-0 text-center text-gray-300"
                                style={{ width: CELL_WIDTH }}
                              >
                                Unrealised ($)
                              </div>
                              <div
                                className="flex-shrink-0 text-center text-gray-300"
                                style={{ width: CELL_WIDTH }}
                              >
                                Unrealised (%)
                              </div>
                              <div
                                className="flex-shrink-0 text-center text-gray-300"
                                style={{ width: CELL_WIDTH }}
                              >
                                Combined ($)
                              </div>
                              <div
                                className="flex-shrink-0 text-center text-gray-300"
                                style={{ width: CELL_WIDTH }}
                              >
                                Combined (%)
                              </div>
                            </div>
                            {symbolEntries.map((logEntry) => {
                              const hasHoldings = logEntry.holdingUnitCount > 0;
                              const hasSold = logEntry.sells.length > 0;
                              const symbolProfitRaw =
                                logEntry.realisedProfitRaw;
                              const isProfit = symbolProfitRaw >= 0;
                              const {
                                displayRealisedRaw,
                                displayRealisedPercent,
                                displayUnrealisedRaw,
                                displayUnrealisedPercent,
                                displayCombinedRaw,
                                displayCombinedPercent,
                              } = getDisplayProfits(logEntry);

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
                                  <div
                                    className={`ml-auto text-center ${
                                      logEntry.realisedProfitRaw >= 0
                                        ? "text-green-500"
                                        : "text-red-500"
                                    }`}
                                    style={{ width: CELL_WIDTH }}
                                  >
                                    {displayRealisedRaw}
                                  </div>
                                  <div
                                    className={`text-center ${
                                      logEntry.realisedProfitRaw >= 0
                                        ? "text-green-500"
                                        : "text-red-500"
                                    }`}
                                    style={{ width: CELL_WIDTH }}
                                  >
                                    {displayRealisedPercent}
                                  </div>
                                  <div
                                    className={`text-center ${
                                      logEntry.unrealisedProfitRaw >= 0
                                        ? "text-green-500"
                                        : "text-red-500"
                                    }`}
                                    style={{ width: CELL_WIDTH }}
                                  >
                                    {displayUnrealisedRaw}
                                  </div>
                                  <div
                                    className={`text-center ${
                                      logEntry.unrealisedProfitRaw >= 0
                                        ? "text-green-500"
                                        : "text-red-500"
                                    }`}
                                    style={{ width: CELL_WIDTH }}
                                  >
                                    {displayUnrealisedPercent}
                                  </div>
                                  <div
                                    className={`text-center ${
                                      logEntry.combinedProfitRaw >= 0
                                        ? "text-green-500"
                                        : "text-red-500"
                                    }`}
                                    style={{ width: CELL_WIDTH }}
                                  >
                                    {displayCombinedRaw}
                                  </div>
                                  <div
                                    className={`text-center ${
                                      logEntry.combinedProfitRaw >= 0
                                        ? "text-green-500"
                                        : "text-red-500"
                                    }`}
                                    style={{ width: CELL_WIDTH }}
                                  >
                                    {displayCombinedPercent}
                                  </div>
                                </div>
                              );
                            })}

                            <div className="py-3 flex items-center border-t border-gray-200">
                              <span
                                className={`ml-auto flex-shrink-0 text-lg text-center ${
                                  dayLog.realisedProfitRaw >= 0
                                    ? "text-green-500"
                                    : "text-red-500"
                                }`}
                                style={{ width: CELL_WIDTH }}
                              >
                                {displayRealisedRaw}
                              </span>
                              <span
                                className={`flex-shrink-0 text-lg text-center ${
                                  dayLog.realisedProfitRaw >= 0
                                    ? "text-green-500"
                                    : "text-red-500"
                                }`}
                                style={{ width: CELL_WIDTH }}
                              >
                                {displayRealisedPercent}
                              </span>
                              <span
                                className={`flex-shrink-0 text-lg text-center ${
                                  dayLog.unrealisedProfitRaw >= 0
                                    ? "text-green-500"
                                    : "text-red-500"
                                }`}
                                style={{ width: CELL_WIDTH }}
                              >
                                {displayUnrealisedRaw}
                              </span>
                              <span
                                className={`flex-shrink-0 text-lg text-center ${
                                  dayLog.unrealisedProfitRaw >= 0
                                    ? "text-green-500"
                                    : "text-red-500"
                                }`}
                                style={{ width: CELL_WIDTH }}
                              >
                                {displayUnrealisedPercent}
                              </span>
                              <span
                                className={`flex-shrink-0 text-lg text-center ${
                                  dayLog.combinedProfitRaw >= 0
                                    ? "text-green-500"
                                    : "text-red-500"
                                }`}
                                style={{ width: CELL_WIDTH }}
                              >
                                {displayCombinedRaw}
                              </span>
                              <span
                                className={`flex-shrink-0 text-lg text-center ${
                                  dayLog.combinedProfitRaw >= 0
                                    ? "text-green-500"
                                    : "text-red-500"
                                }`}
                                style={{ width: CELL_WIDTH }}
                              >
                                {displayCombinedPercent}
                              </span>
                            </div>
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
