import React, { useEffect, useState } from "react";
// eslint-disable-next-line
import style from "./CompetitionGroupSelect.module.css";
import { ICompetitionGroupSelectProps } from "./types";
import Checkbox from "@mui/material/Checkbox";
import { RefreshButton } from "../../RefreshButton";

export function CompetitionGroupSelect(props: ICompetitionGroupSelectProps) {
  const [selectedCompetitionGroupIds, setSelectedCompetitionGroupIds] =
    useState<number[]>([]);

  const handleRefreshCompetitionGroups = () => {
    props.onRefresh();
  };

  const handleCompetitionGroupToggle = (id: number) => {
    let newIds = [];
    if (selectedCompetitionGroupIds.includes(id)) {
      newIds = selectedCompetitionGroupIds.filter((i) => i !== id);
    } else {
      newIds = [...selectedCompetitionGroupIds, id];
    }

    setSelectedCompetitionGroupIds(newIds);
    props.onSelectionValid(newIds);
  };

  useEffect(() => {
    return () => {
    };
  }, []);

  useEffect(() => {}, [props.competitionGroupsItems]);

  const renderRows = () => {
    return props.competitionGroupsItems.map((cgItem) => {
      const selected = selectedCompetitionGroupIds.includes(cgItem.id);
      return (
        <tr
          key={cgItem.id}
          className="selectable"
          onClick={() => handleCompetitionGroupToggle(cgItem.id)}
        >
          <th>
            <Checkbox readOnly checked={selected} />
          </th>
          <th>{cgItem.name}</th>
          <th>{cgItem.course}</th>
          <th>{cgItem.year}</th>
          <th>{cgItem.semesterName}</th>
          <th>{cgItem.selectionGroupName}</th>
        </tr>
      );
    });
  };

  return (
    <section className="step__container">
      <article>
        <RefreshButton
          onClick={handleRefreshCompetitionGroups}
          title="Обновить список"
        />
        <section className="table__container">
          <table className="table">
            <thead>
              <tr>
                <th>Выбр</th>
                <th>Конкурсная группа</th>
                <th>Курс</th>
                <th>Год</th>
                <th>Семестр</th>
                <th>Группа выбора</th>
              </tr>
            </thead>
            <tbody>{renderRows()}</tbody>
          </table>
        </section>
      </article>
    </section>
  );
}
