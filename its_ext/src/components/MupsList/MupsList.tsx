import React from "react";
import style from "./MupsList.module.css";
import { IMupsListProps } from "./types";
import Checkbox from "@mui/material/Checkbox";
import Input from "@mui/material/Input";
import { MUP_PERIOD_URL } from "../../utils/constants";
import { OuterLink } from "../OuterLink";
import { CollapsableList } from "../CollapsableList";

export function MupsList(props: IMupsListProps) {
  const handleLimitChange =
    (mupId: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value);
      props.onMupLimitChange(mupId, value);
    };

  const handleToggle =
    (mupId: string) => (event: React.MouseEvent<HTMLTableDataCellElement>) => {
      props.onMupToggle(mupId);
    };

  const compareMupIds = (lhsMupId: string, rhsMupId: string) => {
    const lhsName = props.mupData.data[lhsMupId]?.name ?? "";
    const rhsName = props.mupData.data[rhsMupId]?.name ?? "";
    return lhsName.localeCompare(rhsName);
  };

  const renderRows = () => {
    return Object.keys(props.mupEdits)
      .sort(compareMupIds)
      .map((mupId: string) => {
        const mup = props.mupData.data[mupId];
        if (!mup) {
          console.warn(`MupsList: mup not founf for id: [${mupId}]`);
          return null;
        }
        const mupEdit = props.mupEdits[mupId];
        const haveMessages =
          mupEdit.addLoadsManual || mupEdit.messages.length > 0;
        return (
          <tr key={mupId}>
            <td onClick={handleToggle(mup.id)}>
              <Checkbox readOnly checked={mupEdit.selected} />
              <span>{mup.name}</span>
            </td>
            <td>
              <Input
                type="number"
                value={mupEdit.limit}
                onChange={handleLimitChange(mup.id)}
                className={style.limit__input}
                disabled={!mupEdit.selected}
              />
            </td>
            <td>
              <CollapsableList
                title={"Посмотреть созданные действия"}
                haveItems={haveMessages}
              >
                {mupEdit.messages.map((me, index) => (
                  <li key={index}>{me}</li>
                ))}
                {!mupEdit.addLoadsManual ? null : (
                  <li>
                    Заполните нагрузку{" "}
                    <OuterLink url={MUP_PERIOD_URL + mupId}>в ИТС</OuterLink>
                  </li>
                )}
              </CollapsableList>
            </td>
          </tr>
        );
      });
  };

  return (
    <section className="table__container">
      <table className="table">
        <colgroup>
          <col style={{ width: "50%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "40%" }} />
        </colgroup>
        <thead>
          <tr>
            <th>МУП</th>
            <th>Количество студентов</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>{renderRows()}</tbody>
      </table>
    </section>
  );
}
