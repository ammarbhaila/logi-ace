import HowItWorks from "@/app/components/how-it-works";
import { requireAuth } from "@/lib/requireAuth";

export default async function HowItWorksPage() {
  await requireAuth();
  return <HowItWorks />;
}