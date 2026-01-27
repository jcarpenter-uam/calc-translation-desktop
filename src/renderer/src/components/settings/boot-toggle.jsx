import React, { useEffect, useState } from "react";

export default function BootToggle() {
  const [isBootEnabled, setIsBootEnabled] = useState(false);

  useEffect(() => {
    window.electron.getStartOnBoot().then(setIsBootEnabled);
  }, []);

  const handleToggle = () => {
    const newValue = !isBootEnabled;
    setIsBootEnabled(newValue);
    window.electron.setStartOnBoot(newValue);
  };

  return (
    <button
      onClick={handleToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        isBootEnabled ? "bg-green-600" : "bg-red-600"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          isBootEnabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
