import React, { useContext, useEffect, useState } from "react";
import style from "./SubgroupDistribution.module.css";
import { ISubgroupDistributionProps } from "./types";
import {
  IActionExecutionLogItem,
  ITSAction,
  executeActions,
} from "../../../common/actions";
import { ApplyButtonWithActionDisplay } from "../../ApplyButtonWithActionDisplay";

import { ITSContext } from "../../../common/Context";
import { DEBOUNCE_MS } from "../../../utils/constants";
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

import Button from "@mui/material/Button";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  parseSubgroupMembershipFromText,
  validateSubgroupMembership,
} from "../../../subgroupMembership/subgroupMembershipParser";

const debouncedWrapperForApply = createDebouncedWrapper(DEBOUNCE_MS);

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
  const [
    subgroupDistributionTextInputMessages,
    setSubgroupDistributionTextInputMessages,
  ] = useState<string[]>([]);

  const [mupToLoadToSubgroupMembership, setMupToLoadToSubgroupMembership] =
    useState<MupToLoadToSubgroupMembership>({});

  const context = useContext(ITSContext)!;

  const handleSubgroupDistributionTextInputChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const value = event.target.value;
    setSubgroupDistributionTextInput(value);
  };

  const handleParseSubgroupDistributionFromTextArea = () => {
    if (!subgroupDiffInfo) return;
    const newMupToLoadToSubgroupMembership = parseSubgroupMembershipFromText(
      subgroupDistributionTextInput
    );

    if (newMupToLoadToSubgroupMembership === null) {
      setSubgroupDistributionTextInputMessages([
        "Неверный формат, можно использовать placeholder как пример",
      ]);
      return;
    }

    const { success, messages } = validateSubgroupMembership(
      newMupToLoadToSubgroupMembership,
      subgroupDiffInfo,
      context.dataRepository.studentData
    );

    setSubgroupDistributionTextInputMessages(messages);
    console.log("validateStudentAdmissions");
    console.log({ success, messages });

    if (success) {
      setMupToLoadToSubgroupMembership(newMupToLoadToSubgroupMembership);
      generateActionsForSubgroupDistributionDebounced(
        newMupToLoadToSubgroupMembership
      );
    }
  };


  const renderSubgroupDistributionTextInputMessages = () => {
    return (
      <ul className="list_without_decorations warning">
        {subgroupDistributionTextInputMessages.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    );
  };

  const ensureData = (refresh: boolean = false) => {
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
    return Promise.allSettled([
      hasSubgroupMetas
        ? Promise.resolve()
        : context.dataRepository.UpdateSubgroupMetas(props.competitionGroupIds),
      hasSubgroups
        ? Promise.resolve()
        : context.dataRepository.UpdateSubgroups(props.competitionGroupIds),
      hasAdmissionMetas
        ? Promise.resolve()
        : context.dataRepository.UpdateAdmissionMetas(
            props.competitionGroupIds
          ),
    ]).then(() => {
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

      const competitionGroupIdToAdmissionIds: { [key: number]: number[] } = {};
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
    ensureData()
      .then(() => {
        if (subgroupDiffInfo) {
          return subgroupDiffInfo;
        }
        return prepareData();
      })
      .then(newSubgroupDiffInfo => {
        generateActionsForOneGroupPerLoadDistribution(newSubgroupDiffInfo);
      });
  }, [props.competitionGroupIds]);

  const generateActionsForOneGroupPerLoadDistribution = (newSubgroupDiffInfo: ISubgoupDiffInfo) => {
    const actions =
      createSubgroupMembershipActionsForOneGroupPerLoadDistribution(
        props.competitionGroupIds,
        newSubgroupDiffInfo,
        context.dataRepository.competitionGroupToSubgroupMetas,
        context.dataRepository.subgroupIdToStudentSubgroupMembership
      );

    setSubgroupDistributionForOneGroupPerLoadActions(actions);
  };

  const generateActionsForOneGroupPerLoadDistributionDebounced = (newSubgroupDiffInfo: ISubgoupDiffInfo) => {
    debouncedWrapperForApply(() => generateActionsForOneGroupPerLoadDistribution(newSubgroupDiffInfo));
  }

  const generateActionsForSubgroupDistribution = (
    newMupToLoadToSubgroupMembership: MupToLoadToSubgroupMembership
  ) => {
    console.log('generateActionsForSubgroupDistribution');
    if (!subgroupDiffInfo) {
      console.log(`subgroupDiffInfo is null`);
      return;
    }

    const actions = createSubgroupMembershipActions(
      subgroupDiffInfo,
      newMupToLoadToSubgroupMembership,
      context.dataRepository.subgroupIdToStudentSubgroupMembership,
      context.dataRepository.studentData
    );

    setSubgroupDistributionActions(actions);
  };

  const generateActionsForSubgroupDistributionDebounced = (
    newMupToLoadToSubgroupMembership: MupToLoadToSubgroupMembership
  ) => {
    debouncedWrapperForApply(() =>
      generateActionsForSubgroupDistribution(newMupToLoadToSubgroupMembership)
    );
  };

  const handleSubgroupDistributionRealApplyDebounced = () => {
    debouncedWrapperForApply(() => {
      alert(`Настоящее применение изменений`);
      // alert(`Safe mode`);
      // return;
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
          return context.dataRepository.UpdateSubgroupMembership(
            allSubgroupIds
          )
          .then(() => {
            prepareData();
            generateActionsForSubgroupDistributionDebounced(mupToLoadToSubgroupMembership);
          });
        });
    });
  };

  const handleSubgroupDistributionForOneGroupPerLoadApplyDebounced = () => {
    debouncedWrapperForApply(() => {
      alert(`Настоящее применение изменений`);
      // alert(`Safe mode`);
      // return;
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
          generateActionsForOneGroupPerLoadDistributionDebounced(newSubgroupDiffInfo);
        });
    });
  };

  const renderContent = () => {
    return (
      <React.Fragment>
        <Button
          onClick={handleRefreshDataDebounced}
          style={{ fontSize: 12, marginBottom: "1em" }}
          variant="text"
          startIcon={<RefreshIcon />}
        >
          Обновить
        </Button>

        <h3>Зачисление студентов на МУПы с одной подгруппой</h3>
        <ApplyButtonWithActionDisplay
          showErrorWarning={true}
          showSuccessMessage={true}
          actions={subgroupDistributionForOneGroupPerLoadActions}
          actionResults={subgroupDistributionActionForOneGroupPerLoadResults}
          onApply={handleSubgroupDistributionForOneGroupPerLoadApplyDebounced}
        />

        <h3>Зачисление студентов на МУПы с несколькими подгруппами</h3>

        <p>
          Запустите алгоритм распределения студентов на подгруппы.
          <br />
          Входные данные можно получить из предыдущего шага во вкладке Ручного
          редактирования
          <br />
          Вставьте вывод алгоритма в поле ниже
          <br />
          Распарсите данные и примените изменения, чтобы распределить студентов
        </p>

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
          Распарсить
        </Button>

        {subgroupDistributionTextInputMessages.length > 0 &&
          renderSubgroupDistributionTextInputMessages()}

        <ApplyButtonWithActionDisplay
          showErrorWarning={true}
          showSuccessMessage={true}
          actions={subgroupDistributionActions}
          actionResults={subgroupDistributionActionResults}
          onApply={handleSubgroupDistributionRealApplyDebounced}
        />
      </React.Fragment>
    );
  };

  return <section className="step__container">{renderContent()}</section>;
}
