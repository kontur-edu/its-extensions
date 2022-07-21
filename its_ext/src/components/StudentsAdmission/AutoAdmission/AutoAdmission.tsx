import React, { useEffect, useState } from "react";
import style from "./CompetitionGroupSelect.module.css";
import { IAutoAdmissionProps } from "./types";
import Button from "@mui/material/Button";
import RefreshIcon from "@mui/icons-material/Refresh";
import Checkbox from "@mui/material/Checkbox";
import { ApplyButtonWithActionDisplay } from "../../ApplyButtonWithActionDisplay";


export function AutoAdmission(props: IAutoAdmissionProps) {

  const handleRefresh = () => {
  };

  const renderRows = () => {
    return null;
  };

  return (
    <section className="step__container">
      <article>
        <Button
          onClick={handleRefresh}
          style={{ fontSize: 12, marginBottom: "1em" }}
          variant="text"
          startIcon={<RefreshIcon />}
        >
          Обновить список
        </Button>
        <section className="table__container">
          <table className="table">
            <thead>
              <tr>
                <th>ФИО</th>
                <th>Группа</th>
                <th>Рейтинг</th>
                <th>З.Е.</th>
                <th>Зачислен на курсы</th>
                <th>Приоритеты</th>
              </tr>
            </thead>
            <tbody>{renderRows()}</tbody>
          </table>
        </section>
      </article>

      <ApplyButtonWithActionDisplay
          showErrorWarning={true}
          showSuccessMessage={true}
          onApply={() => {}}
        />
    </section>
  );
}
