import { Suspense } from "react";
import LoginPage from "@/components/LoginPage";


export const metadata = {
  title: "Sign in — GiftIQ",
};

export default function Page() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
