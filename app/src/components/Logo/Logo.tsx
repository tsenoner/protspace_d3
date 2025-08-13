import type { JSX } from "react";
import { LogoIcon } from "./LogoIcon";

export type LogoProps = Omit<JSX.IntrinsicElements["svg"], "ref"> & {
  title?: string;
};

export default function Logo({ title = "ProtSpace Logo", ...rest }: LogoProps) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      fill="currentColor"
      strokeWidth="0"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <LogoIcon />
    </svg>
  );
}
