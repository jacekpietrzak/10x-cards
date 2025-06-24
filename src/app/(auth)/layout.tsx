export const metadata = {
  title: "10xCards Dashboard",
  description: "Manage your flashcards and study sessions",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="flex-1">{children}</main>;
}
