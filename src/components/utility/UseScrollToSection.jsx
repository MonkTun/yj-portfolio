import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Minimal compatibility wrapper: expose as a default component so existing
// usage (<UseScrollToSection />) in App.jsx works. The component runs the
// same effect as the hook would and returns null (no UI).
export default function UseScrollToSection() {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    // If there's a hash in the URL
    if (hash) {
      // Remove the '#' and find the element
      const element = document.getElementById(hash.slice(1));
      if (element) {
        element.scrollIntoView();
      }
    } else {
      // If no hash, scroll to top on route change
      window.scrollTo(0, 0);
    }
  }, [hash, pathname]); // Re-run when route or hash changes

  return null;
}
