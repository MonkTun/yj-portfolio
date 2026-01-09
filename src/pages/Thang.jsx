import { SectionHeading } from "../components/utility/SectionHeading";
import { getPublicPath } from "../utils/assetUtils";
import { DescriptionSection } from "../components/utility/DescriptionSection";
import { Button } from "../components/utility/Button";
import { Link } from "react-router-dom";

export const Thang = () => {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center py-20">
      <img
        src={getPublicPath("projects/ThangHorizontal.png")}
        alt="Thang Poster"
        className="w-full max-w-7xl rounded-3xl shadow-lg my-auto h-auto"
      />

      <DescriptionSection>
        <ul className="list-disc list-inside">
          <li>Project Status: On Going</li>
          <li>Project Type: Overdawn Studio's Commercial Project</li>
          <li>Project Duration: 2 months</li>
          <li>
            Tech Stack: Unreal Engine, NextJS, MongoDB, FirebaseAuth, and AWS
            GameLift
          </li>
          <li>Primary Role: Multiplayer System Engineer</li>
        </ul>
      </DescriptionSection>

      <div className="w-full max-w-7xl px-4 mt-8 flex flex-col items-center">
        <SectionHeading>Thang</SectionHeading>
        <p className="mt-4 text-gray-300 leading-relaxed text-center max-w-4xl">
          Architected a full-stack ecosystem for Thang by integrating a UE5
          client with a RESTful backend (Next.js, Node.js) and NoSQL (MongoDB);
          managed secure identity via Firebase Auth and Vercel deployment.
        </p>

        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Button
            href="https://thang-backend.vercel.app/"
            variant="primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn more
          </Button>
        </div>
      </div>

      <div className="w-full max-w-7xl px-4 mt-8">
        <hr className="my-12 border-t border-gray-700" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-left text-2xl font-bold mb-4">Core Systems</h2>
            <p className="text-gray-300 leading-relaxed">
              Engineered 5+ core systems, including a Server-Side Rewind (SSR)
              algorithm for latency compensation, friends and party system, and
              Matchmaking and dedicated server hosting via AWS GameLift.
            </p>
          </div>
          <div>
            <h2 className="text-left text-2xl font-bold mb-4">Unreal Engine</h2>
            <p className="text-gray-300 leading-relaxed">
              Programmed a complex network of gameplay systems using C++ and
              Blueprints in Unreal Engine, including player movement, shooting
              mechanics, freeze mechanics, and power-ups.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
