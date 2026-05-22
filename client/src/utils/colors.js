export const latencyColor = (ms) => {
  if (ms < 40) return "#30d158"; // Apple green
  if (ms < 80) return "#ffd60a"; // Apple yellow
  return "#ff453a";              // Apple red
};
