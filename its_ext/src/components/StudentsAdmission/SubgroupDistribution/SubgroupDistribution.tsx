import React, { useContext, useState } from "react";
import style from "./SubgroupDistribution.module.css";
import { ISubgroupDistributionProps } from "./types";
import { IActionExecutionLogItem, ITSAction } from "../../../common/actions";
import { ApplyButtonWithActionDisplay } from "../../ApplyButtonWithActionDisplay";

import { ITSContext } from "../../../common/Context";
import { DEBOUNCE_MS } from "../../../utils/constants";
import { createDebouncedWrapper } from "../../../utils/helpers";
import Button from "@mui/material/Button";

const debouncedWrapperForApply = createDebouncedWrapper(DEBOUNCE_MS);

export function SubgroupDistribution(props: ISubgroupDistributionProps) {
  const [subgroupDistributionActions, setSubgroupDistributionActions] =
    useState<ITSAction[]>([]);
  const [
    subgroupDistributionActionResults,
    setSubgroupDistributionActionResults,
  ] = useState<IActionExecutionLogItem[]>([]);

  const [subgroupDistributionTextInput, setSubgroupDistributionTextInput] =
    useState<string>("");

  const context = useContext(ITSContext)!;

  const handleSubgroupDistributionTextInputChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const value = event.target.value;
    setSubgroupDistributionTextInput(value);
  };

  const handleParseSubgroupDistributionFromTextArea = () => {};

  const renderContent = () => {
    return (
      <React.Fragment>
        <h3>Зачисление студентов на МУПы с одной подгруппой</h3>
        <ApplyButtonWithActionDisplay
          showErrorWarning={true}
          showSuccessMessage={true}
          actions={subgroupDistributionActions}
          actionResults={subgroupDistributionActionResults}
          onApply={handleRealApplyDebounced}
        />

        <h3>Зачисление студентов на МУПы с несколькими подгруппами</h3>

        <textarea
          value={subgroupDistributionTextInput}
          onChange={handleSubgroupDistributionTextInputChange}
          rows={10}
          placeholder="C++, [['personalNumber1', 'personalNumber2', ...], ...]"
        />

        <Button onClick={handleParseSubgroupDistributionFromTextArea}>
          Распарсить
        </Button>

        <ApplyButtonWithActionDisplay
          showErrorWarning={true}
          showSuccessMessage={true}
          actions={subgroupDistributionActions}
          actionResults={subgroupDistributionActionResults}
          onApply={handleRealApplyDebounced}
        />
      </React.Fragment>
    );
  };

  const handleRealApplyDebounced = () => {
    debouncedWrapperForApply(() => {});
  };

  return <section className="step__container">{renderContent()}</section>;
}
