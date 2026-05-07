import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Youngje Park — Under construction",
  description: "The site is being rebuilt. Back soon.",
  robots: { index: false, follow: false },
};

export default function UnderConstruction() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-8 md:px-16 pt-10 md:pt-14 flex items-baseline justify-between gap-6">
        <span className="kicker">Youngje Park</span>
        <span className="kicker">§ 00 &mdash; Under construction</span>
      </header>

      <section className="flex-1 grid grid-cols-12 gap-6 px-8 md:px-16 pt-24 md:pt-40 pb-16">
        <div className="col-span-12 md:col-span-9 md:col-start-3">
          <p className="kicker mb-6">Notice to visitors</p>
          <h1 className="font-display font-black text-[clamp(3.5rem,12vw,11rem)] leading-[0.92] tracking-[-0.02em]">
            Pardon
            <br />
            <span className="text-accent">our</span> dust.
          </h1>
          <p className="font-body italic text-foreground/80 text-xl md:text-2xl leading-snug max-w-prose mt-10">
            The studio is being rebuilt from the press up. New work, new type,
            new ink. Come back in a few weeks &mdash; or write, and I&rsquo;ll
            send a note when it&rsquo;s ready.
          </p>
        </div>
      </section>

      <hr className="rule mx-8 md:mx-16" />

      <footer className="px-8 md:px-16 py-8 grid grid-cols-12 gap-6 items-baseline">
        <span className="kicker col-span-6 md:col-span-3">
          MMXXVI &mdash; in progress
        </span>
        <span className="kicker col-span-6 md:col-span-3 md:col-start-7 md:text-right">
          <a
            href="mailto:peroni014@gmail.com"
            className="editorial-link"
          >
            peroni014@gmail.com
          </a>
        </span>
        <span className="kicker col-span-12 md:col-span-3 md:col-start-10 md:text-right">
          <a
            href="https://github.com/MonkTun"
            target="_blank"
            rel="noreferrer"
            className="editorial-link"
          >
            GitHub
          </a>
        </span>
      </footer>
    </main>
  );
}
