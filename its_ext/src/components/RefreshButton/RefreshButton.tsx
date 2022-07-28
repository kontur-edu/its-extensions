import React from "react";
import style from "./RefreshButton.module.css";

import { IRefreshButtonProps } from "./types";

import { Button } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

export function RefreshButton(props: IRefreshButtonProps) {
  const handleRefreshButton = () => {
    props.onClick();
  };

  return (
    <Button
      onClick={handleRefreshButton}
      style={{ fontSize: 12, marginBottom: "1em" }}
      variant="text"
      startIcon={<RefreshIcon />}
    >
      {props.title}
    </Button>
  );
}
