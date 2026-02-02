/**
 * @fileoverview
 * Telepen Numeric barcode decoder for html5-qrcode.
 *
 * Based on zint library's Telepen implementation.
 * Patterns use "1" for narrow and "3" for wide bars/spaces.
 *
 * For Telepen Numeric:
 * - Digit pairs "00"-"99" are encoded as glyph = (10 * digit1 + digit2) + 27
 * - So "00" uses TeleTable[27], "01" uses TeleTable[28], etc.
 * - Start character: '_' (ASCII 95)
 * - Stop character: 'z' (ASCII 122)
 */

// TeleTable from zint source - patterns for ASCII 0-127
// Format: string of "1"s and "3"s representing narrow/wide elements
const TeleTable: string[] = [
    '31313131', // 0
    '1131313111', // 1
    '33313111', // 2
    '1111313131', // 3
    '3111313111', // 4
    '11333131', // 5
    '13133131', // 6
    '111111313111', // 7
    '31333111', // 8
    '1131113131', // 9
    '33113131', // 10
    '1111333111', // 11
    '3111113131', // 12
    '1113133111', // 13
    '1311133111', // 14
    '111111113131', // 15
    '3131113111', // 16
    '11313331', // 17
    '333331', // 18
    '111131113111', // 19
    '31113331', // 20
    '1133113111', // 21
    '1313113111', // 22
    '1111113331', // 23
    '31131331', // 24
    '113111113111', // 25
    '3311113111', // 26
    '1111131331', // 27 - "00" in numeric mode
    '311111113111', // 28 - "01" in numeric mode
    '1113111331', // 29 - "02" in numeric mode
    '1311111331', // 30
    '11111111113111', // 31
    '31313311', // 32 (space)
    '1131311131', // 33 !
    '33311131', // 34 "
    '1111313311', // 35 #
    '3111311131', // 36 $
    '11333311', // 37 %
    '13133311', // 38 &
    '111111311131', // 39 '
    '31331131', // 40 (
    '1131113311', // 41 )
    '33113311', // 42 *
    '1111331131', // 43 +
    '3111113311', // 44 ,
    '1113131131', // 45 -
    '1311131131', // 46 .
    '111111113311', // 47 /
    '3131111131', // 48 0
    '1131131311', // 49 1
    '33131311', // 50 2
    '111131111131', // 51 3
    '3111131311', // 52 4
    '1133111131', // 53 5
    '1313111131', // 54 6
    '111111131311', // 55 7
    '3113111311', // 56 8
    '113111111131', // 57 9
    '3311111131', // 58 :
    '111113111311', // 59 ;
    '311111111131', // 60 <
    '111311111311', // 61 =
    '131111111311', // 62 >
    '11111111111131', // 63 ?
    '3131311111', // 64 @
    '11313133', // 65 A
    '333133', // 66 B
    '111131311111', // 67 C
    '31113133', // 68 D
    '1133311111', // 69 E
    '1313311111', // 70 F
    '1111113133', // 71 G
    '313333', // 72 H
    '113111311111', // 73 I
    '3311311111', // 74 J
    '11113333', // 75 K
    '311111311111', // 76 L
    '11131333', // 77 M
    '13111333', // 78 N
    '11111111311111', // 79 O
    '31311133', // 80 P
    '1131331111', // 81 Q
    '33331111', // 82 R
    '1111311133', // 83 S
    '3111331111', // 84 T
    '11331133', // 85 U
    '13131133', // 86 V
    '111111331111', // 87 W
    '3113131111', // 88 X
    '1131111133', // 89 Y
    '33111133', // 90 Z
    '111113131111', // 91 [
    '3111111133', // 92 backslash
    '111311131111', // 93 ]
    '131111131111', // 94 ^
    '111111111133', // 95 _ (START character)
    '31311313', // 96 `
    '113131111111', // 97 a
    '3331111111', // 98 b
    '1111311313', // 99 c
    '311131111111', // 100 d
    '11331313', // 101 e
    '13131313', // 102 f
    '11111131111111', // 103 g
    '3133111111', // 104 h
    '1131111313', // 105 i
    '33111313', // 106 j
    '111133111111', // 107 k
    '3111111313', // 108 l
    '111313111111', // 109 m
    '131113111111', // 110 n
    '111111111313', // 111 o
    '313111111111', // 112 p
    '1131131113', // 113 q
    '33131113', // 114 r
    '11113111111111', // 115 s
    '3111131113', // 116 t
    '113311111111', // 117 u
    '131311111111', // 118 v
    '111111131113', // 119 w
    '3113111113', // 120 x
    '11311111111111', // 121 y
    '331111111111', // 122 z (STOP character)
    '111113111113', // 123 {
    '31111111111111', // 124 |
    '111311111113', // 125 }
    '131111111113', // 126 ~
    '1111111111111111', // 127 DEL
];

