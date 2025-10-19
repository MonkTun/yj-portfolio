import { RevealOnScroll } from "../utility/RevealOnScroll";
import { ProjectCard } from "../utility/ProjectCard";
import { getPublicPath } from "../../utils/assetUtils";
import { SectionHeading } from "../utility/SectionHeading";

const projectData = [
  {
    title: "Overdawn",
    description:
      "Overdawn is a video game focused on strategic card battles, where players collect and upgrade cards to defeat opponents in various game modes.",
    skills: ["Unity", "C#", "Photon Networking"],
    projectLink: "/projects/overdawn",
    imageUrl: getPublicPath("projects/overdawnTitle.png"),
  },
  {
    title: "Move Move Melon!",
    description:
      "A roguelike dungeon crawler game built with procedural generation, featuring dynamic combat systems and progressive character development.",
    skills: ["Unity", "C#", "Photon Networking"],
    projectLink: "/projects/move-move-melon",
    imageUrl: getPublicPath("projects/mmmTitle.png"),
  },
  {
    title: "Headless Hotel",
    description:
      "A roguelike dungeon crawler game built with procedural generation, featuring dynamic combat systems and progressive character development.",
    skills: ["Unity", "C#", "Photon Networking"],
    projectLink: "/projects/headless-hotel",
    imageUrl: getPublicPath("projects/headlessHotelTitle.png"),
  },
  {
    title: "Dawngeon",
    description:
      "A roguelike dungeon crawler game built with procedural generation, featuring dynamic combat systems and progressive character development.",
    skills: ["Unity", "C#", "Photon Networking"],
    projectLink: "/projects/dawngeon",
    imageUrl: getPublicPath("projects/dawngeonTitle.png"),
  },
];

export const Projects = () => {
  return (
    <section
      id="projects"
      className="min-h-screen flex items-center justify-center py-20"
    >
      <RevealOnScroll>
        <div className="max-w-5xl mx-auto px-4">
          <SectionHeading>Featured Projects</SectionHeading>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projectData.map((project) => (
              <ProjectCard key={project.title} {...project} />
            ))}
          </div>
        </div>
      </RevealOnScroll>
    </section>
  );
};
