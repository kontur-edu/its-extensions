import React, {useContext, useState} from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
// import {Authenticate} from '../../utils/api';
import { LoginForm } from '../LoginForm';
import { ICredentials } from '../../common/types';
import { IMainProps } from './types';
import { MupsList } from '../MupsList';
import { Modal } from '../Modal';
import { MainMenu } from '../MainMenu/MainMenu';
import style from "./Main.module.css";
import { SemesterPreparation } from '../SemesterPreparation/Base';
import { StudentsAdmission } from "../StudentsAdmission/Base";
import {ITSContext} from "../../common/Context";

export function Main(props: IMainProps) {
    const [needAuthentication, setNeedAuthentication] = useState(false);
    const navigate = useNavigate();
    const context = useContext(ITSContext);

    const handleLogin = async (credentials: ICredentials) => {
        if (!credentials.username || !credentials.password) {
            return;
        }
        const success = await context?.requestService.Authenticate(credentials);
        if (success) {
            setNeedAuthentication(false);
        }
    };

    const handleUnauthorized = () => {
        if (!needAuthentication) {
            setNeedAuthentication(true);
        }
    };

    const handleHeaderClick = () => {
        navigate('/')
    }

    return (
        <div>
            <h1 className={style.header} onClick={handleHeaderClick}>
                Индивидуальная траектория студента
            </h1>
            <Routes>
                {/* <Route path="/editor" element={<Editor />}/>
                <Route path="/educationalSpaces" element={<EducationalSpacesList />}/>
                <Route path="/selectionGroups" element={<SelectionGroupsList />}/>
                <Route path="/competitiveGroups" element={<CompetitiveGroupsList />}/> */}
                <Route path="/" element={<MainMenu />} />
                <Route path="/semesterPreparation" element={
                    <React.Fragment>
                        <Modal visible={needAuthentication}>
                            <LoginForm onSubmit={handleLogin}/>
                        </Modal>
                        <SemesterPreparation isUnauthorized={needAuthentication} onUnauthorized={handleUnauthorized} />
                        {/* <MupsList isUnauthorized={needAuthentication} onUnauthorized={handleUnauthorized} /> */}
                    </React.Fragment>
                }/>

                <Route path="/studentsAdmission" element={
                    <React.Fragment>
                        <Modal visible={needAuthentication}>
                            <LoginForm onSubmit={handleLogin}/>
                        </Modal>
                        <StudentsAdmission isUnauthorized={needAuthentication} onUnauthorized={handleUnauthorized} />
                        {/* <MupsList isUnauthorized={needAuthentication} onUnauthorized={handleUnauthorized} /> */}
                    </React.Fragment>
                }/>
                {/* <Route path="/students" element={<StudentsList />}/> */}
            </Routes>
        </div>
    );
}
