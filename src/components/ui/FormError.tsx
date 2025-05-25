import * as React from "react";

interface FormErrorProps {
  message: string;
}

export function FormError({ message }: FormErrorProps) {
  return <p className="text-destructive text-sm mt-1">{message}</p>;
}
