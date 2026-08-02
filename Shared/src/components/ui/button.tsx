import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@shared/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-dark shadow-soft hover:shadow-medium",
        destructive:
          "bg-destructive-strong text-destructive-foreground hover:bg-destructive-strong/90",
        outline:
          "border border-input bg-transparent text-foreground hover:bg-secondary hover:text-ink-strong",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-surface-muted",
        ghost: "hover:bg-secondary hover:text-ink-strong",
        link: "text-navy underline underline-offset-4 hover:text-navy-light",
        navy: "bg-navy text-white hover:bg-navy-light shadow-soft",
        navyOutline:
          "border border-navy bg-transparent text-navy hover:bg-navy hover:text-white",
        hero: "bg-primary text-primary-foreground font-bold hover:bg-primary-hover shadow-medium hover:shadow-elevated",
        onDark:
          "border border-white/60 bg-transparent text-white hover:border-white hover:bg-white/10",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-lg px-10 text-lg",
        icon: "h-11 w-11",
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
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
