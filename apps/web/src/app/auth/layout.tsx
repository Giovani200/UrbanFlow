export default function AuthLayout({children,}: { children: React.ReactNode;
}) {
    return (
        <div className="min-h-dvh bg-surface">
            {children}
        </div>
    );
}