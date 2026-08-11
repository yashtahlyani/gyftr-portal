import React from "react";
import logo from "../../assets/logo.png";

export function GyftrLogo({ fs=18 }) {
  return (
    <img src={logo} alt="GYFTR" style={{ height:Math.round(fs*2), width:"auto", display:"block" }} draggable={false}/>
  );
}
