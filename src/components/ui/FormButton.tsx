import * as React from "react";
import { Button } from "./button";

export function FormButton(props: React.ComponentProps<typeof Button>) {
  return <Button {...props} />;
}
