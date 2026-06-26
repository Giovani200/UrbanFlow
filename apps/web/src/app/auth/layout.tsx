export default function AuthLayout({children,}: { children: React.ReactNode;
}) {
    return (
        <main className="min-h-screen bg-uf-white">
            {children}
        </main>
    );
}