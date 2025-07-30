"use client";
import { useThemeContext } from "@/lib/providers/ThemeProvider";
import { useCallback, useEffect, useRef, useState } from "react";

function SwitchTheme() {
  const { theme, toggleTheme } = useThemeContext();

  const handleClick = useCallback(() => {
    toggleTheme();
    //@ts-ignore
  }, [toggleTheme]);
  return (
    <div className=" dark:border-[#686868] flex items-center dark:text-gray-200">
      <div
        className={`relative flex items-center ml-4  w-14`}
        onClick={handleClick}
      >
        <span
          className={`sun absolute  right-[8px] z-10 dark:hidden block cursor-pointer`}
        >
          <i
            className="pi pi-sun"
            style={{ fontSize: "13px", color: "white" }}
          ></i>
        </span>

        <span
          className={`moon absolute  left-[7px] z-10 dark:block hidden cursor-pointer`}
        >
          <i
            className="pi pi-moon"
            style={{ fontSize: "13px", color: "white" }}
          ></i>
        </span>
        <label
          htmlFor="switch"
          className="inline-flex relative items-center cursor-pointer"
        >
          <div className="relative  w-14 h-6  rounded-full  bg-orange-400 dark:after:translate-x-[145%] dark:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[3px] after:bg-white  after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all  dark:bg-gray-400 "></div>
        </label>
      </div>
    </div>
  );
}

export default SwitchTheme;
