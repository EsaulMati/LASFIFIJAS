"use client";

import Link from "next/link";
import { ButtonHTMLAttributes, ReactNode } from "react";
import { HoneycombLoader } from "./honeycomb-loader";
import styles from "./animated-action-button.module.css";

type CommonProps = {
  children: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
};
type LinkProps = CommonProps & {
  href: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  disabled?: boolean;
};
type NativeButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { href?: never };

export function AnimatedActionButton(props: LinkProps | NativeButtonProps) {
  const classes = `${styles.action} ${props.fullWidth ? styles.fullWidth : ""} ${props.className ?? ""}`;
  const content = props.loading ? (
    <HoneycombLoader size="small" label="Procesando..." />
  ) : (
    <span className={styles.label}>
      {props.children}
    </span>
  );
  if (typeof props.href === "string") {
    const unavailable = Boolean(props.disabled || props.loading);
    return (
      <Link
        href={props.href}
        onClick={(event) => {
          if (unavailable) {
            event.preventDefault();
            return;
          }
          props.onClick?.(event);
        }}
        aria-disabled={unavailable}
        aria-busy={props.loading || undefined}
        tabIndex={unavailable ? -1 : undefined}
        className={classes}
      >
        {content}
      </Link>
    );
  }
  const { href, children, loading, fullWidth, className, ...buttonProps } =
    props;
  void href;
  void children;
  void fullWidth;
  void className;
  return (
    <button
      {...buttonProps}
      disabled={buttonProps.disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
    >
      {content}
    </button>
  );
}
