import { RevealOnScroll } from "../utility/RevealOnScroll";
import { ProjectCard } from "../utility/ProjectCard";
import { getPublicPath } from "../../utils/assetUtils";
import { SectionHeading } from "../utility/SectionHeading";

const projectData = [
  {
    title: "Thang",
    description:
      "Thang is a casual multiplayer shooter where players compete to freeze each other in a fast paced, action-packed environment.",
    skills: [
      "Unreal Engine",
      "C++",
      "Blueprints",
      "AWSGameLift",
      "MongoDB",
      "NextJS",
      "FirebaseAuth",
    ],
    projectLink: "/projects/thang",
    imageUrl: getPublicPath("projects/thangPoster.png"),
  },
  {
    title: "Overdawn",
    description:
      "Overdawn is a 2.5D, bullet time shooter set in a dystopian city of Andrean. As a blood-thirst merc, hunt down your enemies and defy against your destiny. Now—lock in. Slow time and find your flow state. Punch a hole in your enemy's head—because it's you or them.",
    skills: ["Director", "Lead Engineer", "Since 2022", "Unity", "C#", "Steam"],
    projectLink: "/projects/overdawn",
    imageUrl: getPublicPath("projects/overdawnTitle.png"),
  },
  {
    title: "Dawngeon",
    description:
      "Dawngeon was my high school passion project that unexpectedly gained widespread success, inspiring my journey into game development. It’s a roguelike RPG launched on the App Store, with over 140,000 downloads worldwide.",
    skills: ["Solo Dev", "Unity", "C#", "Mobile"],
    projectLink: "/projects/dawngeon",
    imageUrl: getPublicPath("projects/dawngeonTitle.png"),
  },
  {
    title: "Move Move Melon!",
    description:
      "Move, Move, Melon!! is a whimsical 3D on-rails collection game where you play as Melon, a joyful hamster racing through snack-filled venues on her toy ice cream maker, a fast-paced adventure packed with charm, color, and delicious chaos.",
    skills: ["Engineer", "Unity", "C#", "USC AGP", "Mobile"],
    projectLink: "/projects/move-move-melon",
    imageUrl: getPublicPath("projects/mmmTitle.png"),
  },
  {
    title: "Headless Hotel",
    description:
      "Waking up in a hotel of horrors, you have only one job: to escape the hotel alive. Find the key and the exit to escape the ordeal. Made in 7 days for the Brackey's 2024 Game Jam.",
    skills: ["Engineer", "Unity", "C#", "1 Week Game Jam"],
    projectLink: "/projects/headless-hotel",
    imageUrl: getPublicPath("projects/headlessHotelTitle.png"),
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
