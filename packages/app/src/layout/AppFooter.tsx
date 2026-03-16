import { FaGithub } from "react-icons/fa";

export function AppFooter() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 px-4 py-4">
      <div className="flex w-full justify-end">
        <a
          href="https://github.com/jcarpenter-uam/calc-translation"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub"
          className="text-ink-muted transition hover:text-accent"
        >
          <FaGithub className="h-5 w-5" aria-hidden="true" />
        </a>
      </div>
    </footer>
  );
}
