import React from "react";

/**
 * DescriptionSection - reusable section with styled background similar to About section.
 * Centers the parent div, but text is left-aligned.
 * Usage: <DescriptionSection>Text or JSX here</DescriptionSection>
 */
export const DescriptionSection = ({ children, className = "" }) => (
  <div
    className={`w-full max-w-7xl mx-auto px-4 flex justify-center mt-8 mb-8 rounded-xl  border p-8 border-white/10 bg-white/5 hover:-translate-y-1 transition-all ${className}`}
  >
    {" "}
    {/* parent centered */}
    <div className={`w-full max-w-2xl`}>
      {" "}
      {/* styled box */}
      <div className="text-left text-gray-300 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  </div>
);

export default DescriptionSection;
