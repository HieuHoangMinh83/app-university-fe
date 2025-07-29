"use client";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import React, { useRef } from "react";
import logo from "../../../public/image/login.webp"; // with import
import { useEffect, useState } from "react";
import Image from "next/image";
import SwitchTheme from "../switchbtn/switch.btn";
import { useThemeContext } from "@/library/ThemeProvider";
import LocalSwitcher from "../SwitchLangue/switcherLangue";
import { useTranslations } from "next-intl";
function Login() {
  const [phone, setphone] = useState("");
  const [password, setPassword] = useState("");
  const [errUser, setErrUser] = useState("");
  const [errpass, setErrpass] = useState("");
  const router = useRouter();
  const toast = useRef(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const t = useTranslations("LoginPage");

  const showError = (Message: string) => {
    //@ts-ignore
    toast.current.show({
      severity: "error",
      summary: "Error",
      detail: Message,
      life: 3000,
    });
  };

  const handleSubmit = async () => {
    if (!phone || !password) {
      showError("Please complete your phone and password");
      return;
    }

    setLoading(true);

    const res = await signIn("credentials", {
      phone: phone,
      password: password,
      redirect: false,
    });

    setLoading(false);

    if (!res?.error) {
      setphone("");
      setPassword("");
      router.push("/");
    } else {
      if (res?.error) {
        // Loại bỏ prefix "Error: " nếu có
        const errorMessage = res.error.replace(/^Error:\s*/, "");
        showError(errorMessage);
        return;
      }

    }
  };
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (value.length === 0) {
      setErrpass("Password is required");
    } else {
      setErrpass("");
    }
  };

  const handlePasswordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const headertitle = () => {
    return (
      <div>
        <div className=" pl-5 pt-0 h-[160px] sm:pl-3 sm:pl-0 sm:mb-0 sm:h-[240px] sm:pt-6 lg:h-[165px]  lg:pt-3 xl:mb-4 xl:ml-0 xl:h-[180px] 2xl:pt-4 2xl:mb-5 ">
          <h1 className="text-white text-4xl  sm:text-blue-500  font-normal text-start  ml-4  sm:ml-3 sm:text-4xl lg:ml-0 lg:text-3xl 2xl:mb-2">
            Hello,
          </h1>
          <h2 className="text-white text-4xl sm:text-4xl lg:text-3xl sm:text-blue-500 font-black text-start  ml-4 sm:ml-3  sm:mt-2 lg:ml-0 lg:mt-0">
            Wellcome!
          </h2>
          <p className="text-white text-xl sm:text-lg  w-[380px] sm:dark:text-white sm:text-black sm:w-[300px] ml-4 sm:ml-3 mt-3 h-[40px] block sm:mt-5 lg:mt-0 xl:mt-2 lg:ml-0">
            {t("title1")}
            <Link
              href="/auth/register"
              className="font-bold text-blue-600 sm:text-blue-500 pl-1 pr-1"
            >
              {t("title2")}
            </Link>
            {t("title3")}
          </p>
        </div>
      </div>
    );
  };
  const formInput = () => {
    return (
      <div className=" lg:mt-3 xl:mt-8">
        <div className="xl:mt-7 ml-3 w-full  pl-7 pr-14 sm:px-0">
          <label
            htmlFor="Phone"
            className="text-lg sm:text-base font-semibold block mb-1 xl:text-base sm:dark:text-white "
          >
            Phone
          </label>
          <input
            type="text"
            id="Phone"
            placeholder="Enter Email..."
            className="border w-full  px-2 py-1 focus:outline-none focus:ring-0 focus:border-gray-600 rounded-md"
            value={phone}
            autoFocus
            onChange={(e) => {
              if (e.target.value.length !== 0) {
                setErrUser("");
              } else {
                setErrUser("Phone is required");
              }
              setphone(e.target.value);
            }}
          />

          <span className="mb-0 text-red-500 mt-1 block text-sm xl:text-base font-medium">
            {errUser}
          </span>
        </div>
        <div className="sm:mt-4 lg:mt-3 ml-3 w-full xl:mt-[6px] pl-7 pr-14 sm:px-0">
          <label
            htmlFor="password"
            className="text-lg sm:text-base sm:dark:text-white block mb-1 font-semibold xl:text-base"
          >
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              placeholder="Enter your password"
              className={`border w-full px-2 py-1  rounded-md focus:outline-none focus:ring-0 ${errpass ? "border-red-500" : "focus:border-gray-600"
                }`}
              value={password}
              onChange={handlePasswordChange}
              onKeyDown={handlePasswordKeyDown}
            />
            <button className="absolute right-[-40px] top-1/2 -translate-y-1/2 text-[16px] h-[30px] w-[40px] text-center flex items-center justify-center" type="button" onClick={() => setShowPassword((prev) => !prev)}>
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>

          {errpass && (
            <span className="text-red-500 mt-1 block text-sm xl:text-base font-medium">
              {errpass}
            </span>
          )}
        </div>

        <h2 className=" w-[85%]  sm:w-full text-xl sm:text-lg text-end sm:dark:text-white text-black sm:text-gray-500  ml-4 mt-[10px] xl:mt-3 hover:text-blue-500 hover:cursor-pointer ">
          {t("forget")}
        </h2>
      </div>
    );
  };
  const footerLogin = () => {
    return (
      <>
        <button
          className={`block border-none rounded-[50px] mt-6 py-[5px] min-w-[60%] mx-auto text-xl text-white font-semibold transition duration-300
    ${!phone || !password || loading
              ? "bg-gray-400 cursor-not-allowed opacity-70"
              : "bg-gradient-to-r from-blue-400 to-pink-400 hover:opacity-90"
            }`}
          onClick={handleSubmit}
          disabled={!phone || !password || loading}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-5">
              <svg
                className="w-5 h-5 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
              <span>Đang đăng nhập...</span>
            </div>
          ) : (
            "Đăng nhập"
          )}
        </button>



      </>
    );
  };
  const imgright = () => {
    return (
      <>
        <Image src={logo} className="w-[100%] h-full xl:object-cover" alt="" />
      </>
    );
  };
  return (
    <div>
      <div className="fixed top-0 left-0 w-full h-full bg-gradient-to-r opacity-40 dark:opacity-50 from-indigo-500 via-purple-500 to-pink-500 dark:bg-gradient-to-r dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 "></div>
      <div className="flex justify-center items-center h-screen bg-gradient-to-r ">
        <div
          className="card flex justify-content-center"
          style={{ height: "30px !important" }}
        >
          <Toast ref={toast} position="top-right" />
        </div>

        <div className="relative dark:bg-gray-600 bg-gradient-login-main  sm:bg-none overflow-hidden h-[100vh] w-[100vw] px-10 shadow-lg bg-white rounded-md flex justify-center items-center sm:px-0 sm:items-start lg:items-stretch sm:w-[450px] sm:h-[700px]  lg:w-[800px] lg:h-[530px] lg:grid-cols-2 xl:w-[1000px] xl:h-[600px] 2xl:w-[1300px] 2xl:h-[600px]">
          <div className="">
            {headertitle()}
            {formInput()}

            {footerLogin()}
          </div>
          <div className=" ml-10 dark:bg-gray-600 overflow-hidden hidden lg:block w-[50%]">
            {imgright()}
          </div>
          <div className="absolute top-[15px] right-4">
            <SwitchTheme />
          </div>
          <div className="absolute top-[55px] right-4">
            <LocalSwitcher />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
