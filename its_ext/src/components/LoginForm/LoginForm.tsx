import React, { useState } from "react";
import { ICredentials } from "../../common/types";
import style from "./LoginForm.module.css";
import { ILoginFormProps } from "./types";



export function LoginForm(props: ILoginFormProps) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const handleUsernameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        setUsername(newValue);
    };

    const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        setPassword(newValue);
    };

    const handleSubmit = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        // console.log("NOTE: it is turned off,");
        // return;
        const credentials: ICredentials = {
            username: username,
            password: password,
        };
        props.onSubmit(credentials);
    }


    return (
        <div className={style.litebox}>
            <h2 className={style.litebox__header}>Вход в аккаунт</h2>
            <form className={style.formGroup}>
                <div className={style.formGroup__Item}>
                    <label htmlFor="loginFormUsername">Имя:</label>
                    <input id="loginFormUsername" className={style.login__input} type="text" value={username} onChange={handleUsernameChange}/>
                </div>
                <div className={style.formGroup__Item}>
                    <label htmlFor="loginFormPassword">Пароль:</label> 
                    <input id="loginFormPassword" className={style.login__input} type="password" value={password} onChange={handlePasswordChange}/>
                </div>
                <button onClick={handleSubmit} className={style.litebox__button} >Войти</button>
            </form>
        </div>
    );
}