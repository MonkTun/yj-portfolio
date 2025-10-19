import { useEffect } from "react";
import { Link } from "react-router-dom"; // Make sure Link is imported

export const NavBar = ({ menuOpen, setMenuOpen }) => {
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
  }, [menuOpen]);

  return (
    <nav className="fixed top-0 w-full z-40 bg-[rgba(10, 10, 10, 0.8)] backdrop-blur-lg border-b border-white/10 shadow-lg">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link
            to="/#home" // Use hash path
            onClick={() => {
              // This closes the mobile menu if you click the logo
              if (menuOpen) setMenuOpen(false);
              // We remove the old onClick scroll logic.
              // The new component will handle this automatically.
            }}
            className="font-mono text-2xl font-bold text-white"
          >
            YJ
          </Link>

          <div
            className="w-7 h-5 relative cursor-pointer z-40 md:hidden"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            &#9776;
          </div>

          {/* --- Desktop Links --- */}
          {/* Change all <a> tags to <Link> tags */}
          <div className="hidden md:flex item-center space-x-8">
            <Link
              to="/#home" // Use hash path
              className="text-gray-300 hover:text-white transition-colors"
            >
              Home
            </Link>
            <Link
              to="/#projects" // Use hash path
              className="text-gray-300 hover:text-white transition-colors"
            >
              Projects
            </Link>
            <Link
              to="/#about" // Use hash path
              className="text-gray-300 hover:text-white transition-colors"
            >
              About
            </Link>
            <Link
              to="/#contact" // Use hash path
              className="text-gray-300 hover:text-white transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};
