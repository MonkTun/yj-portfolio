import "./App.css";
import { LoadingScreen } from "./components/utility/LoadingScreen";
import "./index.css";
import { useState } from "react";
import { NavBar } from "./components/utility/NavBar";
import { MobileMenu } from "./components/utility/MobileMenu";
import HomePage from "./pages/HomePage";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NoPage } from "./pages/NoPage";
import { Thang } from "./pages/Thang";
import { Overdawn } from "./pages/Overdawn";
import { Dawngeon } from "./pages/Dawngeon";
import { HeadlessHotel } from "./pages/HeadlessHotel";
import { MMM } from "./pages/MMM";
import { Resume } from "./pages/Resume";
import UseScrollToSection from "./components/utility/UseScrollToSection";

function App() {
  const [isloaded, setIsLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <BrowserRouter>
      <UseScrollToSection />
      <div className="relative">
        <div
          className={`fixed inset-0 z-50 transition-opacity duration-700 pointer-events-none ${
            !isloaded ? "opacity-100" : "opacity-0"
          }`}
        >
          <LoadingScreen onComplete={() => setIsLoaded(true)} />
        </div>
        <div
          className={`min-h-screen transition-opacity duration-700 ${
            isloaded ? "opacity-100" : "opacity-0"
          } bg-black text-gray-100`}
        >
          <NavBar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
          <MobileMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
          <Routes>
            <Route path="/" element={<HomePage isLoaded={isloaded} />} />
            <Route path="/home" element={<HomePage isLoaded={isloaded} />} />
            <Route path="/projects">
              <Route path="thang" element={<Thang />} />
              <Route path="overdawn" element={<Overdawn />} />
              <Route path="move-move-melon" element={<MMM />} />
              <Route path="dawngeon" element={<Dawngeon />} />
              <Route path="headless-hotel" element={<HeadlessHotel />} />
            </Route>
            <Route path="/resume" element={<Resume />} />
            <Route path="*" element={<NoPage />} />
          </Routes>
          <footer className="py-6 text-center text-gray-500 text-sm">
            &copy; 2026 by Youngje Park
          </footer>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;

/// when you write menuOpen={menuOpen}, you're passing a prop (property) to a component.
