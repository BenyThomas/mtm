"use client";

import React from "react";

const ErrorComponent = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <h1 className="text-2xl font-bold text-gray-800">
        Something went wrong.
      </h1>
      <p className="text-gray-600 mt-2">
        Please try again later or contact support if the issue persists.
      </p>
    </div>
  );
};

export default ErrorComponent;
