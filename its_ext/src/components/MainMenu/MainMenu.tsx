import React from "react";
import style from "./MainMenu.module.css";
import { IMainMenuProps } from "./types";
import { useNavigate } from "react-router-dom";


export function MainMenu(props: IMainMenuProps) {
    const navigate = useNavigate();
    const handleSemesterPreparation = () => {
        navigate('/semesterPreparation');
    };
    const handleStudentEnrollment = () => {
        navigate('/studentsAdmission');
    };
    return (
        <section className={style.menu}>
            <div className={style.menu__container}>
                <button className={style.menu__button} onClick={handleSemesterPreparation}>Подготовка семестра</button>
                <button className={style.menu__button} onClick={handleStudentEnrollment}>Зачисление студентов</button>
            </div>
        </section>
    );
}