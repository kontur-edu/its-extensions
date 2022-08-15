import React, { useContext, useEffect, useState, useRef } from "react";
import style from "./SubgroupDistribution.module.css";
import { ISubgroupDistributionProps } from "./types";
import {
  IActionExecutionLogItem,
  ITSAction,
  executeActions,
} from "../../../common/actions";
import { ApplyButtonWithActionDisplay } from "../../ApplyButtonWithActionDisplay";

import { ITSContext } from "../../../common/Context";
import {
  COMPETITION_GROUP_SUBGROUP_URL,
  DEBOUNCE_MS,
} from "../../../utils/constants";
import { createDebouncedWrapper } from "../../../utils/helpers";

import {
  MupToLoadToSubgroupMembership,
  ISubgoupDiffInfo,
} from "../../../common/types";
import {
  createSubgroupMembershipActions,
  createSubgroupMembershipActionsForOneGroupPerLoadDistribution,
} from "../../../subgroupMembership/actionCreator";
import { createSubgroupDiffInfo } from "../../../subgroupUpdater/subgroupDiffs";

import {
  parseSubgroupMembershipFromText,
  trySubstituteLoadWildcards,
  trySubstituteMupShortNamesWithFullNames,
  validateSubgroupMembership,
  createMupToLoadToSubgroupMembership,
} from "../../../subgroupMembership/subgroupMembershipParser";

import {
  prepareStudentAndMupItems,
  getAvailableAdmissionIds,
  createStudentsDistributionData,
} from "../../../studentAdmission/studentDistributor";
import { OuterLink } from "../../OuterLink";
import { CopyOrDownload } from "../../CopyOrDownload";
import { RefreshButton } from "../../RefreshButton";
import Button from "@mui/material/Button";

const debouncedWrapperForApply = createDebouncedWrapper(DEBOUNCE_MS);
const debouncedWrapperForEnsureData = createDebouncedWrapper(DEBOUNCE_MS);

