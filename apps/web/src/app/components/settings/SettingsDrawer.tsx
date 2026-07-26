"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { User, Leaf, Clock, Bell, Database, Lock, HelpCircle, LogOut, LogIn, ChevronRight } from "lucide-react";
import { useBottomSheetDrag } from "@/app/hooks/useBottomSheetDrag";
import { useEscapeKey } from "@/app/hooks/useEscapeKey";
import { useModalFocus } from "@/app/hooks/useModalFocus";

const LOGGED_ITEMS = [
  { icon: User,       label: "Compte",          href: "/profile" },
  { icon: Leaf,       label: "Mon empreinte",   href: "/carbon"  },
  { icon: Clock,      label: "Mes trajets",     href: "/trips"   },
  { icon: Bell,       label: "Notifications",   href: null               },
  { icon: Database,   label: "Mes données",     href: "/mes-donnees"     },
  { icon: Lock,       label: "Confidentialité", href: "/confidentialite" },
  { icon: HelpCircle, label: "Aide",            href: "/aide"            },
] as const;

const GUEST_ITEMS = [
  { icon: HelpCircle, label: "Aide",            href: "/aide"            },
  { icon: Lock,       label: "Confidentialité", href: "/confidentialite" },
] as const;

interface Props {
  onClose: () => void;
}

export function SettingsDrawer({ onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();
  const isLogged = !!user;

  const items = isLogged ? LOGGED_ITEMS : GUEST_ITEMS;

  function dismiss() {
    setVisible(false);
    setTimeout(onClose, 280);
  }

  const {
    dragY, dragging,
    onTouchStart, onTouchMove, onTouchEnd,
    onMouseDown, onMouseMove, onMouseUp, onMouseLeave,
  } = useBottomSheetDrag({ onDismiss: dismiss });

  const dialogRef = useModalFocus<HTMLDivElement>();
  useEscapeKey(dismiss);

  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setVisible(true))
    );
    return () => cancelAnimationFrame(id);
  }, []);

  function handleItem(href: string | null) {
    if (!href) return;
    dismiss();
    setTimeout(() => router.push(href), 280);
  }

  function handleAuthAction() {
    dismiss();
    if (isLogged) {
      setTimeout(async () => { await logout(); router.push("/"); }, 280);
    } else {
      setTimeout(() => router.push("/auth/login"), 280);
    }
  }

  return (
    <>
      <div
        className="absolute inset-0 z-10 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={dismiss}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titre-parametres"
        tabIndex={-1}
        className="absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-2xl shadow-2xl"
        style={{
          transform: visible ? `translateY(${dragY}px)` : "translateY(100%)",
          transition: dragging ? "none" : "transform 280ms cubic-bezier(0.32,0.72,0,1)",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      >
        <div className="flex justify-center py-3">
          <div className="w-9 h-1 rounded-full bg-border" />
        </div>

        <div className="px-4 pb-8">
          <h2 id="titre-parametres" className="text-[17px] font-bold text-ink mb-1">Paramètres</h2>
          {isLogged && (
            <p className="text-xs text-text-2 mb-3">{user?.email}</p>
          )}
          {!isLogged && (
            <p className="text-xs text-text-2 mb-3">Mode invité</p>
          )}

          <div role="navigation" aria-label="Navigation principale" className="flex flex-col">
            {items.map((item, i) => (
              <button
                key={item.label}
                onClick={() => handleItem(item.href)}
                className={`flex items-center gap-3 py-3 w-full text-left ${
                  i < items.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-bg flex items-center justify-center shrink-0">
                  <item.icon size={17} className="text-ink" />
                </div>
                <span className="flex-1 text-[14px] text-ink">{item.label}</span>
                <ChevronRight size={15} className="text-text-2" />
              </button>
            ))}
          </div>

          <button
            onClick={handleAuthAction}
            className="mt-3 flex items-center gap-3 py-3 w-full text-left border-t border-border"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isLogged ? "bg-red-50" : "bg-green-50"}`}>
              {isLogged ? <LogOut size={17} className="text-primary" /> : <LogIn size={17} className="text-green-600" />}
            </div>
            <span className={`flex-1 text-[14px] font-medium ${isLogged ? "text-primary" : "text-green-600"}`}>
              {isLogged ? "Déconnexion" : "Se connecter"}
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
