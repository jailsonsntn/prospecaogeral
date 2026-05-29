"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, getLastSessionActivity, getSession, hasSupabaseConfig, touchSessionActivity } from "@/lib/supabaseAuth";

const TIMEOUT_MS = 60 * 60 * 1000;
const WARNING_WINDOW_MS = 60 * 1000;

function isPublicPath(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/logout");
}

export default function SessionTimeoutManager() {
  const pathname = usePathname();
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(60);

  useEffect(() => {
    if (!hasSupabaseConfig() || !pathname || isPublicPath(pathname)) {
      setShowWarning(false);
      return;
    }

    const session = getSession();
    if (!session) {
      setShowWarning(false);
      return;
    }

    if (!getLastSessionActivity()) {
      touchSessionActivity();
    }

    const onUserActivity = () => {
      if (!getSession()) return;
      touchSessionActivity();
      setShowWarning(false);
    };

    const events = ["click", "keydown", "mousemove", "scroll", "touchstart"];
    events.forEach((evt) => window.addEventListener(evt, onUserActivity, { passive: true }));

    const interval = window.setInterval(() => {
      const currentSession = getSession();
      if (!currentSession) {
        setShowWarning(false);
        return;
      }

      const lastActivity = getLastSessionActivity() ?? Date.now();
      const elapsed = Date.now() - lastActivity;

      if (elapsed >= TIMEOUT_MS) {
        clearSession();
        setShowWarning(false);
        router.replace("/logout?reason=timeout");
        return;
      }

      const warningStartsAt = TIMEOUT_MS - WARNING_WINDOW_MS;
      if (elapsed >= warningStartsAt) {
        const remaining = Math.max(1, Math.ceil((TIMEOUT_MS - elapsed) / 1000));
        setRemainingSeconds(remaining);
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      window.clearInterval(interval);
      events.forEach((evt) => window.removeEventListener(evt, onUserActivity));
    };
  }, [pathname, router]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/55 p-4">
      <div className="panel-card w-full max-w-md p-5">
        <p className="label-kicker">Sessao</p>
        <h3 className="font-display mt-1 text-xl font-semibold text-slate-900">Sua sessao vai expirar</h3>
        <p className="mt-2 text-sm text-slate-600">
          Sem resposta, o logout sera feito automaticamente em {remainingSeconds}s.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              touchSessionActivity();
              setShowWarning(false);
            }}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Continuar logado
          </button>
          <button
            type="button"
            onClick={() => {
              clearSession();
              setShowWarning(false);
              router.replace("/logout?reason=manual");
            }}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Fazer logout agora
          </button>
        </div>
      </div>
    </div>
  );
}
