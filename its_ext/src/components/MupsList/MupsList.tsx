import React from "react";
import style from "./MupsList.module.css";
import { IMupsListProps } from "./types";
import Checkbox from "@mui/material/Checkbox";
import Input from "@mui/material/Input";
import { MUP_PERIOD_URL } from "../../utils/constants";
import { OuterLink } from "../OuterLink";
// import Tooltip from '@mui/material/Tooltip';

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

  // console.log("MupsList props.mupUpdates");
  // console.log(props.mupEdits);

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
          console.log(`Not found mup for [${mupId}]`);
        }
        const mupEdit = props.mupEdits[mupId];
        return (
          <tr key={mupId}>
            <td onClick={handleToggle(mup.id)}>
              <Checkbox readOnly checked={mupEdit.selected} />
              {/* <Tooltip title={mup.name} placement="top"> */}
              <span>{mup.name}</span>
              {/* </Tooltip> */}
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
              <ul className={style.message__list + " warning"}>
                {mupEdit.messages.map((me, index) => (
                  <li key={index}>{me}</li>
                ))}
                {!mupEdit.addLoadsManual ? null : (
                  <li>
                    ?????????????????? ????????????????{" "}
                    <OuterLink url={MUP_PERIOD_URL + mupId} title="?? ??????" />
                  </li>
                )}
              </ul>
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
            {/* <th></th> */}
            <th>??????</th>
            <th>???????????????????? ??????????????????</th>
            <th>????????????????</th>
          </tr>
        </thead>
        <tbody>{renderRows()}</tbody>
      </table>
    </section>
  );
}
