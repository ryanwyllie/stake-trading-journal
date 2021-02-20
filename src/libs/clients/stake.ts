import { DateTime } from "luxon";
import { MarketData, Transaction, User } from "../../types";

const API_URL = "https://global-prd-api.hellostake.com/api";

function apiUrl(uri: string) {
  return `${API_URL}/${uri}`;
}

export async function login(username: string, password: string, otp?: string) {
  const data: any = {
    username,
    password,
    platformType: "WEB_f5K2x3",
    rememberMeDays: 30,
  };

  if (otp) {
    data.otp = otp;
  }

  const response = await fetch(apiUrl("sessions/v2/createSession"), {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    redirect: "follow",
    referrerPolicy: "no-referrer",
    body: JSON.stringify(data),
  });

  if (response.ok) {
    const responseData = await response.json();
    return {
      firstName: responseData.firstName,
      lastName: responseData.lastName,
      regionIdentifier: responseData.regionIdentifier,
      sessionKey: responseData.sessionKey,
      userID: responseData.userID,
      username: responseData.username,
    } as User;
  } else {
    if (response.status === 412) {
      return null;
    } else {
      const responseData = await response.json();
      throw new Error(`Failed to login: ${responseData.message}`);
    }
  }
}

export async function logout(user: User) {
  await fetch(apiUrl(`userauth/${user.sessionKey}`), {
    method: "DELETE",
    mode: "cors",
    cache: "no-cache",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    redirect: "follow",
    referrerPolicy: "no-referrer",
  });
}

export async function loadTrades(
  user: User,
  from: DateTime,
  to: DateTime,
  limit: number,
  offset: number,
  desc: boolean
) {
  const response = await fetch(apiUrl("users/accounts/accountTransactions"), {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "Stake-Session-Token": user.sessionKey,
    },
    redirect: "follow",
    referrerPolicy: "no-referrer",
    body: JSON.stringify({
      direction: desc ? "prev" : "next",
      from: from.toISO(),
      to: to.toISO(),
      limit,
      offset: offset || null,
    }),
  });

  if (response.ok) {
    const responseData = await response.json();
    return responseData as Transaction[];
  } else {
    const responseData = await response.json();
    throw new Error(`Failed to load transactions: ${responseData.message}`);
  }
}

export async function loadMarketData(user: User, symbols: string[]) {
  const response = await fetch(
    apiUrl(`quotes/marketData/${symbols.join(",")}`),
    {
      method: "GET",
      mode: "cors",
      cache: "no-cache",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "Stake-Session-Token": user.sessionKey,
      },
      redirect: "follow",
      referrerPolicy: "no-referrer",
    }
  );

  if (response.ok) {
    const responseData = await response.json();
    return responseData.marketDataList as MarketData[];
  } else {
    const responseData = await response.json();
    throw new Error(`Failed to load market data: ${responseData.message}`);
  }
}
