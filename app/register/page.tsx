import { Suspense } from "react";
import RegisterForm from "../components/RegisterForm";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <RegisterForm />
    </Suspense>
  );
}