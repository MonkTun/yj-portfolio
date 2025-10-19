import clsx from "clsx";

export const Button = ({
  children,
  className,
  href,
  variant = "primary",
  ...props
}) => {
  const baseStyles =
    "py-3 px-6 rounded-4xl font-medium transition-all duration-200";

  const variants = {
    primary:
      "bg-white text-black hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]",
    secondary:
      "border border-white/30 text-white backdrop-blur-md bg-white/5 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]",
  };

  const classes = clsx(baseStyles, variants[variant], className);

  const Component = href ? "a" : "button";

  return (
    <Component href={href} className={classes} {...props}>
      {children}
    </Component>
  );
};
