import React, {useState} from "react";
import { SelectionList } from "../../SelectionList";
import style from "./GroupSelect.module.css";
import { IGroupSelectProps } from "./types";
import {StepMessages, EDU_SPACE_URL} from "../../../utils/constants";


export function GroupSelect(props: IGroupSelectProps) {
    const [selectionGroupsIds, setSelectionGroupsIds] = useState<number[]>([]); 

    const areSelectionGroupSelectionValid = () => {
        return selectionGroupsIds.length === 2;
    };

    const handleRefreshSelectionGroups = () => {
        props.onRefresh();
    };

    // FIXME: При первом корректном выборе не запрашиваются данные МУПов для групп (понять почему)
    const handleSelectionGroupToggle = (id: number) => {
        let newIds = [];
        if (selectionGroupsIds.includes(id)) {
            newIds = selectionGroupsIds.filter(i => i !== id);
        } else {
            newIds = [...selectionGroupsIds, id];
        }
        
        setSelectionGroupsIds(newIds);
        if (newIds.length === 2) {
            props.onSelectionValid(newIds);
        }
    };


    return (
        <section className="step__container">
            <article className={style.selectionGroup_select}>
                <h3>Группы выбора</h3>
                <button className="step__button" onClick={handleRefreshSelectionGroups}>Обновить</button>
                <SelectionList items={props.selectionGroupsList} selectedIds={selectionGroupsIds} onToggle={handleSelectionGroupToggle} />
            </article>
            <article className="step__message_container ">
                <p className={!areSelectionGroupSelectionValid() ? "message_error" : ""}>
                    {!areSelectionGroupSelectionValid() ?
                        StepMessages.selectionGroupsSelectError :
                        StepMessages.selectionGroupsSelected}
                </p>
            </article>
            <article className={style.selectionGroup_link}>
                <p>Если нет нужных групп - создай <a href={EDU_SPACE_URL} rel="noreferrer" target="_blank">{"тут -> its.urfu.ru"}</a></p>
            </article>
        </section>
    );
}