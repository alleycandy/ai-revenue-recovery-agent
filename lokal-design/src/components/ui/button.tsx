import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-[transform,background-color,color,opacity] duration-150 ease-out active:not-disabled:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tide",
  {
    variants: {
      variant: {
        solid:
          "bg-tide text-tide-fg hover:bg-ink",
        ink: "bg-ink text-paper hover:bg-ink-soft",
        ghost:
          "bg-transparent text-ink hover:bg-paper-2",
        line: "bg-transparent text-ink shadow-[0_0_0_1px_var(--color-line)] hover:shadow-[0_0_0_1px_var(--color-ink)]",
        night: "bg-night-fg text-night hover:bg-paper",
        stamp: "bg-stamp text-paper hover:opacity-90",
      },
      size: {
        sm: "h-9 px-3 text-sm rounded-[6px]",
        md: "h-11 px-4 text-sm rounded-[10px]",
        lg: "h-12 px-5 text-base rounded-[12px]",
      },
    },
    defaultVariants: { variant: "solid", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
