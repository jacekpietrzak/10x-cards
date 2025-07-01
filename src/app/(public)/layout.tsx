export const metadata = {
  title: "10xCards",
  description: "Welcome to 10xCards. Login or register to start.",
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col pt-16">
      <main className="flex-1">{children}</main>
    </div>
  );
}
