"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  short: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", short: "Home" },
  { href: "/crm", label: "CRM", short: "CRM" },
  { href: "/ai", label: "AI", short: "AI" },
  { href: "/prospeccao-cnpj", label: "Prospecção CNPJ", short: "CNPJ" },
  { href: "/prospeccao-mapa", label: "Prospecção Mapa", short: "Mapa" },
];

function Icon({ name }: { name: "home" | "crm" | "ai" | "cnpj" | "map" | "config" | "menu" | "bell" | "user" | "logout" | "login" }) {
  const common = "h-4 w-4 shrink-0";
  switch (name) {
    case "home":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
        </svg>
      );
    case "crm":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 9h8M8 13h5" />
        </svg>
      );
    case "ai":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <circle cx="8" cy="8" r="2.2" />
          <circle cx="16" cy="8" r="2.2" />
          <path d="M6 16c.7-1.9 2-3 4-3s3.3 1.1 4 3" />
          <path d="M12 10.2V13" />
        </svg>
      );
    case "cnpj":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <path d="M5 4h10l4 4v12H5z" />
          <path d="M15 4v4h4" />
          <path d="M8 12h8M8 16h6" />
        </svg>
      );
    case "map":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <path d="M9 20 3 18V6l6 2 6-2 6 2v12l-6-2-6 2-6-2" />
          <path d="M9 8v12M15 6v12" />
        </svg>
      );
    case "config":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
          <path d="M19.4 15a1.9 1.9 0 0 0 .38 2.1l.05.05-1.7 2.9-.08-.03a1.9 1.9 0 0 0-2.06.38l-.05.05a1.9 1.9 0 0 0-.56 1.35H8.62a1.9 1.9 0 0 0-.56-1.35l-.05-.05a1.9 1.9 0 0 0-2.06-.38l-.08.03-1.7-2.9.05-.05a1.9 1.9 0 0 0 .38-2.1l-.03-.08a1.9 1.9 0 0 0-1.35-.56V8.62c.54 0 1.06-.23 1.35-.56l.03-.08a1.9 1.9 0 0 0-.38-2.1l-.05-.05 1.7-2.9.08.03a1.9 1.9 0 0 0 2.06-.38l.05-.05A1.9 1.9 0 0 0 8.62 2h6.76a1.9 1.9 0 0 0 .56 1.35l.05.05a1.9 1.9 0 0 0 2.06.38l.08-.03 1.7 2.9-.05.05a1.9 1.9 0 0 0-.38 2.1l.03.08c.29.33.81.56 1.35.56v6.76c-.54 0-1.06.23-1.35.56Z" />
        </svg>
      );
    case "menu":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={common}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    case "bell":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
      );
    case "user":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c1.7-3.2 4.3-4.8 7-4.8s5.3 1.6 7 4.8" />
        </svg>
      );
    case "logout":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H4" />
          <path d="M20 4v16" />
        </svg>
      );
    case "login":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <path d="M14 17l5-5-5-5" />
          <path d="M19 12H8" />
          <path d="M4 4h4v16H4" />
        </svg>
      );
  }
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicPath = pathname === "/login" || pathname.startsWith("/logout");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const desktopMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isPublicPath || sidebarCollapsed) {
      setMenuOpen(false);
    }
  }, [isPublicPath, sidebarCollapsed]);

  useEffect(() => {
    function onScroll() {
      setShowBackToTop(window.scrollY > 280);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  function handleBackToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    function onOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      const clickedDesktopMenu = desktopMenuRef.current?.contains(target);
      const clickedMobileMenu = mobileMenuRef.current?.contains(target);
      if (!clickedDesktopMenu && !clickedMobileMenu) {
        setMenuOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("click", onOutsideClick);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("click", onOutsideClick);
      window.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <div className={isPublicPath ? "relative z-[1] min-h-screen p-3 sm:p-5" : `crm-shell min-h-screen ${sidebarCollapsed ? "lg:grid-cols-[96px_1fr]" : ""}`}>
      {!isPublicPath && (
      <aside className={`crm-sidebar hidden lg:flex ${sidebarCollapsed ? "px-3 py-4" : ""}`}>
        <div className={sidebarCollapsed ? "flex justify-center" : "flex items-start justify-between gap-2"}>
          {!sidebarCollapsed ? (
            <div>
              <p className="label-kicker">Plataforma CRM</p>
              <h1 className="font-display mt-2 text-2xl font-semibold text-slate-900">AllProspect</h1>
              <p className="mt-2 text-sm text-slate-600">Funil comercial com prospecção CNPJ e Google Maps.</p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setSidebarCollapsed((current) => !current)}
            className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            aria-label={sidebarCollapsed ? "Expandir barra lateral" : "Retrair barra lateral"}
            title={sidebarCollapsed ? "Expandir" : "Retrair"}
          >
            {sidebarCollapsed ? ">" : "<"}
          </button>
        </div>

        <nav className="mt-8 space-y-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? `crm-nav-link crm-nav-link-active ${sidebarCollapsed ? "px-2" : ""}` : `crm-nav-link ${sidebarCollapsed ? "px-2" : ""}`}
                title={item.label}
              >
                <span className={`inline-flex items-center ${sidebarCollapsed ? "justify-center" : "gap-2"}`}>
                  <Icon name={item.href === "/" ? "home" : item.href === "/crm" ? "crm" : item.href === "/ai" ? "ai" : item.href === "/prospeccao-cnpj" ? "cnpj" : item.href === "/prospeccao-mapa" ? "map" : "config"} />
                  {!sidebarCollapsed && item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div ref={desktopMenuRef} className="relative mt-auto pt-4">
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            aria-label="Abrir menu do usuario"
            title="Conta e sistema"
          >
            <Icon name="config" />
          </button>

          {menuOpen && (
            <div className={`absolute bottom-0 z-50 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ${sidebarCollapsed ? "left-12" : "left-14"}`}>
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Conta e sistema</p>
              </div>
              <div className="p-2">
                <Link href="/configuracoes" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <Icon name="config" /> Configurações
                </Link>
                <Link href="/login" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <Icon name="login" /> Login
                </Link>
                <Link href="/logout" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <Icon name="logout" /> Logout
                </Link>
              </div>
            </div>
          )}
        </div>
      </aside>
      )}

      <div className="crm-main-wrap">
        <main className={isPublicPath ? "crm-main px-4 pb-10 pt-6 sm:px-6 lg:px-8" : "crm-main px-4 pb-28 pt-4 sm:px-6 sm:pt-5 lg:px-8"}>{children}</main>
      </div>

      {!isPublicPath && (
      <nav className="crm-mobile-nav lg:hidden">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} className={active ? "crm-mobile-link crm-mobile-link-active" : "crm-mobile-link"}>
              {item.short}
            </Link>
          );
        })}
      </nav>
      )}

      {!isPublicPath && showBackToTop && (
        <button
          type="button"
          onClick={handleBackToTop}
          className="fixed bottom-24 right-4 z-[60] inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-lg hover:bg-slate-50 lg:bottom-6 lg:right-6"
          aria-label="Voltar ao topo"
          title="Voltar ao topo"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path d="M12 5v14" />
            <path d="m6 11 6-6 6 6" />
          </svg>
        </button>
      )}
    </div>
  );
}
