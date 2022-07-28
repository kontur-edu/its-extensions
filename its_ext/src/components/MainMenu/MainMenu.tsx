import React from "react";
import style from "./MainMenu.module.css";
import { IMainMenuProps } from "./types";
import { useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";

export function MainMenu(props: IMainMenuProps) {
  const navigate = useNavigate();

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
        <Button
          onClick={handleSemesterPreparation}
          style={{
            backgroundColor: "#fff",
            color: "#000",
            margin: "0 0.4em",
            fontSize: '0.8em',
          }}
          endIcon={<ExitToAppIcon />}
          variant="contained"
        >
          Подготовка семестра
        </Button>
        <Button
          onClick={handleStudentEnrollment}
          style={{
            backgroundColor: "#fff",
            color: "#000",
            margin: "0 0.4em",
            fontSize: '0.8em',
          }}
          endIcon={<ExitToAppIcon />}
          variant="contained"
        >
          Зачисление студентов
        </Button>
      </div>
      <p>{props.login ? `Вы авторизованы под логином ${props.login}` : ""}</p>
    </section>
  );
}
