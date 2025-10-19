import { About } from "../components/sections/About";
import { Contact } from "../components/sections/Contact";
import { Home } from "../components/sections/Home";
import { Projects } from "../components/sections/Projects";

const HomePage = ({ isLoaded }) => {
  return (
    <>
      <Home isLoaded={isLoaded} />
      <Projects />
      <About />
      <Contact />
    </>
  );
};

export default HomePage;
