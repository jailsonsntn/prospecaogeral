"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthSession, clearSession, getSession, getSessionEventName, hasSupabaseConfig, saveSession, validateSession } from "@/lib/supabaseAuth";

interface Props {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: Props) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function check() {
      if (!hasSupabaseConfig()) {
        if (!isMounted) return;
        setChecking(false);
        return;
      }

      const current = getSession();
      if (!current) {
        router.replace("/login");
        if (!isMounted) return;
        setChecking(false);
        return;
      }

      const valid = await validateSession(current);
      if (!isMounted) return;

      if (!valid) {
        clearSession();
        setSession(null);
        router.replace("/login");
        setChecking(false);
        return;
      }

      saveSession(valid);
      setSession(valid);
      setChecking(false);
    }

    check();

    const eventName = getSessionEventName();
    const syncSession = () => setSession(getSession());
    window.addEventListener(eventName, syncSession);
    window.addEventListener("storage", syncSession);

    return () => {
      isMounted = false;
      window.removeEventListener(eventName, syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, [router]);

  useEffect(() => {
    if (!checking && hasSupabaseConfig() && !session) {
      router.replace("/login");
    }
  }, [checking, session, router]);

  if (!hasSupabaseConfig()) {
    return (
      <section className="panel-card p-5 text-sm text-red-700">
        Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY para liberar o acesso autenticado.
      </section>
    );
  }

  if (checking || !session) {
    return (
      <section className="panel-card p-6 text-center text-sm text-slate-600">
        Validando sessão...
      </section>
    );
  }

  return <>{children}</>;
}
