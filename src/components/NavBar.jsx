import { useEffect } from "react";

export const NavBar = ({ menuOpen, setMenuOpen }) => {
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
  }, [menuOpen]);
  // update effect everytime when the menuOpen changes

  return (
    <nav className="fixed top-0 w-full z-40 bg-[rgba(10, 10, 10, 0.8)] backdrop-blur-lg border-b border-white/10 shadow-lg">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <a href="#home" className="font-mono  text-2xl font-bold text-white">
            {" "}
            YJ<span className="text-blue-500">.code</span>{" "}
          </a>

          <div
            className="w-7 h-5 relative cursor-pointer z-40 md:hidden"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {" "}
            {/* mobile */}
            &#9776;
          </div>

          <div className="hidden md:flex item-center space-x-8">
            {" "}
            {/* desktop */}
            <a
              href="#home"
              className="text-gray-300 hove:text-white transition-colors"
            >
              {" "}
              Home {""}
            </a>
            <a
              href="#about"
              className="text-gray-300 hove:text-white transition-colors"
            >
              {" "}
              About {""}
            </a>
            <a
              href="#projects"
              className="text-gray-300 hove:text-white transition-colors"
            >
              {" "}
              Projects {""}
            </a>
            <a
              href="#contact"
              className="text-gray-300 hove:text-white transition-colors"
            >
              {" "}
              Contact {""}
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};
