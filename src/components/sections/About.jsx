import { RevealOnScroll } from "../utility/RevealOnScroll";
import { SectionHeading } from "../utility/SectionHeading";

export const About = () => {
  const technicalSkills = [
    "Unity Engine",
    "Unreal Engine",
    "C#",
    "C++",
    "React",
    "JavaScript",
    "Tailwind CSS",
    "HTML",
    "CSS",
  ];

  const designSkills = [
    "Aseprite",
    "Adobe Photoshop",
    "Adobe Premiere Pro",
    "Miro",
    "Figma",
    "Blender",
    "Logic Pro",
    "MagicaVoxel",
  ];

  return (
    <section
      id="about"
      className="min-h-screen flex items-center justify-center py-20"
    >
      <RevealOnScroll>
        <div className="max-w-3xl mx-auto px-4">
          <SectionHeading>About Me</SectionHeading>

          <div className="rounded-xl p-8 border-white/10 border hover:-translate-y-1 transition-all ">
            <p className="text-gray-300 mb-6">
              I am a passionate indie game developer majoring in Computer
              Science and Games at the University of Southern California. I
              create immersive gaming experiences through innovative design and
              engaging gameplay mechanics. With a strong foundation in both
              technical and artistic aspects of game development, I strive to
              bring unique and captivating worlds to life.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl p-6 hover:-translate-y-1 transition-all">
                <h3 className="text-xl font-bold mb-4">Technical</h3>
                <div className="flex flex-wrap gap-2">
                  {technicalSkills.map((tech, key) => (
                    <span
                      key={tech}
                      className="bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full text-sm hover:bg-blue-500/20 
                        hover:shadow-[0_2px_8px_rgba(59,130,246,0.2)] transition-all"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl p-6 hover:-translate-y-1 transition-all">
                <h3 className="text-xl font-bold mb-4">Design & Art</h3>
                <div className="flex flex-wrap gap-2">
                  {designSkills.map((skill, key) => (
                    <span
                      key={skill}
                      className="bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full text-sm hover:bg-blue-500/20 
                        hover:shadow-[0_2px_8px_rgba(59,130,246,0.2)] transition-all"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="p-6 rounded-xl border-white/10 border hover:-translate-y-1 transition-all">
              <h3 className="text-xl font-bold mb-4">🎓 Education</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>
                  <strong>B.S. in Computer Science Games</strong> - University
                  of Southern California
                </li>
                <li>
                  Relevant Coursework: Data Structures, Algorithms, Linear
                  Algebra, and Game Design
                </li>
              </ul>
            </div>
            <div className="p-6 rounded-xl border-white/10 border hover:-translate-y-1 transition-all">
              <h3 className="text-xl font-bold mb-4">💼 Experience</h3>
              <div className="space-y-4 text-gray-300">
                <div>
                  <h4 className="font-semibold">
                    Software Engineering Intern - Tech Solutions Inc.
                  </h4>
                  <p>
                    developed and maintained web applications using React and
                    Node.js, improving user engagement by 15%.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold">
                    Software Engineering Intern2 - Tech Solutions Inc.
                  </h4>
                  <p>
                    developed and maintained web applications using React and
                    Node.js, improving user engagement by 15%. NO I did not.
                  </p>
                </div>
              </div>
            </div>
          </div> */}
        </div>
      </RevealOnScroll>
    </section>
  );
};

// A in About should be capitalized because it is a React component.
