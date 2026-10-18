"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { formatApiError } from "@/lib/api";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Lỗi giao diện:", formatApiError(error));
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center px-6">
      <h1 className="text-3xl font-bold">Đã có lỗi xảy ra</h1>
      <p className="mt-3 text-muted-foreground">{formatApiError(error)}</p>
      <Button className="mt-6" onClick={reset}>
        Thử lại
      </Button>
    </main>
  );
}
