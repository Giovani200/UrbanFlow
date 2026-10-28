"use client";
import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

interface ModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    children: ReactNode;
}

/** Dialogue sur fond opaque : il passe au-dessus de panneaux en verre, donc jamais de flou sur du flou. */
export function Modal({ open, onOpenChange, title, description, children }: ModalProps) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-[60] bg-uf-ink/40" />
                <Dialog.Content className="fixed top-1/2 left-1/2 z-[60] w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-uf-panel border border-uf-glass-edge bg-uf-glass-opaque p-6 text-uf-ink shadow-2xl">
                    <Dialog.Title className="mb-1.5 [font:var(--uf-time)]">{title}</Dialog.Title>
                    <Dialog.Description className="mb-4 [font:var(--uf-body)] font-medium text-uf-ink-2">
                        {description}
                    </Dialog.Description>
                    {children}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
