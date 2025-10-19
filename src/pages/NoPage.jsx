import { SectionHeading } from "../components/utility/SectionHeading";

export const NoPage = () => {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center py-20">
      <SectionHeading>404 - Page Not Found</SectionHeading>
      <p className="text-lg text-white/70">
        Oops! The page you're looking for doesn't exist.
      </p>
    </section>
  );
};
