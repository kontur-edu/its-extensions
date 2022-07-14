import React, { useState } from "react";
import style from "./MainMenu.module.css";
import { IMainMenuProps } from "./types";
import { useNavigate } from "react-router-dom";


export function MainMenu(props: IMainMenuProps) {
    const [url, setUrl] = useState<string>('');
    const navigate = useNavigate();

    const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setUrl(event.target.value);
    }
    const handleSemesterPreparation = () => {
        navigate('/semesterPreparation');
    };
    const handleStudentEnrollment = () => {
        navigate('/studentsAdmission');
    };
    // const doStuff = () => {
    //     const data = {"a": 1, "b": 2};
    //     const headers = {
    //         "Content-Type": "application/json",
    //         "x-redirect": "manual",
    //         "Accept": "*/*",
    //         // "x-body": "json",
    //         "x-url": "https://its.urfu.ru/",
    //     };
    //     const options: any = {
    //         method: "POST",
    //         headers: headers,
    //         body: JSON.stringify(data),
    //         'credentials': 'include',
    //         withCredentials: true,
    //     };
    //     // console.log(options);
    //     fetch(url, options)
    //     .then(res => res.text())
    //     .then(res => console.log(res));
    // }
    return (
        <section className={style.menu}>
            <div className={style.menu__container}>
                {/* <label>URL:
                    <input value={url} onChange={handleUrlChange} type="text" />
                    <button onClick={doStuff}>Send url</button>
                </label> */}
                <button className={style.menu__button} onClick={handleSemesterPreparation}>Подготовка семестра</button>
                <button className={style.menu__button} onClick={handleStudentEnrollment}>Зачисление студентов</button>
            </div>
        </section>
    );
}