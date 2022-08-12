import React from "react";
// eslint-disable-next-line
import style from "./CopyOrDownload.module.css";
import { ICopyOrDownloadProps } from "./types";

import { downloadFileFromText } from "../../utils/helpers";

import Button from "@mui/material/Button";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";

export function CopyOrDownload(props: ICopyOrDownloadProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(props.data);
  };

  const handleDownlad = () => {
    downloadFileFromText(props.filename, props.data);
  };

  return (
    <div>
      <Button
        onClick={handleCopy}
        style={{ alignSelf: "flex-start" }}
        startIcon={<ContentCopyIcon />}
      >
        {props.title}
      </Button>
      <Button
        onClick={handleDownlad}
        style={{ alignSelf: "flex-start" }}
        startIcon={<DownloadIcon />}
      >
        Скачать файл
      </Button>
    </div>
  );
}
