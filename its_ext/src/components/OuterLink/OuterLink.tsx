import React from "react";
import style from "./OuterLink.module.css";

import { IOuterLinkProps } from "./types";

import Link from "@mui/material/Link";
import NorthEastIcon from "@mui/icons-material/NorthEast";

export function OuterLink(props: IOuterLinkProps) {

  return (
    <Link
      href={props.url}
      rel="noreferrer"
      target="_blank"
      style={{
        textDecoration: "none",
        display: "flex",
        alignItems: "center",
        fontSize: '1em',
      }}
    >
      <NorthEastIcon />
      {props.title}
    </Link>
  );
}
