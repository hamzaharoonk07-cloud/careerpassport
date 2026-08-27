import { useEffect, useState } from 'react';

/**
 * Does this client both want and deserve the 2K cut of a plate?
 *
 * Two questions, and a plate only gets the heavier file if both say yes.
 *
 * 1. Can the display actually show it?
 *
 *    The plates are full-bleed, so what matters is the physical pixel width of
 *    the viewport: CSS width times device pixel ratio. A 1920x1080 monitor
 *    lands on 1920, which the 1080p file already matches one-for-one — sending
 *    it 2K would be pure waste, decoded and then thrown away by the downscale.
 *    A 1440p monitor (2560) or any laptop at DPR 2 is upscaling today, and is
 *    the case this exists for.
 *
 *    The 2000px threshold sits in the gap between those two: comfortably above
 *    a 1920 desktop, comfortably below a 2560 one. A phone at 390 CSS px and
 *    DPR 3 comes to 1170 and correctly stays on 1080p — its screen cannot
 *    resolve the difference, and it is the device least able to afford it.
 *
 * 2. Can the connection afford it?
 *
 *    The 2K tier is roughly 40% more bytes. Save-Data and the slow effective
 *    types are an explicit request not to spend them, and honouring that
 *    matters more than sharpness. Chromium-only, so treated as an opt-out that
 *    may never fire rather than a gate we depend on.
 *
 * Deliberately evaluated once, on mount, rather than tracked live: swapping a
 * video's `src` mid-playback restarts it from frame one, so re-deciding on
 * every resize would restart every plate on the page as the window is dragged.
 * A viewer who resizes across the threshold keeps the tier they loaded with,
 * which is invisible; a restarted plate is not.
 */
export function useHiResVideo() {
  const [hiRes, setHiRes] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const conn = navigator.connection;
    if (conn?.saveData || ['slow-2g', '2g', '3g'].includes(conn?.effectiveType)) return;

    const physicalWidth = window.innerWidth * (window.devicePixelRatio || 1);
    if (physicalWidth >= 2000) setHiRes(true);
  }, []);

  return hiRes;
}

/**
 * `/videos/terminal.mp4` → `/videos/terminal-2k.mp4`.
 *
 * Only the plates carry a 2K sibling — the pipeline skips scrub clips, and the
 * portrait and mobile cuts are their own thing — so callers gate on the clip
 * having one rather than calling this blindly.
 */
export function hiResSrc(src) {
  return src.replace(/\.mp4$/, '-2k.mp4');
}

/**
 * Is this a phone held upright?
 *
 * The plates are 16:9 and fill their box with `object-fit: cover`. In a
 * 390x800 portrait viewport that keeps 27% of the frame — the middle strip,
 * blown up to fill the height — which is why the video looks zoomed in on a
 * phone. It is not scaled up; it is cropped almost to nothing.
 *
 * Portrait cuts are framed for the shape instead, so the composition survives.
 * Same once-on-mount rule as the tier above: re-deciding on every orientation
 * change would restart the clip, and a plate that jumps back to frame one when
 * the phone is tilted is worse than one framed for landscape.
 */
export function usePortraitVideo() {
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setPortrait(window.matchMedia('(max-width: 760px) and (orientation: portrait)').matches);
  }, []);

  return portrait;
}

/** `/videos/terminal.mp4` → `/videos/terminal-portrait.mp4`. */
export function portraitSrc(src) {
  return src.replace(/\.mp4$/, '-portrait.mp4');
}
