/* ═══════════════════════════════════════════════════════════════
   Data Fetching Hooks
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useMemo } from "react";
import type {
  EventFlowData, KolFlowData, NarrativeFlowData,
  EventFlowRequest, KolFlowRequest, NarrativeFlowRequest,
} from "../types";
import { EventGraphApiClient } from "../api/client";

/** Stable serialization for request objects used as effect dependencies */
function useStableRequest<T>(request: T | null): string {
  return useMemo(() => (request ? JSON.stringify(request) : ""), [request]);
}

export function useEventGraphApi(client: EventGraphApiClient, request: EventFlowRequest | null) {
  const [data, setData] = useState<EventFlowData | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const serialized = useStableRequest(request);

  useEffect(() => {
    if (!request || !serialized) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    client.getEventFlow(request)
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [client, serialized]);
  return { data, loading, error, setData };
}

export function useKolGraphApi(client: EventGraphApiClient, request: KolFlowRequest | null) {
  const [data, setData] = useState<KolFlowData | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const serialized = useStableRequest(request);

  useEffect(() => {
    if (!request || !serialized) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    client.getKolFlow(request)
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [client, serialized]);
  return { data, loading, error, setData };
}

export function useNarrativeGraphApi(client: EventGraphApiClient, request: NarrativeFlowRequest | null) {
  const [data, setData] = useState<NarrativeFlowData | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const serialized = useStableRequest(request);

  useEffect(() => {
    if (!request || !serialized) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    client.getNarrativeFlow(request)
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [client, serialized]);
  return { data, loading, error, setData };
}
