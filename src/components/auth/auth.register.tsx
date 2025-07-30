"use client";
import axios, { AxiosResponse } from "axios";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Toast } from "primereact/toast";
import logo from "../../../public/image/register.webp";
import { useRef } from "react";
import Image from "next/image";
import SwitchTheme from "../switchbtn/switch.btn";
import { useThemeContext } from "@/lib/providers/ThemeProvider";
import { useTranslations } from "next-intl";
import LocalSwitcher from "../SwitchLangue/switcherLangue";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Zod schema for form validation


export const registerSchema = z.object({
  phone: z
    .string()
    .min(1, "Vui lòng nhập số điện thoại")
    .regex(/^(0|\+84)[3-9][0-9]{8}$/, "Số điện thoại không hợp lệ"),

  name: z
    .string()
    .min(1, "Vui lòng nhập tên hiển thị")
    .max(50, "Tên không được vượt quá 50 ký tự"),

  password: z
    .string()
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
    .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất 1 chữ in hoa")
    .regex(/[a-z]/, "Mật khẩu phải chứa ít nhất 1 chữ thường")
    .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất 1 chữ số")
    .regex(/[^A-Za-z0-9]/, "Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt"),

  position: z
    .enum(["telesale", "manager", "offline"] as const)
    .or(z.literal("")) // cho phép giá trị "" ban đầu
    .refine((val) => val !== "", {
      message: "Vui lòng chọn chức vụ",
    }),
});



type RegisterFormData = z.infer<typeof registerSchema>;

async function fetchData(url: string, body: any) {
  try {
    const response: AxiosResponse = await axios.post(url, body);
    return response.data;
  } catch (error: any) {
    return {
      statusCode: error?.response?.data?.statusCode ?? 400,
      error: error?.response?.data?.error ?? "error",
      message: error?.response?.data?.message ?? "message",
    };
  }
}

