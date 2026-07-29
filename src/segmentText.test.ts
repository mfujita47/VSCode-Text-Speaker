import { describe, it, expect } from "vitest";
import { iterateSegments, segmentText, SegmentOptions } from "./segmentText";

/** The raw text of every segment must be exactly what its range points at in the document. */
const expectRangesMapBackToSource = (text: string, options?: SegmentOptions) => {
    const segments = segmentText(text, options);
    for (const segment of segments) {
        expect(text.slice(segment.range[0], segment.range[1])).toBe(segment.raw);
    }
    return segments;
};

const rawTexts = (text: string, options?: SegmentOptions) => segmentText(text, options).map((s) => s.raw);

describe("segmentText", () => {
    describe("offset integrity", () => {
        // Highlighting is driven purely by these ranges, so a drift of even one character
        // makes the editor highlight the wrong words.
        const cases: Array<[string, string, SegmentOptions?]> = [
            ["plain sentences", "Hello world. Second one."],
            ["bullet list with LF", "- alpha\n- beta\n- gamma"],
            ["bullet list with CRLF", "- alpha\r\n- beta\r\n- gamma"],
            ["blank line between paragraphs", "First para.\n\nSecond para."],
            ["mixed CRLF and LF", "one.\r\ntwo.\nthree.\r\n"],
            ["japanese", "これは一文目です。これは二文目です。"],
            ["sentence spanning lines", "This sentence\nspans two lines. Next."],
            ["leading blank lines", "\n\n\nAfter blanks."],
            ["trailing whitespace", "Sentence.   \n   "],
            ["selection", "Hello world. Second one. Third one.", { range: [13, 24] }],
            ["selection inside a word", "Hello world. Second one.", { range: [3, 9] }],
            ["selection spanning lines", "- alpha\n- beta\n- gamma", { range: [2, 14] }],
        ];

        for (const [label, text, options] of cases) {
            it(`maps ranges back to the source: ${label}`, () => {
                expectRangesMapBackToSource(text, options);
            });
        }
    });

    describe("segmentation", () => {
        it("splits on sentence boundaries", () => {
            expect(rawTexts("Hello world. Second one.")).toEqual(["Hello world.", "Second one."]);
        });

        it("splits japanese sentences on 。", () => {
            expect(rawTexts("これは一文目です。これは二文目です。")).toEqual([
                "これは一文目です。",
                "これは二文目です。",
            ]);
        });

        it("gives each line of a bullet list its own segment", () => {
            expect(rawTexts("- alpha\n- beta\n- gamma")).toEqual(["- alpha", "- beta", "- gamma"]);
        });

        it("treats newlines as boundaries even mid-sentence", () => {
            expect(rawTexts("This sentence\nspans two lines. Next.")).toEqual([
                "This sentence",
                "spans two lines.",
                "Next.",
            ]);
        });

        it("keeps a line without punctuation as a single segment", () => {
            expect(rawTexts("just a bare line")).toEqual(["just a bare line"]);
        });

        it("drops blank and whitespace-only lines", () => {
            expect(rawTexts("First para.\n\n   \nSecond para.")).toEqual(["First para.", "Second para."]);
        });

        it("returns nothing for text with no speakable content", () => {
            expect(segmentText("")).toEqual([]);
            expect(segmentText("   \n  \n\t")).toEqual([]);
        });
    });

    describe("range restriction", () => {
        it("emits only segments overlapping the requested range", () => {
            expect(rawTexts("Hello world. Second one. Third one.", { range: [13, 24] })).toEqual(["Second one."]);
        });

        it("clips a selection that starts and ends inside words", () => {
            expect(rawTexts("Hello world. Second one.", { range: [3, 9] })).toEqual(["lo wor"]);
        });

        it("returns nothing for an empty selection", () => {
            expect(segmentText("Hello world.", { range: [5, 5] })).toEqual([]);
        });

        it("covers the whole document when no range is given", () => {
            expect(rawTexts("One. Two. Three.")).toEqual(["One.", "Two.", "Three."]);
        });

        it("reads to the end of the document when the range ends there", () => {
            const text = "One. Two. Three.";
            expect(rawTexts(text, { range: [5, text.length] })).toEqual(["Two.", "Three."]);
        });

        it("tolerates a range reaching past the end of the document", () => {
            expect(rawTexts("One. Two.", { range: [5, 9999] })).toEqual(["Two."]);
        });

        it("tolerates a reversed range", () => {
            expect(segmentText("One. Two.", { range: [8, 2] })).toEqual([]);
        });
    });

    describe("windowing", () => {
        // Text is split a window at a time so that a large document starts reading
        // immediately instead of being split in full first.
        const withNewlines: Array<[string, string]> = [
            ["paragraphs", "First sentence here. Second one follows.\n\nA new paragraph starts. And ends.\n"],
            ["bullet list", "- alpha\n- beta\n- gamma\n- delta\n- epsilon\n"],
            ["CRLF", "one.\r\ntwo.\r\nthree.\r\nfour.\r\n"],
            ["japanese", "これは一文目です。これは二文目です。\nこれは三文目です。\n"],
            ["sentences spanning lines", "A sentence\nthat wraps. Another\none that wraps too. End.\n"],
        ];

        // No newline to cut on, so the window has to fall mid-content. Segment boundaries
        // legitimately differ by window size here; only the guarantees below still hold.
        const withoutNewlines: Array<[string, string]> = [
            ["long unbroken line", "word ".repeat(400)],
            ["no whitespace at all", "あ".repeat(2000)],
        ];

        const chunkSizes = [16, 64, 250, 1024];

        for (const [label, source] of withNewlines) {
            const text = source.repeat(20);
            for (const chunkSize of chunkSizes) {
                it(`splits identically at a ${chunkSize}-character window: ${label}`, () => {
                    expect([...iterateSegments(text, undefined, chunkSize)]).toEqual(segmentText(text));
                });
            }
        }

        for (const [label, source] of [...withNewlines, ...withoutNewlines]) {
            const text = source.repeat(20);
            for (const chunkSize of chunkSizes) {
                it(`loses and duplicates nothing at a ${chunkSize}-character window: ${label}`, () => {
                    const segments = [...iterateSegments(text, undefined, chunkSize)];

                    // Every segment still points at what it claims to.
                    for (const segment of segments) {
                        expect(text.slice(segment.range[0], segment.range[1])).toBe(segment.raw);
                    }
                    // Together they account for the document exactly once, whitespace aside.
                    const spoken = segments.map((s) => s.raw).join("");
                    expect(stripWhitespace(spoken)).toBe(stripWhitespace(text));
                });
            }
        }

        // Both of these split several megabytes in one go on purpose, which takes seconds.
        // That cost is the reason reading pulls segments lazily instead.
        const MEGABYTES = "これは日本語の文です。And an English one.\n- a bullet\n".repeat(60000);

        it("reads a multi-megabyte document to its very end", { timeout: 30000 }, () => {
            // Such a document used to be silently truncated at 500,000 characters: a 2 MB file
            // had three quarters of it never read out.
            expect(MEGABYTES.length).toBeGreaterThan(2_000_000);

            const segments = segmentText(MEGABYTES);
            expect(stripWhitespace(segments.map((s) => s.raw).join(""))).toBe(stripWhitespace(MEGABYTES));
            expect(MEGABYTES.slice(segments[segments.length - 1].range[1]).trim()).toBe("");
        });

        it("produces the first segment far sooner than splitting everything", { timeout: 30000 }, () => {
            const lazyStart = performance.now();
            const first = iterateSegments(MEGABYTES).next();
            const lazyMs = performance.now() - lazyStart;

            const eagerStart = performance.now();
            segmentText(MEGABYTES);
            const eagerMs = performance.now() - eagerStart;

            expect(first.done).toBe(false);
            // Relative rather than absolute, so the bound holds on a slow machine too.
            expect(lazyMs).toBeLessThan(eagerMs / 4);
        });
    });
});

const stripWhitespace = (value: string) => value.replace(/\s+/g, "");
