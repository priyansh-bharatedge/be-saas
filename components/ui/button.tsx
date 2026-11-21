import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-semibold tracking-wider uppercase transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0944D] disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-[#141619] text-white shadow-xs hover:bg-black active:scale-98",
        brand: "bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-white shadow-sm hover:opacity-95 active:scale-98",
        orange: "bg-[#F0944D] text-white shadow-xs hover:bg-[#C66318] active:scale-98",
        cyan: "bg-[#EBF3F6] text-[#588594] border border-[#ACCAD5]/60 hover:bg-[#ACCAD5]/30",
        destructive: "bg-red-600 text-white shadow-xs hover:bg-red-700",
        outline: "border border-slate-300 bg-white hover:bg-slate-50 text-slate-800",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
        ghost: "hover:bg-slate-100 text-slate-700 hover:text-slate-950",
        link: "text-[#C66318] underline-offset-4 hover:underline lowercase normal-case",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-[11px]",
        lg: "h-11 rounded-md px-6 text-xs",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
