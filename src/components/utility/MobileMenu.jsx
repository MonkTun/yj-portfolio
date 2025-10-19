import { Link } from "react-router-dom";

export const MobileMenu = ({ menuOpen, setMenuOpen }) => {
  const baseClassName = `text-2xl font-semibold text-white my-4 transform transition-transform duration-300 
    ${menuOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`;

  return (
    <div
      className={`fixed top-0 left-0 w-full bg-black bg-opacity-80 z-40 flex flex-col items-center 
        justify-center transition-all duration-300 ease-in-out
        ${
          menuOpen
            ? "h-screen opacity-100 pointer-events-auto"
            : "h-0 opacity-0 pointer-events-none"
        }`}
    >
      <button
        onClick={() => setMenuOpen(false)}
        className="absolute top-6 right-6 text-white text-3xl focus:outline-none cursor-pointer"
        aria-label="Close Menu"
      >
        &times;
      </button>

      <a
        href="#home"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("home").scrollIntoView();
          setMenuOpen(false);
        }}
        className={baseClassName}
      >
        Home
      </a>
      <a
        href="#about"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("about").scrollIntoView();
          setMenuOpen(false);
        }}
        className={baseClassName}
      >
        About
      </a>
      <a
        href="#projects"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("projects").scrollIntoView();
          setMenuOpen(false);
        }}
        className={baseClassName}
      >
        Projects
      </a>
      <a
        href="#contact"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("contact").scrollIntoView();
          setMenuOpen(false);
        }}
        className={baseClassName}
      >
        Contact
      </a>
    </div>
  );
};
