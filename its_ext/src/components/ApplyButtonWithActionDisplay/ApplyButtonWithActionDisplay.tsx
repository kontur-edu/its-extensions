import React, { useEffect, useRef, useState } from "react";
import style from "./ApplyButtonWithActionDisplay.module.css";
import { IApplyButtonWithActionDisplayProps } from "./types";
import {
  IActionExecutionLogItem,
  ITSAction,
  checkAllRefreshAction,
} from "../../common/actions";

import Collapse from "@mui/material/Collapse";
import Button from "@mui/material/Button";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import DoneIcon from "@mui/icons-material/Done";
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";
import CircularProgress from "@mui/material/CircularProgress";

function clipString(message: string, length: number) {
  if (message.length > length) {
    return message.substring(0, Math.max(0, length - 3)) + "...";
  }
  return message;
}

const MESSAGE_SIZE = 150;

export interface INextStepButtonProps {
  onClick: () => void;
}

export function NextStepButton(
  props: React.PropsWithChildren<INextStepButtonProps>
) {
  return (
    <Button
      onClick={props.onClick}
      variant="contained"
      style={{ marginRight: "1em", alignSelf: "flex-start" }}
      endIcon={<SystemUpdateAltIcon />}
    >
      {props.children}
    </Button>
  );
}

export function ApplyButtonWithActionDisplay(
  props: React.PropsWithChildren<IApplyButtonWithActionDisplayProps>
) {
  const [actionListOpen, setActionListOpen] = useState<boolean>(false);
  const [actionResultsListOpen, setActionResultsListOpen] =
    useState<boolean>(false);
  // const wasApply = useRef<boolean>(false);
  const [wasApply, setWasApply] = useState<boolean>(false);

  useEffect(() => {
    if (props.clicked !== null && props.clicked !== undefined) {
      setWasApply(props.clicked);
    }
  }, [props.clicked]);

  const handleActionListOpen = () => {
    setActionListOpen(!actionListOpen);
  };

  const handleActionResultsListOpen = () => {
    setActionResultsListOpen(!actionResultsListOpen);
  };

  const renderActionList = () => {
    // style={{alignSelf: 'flex-start'}}
    return (
      <React.Fragment>
        <Button onClick={handleActionListOpen}>
          Созданные действия {actionListOpen ? <ExpandLess /> : <ExpandMore />}
        </Button>
        <Collapse in={actionListOpen} timeout="auto" unmountOnExit>
          <ul>
            {props.actions?.map((a: ITSAction, index: number) => (
              <li key={index}>{clipString(a.getMessage(), MESSAGE_SIZE)}</li>
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
          Результаты последнего применения изменений{" "}
          {actionResultsListOpen ? <ExpandLess /> : <ExpandMore />}
        </Button>
        <Collapse in={actionResultsListOpen} timeout="auto" unmountOnExit>
          <ul>
            {props.actionResults?.map(
              (logItem: IActionExecutionLogItem, index: number) => (
                <li key={index}>
                  {clipString(logItem.actionMessage, MESSAGE_SIZE)}
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
      <NextStepButton onClick={props.onNextStep}>
        К следующему шагу
      </NextStepButton>
      // <Button
      //   onClick={props.onNextStep}
      //   variant="contained"
      //   style={{ marginRight: "1em" }}
      //   endIcon={<SystemUpdateAltIcon />}
      // >
      //   К следующему шагу
      // </Button>
    );

    let successMessage: JSX.Element | null = null;
    if (wasApply && props.showSuccessMessage) {
      let allSuccess = true;
      if (
        props.actionResults &&
        !props.actionResults.every((li) =>
          li.actionResults.every((ar) => ar.success)
        )
      ) {
        allSuccess = false;
      }
      if (allSuccess) {
        successMessage = (
          <span className="message_success__container">
            <DoneIcon />
            Сохранено, с этого шага можно безопасно уходить
          </span>
        );
      }
    }

    return (
      <React.Fragment>
        {successMessage}
        {nextStepButton}
        {!successMessage && !nextStepButton && (
          <p className="message_success no_offsets">
            Для данного шага не найдено автоматических действий
          </p>
        )}
      </React.Fragment>
    );
  };

  const handleApply = () => {
    setWasApply(true);
    props.onApply?.();
  };

  const renderApplyButton = () => {
    return (
      <React.Fragment>
        <Button
          onClick={handleApply}
          variant="contained"
          style={{ marginRight: "1em" }}
        >
          {props.children}
        </Button>
      </React.Fragment>
    );
  };

  const renderButtons = () => {
    const haveOnlyRefreshActions =
      !props.actions || checkAllRefreshAction(props.actions);
    const actionsСompletedSuccessfully =
      !props.actionResults?.length ||
      props.actionResults?.every((logItem) =>
        logItem.actionResults.every((ar) => ar.success)
      );
    return (
      <div className="apply_button__container">
        {!haveOnlyRefreshActions && props.onApply && renderApplyButton()}
        {haveOnlyRefreshActions && renderSuccessButtonWithNextStep()}
        <p className="warning">
          {props.showErrorWarning &&
            !actionsСompletedSuccessfully &&
            "При сохранении изменений возникли ошибки"}
        </p>
      </div>
    );
  };

  return (
    <div className={style.container}>
      {props.actions && props.actions.length > 0 && renderActionList()}
      {renderButtons()}
      {wasApply && props.actionResults &&
        props.actionResults.length > 0 &&
        renderActionResultsList()}
      {props.loading && <div className="progress_screen"></div>}
      {props.loading && <CircularProgress className="progress_icon_small" />}
    </div>
  );
}