function Register() {
  const router = useRouter();
  const toast = useRef(null);
  const t = useTranslations("RegisterPage");
  const positions = [
    { value: '', label: 'Chọn chức vụ' },
    { value: 'telesale', label: 'Telesale' },
    { value: 'manager', label: 'Manager' },
    { value: 'offline', label: 'Offline' },
  ];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    setValue,
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onChange", // để cập nhật isValid theo từng thay đổi
    defaultValues: {
      phone: "",
      name: "",
      password: "",
      position: "",
    },
  });

  const watchAllFields = watch();
  const isDisabled =
    !isValid || isSubmitting ||           // valid form và chưa gửi
    !watchAllFields.phone?.trim() ||
    !watchAllFields.name?.trim() ||
    !watchAllFields.password?.trim() ||
    !watchAllFields.position?.trim();


  const showError = (Message: string) => {
    //@ts-ignore
    toast.current.show({
      severity: "error",
      summary: "Error",
      detail: Message,
      life: 300000,
    });
  };

  const onSubmit = async (data: RegisterFormData) => {
    const response = await fetchData(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/register`,
      {
        phone: data.phone,
        name: data.name,
        password: data.password,
        role: data.position,
      }
    );

    if (response.error) {
      showError(response.message);
      return;
    } else {



      setValue("phone", "");
      setValue("name", "");
      setValue("password", "");
      setValue("position", "");

    }
  };

  const headertitle = () => {
    return (
      <div
        className=" mt-3  pl-6 
        sm:pl-0 sm:mb-0 h-[130px] sm:h-[200px] sm:pt-10 
        md:pt-6  lg:h-[90px]  lg:pt-0 
        xl:mb-4 xl:h-[120px]  2xl:pt-1 2xl:mb-5 2xl:pl-0"
      >
        <h1 className="text-white text-4xl sm:text-4xl lg:text-3xl sm:text-blue-500 font-normal text-start  ml-5 sm:ml-4 2xl:mb-2">
          Hello,
        </h1>
        <h2 className="text-white text-4xl sm:text-4xl lg:text-3xl sm:text-blue-500 font-black text-start  ml-5 sm:ml-4 sm:mt-4 lg:mt-0">
          Wellcome!
        </h2>
        <p
          className="text-white text-xl w-[380px]  ml-5 mt-3 h-[40px] block sm:ml-4  sm:mt-5 sm:text-base sm:text-black sm:dark:text-white
          sm:w-[300px] lg:mt-0 xl:mt-2"
        >
          {t("title1")}
          <Link
            href="login"
            className="font-bold text-blue-600 sm:text-blue-500"
          >
            {t("title2")}
          </Link>{" "}
        </p>
      </div>
    );
  };

  const formInput = () => {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="lg:mt-3 xl:mt-0">
        <div className="mt-7 ml-3 w-full xl:mt-0 pl-0 pr-14 sm:px-0">
          <label
            htmlFor="phone"
            className="text-xl text-white sm:text-black sm:dark:text-white sm:text-base font-semibold block mb-1 xl:text-base"
          >
            Số điện thoại
          </label>
          <input
            type="text"
            id="phone"
            placeholder="Enter Phone..."
            className="border w-full px-2 py-1 focus:outline-none focus:ring-0 focus:border-gray-600 rounded-md"
            autoFocus
            {...register("phone", { required: "Vui lòng nhập số điện thoại" })}
          />
          {errors.phone?.message && (
            <span className="text-black font-semibold text-lg sm:text-base sm:text-red-500 mt-[2px] md:text-base lg:text-[14px] xl:mt-1 xl:mb-0 block pb-0">
              {errors.phone.message}
            </span>
          )}
        </div>

        <div className="mt-2 ml-3 text-base w-full xl:mt-0 pl-7 pr-14 sm:px-0">
          <label
            htmlFor="name"
            className={`text-xl block mb-1 font-semibold text-white mt-2 sm:text-black sm:dark:text-white sm:text-base md:mt-4  xl:text-base ${errors.phone?.message ? "xl:mt-0" : "xl:mt-2"}`}
          >
            Tên hiển thị
          </label>
          <input
            type="text"
            id="name"
            placeholder="Enter Name display..."
            className="border w-full px-2 py-1 focus:outline-none focus:ring-0 focus:border-gray-600 rounded-md"
            {...register("name", { required: "Vui lòng nhập tên hiển thị" })}
          />
          {errors.name?.message && (
            <span className="text-black font-semibold text-lg sm:text-base sm:text-red-500 mt-[2px] md:text-base lg:text-[14px] xl:mt-1 xl:mb-0 block pb-0">
              {errors.name.message}
            </span>
          )}
        </div>

        <div className="mt-2 ml-3 text-base w-full xl:mt-0 pl-7 pr-14 sm:px-0">
          <label
            htmlFor="password"
            className={`text-xl block mb-1 font-semibold text-white mt-2 sm:text-black sm:dark:text-white sm:text-base md:mt-4  xl:text-base ${errors.name?.message ? "xl:mt-0" : "xl:mt-2"}`}
          >
            Mật khẩu
          </label>
          <input
            type="password"
            id="password"
            placeholder="Enter Password..."
            className="border w-full px-2 py-1 focus:outline-none focus:ring-0 focus:border-gray-600 rounded-md"
            {...register("password", { required: "Vui lòng nhập mật khẩu" })}
          />
          {errors.password?.message && (
            <span className="text-black font-semibold text-lg sm:text-base sm:text-red-500 mt-[2px] md:text-base lg:text-[14px] xl:mt-1 xl:mb-1 block">
              {errors.password.message}
            </span>
          )}
        </div>

        {/* Chức vụ */}
        <div className="mt-2 ml-3 text-base w-full xl:mt-0 pl-7 pr-14 sm:px-0">
          <label
            htmlFor="position"
            className={`text-xl block mb-1 font-semibold text-white mt-2 sm:text-black sm:dark:text-white sm:text-base md:mt-4  xl:text-base ${errors.password?.message ? "xl:mt-0" : "xl:mt-2"}`}

          >
            Chức vụ
          </label>
          <select
            id="position"
            className="border w-full px-2 py-1 focus:outline-none focus:ring-0 focus:border-gray-600 rounded-md"
            {...register("position", { required: "Vui lòng chọn chức vụ" })}
          >
            {positions.map((pos) => (
              <option key={pos.value} value={pos.value}>
                {pos.label}
              </option>
            ))}
          </select>
          {errors.position?.message && (
            <span className="text-black font-semibold text-lg sm:text-base sm:text-red-500 mt-[2px] md:text-base lg:text-[14px] xl:mt-1 xl:mb-2 block">
              {errors.position.message}
            </span>
          )}
        </div>

        {/* Nút Register */}
        <button
          type="submit"
          disabled={isDisabled}
          className={`block border-none rounded-[50px] py-2 text-2xl sm:text-xl w-[60%] mx-auto text-white font-semibold mt-8 sm:mt-10 lg:text-lg lg:py-[3px] lg:mt-8 xl:mt-9 2xl:mt-9 xl:py-[5px]
    ${isDisabled
              ? "bg-gray-400 cursor-not-allowed opacity-70"
              : "bg-gradient-to-r from-blue-400 to-pink-400 hover:opacity-100 transition duration-300"
            }`}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center gap-2">
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
              <span>Đang gửi...</span>
            </div>
          ) : (
            "Đăng ký"
          )}
        </button>



      </form>
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
      <div className="fixed top-0 left-0 right-0 bottom-0 opacity-40 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:bg-gradient-to-r dark:from-gray-800 dark:via-gray-800 dark:to-gray-800"></div>
      <div className="flex justify-center items-center h-screen ">
        <div
          className="card flex justify-content-center"
          style={{ height: "30px !important" }}
        >
          <Toast ref={toast} position="bottom-right" />
        </div>
        <div className="relative dark:bg-gray-600 bg-gradient-login-main sm:bg-none h-[100vh] w-[100vw] overflow-hidden pb-10 md:pb-0 shadow-lg bg-white rounded-md flex justify-center items-center sm:items-start lg:items-stretch sm:w-[450px] sm:h-[700px] lg:w-[800px] lg:h-[530px] lg:grid-cols-2 xl:w-[1000px] xl:h-[600px] 2xl:w-[1300px] 2xl:h-[600px]">
          <div className="">
            {headertitle()}
            {formInput()}
          </div>
          <div className="ml-10 bg-white dark:bg-gray-600 overflow-hidden hidden lg:block w-[50%]">
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

export default Register;
