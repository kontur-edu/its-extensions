import React from "react";
import style from "./MainMenu.module.css";
import { IMainMenuProps } from "./types";
import { useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";

export interface IMainMenuButtonProps {
  onClick: () => void;
}

export function MainMenuButton(
  props: React.PropsWithChildren<IMainMenuButtonProps>
) {
  return (
    <Button
      onClick={props.onClick}
      style={{
        backgroundColor: "#fff",
        color: "#000",
        margin: "0 0.4em",
        fontSize: "0.8em",
      }}
      endIcon={<ExitToAppIcon />}
      variant="contained"
    >
      {props.children}
    </Button>
  );
}

export function MainMenu(props: IMainMenuProps) {
  const navigate = useNavigate();

  // TODO: deside if it is needed
  // const handleStudent = () => {
  //   navigate("/student");
  // };
  const handleSemesterPreparation = () => {
    navigate("/semesterPreparation");
  };
  const handleStudentEnrollment = () => {
    navigate("/studentsAdmission");
  };
  return (
    <section className={style.menu}>
      <h2 className={style.menu__header}>Индивидуальная траектория студента</h2>
      <div className={style.menu__container}>
        {/* TODO: deside if it is needed */}
        {/* <MainMenuButton onClick={handleStudent}>Студент</MainMenuButton> */}
        <MainMenuButton onClick={handleSemesterPreparation}>
          Подготовка семестра
        </MainMenuButton>
        <MainMenuButton onClick={handleStudentEnrollment}>
          Зачисление студентов
        </MainMenuButton>
      </div>
      <p>{props.login ? `Вы авторизованы под логином ${props.login}` : ""}</p>
    </section>
  );
}
