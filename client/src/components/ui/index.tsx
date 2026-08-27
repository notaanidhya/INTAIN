import React from 'react';
import { cn } from '../../lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("rounded-md border border-border bg-bg-surface text-text-primary shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]", className)} {...props} />
);

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 p-5", className)} {...props} />
);

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("text-sm font-semibold tracking-tight text-text-primary", className)} {...props} />
);

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-5 pt-0", className)} {...props} />
);

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.99]",
  {
    variants: {
      variant: {
        default: "bg-brand text-white hover:bg-brand/90 shadow-sm",
        destructive: "bg-critical text-white hover:bg-critical/90 shadow-sm",
        outline: "border border-border bg-bg-surface hover:bg-bg-surface-alt hover:text-text-primary text-text-primary shadow-sm",
        secondary: "bg-bg-surface-alt text-text-secondary hover:bg-bg-surface-alt/80 hover:text-text-primary",
        ghost: "hover:bg-bg-surface-alt hover:text-text-primary text-text-secondary",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 px-3.5 py-1.5",
        sm: "h-7 rounded px-2.5 text-[11px]",
        lg: "h-9 rounded-md px-5 text-sm",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export const Badge = ({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "secondary" | "destructive" | "critical" | "outline" | "success" | "warning" | "conflict" | "info" | "neutral"
}) => {
  const variants = {
    default: "border-brand/25 bg-brand-subtle text-brand",
    secondary: "border-border bg-bg-surface-alt text-text-secondary",
    destructive: "border-critical/30 bg-critical/10 text-critical",
    critical: "border-critical/30 bg-critical/10 text-critical",
    outline: "border-border text-text-primary bg-bg-surface/80",
    success: "border-success/30 bg-success/10 text-success",
    warning: "border-warning/30 bg-warning/10 text-warning",
    conflict: "border-info/30 bg-info/10 text-info",
    info: "border-info/30 bg-info/10 text-info",
    neutral: "border-border bg-bg-surface-alt text-text-secondary",
  };
  return (
    <div
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-mono font-medium tracking-tight transition-colors",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    />
  );
};
