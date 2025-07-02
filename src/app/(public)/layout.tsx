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
    <div className="flex flex-col p-6">
      <main className="flex-1">{children}</main>
    </div>
  );
}
