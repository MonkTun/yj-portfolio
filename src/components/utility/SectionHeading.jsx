export const SectionHeading = ({ children, className = "" }) => {
  return (
    <h1
      className={`text-5xl font-bold mb-8 bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent text-center ${className}`}
    >
      {children}
    </h1>
  );
};
