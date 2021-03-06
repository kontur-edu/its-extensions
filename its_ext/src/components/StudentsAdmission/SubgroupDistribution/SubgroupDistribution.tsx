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
  REQUEST_ERROR_UNAUTHORIZED,
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
        "???????????????? ????????????, ?????????? ???????????????????????? placeholder ?????? ????????????",
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
      // context.dataRepository.mupData
    );

    setSubgroupDistributionTextInputMessages(messages);
    console.log("validateStudentAdmissions");
    console.log({ success, messages });

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
      .then(() => {
        setEnsureDataInProgress(false);
      })
      .catch((err) => {
        setEnsureDataInProgress(false);
        if (err.message === REQUEST_ERROR_UNAUTHORIZED) {
          props.onUnauthorized();
          return;
        }
        throw err;
      });
  };

  const prepareData = () => {
    const newSubgroupDiffInfo = createSubgroupDiffInfo(
      props.competitionGroupIds,
      context.dataRepository.competitionGroupToSubgroupMetas,
      context.dataRepository.competitionGroupToSubgroupIds,
      context.dataRepository.subgroupData
    );

    console.log("prepareData newSubgroupDiffInfo");
    console.log(newSubgroupDiffInfo);

    setSubgroupDiffInfo(newSubgroupDiffInfo);

    const studentAndMupItems = prepareStudentAndMupItems(
      props.competitionGroupIds,
      context.dataRepository.mupData,
      context.dataRepository.competitionGroupIdToMupAdmissions,
      context.dataRepository.admissionInfo,
      context.dataRepository.admissionIdToMupId,
      context.dataRepository.studentData
    );

    console.log("studentAndMupItems");
    console.log(studentAndMupItems);

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

    try {
      const mupToLoadToSubgroupMembership = createMupToLoadToSubgroupMembership(
        props.competitionGroupIds,
        newSubgroupDiffInfo,
        context.dataRepository.subgroupIdToStudentSubgroupMembership,
        context.dataRepository.studentIdToPersonalNumber
      );
      console.log("mupToLoadToSubgroupMembership");
      console.log(mupToLoadToSubgroupMembership);
      const newSubgroupDistributionTextOutput = JSON.stringify(
        mupToLoadToSubgroupMembership,
        null,
        2
      );
      setSubgroupDistributionTextOutput(newSubgroupDistributionTextOutput);
    } catch (err: any) {
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
    ensureData()
      .then(() => {
        if (subgroupDiffInfo) {
          return subgroupDiffInfo;
        }
        return prepareData();
      })
      .then((newSubgroupDiffInfo) => {
        generateActionsForOneGroupPerLoadDistribution(newSubgroupDiffInfo);
      });
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
    console.log("generateActionsForSubgroupDistribution");
    if (!newSubgroupDiffInfo) {
      console.log(`subgroupDiffInfo is null`);
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
      alert(`?????????????????? ???????????????????? ??????????????????`);
      setFirstApplyClicked(false);
      setSecondApplyClicked(true);
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
      alert(`?????????????????? ???????????????????? ??????????????????`);
      setFirstApplyClicked(true);
      setSecondApplyClicked(false);
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
          <OuterLink url={link} title={competitionGroupName} />
        </li>
      );
    });
    return <ul className="list_without_decorations">{links}</ul>;
  };

  const renderSubgroupDistributionForOneGroupPerLoad = () => {
    const haveActions =
      subgroupDistributionForOneGroupPerLoadActions.length > 0 ||
      subgroupDistributionActionForOneGroupPerLoadResults.length > 0;
    return (
      <React.Fragment>
        <h3>???????????????????? ?????????????????? ???? ???????? ?? ?????????? ????????????????????</h3>
        {!haveActions && <p>???? ?????????????? ?????????????????? ???????????????? ?????? ?????????? ????????</p>}
        <ApplyButtonWithActionDisplay
          showErrorWarning={true}
          showSuccessMessage={true}
          actions={subgroupDistributionForOneGroupPerLoadActions}
          actionResults={subgroupDistributionActionForOneGroupPerLoadResults}
          clicked={firstApplyClicked}
          onApply={handleSubgroupDistributionForOneGroupPerLoadApplyDebounced}
        />
      </React.Fragment>
    );
  };

  const renderContent = () => {
    return (
      <React.Fragment>
        {/* <div className="load_content_container_small">
          {ensureDataInProgress && <CircularProgress className="progress_icon_small" />}
          <RefreshButton
            onClick={handleRefreshDataDebounced}
            title="???????????????? ????????????"
          />
        </div> */}
        <RefreshButton
          onClick={handleRefreshDataDebounced}
          title="???????????????? ????????????"
          loading={ensureDataInProgress}
        />

        {renderSubgroupDistributionForOneGroupPerLoad()}

        <h3>???????????????????? ?????????????????? ???? ???????? ?? ?????????????????????? ??????????????????????</h3>

        <ol className={style.step_list}>
          <li>
            ???????????????? ?????????????? ???????????? ??????????????????
            <CopyOrDownload
              title="?????????????????????? ?????????????? ????????????"
              filename="StudentAdmissions.json"
              data={studentAdmissionsText}
            />
          </li>
          <li>?????????????????? ???????????????? ?????????????????????????? ?????????????????? ???? ??????????????????</li>
          <li>???????????????? ?????????? ?????????????????? ?? ???????? ???????? ?? ???????????????????? ????????????</li>
          <li>
            ???????? ???????????? ?????? ????????????????????, ?????????????? ???????????? "???????????????? ????????????" ??
            ???????????? ????????
          </li>
          <li>
            ?????????????????? ??????????????????, ?????????? ???????????????????????? ?????????????????? ???? ??????????????????
            ??????????????
          </li>
          <li>
            ?????????????????? ?????????????????????????? ?? ?????? ?????? ?????????????????? ???????????????????? ??????????:
            {renderCompetitionGroupsSubgroupsLinkList()}
          </li>
        </ol>

        <CopyOrDownload
          title={"?????????????????????? ?????????????????????????? ?????????????????? ???? ????????????????????"}
          data={subgroupDistributionTextOutput}
          filename={"subgroupDistribution.josn"}
        />

        <textarea
          value={subgroupDistributionTextInput}
          onChange={handleSubgroupDistributionTextInputChange}
          rows={10}
          placeholder={`{
// ??????
  "C++": {
    // ????????????????
    "????????????": [
      // ???????????? ???????????? ?????????????? ?????????????????? ???????????? ????????????
      ["123456", ...], 
      // ???????????? ???????????? ?????????????? ?????????????????? ???????????? ????????????
      [...],			 
      ...
    ]
  }
}`}
        />

        <Button onClick={handleParseSubgroupDistributionFromTextArea}>
          ???????????????????? ?? ?????????????????????? ??????????????????
        </Button>

        {subgroupDistributionTextInputMessages.length > 0 &&
          renderSubgroupDistributionTextInputMessages()}
        {parseButtonClicked.current &&
          subgroupDistributionTextInputMessages.length === 0 &&
          subgroupDistributionActions.length === 0 &&
          !secondApplyClicked && (
            <p>???? ?????????????? ?????????????????? ???????????????? ?????? ?????????? ????????</p>
          )}
        <ApplyButtonWithActionDisplay
          showErrorWarning={true}
          showSuccessMessage={true}
          actions={subgroupDistributionActions}
          actionResults={subgroupDistributionActionResults}
          clicked={secondApplyClicked}
          onApply={handleSubgroupDistributionRealApplyDebounced}
        />
      </React.Fragment>
    );
  };

  return <section className="step__container">{renderContent()}</section>;
}
