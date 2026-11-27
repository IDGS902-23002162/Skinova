import useMediaQuery from "@mui/material/useMediaQuery";

export function useMotionDuration(duration = 240) {
  return useMediaQuery("(prefers-reduced-motion: reduce)") ? 0 : duration;
}
