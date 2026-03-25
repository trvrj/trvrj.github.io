export function createTypewriter({ fontSizePx, lineHeight, visibleLines }) {
    const textarea = document.createElement("textarea");
    textarea.className = "typewriter-textarea";

    textarea.spellcheck = false;
    textarea.autocapitalize = "off";
    textarea.autocomplete = "off";
    textarea.wrap = "soft";

    textarea.style.fontSize = `${fontSizePx}px`;
    textarea.style.lineHeight = String(lineHeight);
    textarea.style.height = `calc(${visibleLines} * ${lineHeight}em)`;

    // Used by CSS to vertically place the active (bottom) line and fade overlay.
    // Integer px avoids subpixel blur that can make lines look like a different size.
    const lineHeightPx = fontSizePx * lineHeight;
    const activeLineOffsetPx = Math.round((visibleLines - 0.5) * lineHeightPx);
    const visibleHeightPx = Math.round(visibleLines * lineHeightPx);

    function keepBottomLineVisible() {
        textarea.scrollTop = textarea.scrollHeight;
    }

    textarea.addEventListener("input", keepBottomLineVisible);
    window.addEventListener("resize", keepBottomLineVisible, { passive: true });

    // Initial positioning
    queueMicrotask(keepBottomLineVisible);

    return {
        el: textarea,
        metrics: {
            activeLineOffsetPx,
            visibleHeightPx,
        },
        focus: () => textarea.focus(),
        getValue: () => textarea.value,
        setValue: (v) => {
            textarea.value = String(v ?? "");
            keepBottomLineVisible();
        },
        destroy: () => {
            textarea.removeEventListener("input", keepBottomLineVisible);
            window.removeEventListener("resize", keepBottomLineVisible);
        },
    };
}

