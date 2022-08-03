import React, { useState } from "react";
import style from "./CollapsableList.module.css";
import { ICollapsableListProps } from "./types";
import Collapse from "@mui/material/Collapse";

export function CollapsableList(
  props: React.PropsWithChildren<ICollapsableListProps>
) {
  const [listOpen, setListOpen] = useState<boolean>(false);
  const handleListToggle = () => {
    setListOpen(!listOpen);
  };
  return (
    <ul onClick={handleListToggle} className={style.message__list + " warning"}>
      {!listOpen && props.haveItems && <li>{props.title}</li>}

      <Collapse in={listOpen} timeout="auto" unmountOnExit>
        {props.children}
      </Collapse>
    </ul>
  );
}
