import React from "react";
import style from "./RefreshButton.module.css";

import { IRefreshButtonProps } from "./types";

import { Button } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import CircularProgress from "@mui/material/CircularProgress";

export function RefreshButton(props: IRefreshButtonProps) {
  const handleRefreshButton = () => {
    props.onClick();
  };

  return (
    <div className="load_content_container_small">
      <Button
        onClick={handleRefreshButton}
        style={{
          fontSize: "0.75em",
        }}
        variant="text"
        startIcon={<RefreshIcon />}
      >
        {props.title}
      </Button>
      {props.loading && <div className="progress_screen"></div>}
      {props.loading && <CircularProgress className="progress_icon_small" />}
    </div>
  );
}
