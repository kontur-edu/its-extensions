import React from "react";
import style from "./MupsList.module.css";
import { IMupsListProps } from "./types";
import Checkbox from "@mui/material/Checkbox";
import Input from "@mui/material/Input";
import { MUP_PERIOD_URL } from "../../utils/constants";
import { OuterLink } from "../OuterLink";
import { CollapsableList } from "../CollapsableList";
// import Tooltip from '@mui/material/Tooltip';
// import Collapse from "@mui/material/Collapse";
// interface ICollapsableListProps {
//   title: string;
//   haveItems: boolean;
// }

// function CollapsableList(
//   props: React.PropsWithChildren<ICollapsableListProps>
// ) {
//   const [listOpen, setListOpen] = useState<boolean>(false);
//   const handleListToggle = () => {
//     setListOpen(!listOpen);
//   };
//   return (
//     <ul onClick={handleListToggle} className={style.message__list + " warning"}>
//       {!listOpen && props.haveItems && <li>{props.title}</li>}

//       <Collapse in={listOpen} timeout="auto" unmountOnExit>
//         {props.children}
//       </Collapse>
//     </ul>
//   );
// }

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
        const haveMessages =
          mupEdit.addLoadsManual || mupEdit.messages.length > 0;
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
              {/* <ul className={style.message__list + " warning"}> */}
              {/* <li
              <Collapse in={actionListOpen} timeout="auto" unmountOnExit>
                  {mupEdit.messages.filter((v, i) => i > 0).map((me, index) => (
                  <li key={index}>{me}</li>
                ))}
                {!mupEdit.addLoadsManual ? null : (
                  <li>
                    Заполните нагрузку{" "}
                    <OuterLink url={MUP_PERIOD_URL + mupId} title="в ИТС" />
                  </li>
                )}
              </Collapse> */}
              {/* {mupEdit.messages.map((me, index) => (
                  <li key={index}>{me}</li>
                ))}
                {!mupEdit.addLoadsManual ? null : (
                  <li>
                    Заполните нагрузку{" "}
                    <OuterLink url={MUP_PERIOD_URL + mupId} title="в ИТС" />
                  </li>
                )} */}
              {/* </ul> */}
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
