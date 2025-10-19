import { SectionHeading } from "../components/utility/SectionHeading";
import { getPublicPath } from "../utils/assetUtils";
import { DescriptionSection } from "../components/utility/DescriptionSection";
import { Button } from "../components/utility/Button";

export const HeadlessHotel = () => {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center py-20">
      <img
        src={getPublicPath("projects/headlessHotelTitle.png")}
        alt="HH Title"
        className="w-full max-w-7xl rounded-3xl shadow-lg my-auto h-auto"
      />

      <DescriptionSection>
        <ul className="list-disc list-inside">
          <li>Project Status: Released</li>
          <li>Project Type: Game Jam</li>
          <li>Project Duration: 1 week</li>
          <li>Tech Stack: Unity (C#) and Github</li>
          <li>Primary Role: Enginee and Artist</li>
        </ul>
      </DescriptionSection>

      <div className="w-full max-w-7xl px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <img
            src={getPublicPath("projects/HHscreenshot.png")}
            alt="Headless Hotel game screenshot"
            className="w-auto object-contain rounded-3xl shadow-lg mt-8 mb-8"
          />

          {/* Right: heading + text */}
          <div className="w-full flex flex-col ">
            <SectionHeading>Headless Hotel</SectionHeading>
            <p className="mt-4 text-gray-300 leading-relaxed">
              Waking up in a hotel of horrors, you have only one job: to escape
              the hotel alive. Find the key and the exit to escape the ordeal.
              Made in 7 days for the Brackey's 2024 Game Jam.
            </p>

            <div className="flex justify-center space-x-4 mt-12">
              <div className="mt-6 flex flex-wrap gap-4">
                <Button
                  href="https://henry-hamster.itch.io/headless-hotel"
                  variant="secondary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Itch.io
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-7xl px-4 mt-8">
        <hr className="my-12 border-t border-gray-700" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mt-8">
          <div>
            <h2 className="text-left mt-8">Items & Inventory</h2>
            <p>
              Built an item and inventory system that allows players to collect,
              store, and use various items found throughout the game.
              Implemented item interactions, including picking up, dropping, and
              using items to solve puzzles and progress through the game.
            </p>
          </div>
          <img
            src={getPublicPath("projects/HHInventorySystem.png")}
            alt="inventory"
            className="w-auto object-contain rounded-3xl shadow-lg"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mt-8">
          <div>
            <h2 className="text-left mt-8">Crafting System</h2>
            <p>
              Developed a crafting system that allows players to combine items
              to create new, more powerful items. This system encourages
              exploration and experimentation, as players discover new recipes
              and crafting techniques throughout the game.
            </p>
          </div>
          <img
            src={getPublicPath("projects/HHCraftingSystem.png")}
            alt="crafting"
            className="w-auto object-contain rounded-3xl shadow-lg"
          />
        </div>
        <div>
          <h2 className="text-left mt-8">UI and Scene Management</h2>
          <p>
            Programmed a UI management system that handles all user interface
            elements. Created main menu and scene navigation systems to allow
            smooth transitions between different game states and scenes.
          </p>
          <h2 className="text-left mt-8">UI Manager & Joystick</h2>
          <p>
            Programmed a UI management system that is cohesive to
            persistentSingleton design pattern. This system manages all UI
            elements, including menus, HUDs, and pop-ups, ensuring smooth
            transitions and interactions. Created dynamic joystick controls for
            mobile platforms, providing players with intuitive and responsive
            input methods.
          </p>
          <h2 className="text-left mt-8">Post processing</h2>
          <p>
            utilized Unity's Post-Processing Stack to enhance the visual quality
            of the game. Implemented various effects such as bloom, color
            grading, and ambient occlusion to create a more immersive and
            atmospheric experience.
          </p>
          <h2 className="text-left mt-8">Player</h2>
          <p>
            Designed and animated player character with smooth movement and
            interaction mechanics. Implemented player controls and physics to
            ensure responsive and engaging gameplay experience.
          </p>
        </div>
      </div>
    </section>
  );
};
