export function slug(text: string): string {
    return text
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/** 0-based column offset → spreadsheet-style letters (0 → "A", 26 → "AA"). */
export function columnLetter(offset: number): string {
    let n = offset + 1;
    let letters = "";
    while (n > 0) {
        const remainder = (n - 1) % 26;
        letters = String.fromCharCode(65 + remainder) + letters;
        n = Math.floor((n - 1) / 26);
    }
    return letters;
}
