import { createTypewriter } from "./typewriter.js";

export function mountTypewriter({ root }) {
    if (!root) return;

    const tw = createTypewriter({
        fontSizePx: 20,
        lineHeight: 1.4,
        visibleLines: 3,
    });

    root.style.setProperty("--tw-active-line-offset-px", `${tw.metrics.activeLineOffsetPx}px`);
    root.style.setProperty("--tw-visible-height-px", `${tw.metrics.visibleHeightPx}px`);

    root.replaceChildren(tw.el);
    tw.focus();
    return tw;
}

