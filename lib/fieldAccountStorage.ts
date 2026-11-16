"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/** Browser and offline data must never be shared across Grace accounts. */
export function fieldStorageKey(userId: string, key: string): string {
  if (!userId || !/^[a-f0-9-]{36}$/i.test(userId)) {
    throw new Error("Signed-in Grace account required for Field storage");
  }
  return `grace-field-user:${userId}:${key}`;
}

/** Cached Supabase sessions also work when a signed-in user is offline. */
export function useFieldAccountId(): string | null {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) setUserId(data.session?.user?.id || null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUserId(session?.user?.id || null);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);
  return userId;
}
