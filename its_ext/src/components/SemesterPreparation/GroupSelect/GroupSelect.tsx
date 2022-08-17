import React, { useState, useEffect } from "react";
import { SelectionList } from "../../SelectionList";
import style from "./GroupSelect.module.css";
import { IGroupSelectProps } from "./types";
import { EDU_SPACE_URL } from "../../../utils/constants";
import { RefreshButton } from "../../RefreshButton";
import { OuterLink } from "../../OuterLink";

export function GroupSelect(props: IGroupSelectProps) {
  const [selectionGroupsIds, setSelectionGroupsIds] = useState<number[]>([]);

  const handleRefreshSelectionGroups = () => {
    props.onRefresh();
  };

  const handleSelectionGroupToggle = (id: number) => {
    let newIds = [];
    if (selectionGroupsIds.includes(id)) {
      newIds = selectionGroupsIds.filter((i) => i !== id);
    } else {
      newIds = [...selectionGroupsIds, id];
    }

    setSelectionGroupsIds(newIds);
    props.onSelection(newIds);
  };

  useEffect(() => {
    return () => {
      // console.warn("GroupSelect UNMOUNTED");
    };
  }, []);

  return (
    <section className="step__container">
      <article className={style.selectionGroup_select}>
        <SelectionList
          items={props.selectionGroupsList}
          selectedIds={selectionGroupsIds}
          onToggle={handleSelectionGroupToggle}
        />
      </article>
      <article className="step__message_container "></article>
      <article className={style.selectionGroup_link}>
        <p>Если групп нет, создайте их в ИТС или попробуйте обновить список</p>
        <span>
          <RefreshButton
            onClick={handleRefreshSelectionGroups}
            title="Обновить список"
          />
        </span>
        <OuterLink url={EDU_SPACE_URL}>Перейти в ИТС</OuterLink>
      </article>
    </section>
  );
}
