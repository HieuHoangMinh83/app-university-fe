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
      x = x.replace("vi", "en");
    }
    if (e.target.value == "vi") {
      x = x.replace("en", "vi");
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
