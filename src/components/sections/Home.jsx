import { RevealOnScroll } from "../utility/RevealOnScroll";
import { Button } from "../utility/Button";
import BlurText from "../utility/BlurText";
import PrismaticBurst from "../utility/PrismaticBurst";

export const Home = ({ isLoaded }) => {
  return (
    <section
      id="home"
      className="min-h-screen flex items-center justify-center relative"
    >
      <div className="absolute inset-0 z-0">
        <PrismaticBurst
          intensity={2}
          speed={0.5}
          distort={5.0}
          paused={false}
          offset={{ x: 0, y: 0 }}
          hoverDampness={0.25}
          rayCount={1}
          mixBlendMode="lighten"
          colors={["#e548f0f5", "#155f6a", "#4b7d22ff"]}
        />
      </div>
      <RevealOnScroll>
        <div className="text-center z-10 px-4">
          {isLoaded ? (
            <>
              <BlurText
                text="Hi, I am Youngje Park."
                delay={100}
                animateBy="letters"
                direction="top"
                className="text-7xl md:text-7xl font-bold mb-6 leading-right"
              />

              <p className="text-gray-400 text-lg mb-8 max-w-lg mx-auto">
                A passionate indie game developer majoring in Computer Science
                and Game Design. I create immersive gaming experiences through
                innovative design and engaging gameplay mechanics.
              </p>

              <div className="flex justify-center space-x-4">
                <Button href="#projects" variant="primary">
                  View Projects
                </Button>
                <Button href="#contact" variant="secondary">
                  Contact Me
                </Button>
              </div>
            </>
          ) : (
            <div className="h-[400px]" /> /* Placeholder to maintain layout */
          )}
        </div>
      </RevealOnScroll>
    </section>
  );
};

// in tailwind css, md: applies styles for medium screens and larger (768px and up)
