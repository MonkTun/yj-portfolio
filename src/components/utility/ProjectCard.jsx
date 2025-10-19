import { Link } from "react-router-dom";

export const ProjectCard = ({
  title,
  description,
  skills = [],
  projectLink,
  imageUrl,
}) => {
  console.log("Rendering ProjectCard with image:", imageUrl);
  return (
    <Link
      to={projectLink}
      className="block p-6 rounded-xl border-white/10 border hover:-translate-y-2 hover:scale-[1.01]
             hover:border-white-500/30 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all cursor-pointer no-underline"
    >
      <h3 className="text-xl font-bold mb-4 text-white">{title}</h3>
      <div className="relative w-full h-160 mb-4 rounded-lg overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          onError={(e) => {
            console.error("Image failed to load:", imageUrl);
            e.target.style.display = "none";
          }}
          onLoad={() => console.log("Image loaded successfully:", imageUrl)}
          className="w-full h-full object-cover"
        />
      </div>
      <p className="text-gray-400 mb-4">{description}</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {skills.map((skill) => (
          <span
            key={skill}
            className="bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full text-sm"
          >
            {skill}
          </span>
        ))}
      </div>
    </Link>
  );
};
