import React, { useState } from "react";
import { ICredentials } from "../../common/types";
import style from "./LoginForm.module.css";
import { ILoginFormProps } from "./types";

import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';


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
            <h2 className={style.litebox__header}>Вход в аккаунт its.urfu.ru</h2>
            <Box className={style.formGroup} component="form" noValidate>
                <div className={style.formGroup__Item}>
                    <TextField className={style.login__input} value={username} onChange={handleUsernameChange}
                        label="Логин" variant="outlined"  />
                </div>
                <div className={style.formGroup__Item}>
                    <TextField className={style.login__input} value={password} onChange={handlePasswordChange}
                        label="Пароль" type="password" variant="outlined"  />
                </div>
                <Button onClick={handleSubmit} variant="contained" >Войти</Button>
            </Box>
        </div>
    );
}