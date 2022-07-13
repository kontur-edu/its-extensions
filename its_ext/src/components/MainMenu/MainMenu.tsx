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
    const doStuff = () => {
        const data = {"a": 1, "b": 2};
        const headers = {
            "Content-Type": "application/json",
            "x-redirect": "manual",
            "Accept": "*/*",
            // "x-body": "json",
        };
        const options: any = {
            method: "POST",
            headers: headers,
            body: data,
            'credentials': 'include',
            withCredentials: true,
        };
        fetch("https://functions.yandexcloud.net/d4eiimn6mlk4iokiparv", options)
        .then(res => console.log(res));
    }
    return (
        <section className={style.menu}>
            <div className={style.menu__container}>
                <button onClick={doStuff}>DO STUFF</button>
                <button className={style.menu__button} onClick={handleSemesterPreparation}>Подготовка семестра</button>
                <button className={style.menu__button} onClick={handleStudentEnrollment}>Зачисление студентов</button>
            </div>
        </section>
    );
}