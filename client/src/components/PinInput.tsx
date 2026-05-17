import { useRef, useEffect, ChangeEvent, KeyboardEvent, ClipboardEvent } from "react";

interface PinInputProps {
  value: string;
  onChange: (val: string) => void;
  length?: number;
}

export default function PinInput({ value, onChange, length = 4 }: PinInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const focusBox = (i: number) => {
    const el = refs.current[i];
    if (!el) return;
    el.focus();
    // Put cursor at end so select-all doesn't interfere on some browsers
    requestAnimationFrame(() => el.setSelectionRange(1, 1));
  };

  // Sync DOM when parent resets value (e.g. on cancel / external clear)
  useEffect(() => {
    refs.current.forEach((el, i) => {
      if (el && el.value !== (value[i] ?? "")) el.value = value[i] ?? "";
    });
  }, [value, length]);

  // Build parent string from DOM
  const collect = () => refs.current.map((el) => (el?.value ?? "")).join("");

  const handleChange = (i: number, e: ChangeEvent<HTMLInputElement>) => {
    // Strip non-digits, keep only the last character typed
    const raw = e.target.value.replace(/\D/g, "");
    const digit = raw.slice(-1); // last char wins if somehow >1 chars appear
    e.target.value = digit;      // clamp DOM value
    onChange(collect());
    if (digit && i < length - 1) focusBox(i + 1);
  };

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      const el = refs.current[i]!;
      if (el.value) {
        // Clear current box — let onChange fire naturally; but be safe
        el.value = "";
        onChange(collect());
        e.preventDefault(); // prevent double-fire
      } else if (i > 0) {
        e.preventDefault();
        const prev = refs.current[i - 1]!;
        prev.value = "";
        onChange(collect());
        focusBox(i - 1);
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      focusBox(i - 1);
    } else if (e.key === "ArrowRight" && i < length - 1) {
      e.preventDefault();
      focusBox(i + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    refs.current.forEach((el, i) => { if (el) el.value = pasted[i] ?? ""; });
    onChange(collect());
    focusBox(Math.min(pasted.length, length - 1));
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          autoComplete="one-time-code"
          defaultValue={value[i] ?? ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className="w-12 h-12 text-center text-xl font-mono font-bold rounded-xl border-2 bg-background outline-none transition-all border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      ))}
    </div>
  );
}
