import React, { useContext, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { LoginForm } from "../LoginForm";
import { ICredentials } from "../../common/types";
import { IMainProps } from "./types";
import { Modal } from "../Modal";
import { MainMenu } from "../MainMenu/MainMenu";
import style from "./Main.module.css";
import { SemesterPreparation } from "../SemesterPreparation/Base";
import { StudentsAdmission } from "../StudentsAdmission/Base";
import { ITSContext } from "../../common/Context";
import Button from "@mui/material/Button";

export function Main(props: IMainProps) {
  const [needAuthentication, setNeedAuthentication] = useState(false);
  const [connectionRefused, setConnectionRefused] = useState(false);
  const context = useContext(ITSContext);
  const [currentLogin, setCurrentLogin] = useState<string>("");

  const handleLogin = async (credentials: ICredentials) => {
    if (!credentials.username || !credentials.password) {
      return;
    }
    const success = await context?.requestService.Authenticate(credentials);
    if (success) {
      setCurrentLogin(credentials.username);
      setNeedAuthentication(false);
    } else {
      setCurrentLogin("");
    }
  };

  const handleUnauthorized = () => {
    if (!needAuthentication) {
      setNeedAuthentication(true);
    }
  };

  const handleConnectoinRefused = () => {
    if (!connectionRefused) {
      setConnectionRefused(true);
    }
  };
  const handleIgnoreConnectionRefused = () => {
    if (connectionRefused) {
      setConnectionRefused(false);
    }
  };

  context?.requestService.setOnConnectionRefused(handleConnectoinRefused);

  return (
    <div>
      <Routes>
        <Route path="/" element={<MainMenu login={currentLogin} />} />

        <Route
          path="/semesterPreparation"
          element={
            <React.Fragment>
              <Modal visible={needAuthentication}>
                <LoginForm onSubmit={handleLogin} />
              </Modal>
              <SemesterPreparation
                isUnauthorized={needAuthentication}
                onUnauthorized={handleUnauthorized}
              />
            </React.Fragment>
          }
        />

        <Route
          path="/studentsAdmission"
          element={
            <React.Fragment>
              <Modal visible={needAuthentication}>
                <LoginForm onSubmit={handleLogin} />
              </Modal>
              <StudentsAdmission
                isUnauthorized={needAuthentication}
                onUnauthorized={handleUnauthorized}
              />
            </React.Fragment>
          }
        />
      </Routes>

      <Modal visible={connectionRefused}>
        <div className="litebox">
          <h2
            className={
              "litebox__header warning " + style.connectionRefused__header
            }
          >
            Не получилось установить соединение, проверьте доступность Proxy
          </h2>
          <Button
            onClick={handleIgnoreConnectionRefused}
            variant="contained"
            style={{ fontSize: "1em" }}
          >
            Закрать
          </Button>
        </div>
      </Modal>
    </div>
  );
}
