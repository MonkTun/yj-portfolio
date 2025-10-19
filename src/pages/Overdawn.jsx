import { SectionHeading } from "../components/utility/SectionHeading";
import { getPublicPath } from "../utils/assetUtils";
import { Button } from "../components/utility/Button";
import { DescriptionSection } from "../components/utility/DescriptionSection";

export const Overdawn = () => {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center py-20">
      <img
        src={getPublicPath("projects/overdawnWide.png")}
        alt="Overdawn Screenshot"
        className="w-full max-w-7xl rounded-3xl shadow-lg my-auto h-auto"
      />

      <DescriptionSection>
        <ul className="list-disc list-inside">
          <li>Project Status: On going</li>
          <li>Project Type: Commercial</li>
          <li>Project Duration: ~3 years</li>
          <li>
            Tech Stack: Unity (C#), SteamAPI, GitHub, Odin Inspector, Yarn
            Spinner
          </li>
          <li>
            Primary Role(s): Game Director, Lead Engineer, Design, and Artist{" "}
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
                src="https://www.youtube.com/embed/E7KgVHyf0ak"
                title="Overdawn Trailer"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>

          {/* Right: heading + text */}
          <div className="w-full flex flex-col ">
            <SectionHeading>Overdawn</SectionHeading>
            <p className="mt-4 text-gray-300 leading-relaxed">
              Overdawn is a narrative-driven game that explores themes of memory
              and consequence. This trailer showcases the world, characters, and
              a glimpse of core mechanics. For more details, check the project
              page or the walkthrough below.
            </p>

            <div className="flex justify-center space-x-4 mt-12">
              <div className="mt-6 flex flex-wrap gap-4">
                <Button
                  href="https://linktr.ee/overdawn"
                  variant="secondary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Linktree
                </Button>

                <Button
                  href="https://store.steampowered.com/app/3519070/Overdawn/"
                  variant="secondary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Steam Store
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-7xl px-4 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          <div className="w-full flex flex-col justify-center">
            <h2 className="text-left"> Awards & Recognition</h2>
            <ul className="list-disc list-inside mt-4 text-gray-300 leading-relaxed">
              <li>
                <a
                  href="https://thegdwc.com/games/b665386f-fdca-4ca3-aa1c-a46ac55c31b4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  2025 Game Development World Championship - Best Student Game
                  Finalist
                </a>
              </li>
              <li>
                <a
                  href="https://sageawards.promote.fyi/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  2025 SAGE - Design Runner Up
                </a>
              </li>
              <li>
                <a
                  href="https://www.uscgamesexpo.com/game-2025"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  Featured in USC Games Expo
                </a>
              </li>
            </ul>
          </div>
          <div className="w-full flex items-center justify-center h-full">
            <img
              src={getPublicPath("projects/gdwcBadge.png")}
              alt="Overdawn badge"
              className="w-auto max-h-60 object-contain rounded-3xl shadow-lg"
            />
          </div>
        </div>
      </div>

      <div className="w-full max-w-7xl px-4 mt-8">
        <hr className="my-12 border-t border-gray-700" />
        <h2 className="text-left">Founding a Team</h2>
        <p>
          After releasing Dawngeon in my highschool years, I started on Overdawn
          as a solo project. The project had years of iteration from a pvp game
          to finally landing on a bullet-hell bullet-time shooter. Then, I
          became a college student. I brought the game to USC and started
          assembling a team of talented individuals who shared my vision.
          Recruiting wasn't all that easy, but I managed to find passionate team
          members through game development clubs and networking events. The team
          grew to team of over 20 members, including programmers, artists,
          designers, and writers. As a now director and lead engineer of
          Overdawn, I am forever grateful for the dedication and hard work of my
          team members who have helped bring this project to life.
        </p>
      </div>

      <div className="w-full max-w-7xl px-4 mt-8">
        <hr className="my-12 border-t border-gray-700" />
        <h1 className="text-left">System Engineering</h1>
        <h2 className="text-left">Game Architecture</h2>
        <p>
          Designed and implemented a modular and scalable game architecture
          using Unity and C#. This architecture facilitated efficient
          development and reliable integration of various game systems,
          including player controls, level management, and quest systems.
        </p>
        <img
          src={getPublicPath("projects/ODArchitectureSimplified.png")}
          alt="Overdawn game architecture"
          className="w-auto object-contain rounded-3xl shadow-lg mt-8 mb-8"
        />
        <ul className="list-disc list-inside mt-4 text-gray-300 leading-relaxed">
          <li>
            Managing Scenes: Utilize a centralized SceneManager to handle scene
            transitions, loading, and unloading. To ensure smooth navigation
            between different game areas, implemented asynchronous loading and
            unloading of scenes. PersisentGameplay was introduced to allow
            players and other gamesystems to persist across scene changes.
          </li>
          <li>
            Game State Management: Developed a singleton instance of GameManager
            to oversee various game states such as Main Menu, In-Game, Paused,
            and Game Over. This manager handled state transitions and ensured
            that the game responded appropriately to player inputs and events.
          </li>
          <li>
            Event-Driven Communication: Implemented an event system to
            facilitate communication between different gameObjects. This
            decoupled various systems, allowing for easier maintenance and
            scalability. This system became the backbone for our sequence
            system.
          </li>
          <li>
            Data Persistence: Designed a save/load system to manage player
            progress and game data. This system ensured that player choices and
            achievements were retained across gaming sessions.
          </li>
        </ul>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mt-8">
          <img
            src={getPublicPath("projects/ODConsole.png")}
            alt="Overdawn game console"
            className="w-auto object-contain rounded-3xl shadow-lg"
          />
          <div className="w-full flex flex-col justify-center leading-relaxed">
            <h2 className="text-center">Debug Tools</h2>
            <p>
              Developed an in-game debug console to facilitate testing and
              debugging during development. This console allowed developers to
              execute commands, inspect variables, and modify game states in
              real-time, significantly improving the debugging process.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-center mt-8">
          <div className="w-full flex flex-col justify-center leading-relaxed">
            <h2 className="text-center">Design Tools</h2>
            <p>
              Built custom Unity Editor tools to streamline level design and
              asset management for designers. These tools were built using Odin
              Inspector. Custom Painter allowed designers to paint terrain and
              place objects for our 2.5D levels with ease. Scene Switcher and
              Scene Behavior tools provided an intuitive interface for managing
              scene transitions and behaviors.
            </p>
          </div>
          <img
            src={getPublicPath("projects/ODPainter.png")}
            alt="Overdawn game console"
            className="w-auto object-contain rounded-3xl shadow-lg"
          />
          <img
            src={getPublicPath("projects/ODSceneSwitcher.png")}
            alt="Overdawn game console"
            className="w-auto object-contain rounded-3xl shadow-lg"
          />
          <img
            src={getPublicPath("projects/ODSceneBehavior.png")}
            alt="Overdawn game console"
            className="w-auto object-contain rounded-3xl shadow-lg"
          />
        </div>

        <h2 className="text-left mt-8">Quest System</h2>
        <p>
          Design and implemented a comprehensive quest system to manage player
          objectives, progress tracking, and rewards. The system supported
          various quest types including main quests and optional side
          objectives. Used ScriptableObjects to define quest data, making it
          easy for designers to create and modify quests without altering code.
          Integrated the quest system with the UI to provide players with clear
          feedback on their progress and objectives.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mt-8">
          <img
            src={getPublicPath("projects/ODQuestPreview.png")}
            alt="Overdawn game console"
            className="w-auto object-contain rounded-3xl shadow-lg"
          />
          <img
            src={getPublicPath("projects/ODQuestSystem.png")}
            alt="Overdawn game console"
            className="w-auto object-contain rounded-3xl shadow-lg"
          />
        </div>

        <h2 className="text-left mt-8">Seamless Navigation System</h2>
        <p>
          Unity handles basic pathfinding through its NavMesh system, but for
          Overdawn's async level layouts, there needed to be a system which
          could handle pathfinding across multiple scenes. Each scene is indexed
          with valid navigation points, and the NavigationManager handles
          pathfinding requests by calculating paths across these scenes using
          BFS algorithm. This system ensures that NPCs and enemies can navigate
          the game world seamlessly, regardless of scene boundaries. This system
          also needed to work with our custom transporation system which is a
          base for our seamless subway and elevator systems. The transportation
          system relies on player's active navmesh as the system determines the
          scene with active navmesh as the active scenebehavior.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <img
            src={getPublicPath("projects/ODNavigation.gif")}
            alt="Overdawn game console"
            className="w-auto object-contain rounded-3xl shadow-lg"
          />
          <img
            src={getPublicPath("projects/ODElevator.png")}
            alt="Overdawn game console"
            className="w-auto object-contain rounded-3xl shadow-lg"
          />
        </div>

        <h2 className="text-left mt-8">Sequence Graph</h2>
        <p>
          Overdawn's Sequence system is first built to be event-driven, allowing
          for modular and reusable components. The dialog system is built with
          Yarn Spinner and to handle Overdan's complex narrative sequences, I
          iterated over three different sequence system. The first was simple
          GameObject based system which quickly became unmanageable as the
          sequences grew in complexity. The second iteration was a graph based
          system built with XNode which allowed for visual scripting of
          sequences. However, as it was built on unity IMGUI, it was not as
          performant and user-friendly as I hoped. The final iteration was built
          with Unity 6's Behavior Tree system. While originally built for
          handling character behaviors, the shift was quickly beneficial as the
          designers gained more flexibility in editing individual actos.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mt-8">
          <img
            src={getPublicPath("projects/ODXNODE.png")}
            alt="2nd iteration"
            className="w-auto object-contain rounded-3xl shadow-lg"
          />
          <img
            src={getPublicPath("projects/ODFINALSGB.png")}
            alt="final iteration"
            className="w-auto object-contain rounded-3xl shadow-lg"
          />
        </div>
      </div>

      <div className="w-full max-w-7xl px-4 mt-8">
        <hr className="my-12 border-t border-gray-700" />

        <h1 className="text-left">Gameplay Programming</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mt-8">
          <div>
            <h2 className="text-left mt-8">Player</h2>
            <p>
              Implemented responsive player controls and mechanics, including
              movement, combat, and interaction systems.
            </p>
            <ul className="list-disc list-inside mt-4 text-gray-300 leading-relaxed">
              <li>
                Programmed an expandable class hierarchy for all actors to allow
                for greater flexibility in controlling their behavior
              </li>
              <li>
                Created a custom animation system for dynamic 2.5D environments
                across multiple camera angles and perspectives
              </li>
              <li>
                Structured object hierarchy to allow for easy management of
                complex interactions
              </li>
            </ul>
          </div>

          <img
            src={getPublicPath("projects/ODCharacterHierarchy.png")}
            alt="character hierarchy"
            className="w-auto object-contain rounded-3xl shadow-lg"
          />
        </div>

        <h2 className="text-left mt-8">Weapons and Projectiles</h2>
        <p>
          Overdawn features a diverse arsenal of weapons, each with unique
          behaviors and projectile types. I developed a flexible weapon system
          that allows for easy addition of new weapons and projectiles.
          Projectiles use shared pooling system to optimize performance during
          intense combat scenarios. Implemented various projectile behaviors,
          including homing, bouncing, and area-of-effect damage. Projectiles
          work interconnected with the health system which bases of IDamageable
          interfaces.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mt-8">
          <img
            src={getPublicPath("projects/ODWeapon.png")}
            alt="weapons"
            className="w-auto object-contain rounded-3xl shadow-lg"
          />
          <img
            src={getPublicPath("projects/ODProjectile.png")}
            alt="final iteration"
            className="w-auto object-contain rounded-3xl shadow-lg"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mt-8">
          <img
            src={getPublicPath("projects/ODRev.png")}
            alt="character hierarchy"
            className="w-auto object-contain rounded-3xl shadow-lg"
          />
          <div>
            <h2 className="text-left mt-8">Enemies</h2>
            <p>
              Designed and implemented various enemy types with unique behaviors
              and attack patterns. Enemies utilize the Behavior Tree system for
              dynamic decision-making and actions. Enemies also have FOV system
              and take-cover mechanics to enhance combat depth.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mt-8">
          <div>
            <h2 className="text-left mt-8">UI</h2>
            <p>
              Developed interactive and visually appealing UI elements.
              Implemented HUD components such as health bars, ammo counters, and
              inventory systems to provide players with essential information.
            </p>
          </div>
          <img
            src={getPublicPath("projects/ODInventory.png")}
            alt="inventory"
            className="w-auto object-contain rounded-3xl shadow-lg"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mt-8">
          <img
            src={getPublicPath("projects/ODSkill.png")}
            alt="skilltree"
            className="w-auto object-contain rounded-3xl shadow-lg"
          />
          <div>
            <h2 className="text-left mt-8">Skill & SkillTree</h2>
            <p>
              Designed and implemented a skill system that allows players to
              acquire and upgrade abilities. Developed a skill tree UI to enable
              players to visualize and manage their skill progression.
            </p>
          </div>
        </div>
      </div>
      <div className="w-full max-w-7xl px-4 mt-8"></div>
    </section>
  );
};
