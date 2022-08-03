import React, { useState } from "react";
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

  // FIXME: При первом корректном выборе не запрашиваются данные МУПов для групп (понять почему)
  const handleSelectionGroupToggle = (id: number) => {
    let newIds = [];
    if (selectionGroupsIds.includes(id)) {
      newIds = selectionGroupsIds.filter((i) => i !== id);
    } else {
      newIds = [...selectionGroupsIds, id];
    }

    setSelectionGroupsIds(newIds);
    // if (newIds.length === 2) {
    props.onSelection(newIds);
    // }
  };

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
        <RefreshButton
          onClick={handleRefreshSelectionGroups}
          title="Обновить список"
        />
        <OuterLink url={EDU_SPACE_URL}>Перейти в ИТС</OuterLink>
      </article>
    </section>
  );
}
