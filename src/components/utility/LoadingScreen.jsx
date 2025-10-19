import { useEffect, useState } from "react";

export const LoadingScreen = ({ onComplete }) => {
  const [text, setText] = useState("");
  const fullText = "Loading...";

  useEffect(() => {
    let typingTimeout;
    let loadCheckInterval;
    let index = 0;

    // Type out text
    const typingInterval = setInterval(() => {
      setText(fullText.substring(0, index));
      index++;

      if (index > fullText.length) {
        clearInterval(typingInterval);

        // Wait a brief moment after typing completes
        typingTimeout = setTimeout(() => {
          // Check if the page is loaded
          if (document.readyState === "complete") {
            onComplete();
          } else {
            // If not loaded yet, start checking periodically
            loadCheckInterval = setInterval(() => {
              if (document.readyState === "complete") {
                onComplete();
                clearInterval(loadCheckInterval);
              }
            }, 100);
          }
        }, 300);
      }
    }, 50);

    // Cleanup all timers
    return () => {
      clearInterval(typingInterval);
      clearTimeout(typingTimeout);
      if (loadCheckInterval) {
        clearInterval(loadCheckInterval);
      }
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-black text-gray-100 flex flex-col items-center justify-center">
      <div className="mb-4 text-4xl font-mono font-bold">
        {text}
        <span className="animate-blink ml-1"> | </span>
      </div>

      <div className="w-[200px] h-[2px] bg-gray-800 rounded relative overflow-hidden">
        <div className="w-[100%] h-full bg-blue-500 shadow-[0_0_15px_#3b82f6] animate-loading-bar"></div>
      </div>
    </div>
  );
};
