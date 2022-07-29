import React, { useContext, useEffect, useState } from "react";
import { ITSContext } from "../../common/Context";
import style from "./StudentInfo.module.css";
import { IStudentInfoProps } from "./types";


export function StudentInfo(props: IStudentInfoProps) {
  const [data, setData] = useState<string>("");

  const context = useContext(ITSContext)!;

  useEffect(() => {
    alert("StudentInfo");
  }, []);

  const handleClick = () => {

    const url = "https://istudent.urfu.ru/s/http-urfu-ru-ru-students-study-brs/";
    const urlWithProxy = `${context.requestService.proxyUrl}/${url}`;
    const headers = {
      "x-url": url,
    };

    const options: any = {
      method: "GET",
      credentials: "include",
      headers: headers,
    };

    context.requestService.SendRequest(urlWithProxy, options).then((res) => {
      console.log("res");
      console.log(res);

      if (!res.data) {
        props.onUnauthorized();
      }

      setData(res.data);
    });
  }


  return (
    <section className={style.modal}>
      <button onClick={handleClick}>RequestData</button>
      {data}
    </section>
  );
}
