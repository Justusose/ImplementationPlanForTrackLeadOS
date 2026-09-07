// Simple data-fetch hook over the Supabase REST layer. Returns [] when unconfigured.
import { useCallback, useEffect, useState } from "react";
import { select } from "./supabase";

export function useTable<T = Record<string, unknown>>(table: string, query = "select=*") {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    select<T>(table, query).then((data) => {
      if (!alive) return;
      setRows(data);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [table, query, nonce]);

  return { rows, loading, setRows, refetch };
}
