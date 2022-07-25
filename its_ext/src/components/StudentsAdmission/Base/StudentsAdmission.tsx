import React, { useState, useEffect, useRef, useContext } from "react";

import style from "./StudentsAdmission.module.css";
import { IStudentsAdmissionProps } from "./types";
import { ITSContext } from "../../../common/Context";
import { CompetitionGroupSelect } from "../CompetitionGroupSelect";
import { ICompetitionGroupItem } from "../CompetitionGroupSelect/types";
import { REQUEST_ERROR_UNAUTHORIZED } from "../../../utils/constants";
import { TaskResultsInput } from "../TaskResultsInput";

import { useNavigate } from "react-router-dom";

import { Button } from "@mui/material";
import WestIcon from "@mui/icons-material/West";
import { ApplyButtonWithActionDisplay } from "../../ApplyButtonWithActionDisplay";
import { StudentsDistribution } from "../StudentsDistribution";

export function StudentsAdmission(props: IStudentsAdmissionProps) {
  const [competitionGroupItems, setCompetitionGroupItems] = useState<
    ICompetitionGroupItem[]
  >([]);
  const [competitionGroupIds, setCompetitionGroupIds] = useState<number[]>([]);
  const competitionGroupRefreshInProgress = useRef<boolean>(false);
  const context = useContext(ITSContext)!;
  const stepTwoRef = useRef<HTMLElement | null>(null);
  const stepThreeRef = useRef<HTMLElement | null>(null);

  const navigate = useNavigate();

  const handleBackButton = () => {
    navigate("/");
  };

  const isGroupSelectionValid = () => {
    return competitionGroupIds.length > 0 && competitionGroupIds.length <= 2;
  };

  const refreshCompetitionGroups = () => {
    if (props.isUnauthorized || competitionGroupRefreshInProgress.current) {
      return;
    }
    competitionGroupRefreshInProgress.current = true;
    context.dataRepository
      .UpdateCompetitionGroupData()
      .then(() => {
        competitionGroupRefreshInProgress.current = false;
        const newCompetitionGroupItems =
          context.dataRepository.competitionGroupData.ids.map((cgId) => {
            const competitionGroup =
              context.dataRepository.competitionGroupData.data[cgId];
            const selectionGroups =
              competitionGroup.selectionGroupNames.join(", ");
            const cgItem: ICompetitionGroupItem = {
              id: competitionGroup.id,
              name: competitionGroup.name,
              course: competitionGroup.course,
              year: competitionGroup.year,
              semesterName: competitionGroup.semesterName,
              selectionGroupName: selectionGroups,
            };

            return cgItem;
          });
        setCompetitionGroupItems(newCompetitionGroupItems);
      })
      .catch((err) => {
        competitionGroupRefreshInProgress.current = false;
        if (err.message === REQUEST_ERROR_UNAUTHORIZED) {
          props.onUnauthorized();
          return;
        }
        throw err;
      });
  };

  useEffect(() => {
    refreshCompetitionGroups();
  }, []);

  const handleCompetitionGroupsSelect = (newCompetitionGroupIds: number[]) => {
    setCompetitionGroupIds(newCompetitionGroupIds);
  };

  const handleCompetitionGroupSelectButton = () => {
    stepTwoRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleGoToStudentAdmissions = () => {
    stepThreeRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  const renderTaskResultsInput = () => {
    return (
      <React.Fragment>
        <article className="step" ref={stepTwoRef}>
          <span className="step__header">
            2. Ввод результатов отборочных заданий
          </span>

          <TaskResultsInput
            competitionGroupIds={competitionGroupIds}
            onUnauthorized={props.onUnauthorized}
            onNextStep={handleGoToStudentAdmissions}
          />
        </article>
      </React.Fragment>
    );
  };

  const renderStudentsAutoAdmission = () => {
    return (
      <React.Fragment>
        <article className="step" ref={stepThreeRef}>
          <span className="step__header">3. Зачисление студентов на курсы</span>

          <StudentsDistribution
            onUnauthorized={props.onUnauthorized}
            competitionGroupIds={competitionGroupIds}
          />
        </article>
      </React.Fragment>
    );
  };

  return (
    <section className="page">
      <h2 className="action_header">
        <Button
          onClick={handleBackButton}
          variant="text"
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translate(0, -50%)",
          }}
          startIcon={<WestIcon />}
        >
          Вернуться назад
        </Button>
        Зачисление студентов
      </h2>
      <article className="step">
        <span className="step__header">
          1. Выберите конкурсные группы для 3-го и 4-го курсов
        </span>

        <CompetitionGroupSelect
          competitionGroupsItems={competitionGroupItems}
          onRefresh={refreshCompetitionGroups}
          onSelectionValid={handleCompetitionGroupsSelect}
        />

        <div className="next_step__container">
          <ApplyButtonWithActionDisplay
            showErrorWarning={false}
            showSuccessMessage={false}
            onNextStep={handleCompetitionGroupSelectButton}
          />
          <p className="next_step__message">
            {!isGroupSelectionValid() &&
              "Выберите одну или две группы для перехода к следующему шагу"}
          </p>
        </div>
      </article>

      {isGroupSelectionValid() && renderTaskResultsInput()}

      {isGroupSelectionValid() && renderStudentsAutoAdmission()}
    </section>
  );
}
