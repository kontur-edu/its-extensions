import React from "react";
import style from "./SelectionList.module.css";
import { ISelectionListProps } from "./types";



export function SelectionList(props: ISelectionListProps) {
    const handleItemClick = (id: number) => {
        props.onToggle(id);
    }
    return (
        <ul className={style.list}>
            {props.items.map(item => {
                return (
                    <li key={item.id} onClick={() => handleItemClick(item.id)}>
                        <input type="checkbox" readOnly checked={props.selectedIds.includes(item.id)}/>
                        {item.name}
                    </li>
                );
            })}
        </ul>
    );
}