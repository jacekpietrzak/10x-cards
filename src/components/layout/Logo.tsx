import Link from "next/link";

interface LogoProps {
  className?: string;
}

export function Logo({ className = "" }: LogoProps) {
  return (
    <Link href="/" className={`font-bold text-xl text-foreground ${className}`}>
      10xCards
    </Link>
  );
}
