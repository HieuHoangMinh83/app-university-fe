"use client"; // Error components must be Client Components

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
  }, [error]);

  return (
    <div className="flex justify-center items-center h-[100vh]">
      <div className="">
        <h2>Something went wrong!</h2>
        <div className="flex justify-center mt-5">
          <button
            className="bg-gray-400 p-2 hover:bg-gray-500 rounded-lg"
            onClick={
              // Attempt to recover by trying to re-render the segment
              () => reset()
            }
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
