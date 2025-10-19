import "./App.css";
import { LoadingScreen } from "./components/utility/LoadingScreen";
import "./index.css";
import { useState } from "react";
import { NavBar } from "./components/utility/NavBar";
import { MobileMenu } from "./components/utility/MobileMenu";
import HomePage from "./pages/HomePage";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NoPage } from "./pages/NoPage";
import { Overdawn } from "./pages/Overdawn";
import { Dawngeon } from "./pages/Dawngeon";
import { HeadlessHotel } from "./pages/HeadlessHotel";
import { MMM } from "./pages/MMM";
import UseScrollToSection from "./components/utility/UseScrollToSection";

function App() {
  const [isloaded, setIsLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <BrowserRouter basename="/yj-portfolio">
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
              <Route path="overdawn" element={<Overdawn />} />
              <Route path="move-move-melon" element={<MMM />} />
              <Route path="dawngeon" element={<Dawngeon />} />
              <Route path="headless-hotel" element={<HeadlessHotel />} />
            </Route>
            <Route path="*" element={<NoPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;

/// when you write menuOpen={menuOpen}, you're passing a prop (property) to a component.
