"use client";

import { Provider, cacheExchange, createClient, fetchExchange } from "urql";
import { ReactNode, useMemo } from "react";

export function UrqlProvider({ children }: { children: ReactNode }) {
  const client = useMemo(
    () =>
      createClient({
        url: "/api/graphql",
        exchanges: [cacheExchange, fetchExchange],
      }),
    []
  );

  return <Provider value={client}>{children}</Provider>;
}
