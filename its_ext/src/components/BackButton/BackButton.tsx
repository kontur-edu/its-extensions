import React from "react";
// eslint-disable-next-line
import style from "./BackButton.module.css";
import { useNavigate } from "react-router-dom";

import { IBackButtonProps } from "./types";

import { Button } from "@mui/material";
import WestIcon from "@mui/icons-material/West";

export function BackButton(props: IBackButtonProps) {
  const navigate = useNavigate();

  const handleBackButton = () => {
    navigate(props.route);
  };

  return (
    <Button
      onClick={handleBackButton}
      variant="text"
      style={{
        alignSelf: "flex-start",
      }}
      startIcon={<WestIcon />}
    >
      Вернуться назад
    </Button>
  );
}
