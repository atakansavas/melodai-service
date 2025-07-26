"use client";

import { withErrorBoundary } from "@/components/ErrorBoundary";
import { withAuth } from "@/components/withAuth";
import { authManager } from "@/lib/auth";
import { errorHandler } from "@/lib/errorHandler";
import { useEffect, useState } from "react";

function ProtectedPage() {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to error notifications
    const unsubscribe = errorHandler.subscribeToErrors((notification) => {
      if (notification.level === "error" || notification.level === "critical") {
        console.error("Error notification:", notification);
      }
    });

    return unsubscribe;
  }, []);

  const fetchProtectedData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await authManager.authenticatedFetch("/api/example", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: "Example text for vector storage",
          vector: Array(1536).fill(0.1), // Example vector
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError((err as Error).message);
      errorHandler.logError(
        "error",
        "Failed to fetch protected data",
        err as Error
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Protected Page Example
        </h1>

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            This page demonstrates:
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Authentication protection using withAuth HOC</li>
            <li>Error boundary for graceful error handling</li>
            <li>Authenticated API requests</li>
            <li>Error logging and notifications</li>
          </ul>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <button
            onClick={fetchProtectedData}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {loading ? "Loading..." : "Fetch Protected Data"}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {data !== null && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
              <pre className="text-sm overflow-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Apply both HOCs
export default withErrorBoundary(
  withAuth(ProtectedPage, {
    redirectTo: "/login",
    fallback: (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    ),
  }),
  {
    onError: (error, errorInfo) => {
      console.error("Page error:", error, errorInfo);
    },
  }
);
