export const getPublicPath = (path) => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `/yj-portfolio/${cleanPath}`;
};