export function SubgroupDistribution(props: ISubgroupDistributionProps) {
  const [
    subgroupDistributionForOneGroupPerLoadActions,
    setSubgroupDistributionForOneGroupPerLoadActions,
  ] = useState<ITSAction[]>([]);
  const [
    subgroupDistributionActionForOneGroupPerLoadResults,
    setSubgroupDistributionActionForOneGroupPerLoadResults,
  ] = useState<IActionExecutionLogItem[]>([]);

  const [subgroupDistributionActions, setSubgroupDistributionActions] =
    useState<ITSAction[]>([]);
  const [
    subgroupDistributionActionResults,
    setSubgroupDistributionActionResults,
  ] = useState<IActionExecutionLogItem[]>([]);

  const [subgroupDiffInfo, setSubgroupDiffInfo] =
    useState<ISubgoupDiffInfo | null>(null);

  const [subgroupDistributionTextInput, setSubgroupDistributionTextInput] =
    useState<string>("");
  const [subgroupDistributionTextOutput, setSubgroupDistributionTextOutput] =
    useState<string>("");
  const [
    subgroupDistributionTextInputMessages,
    setSubgroupDistributionTextInputMessages,
  ] = useState<string[]>([]);

  const [mupToLoadToSubgroupMembership, setMupToLoadToSubgroupMembership] =
    useState<MupToLoadToSubgroupMembership>({});

  const [studentAdmissionsText, setStudentAdmissionsText] =
    useState<string>("");

  const [firstApplyClicked, setFirstApplyClicked] = useState<boolean>(false);
  const [secondApplyClicked, setSecondApplyClicked] = useState<boolean>(false);
  const parseButtonClicked = useRef<boolean>(false);

  const [ensureDataInProgress, setEnsureDataInProgress] =
    useState<boolean>(false);
  const context = useContext(ITSContext)!;

  const handleSubgroupDistributionTextInputChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const value = event.target.value;
    setSubgroupDistributionTextInput(value);
  };

  const handleParseSubgroupDistributionFromTextArea = () => {
    if (!subgroupDiffInfo) return;
    parseButtonClicked.current = true;
    const newMupToLoadToSubgroupMembership = parseSubgroupMembershipFromText(
      subgroupDistributionTextInput
    );

    if (newMupToLoadToSubgroupMembership === null) {
      setSubgroupDistributionTextInputMessages([
        "Неверный формат, можно использовать placeholder как пример",
      ]);
      return;
    }

    let substitutedMupToLoadToSubgroupMembership =
      trySubstituteMupShortNamesWithFullNames(
        newMupToLoadToSubgroupMembership,
        context.dataRepository.mupData
      );
    substitutedMupToLoadToSubgroupMembership = trySubstituteLoadWildcards(
      substitutedMupToLoadToSubgroupMembership,
      props.competitionGroupIds,
      subgroupDiffInfo
    );

    const { success, messages } = validateSubgroupMembership(
      props.competitionGroupIds,
      substitutedMupToLoadToSubgroupMembership,
      subgroupDiffInfo,
      context.dataRepository.studentData
    );

    setSubgroupDistributionTextInputMessages(messages);
    // console.log("validateStudentAdmissions");
    // console.log({ success, messages });

    if (success) {
      setMupToLoadToSubgroupMembership(
        substitutedMupToLoadToSubgroupMembership
      );
      generateActionsForSubgroupDistributionDebounced(
        substitutedMupToLoadToSubgroupMembership
      );
    }
  };

  const renderSubgroupDistributionTextInputMessages = () => {
    return (
      <ul className="warning">
        {subgroupDistributionTextInputMessages.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    );
  };

  const ensureData = (refresh: boolean = false) => {
    setEnsureDataInProgress(true);
    const hasMupData = context.dataRepository.mupData.ids.length > 0;
    const hasSubgroupMetas =
      !refresh &&
      props.competitionGroupIds.every((cgId) =>
        context.dataRepository.competitionGroupToSubgroupMetas.hasOwnProperty(
          cgId
        )
      );
    const hasSubgroups =
      !refresh &&
      props.competitionGroupIds.every((cgId) =>
        context.dataRepository.competitionGroupToSubgroupIds.hasOwnProperty(
          cgId
        )
      );
    const hasAdmissionMetas =
      !refresh &&
      props.competitionGroupIds.every((cgId) =>
        context.dataRepository.competitionGroupIdToMupAdmissions.hasOwnProperty(
          cgId
        )
      );
    return Promise.allSettled(
      props.competitionGroupIds.map((cId) =>
        context.apiService.EmulateCheckSubgroupMetas(cId)
      )
    )
      .then(() =>
        Promise.allSettled([
          hasMupData
            ? Promise.resolve()
            : context.dataRepository.UpdateMupData(),
          hasSubgroupMetas
            ? Promise.resolve()
            : context.dataRepository.UpdateSubgroupMetas(
                props.competitionGroupIds
              ),
          hasSubgroups
            ? Promise.resolve()
            : context.dataRepository.UpdateSubgroups(props.competitionGroupIds),
          hasAdmissionMetas
            ? Promise.resolve()
            : context.dataRepository.UpdateAdmissionMetas(
                props.competitionGroupIds
              ),
        ])
      )
      .then(() => {
        const allSubgroupIds: number[] = [];
        props.competitionGroupIds.forEach((cgId) =>
          allSubgroupIds.push(
            ...context.dataRepository.competitionGroupToSubgroupIds[cgId]
          )
        );
        const hasSubgroupMemberships =
          !refresh &&
          allSubgroupIds.every((sId) =>
            context.dataRepository.subgroupIdToStudentSubgroupMembership.hasOwnProperty(
              sId
            )
          );
        const updateSubgroupMembershipPromise = hasSubgroupMemberships
          ? Promise.resolve()
          : context.dataRepository.UpdateSubgroupMembership(allSubgroupIds);

        const competitionGroupIdToAdmissionIds: { [key: number]: number[] } =
          {};
        for (const cgId in context.dataRepository
          .competitionGroupIdToMupAdmissions) {
          const mupIdToAdmissions =
            context.dataRepository.competitionGroupIdToMupAdmissions[cgId];
          competitionGroupIdToAdmissionIds[cgId] = Object.values(
            mupIdToAdmissions
          ).map((a) => a.admissionsId);
        }
        const hasStudentAndAdmissionData =
          !refresh &&
          context.dataRepository.studentData.ids.length > 0 &&
          props.competitionGroupIds.every((cgId) =>
            competitionGroupIdToAdmissionIds[cgId].every((aId) =>
              context.dataRepository.admissionInfo.hasOwnProperty(aId)
            )
          );
        const updateStudentAndAdmissionsPromise = hasStudentAndAdmissionData
          ? Promise.resolve()
          : context.dataRepository.UpdateStudentAdmissionsAndStudentData(
              competitionGroupIdToAdmissionIds
            );

        return Promise.allSettled([
          updateSubgroupMembershipPromise,
          updateStudentAndAdmissionsPromise,
        ]);
      })
      .finally(() => {
        setEnsureDataInProgress(false);
      });
  };

  const prepareData = () => {
    const newSubgroupDiffInfo = createSubgroupDiffInfo(
      props.competitionGroupIds,
      context.dataRepository.competitionGroupToSubgroupMetas,
      context.dataRepository.competitionGroupToSubgroupIds,
      context.dataRepository.subgroupData
    );

    setSubgroupDiffInfo(newSubgroupDiffInfo);

    const studentAndMupItems = prepareStudentAndMupItems(
      props.competitionGroupIds,
      context.dataRepository.mupData,
      context.dataRepository.competitionGroupIdToMupAdmissions,
      context.dataRepository.admissionInfo,
      context.dataRepository.admissionIdToMupId,
      context.dataRepository.studentData
    );

    const availableAdmissionIds = getAvailableAdmissionIds(
      props.competitionGroupIds,
      context.dataRepository.competitionGroupIdToMupAdmissions
    );

    const newStudentDistributionData = createStudentsDistributionData(
      studentAndMupItems.personalNumberToStudentItems,
      context.dataRepository.studentData,
      context.dataRepository.mupData,
      context.dataRepository.admissionIdToMupId,
      Array.from(availableAdmissionIds)
    );
    // NOTE: Algorithm input data
    setStudentAdmissionsText(
      JSON.stringify(newStudentDistributionData, null, 2)
    );

    const availableMupIds = new Set<string>();
    availableAdmissionIds.forEach((aId) =>
      availableMupIds.add(context.dataRepository.admissionIdToMupId[aId])
    );
    const mupNames: string[] = [];
    availableMupIds.forEach((mId) =>
      mupNames.push(context.dataRepository.mupData.data[mId].name)
    );
    try {
      const mupToLoadToSubgroupMembership = createMupToLoadToSubgroupMembership(
        mupNames,
        props.competitionGroupIds,
        newSubgroupDiffInfo,
        context.dataRepository.subgroupIdToStudentSubgroupMembership,
        context.dataRepository.studentIdToPersonalNumber
      );

      const newSubgroupDistributionTextOutput = JSON.stringify(
        mupToLoadToSubgroupMembership,
        null,
        2
      );
      setSubgroupDistributionTextOutput(newSubgroupDistributionTextOutput);
    } catch (err: any) {
      console.warn('Error: ', err);
      setSubgroupDistributionTextOutput(`Error: ${err.message}`);
    }

    return newSubgroupDiffInfo;
  };

  const handleRefreshData = () => {
    ensureData(true).then(() => {
      const newSubgroupDiffInfo = prepareData();
      generateActionsForOneGroupPerLoadDistribution(newSubgroupDiffInfo);
    });
  };

  const handleRefreshDataDebounced = () => {
    debouncedWrapperForApply(handleRefreshData);
  };

  useEffect(() => {
    // console.warn("SubgroupDistribution MOUNTED");
    // return () => {
    //   console.warn("SubgroupDistribution UNMOUNTED X");
    // };
  }, []);

  useEffect(() => {
    debouncedWrapperForEnsureData(() =>
      ensureData()
        .then(() => {
          if (subgroupDiffInfo) {
            return subgroupDiffInfo;
          }
          return prepareData();
        })
        .then((newSubgroupDiffInfo) => {
          generateActionsForOneGroupPerLoadDistribution(newSubgroupDiffInfo);
        })
    );
    // eslint-disable-next-line
  }, [props.competitionGroupIds]);

  const generateActionsForOneGroupPerLoadDistribution = (
    newSubgroupDiffInfo: ISubgoupDiffInfo
  ) => {
    const actions =
      createSubgroupMembershipActionsForOneGroupPerLoadDistribution(
        props.competitionGroupIds,
        newSubgroupDiffInfo,
        context.dataRepository.competitionGroupToSubgroupMetas,
        context.dataRepository.subgroupIdToStudentSubgroupMembership
      );

    setSubgroupDistributionForOneGroupPerLoadActions(actions);
  };

  const generateActionsForOneGroupPerLoadDistributionDebounced = (
    newSubgroupDiffInfo: ISubgoupDiffInfo
  ) => {
    debouncedWrapperForApply(() =>
      generateActionsForOneGroupPerLoadDistribution(newSubgroupDiffInfo)
    );
  };

  const generateActionsForSubgroupDistribution = (
    newMupToLoadToSubgroupMembership: MupToLoadToSubgroupMembership,
    newSubgroupDiffInfo: ISubgoupDiffInfo
  ) => {
    // console.log("generateActionsForSubgroupDistribution");
    if (!newSubgroupDiffInfo) {
      // console.log(`subgroupDiffInfo is null`);
      return;
    }

    const actions = createSubgroupMembershipActions(
      newSubgroupDiffInfo,
      newMupToLoadToSubgroupMembership,
      context.dataRepository.subgroupIdToStudentSubgroupMembership,
      context.dataRepository.studentData
    );

    setSubgroupDistributionActions(actions);
  };

  const generateActionsForSubgroupDistributionDebounced = (
    newMupToLoadToSubgroupMembership: MupToLoadToSubgroupMembership
  ) => {
    if (!subgroupDiffInfo) return;
    debouncedWrapperForApply(() =>
      generateActionsForSubgroupDistribution(
        newMupToLoadToSubgroupMembership,
        subgroupDiffInfo
      )
    );
  };

  const generateAllActionsDebounced = (
    newMupToLoadToSubgroupMembership: MupToLoadToSubgroupMembership,
    newSubgroupDiffInfo: ISubgoupDiffInfo
  ) => {
    debouncedWrapperForApply(() => {
      generateActionsForSubgroupDistribution(
        newMupToLoadToSubgroupMembership,
        newSubgroupDiffInfo
      );
      generateActionsForOneGroupPerLoadDistribution(newSubgroupDiffInfo);
    });
  };

  const handleSubgroupDistributionRealApplyDebounced = () => {
    debouncedWrapperForApply(() => {
      alert(`Настоящее применение изменений`);
      setFirstApplyClicked(false);
      setSecondApplyClicked(true);
      executeActions(subgroupDistributionActions, context)
        .then((actionResults) => {
          setSubgroupDistributionActionResults(actionResults);
        })
        .then(() => {
          const allSubgroupIds: number[] = [];
          props.competitionGroupIds.forEach((cgId) =>
            allSubgroupIds.push(
              ...context.dataRepository.competitionGroupToSubgroupIds[cgId]
            )
          );
          return context.dataRepository
            .UpdateSubgroupMembership(allSubgroupIds)
            .then(() => {
              const newSubgroupDiffInfo = prepareData();
              generateAllActionsDebounced(
                mupToLoadToSubgroupMembership,
                newSubgroupDiffInfo
              );
            });
        });
    });
  };

  const handleSubgroupDistributionForOneGroupPerLoadApplyDebounced = () => {
    debouncedWrapperForApply(() => {
      alert(`Настоящее применение изменений`);
      setFirstApplyClicked(true);
      setSecondApplyClicked(false);
      executeActions(subgroupDistributionForOneGroupPerLoadActions, context)
        .then((actionResults) => {
          setSubgroupDistributionActionForOneGroupPerLoadResults(actionResults);
        })
        .then(() => {
          const allSubgroupIds: number[] = [];
          props.competitionGroupIds.forEach((cgId) =>
            allSubgroupIds.push(
              ...context.dataRepository.competitionGroupToSubgroupIds[cgId]
            )
          );
          return context.dataRepository.UpdateSubgroupMembership(
            allSubgroupIds
          );
        })
        .then(() => {
          const newSubgroupDiffInfo = prepareData();
          generateActionsForOneGroupPerLoadDistributionDebounced(
            newSubgroupDiffInfo
          );
        });
    });
  };

  const renderCompetitionGroupsSubgroupsLinkList = () => {
    const links = props.competitionGroupIds.map((cgId) => {
      const link = COMPETITION_GROUP_SUBGROUP_URL + cgId;
      let competitionGroupName: string = `${cgId}`;
      if (
        context.dataRepository.competitionGroupData.data.hasOwnProperty(cgId)
      ) {
        competitionGroupName =
          context.dataRepository.competitionGroupData.data[cgId].name;
      }
      return (
        <li key={cgId}>
          <OuterLink url={link}>{competitionGroupName}</OuterLink>
        </li>
      );
    });
    return <ul className="list_without_decorations">{links}</ul>;
  };

  const renderSubgroupDistributionForOneGroupPerLoad = () => {
    // const haveActions =
    //   subgroupDistributionForOneGroupPerLoadActions.length > 0 ||
    //   subgroupDistributionActionForOneGroupPerLoadResults.length > 0;
    return (
      <React.Fragment>
        <h3>Зачисление студентов на МУПы с одной подгруппой</h3>
        {/* {!haveActions && <p>Не найдено возможных действий для этого шага</p>} */}
        <ApplyButtonWithActionDisplay
          showErrorWarning={true}
          showSuccessMessage={true}
          actions={subgroupDistributionForOneGroupPerLoadActions}
          actionResults={subgroupDistributionActionForOneGroupPerLoadResults}
          clicked={firstApplyClicked}
          onApply={handleSubgroupDistributionForOneGroupPerLoadApplyDebounced}
        >
          Применить изменения
        </ApplyButtonWithActionDisplay>
      </React.Fragment>
    );
  };

  const renderContent = () => {
    return (
      <React.Fragment>
        <RefreshButton
          onClick={handleRefreshDataDebounced}
          title="Обновить данные"
          loading={ensureDataInProgress}
        />

        {renderSubgroupDistributionForOneGroupPerLoad()}

        <h3>Зачисление студентов на МУПы с несколькими подгруппами</h3>

        <ol className={style.step_list}>
          <li>
            Получите входные данные алгоритма
            <CopyOrDownload
              title="Скопировать входные данные"
              filename="StudentAdmissions.json"
              data={studentAdmissionsText}
            />
          </li>
          <li>Запустите алгоритм распределения студентов на подгруппы</li>
          <li>Вставьте вывод алгоритма в поле ниже и распарсите данные</li>
          <li>
            Если данные ИТС изменились, нажмите кнопку "Обновить данные" в
            начале шага
          </li>
          <li>
            Примените изменения, чтобы распределить студентов по выбранным
            группам
          </li>
          <li>
            Проверьте распределение в ИТС для следующих Конкурсных групп:
            {renderCompetitionGroupsSubgroupsLinkList()}
          </li>
        </ol>

        <CopyOrDownload
          title={"Скопировать распределение студентов по подгруппам"}
          data={subgroupDistributionTextOutput}
          filename={"subgroupDistribution.josn"}
        />

        <textarea
          value={subgroupDistributionTextInput}
          onChange={handleSubgroupDistributionTextInputChange}
          rows={10}
          placeholder={`{
// МУП
  "C++": {
    // Нагрузка
    "лекции": [
      // Список личных номеров студентов первой группы
      ["123456", ...], 
      // Список личных номеров студентов второй группы
      [...],			 
      ...
    ]
  }
}`}
        />

        <Button onClick={handleParseSubgroupDistributionFromTextArea}>
          Распарсить и подготовить изменения
        </Button>

        {subgroupDistributionTextInputMessages.length > 0 &&
          renderSubgroupDistributionTextInputMessages()}
        {/* {parseButtonClicked.current &&
          subgroupDistributionTextInputMessages.length === 0 &&
          subgroupDistributionActions.length === 0 &&
          !secondApplyClicked && (
            <p>Не найдено возможных действий для этого шага</p>
          )} */}
        <ApplyButtonWithActionDisplay
          showErrorWarning={true}
          showSuccessMessage={true}
          actions={subgroupDistributionActions}
          actionResults={subgroupDistributionActionResults}
          clicked={secondApplyClicked}
          onApply={handleSubgroupDistributionRealApplyDebounced}
        >
          Применить изменения
        </ApplyButtonWithActionDisplay>
      </React.Fragment>
    );
  };

  return <section className="step__container">{renderContent()}</section>;
}
