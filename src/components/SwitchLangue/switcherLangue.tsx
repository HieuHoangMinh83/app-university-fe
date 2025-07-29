"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { ChangeEvent, useTransition } from "react";

export default function LocalSwitcher() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const localActive = useLocale();
  let current = usePathname();
  const onSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = e.target.value;
    let x = current.toString();

    if (e.target.value == "en") {
      console.log(x);
      x = x.replace("vi", "en");
      console.log(x);
    }
    if (e.target.value == "vi") {
      console.log(x);
      x = x.replace("en", "vi");
      console.log(x);
    }
    startTransition(() => {
      router.replace(`${x}`);
    });
  };
  return (
    <div className=" dark:border-[#686868] flex items-center ">

    </div>
  );
}
