"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Leaf, Clock, Bell, Lock, HelpCircle, LogOut, ChevronRight } from "lucide-react";
import { useBottomSheetDrag } from "@/app/hooks/useBottomSheetDrag";

const ITEMS = [
  { icon: User,       label: "Compte",          href: "/profile" },
  { icon: Leaf,       label: "Mon empreinte",   href: "/carbon"  },
  { icon: Clock,      label: "Mes trajets",     href: "/trips"   },
  { icon: Bell,       label: "Notifications",   href: null       },
  { icon: Lock,       label: "Confidentialite", href: null       },
  { icon: HelpCircle, label: "Aide",            href: null       },
] as const;

interface Props {
  onClose: () => void;
}

export function SettingsDrawer({ onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  function dismiss() {
    setVisible(false);
    setTimeout(onClose, 280);
  }

  const { dragY, dragging, onTouchStart, onTouchMove, onTouchEnd } =
    useBottomSheetDrag({ onDismiss: dismiss });

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

  return (
    <>
      <div
        className="absolute inset-0 z-10 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={dismiss}
      />

      <div
        className="absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-2xl shadow-2xl"
        style={{
          transform: visible ? `translateY(${dragY}px)` : "translateY(100%)",
          transition: dragging ? "none" : "transform 280ms cubic-bezier(0.32,0.72,0,1)",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex justify-center py-3">
          <div className="w-9 h-1 rounded-full bg-uf-border" />
        </div>

        <div className="px-4 pb-8">
          <p className="text-[17px] font-bold text-uf-text mb-4">Parametres</p>

          <div className="flex flex-col">
            {ITEMS.map((item, i) => (
              <button
                key={item.label}
                onClick={() => handleItem(item.href)}
                className={`flex items-center gap-3 py-3 w-full text-left ${
                  i < ITEMS.length - 1 ? "border-b border-uf-border" : ""
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-uf-bg flex items-center justify-center shrink-0">
                  <item.icon size={17} className="text-uf-text" />
                </div>
                <span className="flex-1 text-[14px] text-uf-text">{item.label}</span>
                <ChevronRight size={15} className="text-uf-text-secondary" />
              </button>
            ))}
          </div>

          <button className="mt-3 flex items-center gap-3 py-3 w-full text-left border-t border-uf-border">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <LogOut size={17} className="text-uf-red" />
            </div>
            <span className="flex-1 text-[14px] text-uf-red">Deconnexion</span>
          </button>
        </div>
      </div>
    </>
  );
}
