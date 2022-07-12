import React from "react";
import style from "./Modal.module.css";
import { IModalProps } from "./types";



export function Modal(props: React.PropsWithChildren<IModalProps>) {
    
    return !props.visible ? null : (
        <section className={style.modal}>
           <div className={style.modal__content}>
               {props.children}
            </div>
        </section>
    );
}