import React from "react";
import style from "./MupsList.module.css";
import { IMupsListProps } from "./types";
import Checkbox from '@mui/material/Checkbox';
import Input from '@mui/material/Input';


export function MupsList(props: IMupsListProps) {
    const handleLimitChange = (mupId: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(event.target.value);
        props.onMupLimitChange(mupId, value);
    }

    // const handleToggle = (mupId: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    //     props.onMupToggle(mupId);
    // }

    const handleToggle = (mupId: string) => (event: React.MouseEvent<HTMLTableDataCellElement>) => {
        props.onMupToggle(mupId);
    }

    console.log("MupsList props.mupUpdates");
    console.log(props.mupEdits);

    const renderRows = () => {
        return Object.keys(props.mupEdits).map((mupId: string) => {
            const mup = props.mupData.data[mupId];
            if (!mup) {
                console.log(`Not found mup for [${mupId}]`);
            }
            const mupEdit = props.mupEdits[mupId];
            return (
                <tr key={mupId}>
                    {/* <td>
                        <input type="checkbox"
                            checked={mupEdit.selected} onChange={handleToggle(mup.id)} />
                    </td> */}
                    <td onClick={handleToggle(mup.id)}>
                        <Checkbox readOnly checked={mupEdit.selected} />
                        {mup.name}
                    </td>
                    <td>
                        <Input type="number" value={mupEdit.limit} onChange={handleLimitChange(mup.id)}
                            className={style.limit__input}
                            disabled={!mupEdit.selected} />
                        {/* <input className={style.limit__input} type="number"
                            value={mupEdit.limit} onChange={handleLimitChange(mup.id)}
                            disabled={!mupEdit.selected} /> */}
                        </td>
                    {/* <td>{mupEdit.messages.map(message => <p>{message}</p>)}</td> */}
                    <td>{mupEdit.messages.join('; ')}</td>
                </tr>
            );
        })
    }

    return (
        <section className="table__сontainer">
            <table className="table">
                <colgroup>
                    <col style={{width: "50%"}} />
                    <col style={{width: "10%"}} />
                    <col style={{width: "40%"}} />
                </colgroup>  
                <thead>
                    <tr>
                        {/* <th></th> */}
                        <th>МУП</th>
                        <th>Количество студентов</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    {renderRows()}
                </tbody>
            </table>
        </section>
    );
}