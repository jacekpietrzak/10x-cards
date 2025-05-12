import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface TextInputAreaProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TextInputArea({
  value,
  onChange,
  disabled,
}: TextInputAreaProps) {
  const textLength = value.length;
  const isValidLength = textLength >= 1000 && textLength <= 10000;
  const remainingChars = 10000 - textLength;

  return (
    <div className="space-y-2">
      <Label htmlFor="text-input">
        Enter your text (1,000 - 10,000 characters)
      </Label>
      <Textarea
        id="text-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Paste your text here to generate flashcards..."
        className="min-h-[200px]"
      />
      <div className="text-sm flex justify-between items-center">
        <span
          className={
            textLength > 0 && !isValidLength
              ? "text-destructive"
              : "text-muted-foreground"
          }
        >
          {textLength.toLocaleString()} characters
        </span>
        <span className="text-muted-foreground">
          {remainingChars > 0
            ? `${remainingChars.toLocaleString()} remaining`
            : "Maximum length reached"}
        </span>
      </div>
    </div>
  );
}
