import React, { useState, useEffect, useRef, useContext } from "react";
// eslint-disable-next-line
import style from "./StudentsAdmission.module.css";
import { IStudentsAdmissionProps } from "./types";
import { ITSContext } from "../../../common/Context";
import { CompetitionGroupSelect } from "../CompetitionGroupSelect";
import { ICompetitionGroupItem } from "../CompetitionGroupSelect/types";
import {
  DEBOUNCE_MS,
  REQUEST_ERROR_UNAUTHORIZED,
} from "../../../utils/constants";
import { TaskResultsInput } from "../TaskResultsInput";

import { ApplyButtonWithActionDisplay } from "../../ApplyButtonWithActionDisplay";
import { StudentsDistribution } from "../StudentsDistribution";
import { SubgroupDistribution } from "../SubgroupDistribution";
import { BackButton } from "../../BackButton";
import { createDebouncedWrapper } from "../../../utils/helpers";

const debouncedWrapperForApply = createDebouncedWrapper(DEBOUNCE_MS);

export function StudentsAdmission(props: IStudentsAdmissionProps) {
  const [competitionGroupItems, setCompetitionGroupItems] = useState<
    ICompetitionGroupItem[]
  >([]);
  const [competitionGroupIds, setCompetitionGroupIds] = useState<number[]>([]);
  const competitionGroupRefreshInProgress = useRef<boolean>(false);
  const context = useContext(ITSContext)!;
  const stepTwoRef = useRef<HTMLElement | null>(null);
  const stepThreeRef = useRef<HTMLElement | null>(null);
  const stepFourRef = useRef<HTMLElement | null>(null);

  const [groupIdsFixed, setGroupIdsFixed] = useState<boolean>(false);
  const [stepTwoLoaded, setStepTwoLoaded] = useState<boolean>(false);
  const [stepThreeLoaded, setStepThreeLoaded] = useState<boolean>(false);

  // const handleGroupIdsFixed = (val: boolean) => {
  //   if (groupIdsFixed !== val) {
  //     setGroupIdsFixed(val);
  //   }
  // };
  const handleStepTwoLoaded = () => {
    // console.log("handleStepTwoLoaded");
    setStepTwoLoaded(true);
  };

  const handleStepThreeLoaded = () => {
    // console.log("handleStepThreeLoaded");
    setStepThreeLoaded(true);
  };

  const isGroupSelectionValid = () => {
    const res =
      competitionGroupIds.length > 0 && competitionGroupIds.length <= 2;
    // console.log(`isGroupSelectionValid: ${res}`);
    return res;
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
        if (err.message === REQUEST_ERROR_UNAUTHORIZED) {
          props.onUnauthorized();
          return;
        }
        throw err;
      })
      .finally(() => {
        competitionGroupRefreshInProgress.current = false;
      });
  };

  useEffect(() => {
    refreshCompetitionGroups();
    // eslint-disable-next-line
  }, [props.isUnauthorized]);

  useEffect(() => {
    // console.warn("StudentsAdmission MONUTED");
    // return () => {
    //   console.warn("StudentsAdmission UNMOUNTED X");
    // };
  }, []);

  const handleCompetitionGroupsSelect = (newCompetitionGroupIds: number[]) => {
    if (
      JSON.stringify(competitionGroupIds) ===
      JSON.stringify(newCompetitionGroupIds)
    )
      return;
    setStepTwoLoaded(false);
    setStepThreeLoaded(false);
    setGroupIdsFixed(false);
    debouncedWrapperForApply(() => {
      setCompetitionGroupIds(newCompetitionGroupIds);
      setGroupIdsFixed(true);
    });
  };

  const handleCompetitionGroupSelectButton = () => {
    stepTwoRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleGoToStudentAdmissions = () => {
    stepThreeRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleGoToSubgroupDistribution = () => {
    stepFourRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const renderTaskResultsInput = () => {
    // console.warn("rendering: renderTaskResultsInput");
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
            onLoad={handleStepTwoLoaded}
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
            onNextStep={handleGoToSubgroupDistribution}
            onLoad={handleStepThreeLoaded}
          />
        </article>
      </React.Fragment>
    );
  };

  const renderSubgroupDistribution = () => {
    return (
      <React.Fragment>
        <article className="step" ref={stepFourRef}>
          <span className="step__header">
            4. Распределение студентов по группам
          </span>

          <SubgroupDistribution
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
        <BackButton route="/" />
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
          >
            Выбрать
          </ApplyButtonWithActionDisplay>
          <p className="next_step__message">
            {!isGroupSelectionValid() &&
              "Выберите одну или две группы для перехода к следующему шагу"}
          </p>
        </div>
      </article>

      {isGroupSelectionValid() && groupIdsFixed && renderTaskResultsInput()}

      {isGroupSelectionValid() &&
        // false &&
        groupIdsFixed &&
        stepTwoLoaded &&
        renderStudentsAutoAdmission()}

      {isGroupSelectionValid() &&
        // false &&
        groupIdsFixed &&
        stepTwoLoaded &&
        stepThreeLoaded &&
        renderSubgroupDistribution()}
    </section>
  );
}
