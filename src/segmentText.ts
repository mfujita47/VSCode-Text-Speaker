import { split } from "sentence-splitter";

export type SegmentOptions = {
    /** Character offsets into the document to read, defaulting to the whole thing. */
    range?: [number, number];
};

/**
 * A chunk of text to be spoken as a unit, with its offsets into the original document.
 * `range` is always relative to the full document text, never to a parsed slice.
 */
export interface SpeechSegment {
    raw: string;
    range: [number, number];
}

/**
 * How much text is handed to the sentence splitter at a time.
 *
 * Splitting cost grows with the amount of text, and a large document would otherwise freeze
 * the editor for seconds before the first word is spoken. Reading is far slower than
 * splitting, so there is always time to prepare the next window while the current one plays.
 */
const CHUNK_SIZE = 65536;

/** How far past a chunk's nominal end to look for a boundary that is safe to cut on. */
const BOUNDARY_SEARCH_LIMIT = 8192;

/**
 * Walk the requested region of `text`, yielding speakable segments in document order.
 *
 * Segments are sentences as found by sentence-splitter, then further divided at newlines so
 * that bullet lists and other punctuation-less lines each become their own segment.
 *
 * Text is processed a window at a time, cut at newlines. Because the output is divided at
 * every newline anyway, no segment ever spans one, so windowing this way produces exactly
 * what splitting the whole region at once would.
 *
 * `chunkSize` exists so tests can exercise the windowing without megabyte-sized fixtures.
 */
export function* iterateSegments(
    text: string,
    options?: SegmentOptions,
    chunkSize: number = CHUNK_SIZE,
): Generator<SpeechSegment> {
    const [regionStart, regionEnd] = resolveRegion(text, options);

    let cursor = regionStart;
    while (cursor < regionEnd) {
        const chunkEnd = findChunkEnd(text, cursor, regionEnd, chunkSize);
        yield* segmentChunk(text.slice(cursor, chunkEnd), cursor, regionStart, regionEnd);
        cursor = chunkEnd;
    }
}

/**
 * Every segment of the requested region at once.
 *
 * Prefer {@link iterateSegments} for reading, so a large document starts speaking without
 * waiting for all of it to be split.
 */
export const segmentText = (text: string, options?: SegmentOptions): SpeechSegment[] => [
    ...iterateSegments(text, options),
];

const resolveRegion = (text: string, options?: SegmentOptions): [number, number] => {
    if (!options?.range) {
        return [0, text.length];
    }
    const [from, to] = options.range;
    const start = clamp(from, 0, text.length);
    return [start, clamp(to, start, text.length)];
};

const clamp = (value: number, low: number, high: number): number => Math.min(Math.max(value, low), high);

/**
 * Where to end the window that starts at `from`.
 *
 * A newline is the boundary of choice, since segments never cross one. Failing that a space
 * keeps the cut out of the middle of a word. A document with neither for thousands of
 * characters is cut bluntly rather than allowed to grow the window without limit.
 */
const findChunkEnd = (text: string, from: number, regionEnd: number, chunkSize: number): number => {
    const target = from + chunkSize;
    if (target >= regionEnd) {
        return regionEnd;
    }

    const searchEnd = Math.min(target + BOUNDARY_SEARCH_LIMIT, regionEnd);
    const newline = text.indexOf("\n", target);
    if (newline >= 0 && newline < searchEnd) {
        return newline + 1;
    }

    const space = text.indexOf(" ", target);
    if (space >= 0 && space < searchEnd) {
        return space + 1;
    }

    return target;
};

function* segmentChunk(
    chunk: string,
    offset: number,
    regionStart: number,
    regionEnd: number,
): Generator<SpeechSegment> {
    for (const sentence of split(chunk)) {
        if (sentence.type !== "Sentence") {
            continue;
        }

        // Divide the sentence at newlines so bullet points and unpunctuated lines stand alone.
        let lineStart = sentence.range[0];
        for (const line of sentence.raw.split(/(\r?\n)/)) {
            if (line.trim().length > 0) {
                const start = lineStart + offset;
                const end = start + line.length;
                if (overlaps(start, end, regionStart, regionEnd)) {
                    yield { raw: line, range: [start, end] };
                }
            }
            lineStart += line.length;
        }
    }
}

const overlaps = (start: number, end: number, regionStart: number, regionEnd: number): boolean =>
    Math.max(regionStart, start) < Math.min(regionEnd, end);
