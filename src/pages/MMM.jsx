import { SectionHeading } from "../components/utility/SectionHeading";
import { getPublicPath } from "../utils/assetUtils";
import { DescriptionSection } from "../components/utility/DescriptionSection";

export const MMM = () => {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center py-20">
      <img
        src={getPublicPath("projects/mmmTitleWide.png")}
        alt="MMM Title"
        className="w-full max-w-7xl rounded-3xl shadow-lg my-auto h-auto"
      />

      <DescriptionSection>
        <ul className="list-disc list-inside">
          <li>Project Status: On Going</li>
          <li>Project Type: USC's Advanced Game Project (AGP)</li>
          <li>Project Duration: ~6 months</li>
          <li>Tech Stack: Unity (C#) and Perforce</li>
          <li>Primary Role: Engineer</li>
        </ul>
      </DescriptionSection>

      <div className="w-full max-w-7xl px-4 mt-8">
        <hr className="my-12 border-t border-gray-700" />
        <div>
          <h2 className="text-left mt-8">Camera Manager</h2>
          <p>
            Programmed a camera management system that allows for dynamic camera
            positioning and movement. Integrated various camera modes allowing
            the designers to switch between different camera transition
            behaviors.
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
          <h2 className="text-left mt-8">Debugging</h2>
          <p>
            Implemented Quantum Console for in-game debugging and logging. This
            tool allows developers to execute commands, monitor game states, and
            troubleshoot issues in real-time, enhancing the development
            workflow. Investigated in various bugs including memory leaks and
            shader issues, providing timely fixes to ensure a smooth gaming
            experience.
          </p>
          <h2 className="text-left mt-8">Player</h2>
          <p>
            Implemented acceleration of the player character based on the
            mix-ins they have collected. This feature enhances gameplay dynamics
            by rewarding players with increased speed and agility as they gather
            more mix-ins, adding an extra layer of strategy and excitement to
            the game. Optimized player movements and manager scripts to ensure
            no references are lost or redundant instances are created.
            Introduced event-driven architecture to improve code modularity and
            maintainability.
          </p>
        </div>
      </div>

      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mt-8">
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
      <div className="w-full max-w-7xl px-4 mt-8"></div> */}
    </section>
  );
};
