"use client";

import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";

export default function Home() {
  const router = useRouter();

  return <Button onClick={() => router.push("/dashboard")}>Click Me!</Button>;
}
