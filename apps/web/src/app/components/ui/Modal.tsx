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

export function Modal({ open, onOpenChange, title, description, children }: ModalProps) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-sm bg-white rounded-2xl p-5 shadow-2xl">
                    <Dialog.Title className="text-base font-bold text-uf-text mb-1.5">
                        {title}
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-uf-text-secondary mb-4">
                        {description}
                    </Dialog.Description>
                    {children}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}