// Pattern lengths (from zint TeleLens array)
const TeleLens: number[] = [
    8, 10, 8, 10, 10, 8, 8, 12, 8, 10, 8, 10, 10, 10, 10, 12, 10, 8, 6, 12, 8, 10, 10, 10, 8, 12, 10,
    10, 12, 10, 10, 14, 8, 10, 8, 10, 10, 8, 8, 12, 8, 10, 8, 10, 10, 10, 10, 12, 10, 10, 8, 12, 10,
    10, 10, 12, 10, 12, 10, 12, 12, 12, 12, 14, 10, 8, 6, 12, 8, 10, 10, 10, 6, 12, 10, 8, 12, 8, 8,
    14, 8, 10, 8, 10, 10, 8, 8, 12, 10, 10, 8, 12, 10, 12, 12, 12, 8, 12, 10, 10, 12, 8, 8, 14, 10,
    10, 8, 12, 10, 12, 12, 12, 12, 10, 8, 14, 10, 12, 12, 12, 10, 14, 12, 12, 14, 12, 12, 16,
];

const START_CHAR = 95; // '_'
const STOP_CHAR = 122; // 'z'

interface Run {
    length: number;
    isBar: boolean;
}

// Set to true to enable debug logging
const DEBUG = true;

function debugLog(...args: any[]) {
    if (DEBUG) {
        console.log('[Telepen]', ...args);
    }
}

/**
 * Decode a Telepen Numeric barcode from a canvas element.
 * Returns the decoded text or null if no barcode found.
 */
export function decodeTelepenFromCanvas(canvas: HTMLCanvasElement): string | null {
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const width = canvas.width;
    const height = canvas.height;

    debugLog('Canvas size:', width, 'x', height);

    // Try multiple scan lines
    const scanLines = [
        Math.floor(height * 0.5),
        Math.floor(height * 0.45),
        Math.floor(height * 0.55),
        Math.floor(height * 0.4),
        Math.floor(height * 0.6),
        Math.floor(height * 0.35),
        Math.floor(height * 0.65),
        Math.floor(height * 0.3),
        Math.floor(height * 0.7),
    ];

    for (const y of scanLines) {
        const imageData = ctx.getImageData(0, y, width, 1);
        const text = decodeScanLine(imageData.data, width);
        if (text) {
            debugLog('Decoded at y=' + y + ':', text);
            return text;
        }
    }

    debugLog('No barcode found');
    return null;
}

function decodeScanLine(data: Uint8ClampedArray, width: number): string | null {
    // Convert to grayscale
    const grayscale: number[] = [];
    for (let x = 0; x < width; x++) {
        const idx = x * 4;
        const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
        grayscale.push(gray);
    }

    // Calculate threshold using Otsu's method
    const threshold = calculateOtsuThreshold(grayscale);

    // Get run lengths
    const runs = getRunLengths(grayscale, threshold);

    if (runs.length < 20) {
        return null;
    }

    // Try decoding in both directions
    let result = tryDecode(runs);
    if (!result) {
        result = tryDecode(runs.slice().reverse());
    }

    return result;
}

function calculateOtsuThreshold(grayscale: number[]): number {
    const histogram = new Array(256).fill(0);
    for (const v of grayscale) {
        histogram[Math.min(255, Math.max(0, Math.floor(v)))]++;
    }

    const total = grayscale.length;
    let sum = 0;
    for (let i = 0; i < 256; i++) {
        sum += i * histogram[i];
    }

    let sumB = 0;
    let wB = 0;
    let maxVariance = 0;
    let threshold = 128;

    for (let i = 0; i < 256; i++) {
        wB += histogram[i];
        if (wB === 0) continue;

        const wF = total - wB;
        if (wF === 0) break;

        sumB += i * histogram[i];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        const variance = wB * wF * (mB - mF) * (mB - mF);

        if (variance > maxVariance) {
            maxVariance = variance;
            threshold = i;
        }
    }

    // For binary images (only 0 and 255), Otsu returns 0 which doesn't work
    if (threshold === 0 || threshold === 255) {
        threshold = 128;
    }

    return threshold;
}

function getRunLengths(grayscale: number[], threshold: number): Run[] {
    const runs: Run[] = [];
    if (grayscale.length === 0) return runs;

    let isBar = grayscale[0] < threshold;
    let length = 1;

    for (let i = 1; i < grayscale.length; i++) {
        const currentIsBar = grayscale[i] < threshold;
        if (currentIsBar === isBar) {
            length++;
        } else {
            runs.push({ length, isBar });
            isBar = currentIsBar;
            length = 1;
        }
    }
    runs.push({ length, isBar });

    return runs;
}

function tryDecode(runs: Run[]): string | null {
    // Skip leading quiet zone (spaces)
    let startIdx = 0;
    while (startIdx < runs.length && !runs[startIdx].isBar) {
        startIdx++;
    }

    if (startIdx >= runs.length) return null;

    debugLog('Total runs:', runs.length, 'First bar at index:', startIdx);

    // Log first 20 run lengths for debugging
    const sampleRuns = runs.slice(startIdx, startIdx + 20).map(r => r.length);
    debugLog('First 20 run lengths:', sampleRuns);

    // Find the narrow unit width by analyzing runs
    const narrowWidth = estimateNarrowWidth(runs, startIdx);
    debugLog('Estimated narrow width:', narrowWidth);

    if (narrowWidth <= 0) return null;

    // Try decoding with different tolerance levels
    const tolerances = [0.3, 0.4, 0.5, 0.25];

    for (const tolerance of tolerances) {
        const result = tryDecodeWithTolerance(runs, startIdx, narrowWidth, tolerance);
        if (result) {
            return result;
        }
    }

    return null;
}

