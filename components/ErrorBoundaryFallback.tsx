'use client';

import React from 'react';
import { errorHandler } from '@/lib/errorHandler';

export function createErrorBoundaryFallback(error: Error): React.ReactElement {
  errorHandler.logError('critical', 'React Error Boundary triggered', error);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
        <p className="text-gray-700 mb-4">
          We&apos;re sorry, but something unexpected happened. Please try refreshing the page.
        </p>
        <details className="mb-4">
          <summary className="cursor-pointer text-sm text-gray-500">Error details</summary>
          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
            {error.message}
          </pre>
        </details>
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}