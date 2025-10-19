import { SectionHeading } from "../components/utility/SectionHeading";
import { getPublicPath } from "../utils/assetUtils";
import { DescriptionSection } from "../components/utility/DescriptionSection";
import { Button } from "../components/utility/Button";

export const Dawngeon = () => {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center py-20">
      <img
        src={getPublicPath("projects/DawngeonLogo.png")}
        alt="Dawngeon Logo"
        className="w-full max-w-7xl rounded-3xl shadow-lg my-auto h-auto"
      />

      <DescriptionSection>
        <ul className="list-disc list-inside">
          <li>Project Status: Released</li>
          <li>Project Type: Personal</li>
          <li>Project Duration: ~2 years</li>
          <li>Tech Stack: Unity (C#), GitHub, and XCode</li>
          <li>
            Primary Role(s): Solo Developer, Programmer, Arist, Game Designer,
            Narrative Designer, and Sound Designer
          </li>
        </ul>
      </DescriptionSection>

      <div className="w-full max-w-7xl px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Left: video */}
          <div className="w-full">
            <div className="relative" style={{ paddingTop: "56.25%" }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
                src="https://www.youtube.com/embed/10N-DnhTI78"
                title="Dawngeon Trailer"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>

          {/* Right: heading + text */}
          <div className="w-full flex flex-col ">
            <SectionHeading>Dawngeon</SectionHeading>
            <p className="mt-4 text-gray-300 leading-relaxed">
              Dawngeon is pixel rogue-like role playing game (RPG) that I
              originally developed for the Appstore. I wanted to build a fun 2D
              roguelike adventure with emphasis in replayability and
              storytelling that you can play wherever you want, even without
              wifi. This was my first time creating a mobile game, and I learned
              to use XCode, experienced App publishing, and received numerous
              user feedback and support.
            </p>

            <div className="flex justify-center space-x-4 mt-12">
              <div className="mt-6 flex flex-wrap gap-4">
                <Button
                  href="https://discord.com/invite/AXUmWE8ntv"
                  variant="secondary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Discord
                </Button>

                <Button
                  href="https://apps.apple.com/us/app/dawngeon/id1608444995"
                  variant="secondary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  App Store
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full max-w-7xl px-4 mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            <div className="w-full flex flex-col justify-center">
              <h2 className="text-left"> Achievements</h2>
              <ul className="list-disc list-inside mt-4 text-gray-300 leading-relaxed">
                <li>21M impressions on Appstore</li>
                <li>140K+ downloads worldwide</li>
                <li>4.6/5.0 star rating on Appstore</li>
                <li>Charted on AppStore's Adventure Game category</li>
              </ul>
            </div>
            <div className="w-full flex items-center justify-center h-full">
              <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                <iframe
                  className="absolute top-0 left-0 w-full h-full rounded-3xl shadow-lg"
                  src="https://www.youtube.com/embed/25WQUfCgPzE"
                  title="Dawngeon Gameplay"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-7xl px-4 mt-8">
          <hr className="my-12 border-t border-gray-700" />
          <div>
            <h2 className="text-left mt-8">Player Control</h2>
            <p>
              Designed and implemented intuitive touch controls optimized for
              mobile devices. Developed responsive virtual joystick and action
              buttons to ensure smooth and engaging gameplay experience.
            </p>
            <h2 className="text-left mt-8">Weapons and Projectiles</h2>
            <p>
              Developed a variety of weapons and projectile systems that is
              expandable by the skill tree. Each attributes are modfied by the
              player's stats and skills, allowing for diverse combat styles and
              strategies.
            </p>
            <h2 className="text-left mt-8">Enemy AI</h2>
            <p>
              Developed advanced enemy AI behaviors, including pathfinding,
              decision-making, and combat tactics. Implemented state machines to
              manage different enemy states, such as patrolling, chasing, and
              attacking players. Fine-tuned AI parameters for balanced gameplay
              and challenging encounters.
            </p>
            <h2 className="text-left mt-8">Procedural Generation</h2>
            <p>
              Implemented random dungeon generation algorithm that creates
              unique and diverse levels for each playthrough. Designed modular
              room layouts, enemy placements, and item distributions to enhance
              replayability and player engagement.
            </p>
            <h2 className="text-left mt-8">Roguelike Design</h2>
            <p>
              Crafted engaging and challenging level designs that align with the
              game's roguelike mechanics. Balanced enemy encounters, item
              placements, and environmental hazards to create a rewarding
              gameplay experience.
            </p>
            <h2 className="text-left mt-8">Save System</h2>
            <p>
              Implemented a robust save system that allows players to save their
              progress at any point during gameplay.
            </p>
            <h2 className="text-left mt-8">Narrative System</h2>
            <p>
              Built a custom narrative system to deliver immersive storytelling
              experiences.
            </p>
            <h2 className="text-left mt-8">Inventory System and Crafting</h2>
            <p>
              Developed a comprehensive inventory system that allows players to
              manage their items, equipment, and resources effectively.
              Implemented crafting mechanics that enable players to create and
              upgrade items using gathered materials.
            </p>
            <h2 className="text-left mt-8">Cooking system</h2>
            <p>
              Developed a simple but effective cooking system that allows
              players to combine ingredients found in the dungeon to create
              meals that provide various buffs and benefits. Designed an
              intuitive UI for selecting recipes and managing ingredients,
              enhancing the overall gameplay experience.
            </p>
            <h2 className="text-left mt-8">Publishing and Marketing</h2>
            <p>
              With 0 prior experience and 0 budget, I successfully published
              Dawngeon on AppStore, receiving over 140K downloads, and marketed
              the game through social media platforms and gaming communities.
              Created promotional materials, including trailers and screenshots,
              to attract potential players and generate interest in the game.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
