import React, { useRef, useState } from "react";
import style from "./Modal.module.css";
import { IApplyButtonWithActionDisplayProps } from "./types";
import {
  IActionExecutionLogItem,
  ITSAction,
  ActionType,
} from "../../common/actions";

import Collapse from "@mui/material/Collapse";
import Button from "@mui/material/Button";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import DoneIcon from "@mui/icons-material/Done";
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";

export function ApplyButtonWithActionDisplay(
  props: IApplyButtonWithActionDisplayProps
) {
  const [actionListOpen, setActionListOpen] = useState<boolean>(false);
  const [actionResultsListOpen, setActionResultsListOpen] =
    useState<boolean>(false);
  const wasApply = useRef<boolean>(false);

  const handleActionListOpen = () => {
    setActionListOpen(!actionListOpen);
  };

  const handleActionResultsListOpen = () => {
    setActionResultsListOpen(!actionResultsListOpen);
  };

  const renderActionList = () => {
    return (
      <React.Fragment>
        <Button onClick={handleActionListOpen}>
          Показать созданные действия{" "}
          {actionListOpen ? <ExpandLess /> : <ExpandMore />}
        </Button>
        <Collapse in={actionListOpen} timeout="auto" unmountOnExit>
          <ul>
            {props.actions?.map((a: ITSAction, index: number) => (
              <li key={index}>{a.getMessage()}</li>
            ))}
          </ul>
        </Collapse>
      </React.Fragment>
    );
  };

  const renderActionResultsList = () => {
    return (
      <React.Fragment>
        <Button onClick={handleActionResultsListOpen}>
          Показать рещультаты выполнения действий{" "}
          {actionResultsListOpen ? <ExpandLess /> : <ExpandMore />}
        </Button>
        <Collapse in={actionResultsListOpen} timeout="auto" unmountOnExit>
          <ul>
            {props.actionResults?.map(
              (logItem: IActionExecutionLogItem, index: number) => (
                <li key={index}>
                  {logItem.actionMessage}
                  <ul>
                    {logItem.actionResults.map((ar, arIdx) => (
                      <li
                        key={arIdx}
                        className={
                          ar.success ? "message_success" : "message_error"
                        }
                      >
                        {ar.message}
                      </li>
                    ))}
                  </ul>
                </li>
              )
            )}
          </ul>
        </Collapse>
      </React.Fragment>
    );
  };

  const renderSuccessButtonWithNextStep = () => {
    const nextStepButton = props.onNextStep && (
      <Button
        onClick={props.onNextStep}
        variant="contained"
        style={{ marginRight: "1em" }}
        endIcon={<SystemUpdateAltIcon />}
      >
        К следующему шагу
      </Button>
    );
    const successMessage = wasApply.current && props.showSuccessMessage && (
      <span className="message_success__container">
        <DoneIcon />
        Сохранено, с этого шага можно безопасно уходить
      </span>
    );
    return (
      <React.Fragment>
        {successMessage}
        {nextStepButton}
      </React.Fragment>
    );
  };

  const handleApply = () => {
    wasApply.current = true;
    props.onApply?.();
  }

  const renderApplyButtonWithMessage = () => {
    const applyButton = props.onApply && (
      <Button
        onClick={handleApply}
        variant="contained"
        style={{ marginRight: "1em" }}
      >
        Применение изменений
      </Button>
    );
    return (
      <React.Fragment>
        {applyButton}
        <p className="warning">
          {props.showErrorWarning &&
          props.actionResults?.every((logItem) =>
            logItem.actionResults.every((ar) => ar.success)
          )
            ? null
            : "При сохранении изменений возникли ошибки. Чтобы перейти к следующему шагу исправьте ошибки"}
        </p>
      </React.Fragment>
    );
  };

  const renderButtons = () => {
    const haveOnlyRefreshActions =
      !props.actions ||
      props.actions.every(
        (a) =>
          a.actionType === ActionType.RefreshSelectionGroups ||
          a.actionType === ActionType.RefreshPeriods ||
          a.actionType === ActionType.RefreshSubgroups
      );

    return (
      <div className="apply_button__container">
        {haveOnlyRefreshActions
          ? renderSuccessButtonWithNextStep()
          : renderApplyButtonWithMessage()}
      </div>
    );
  };

  return (
    <React.Fragment>
      {props.actions && renderActionList()}
      {renderButtons()}
      {props.actionResults && renderActionResultsList()}
    </React.Fragment>
  );
}