function estimateNarrowWidth(runs: Run[], startIdx: number): number {
    // Collect all run lengths
    const lengths: number[] = [];
    for (let i = startIdx; i < Math.min(startIdx + 50, runs.length); i++) {
        lengths.push(runs[i].length);
    }

    if (lengths.length < 10) return 0;

    // Sort to find the minimum (narrow) width
    lengths.sort((a, b) => a - b);

    // Use a small percentile to avoid noise
    const narrowWidth = lengths[Math.floor(lengths.length * 0.1)];

    return narrowWidth;
}

function tryDecodeWithTolerance(
    runs: Run[],
    startIdx: number,
    narrowWidth: number,
    tolerance: number
): string | null {
    // Classify runs as narrow (1) or wide (3)
    const elements: number[] = [];

    for (let i = startIdx; i < runs.length; i++) {
        const run = runs[i];
        const units = run.length / narrowWidth;

        if (Math.abs(units - 1) <= tolerance) {
            elements.push(1);
        } else if (Math.abs(units - 3) <= tolerance * 1.5) {
            elements.push(3);
        } else if (units < 2) {
            elements.push(1);
        } else {
            elements.push(3);
        }
    }

    debugLog('Tolerance:', tolerance, 'Elements (first 50):', elements.slice(0, 50).join(''));
    return decodeFromElements(elements);
}

function decodeFromElements(elements: number[]): string | null {
    // Look for start pattern (ASCII 95 '_')
    const startPattern = TeleTable[START_CHAR];
    const startLen = TeleLens[START_CHAR];

    let startIdx = -1;

    // Search for start pattern
    for (let i = 0; i <= elements.length - startLen; i++) {
        if (matchPattern(elements, i, startPattern)) {
            startIdx = i;
            break;
        }
    }

    if (startIdx < 0) {
        debugLog('Start pattern not found');
        return null;
    }

    debugLog('Start pattern found at index:', startIdx);

    // Decode characters after start
    const glyphs: number[] = [];
    let idx = startIdx + startLen;

    while (idx < elements.length) {
        let matched = false;

        for (let ascii = 0; ascii < 128; ascii++) {
            const pattern = TeleTable[ascii];
            const len = TeleLens[ascii];

            if (idx + len > elements.length) continue;

            if (matchPattern(elements, idx, pattern)) {
                if (ascii === STOP_CHAR) {
                    debugLog('Stop char found. Glyphs:', glyphs);
                    return decodeGlyphsToDigits(glyphs);
                }

                glyphs.push(ascii);
                idx += len;
                matched = true;
                break;
            }
        }

        if (!matched) {
            idx++;
        }
    }

    // No stop character found, try to decode what we have
    debugLog('No stop char. Glyphs so far:', glyphs);
    if (glyphs.length > 0) {
        return decodeGlyphsToDigits(glyphs);
    }

    return null;
}

function matchPattern(elements: number[], startIdx: number, pattern: string): boolean {
    if (startIdx + pattern.length > elements.length) return false;

    for (let i = 0; i < pattern.length; i++) {
        const expected = pattern.charCodeAt(i) - 48; // '1' -> 1, '3' -> 3
        const actual = elements[startIdx + i];

        if (expected !== actual) {
            return false;
        }
    }

    return true;
}

function decodeGlyphsToDigits(glyphs: number[]): string | null {
    debugLog('decodeGlyphsToDigits input:', glyphs);

    if (glyphs.length < 2) {
        debugLog('Too few glyphs:', glyphs.length);
        return null;
    }

    // Last glyph is the checksum
    const dataGlyphs = glyphs.slice(0, -1);
    debugLog('Data glyphs (excluding checksum):', dataGlyphs);

    // Convert glyphs to digit string
    let result = '';

    for (const glyph of dataGlyphs) {
        if (glyph >= 27 && glyph <= 126) {
            const pairValue = glyph - 27;
            if (pairValue <= 99) {
                const d1 = Math.floor(pairValue / 10);
                const d2 = pairValue % 10;
                result += d1.toString() + d2.toString();
                debugLog('Glyph', glyph, '-> pair value', pairValue, '->', d1.toString() + d2.toString());
            }
        } else if (glyph >= 17 && glyph <= 26) {
            // Single digit with X: glyph = digit + 17
            const digit = glyph - 17;
            result += digit.toString();
            debugLog('Glyph', glyph, '-> single digit', digit);
        } else {
            debugLog('Glyph', glyph, '-> not decoded (out of range)');
        }
    }

    debugLog('Final result:', result);
    return result.length > 0 ? result : null;
}
