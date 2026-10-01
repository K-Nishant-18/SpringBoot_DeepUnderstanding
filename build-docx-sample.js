const fs = require("fs");
const {
  AlignmentType,
  BorderStyle,
  CheckBox,
  ColumnBreak,
  Document,
  ExternalHyperlink,
  Footer,
  FootnoteReferenceRun,
  FootNotes,
  Header,
  HeadingLevel,
  ImageRun,
  InternalHyperlink,
  LevelFormat,
  LineRuleType,
  NumberFormat,
  HorizontalPositionAlign,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  PositionalTab,
  PositionalTabAlignment,
  PositionalTabLeader,
  PositionalTabRelativeTo,
  HorizontalPositionRelativeFrom,
  VerticalPositionRelativeFrom,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableOfContents,
  TableRow,
  TabStopType,
  SectionType,
  TextDirection,
  TextRun,
  TextWrappingSide,
  TextWrappingType,
  UnderlineType,
  VerticalAlign,
  VerticalPositionAlign,
  WidthType,
  convertInchesToTwip,
} = require("docx");

const PAGE_W = 12240;
const PAGE_H = 15840;
const MARGIN = convertInchesToTwip(1);
const CONTENT_W = PAGE_W - MARGIN * 2;

const INK = "1B1B2F";
const MUTED = "5A5A72";
const ACCENT = "3B4CCA";
const ACCENT_SOFT = "EAECFB";
const RULE = "C9CBDD";
const BAND = "F2F3F8";

const body = [];
const push = (...items) => body.push(...items);

const p = (text, opts = {}) =>
  new Paragraph({
    spacing: { after: 140, line: 300, lineRule: LineRuleType.AUTO },
    ...opts,
    children: Array.isArray(text) ? text : [new TextRun({ text, ...(opts.run || {}) })],
  });

const h1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    pageBreakBefore: true,
    spacing: { before: 200, after: 260 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: ACCENT, space: 8 } },
    children: [new TextRun({ text })],
  });

const h2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 140 },
    children: [new TextRun({ text, color: ACCENT })],
  });

const h3 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 260, after: 100 },
    children: [new TextRun({ text })],
  });

const bullet = (text, level = 0) =>
  new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { after: 70, line: 290, lineRule: LineRuleType.AUTO },
    children: Array.isArray(text) ? text : [new TextRun(text)],
  });

const numbered = (text) =>
  new Paragraph({
    numbering: { reference: "steps", level: 0 },
    spacing: { after: 70, line: 290, lineRule: LineRuleType.AUTO },
    children: Array.isArray(text) ? text : [new TextRun(text)],
  });

const code = (text) =>
  new Paragraph({
    spacing: { before: 120, after: 180, line: 260, lineRule: LineRuleType.AUTO },
    shading: { type: ShadingType.CLEAR, fill: "1B1B2F" },
    indent: { left: convertInchesToTwip(0.25), right: convertInchesToTwip(0.25) },
    border: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "1B1B2F", space: 8 },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "1B1B2F", space: 8 },
    },
    children: [new TextRun({ text, font: "Consolas", size: 19, color: "E6E6F0" })],
  });

const callout = (label, text) =>
  new Paragraph({
    spacing: { before: 140, after: 200, line: 300, lineRule: LineRuleType.AUTO },
    shading: { type: ShadingType.CLEAR, fill: ACCENT_SOFT },
    indent: { left: convertInchesToTwip(0.15), right: convertInchesToTwip(0.15) },
    border: {
      left: { style: BorderStyle.SINGLE, size: 18, color: ACCENT, space: 10 },
    },
    children: [
      new TextRun({ text: `${label}  `, bold: true, color: ACCENT }),
      new TextRun({ text, color: INK }),
    ],
  });

const cell = (text, opts = {}) =>
  new TableCell({
    width: { size: opts.w, type: WidthType.DXA },
    columnSpan: opts.span,
    verticalAlign: opts.vAlign || VerticalAlign.CENTER,
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill } : undefined,
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    children: Array.isArray(text)
      ? text
      : [
          new Paragraph({
            spacing: { after: 0, line: 260, lineRule: LineRuleType.AUTO },
            alignment: opts.align,
            children: [
              new TextRun({
                text,
                bold: opts.bold,
                size: opts.size || 20,
                color: opts.color || INK,
              }),
            ],
          }),
        ],
  });

const caption = (text) =>
  new Paragraph({
    spacing: { before: 60, after: 240 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text, italics: true, size: 18, color: MUTED })],
  });

const spacer = (after = 160) => new Paragraph({ spacing: { after }, children: [new TextRun("")] });

/* ---------------------------------------------------------------- cover */

push(
  new Paragraph({ spacing: { after: 600 }, children: [new TextRun("")] }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [
      new ImageRun({
        type: "png",
        data: fs.readFileSync(`${__dirname}/banner.png`),
        transformation: { width: 620, height: 217 },
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [
      new TextRun({
        text: "The DOCX Skill",
        bold: true,
        size: 68,
        color: INK,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [
      new TextRun({
        text: "Everything the installed skill can create, edit, and verify",
        size: 30,
        color: MUTED,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 700 },
    children: [
      new TextRun({ text: "SKILL  ·  anthropics/skills@docx  ·  194.5K installs", size: 20, color: MUTED }),
    ],
  }),
  new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [convertInchesToTwip(1.6), convertInchesToTwip(4.9)],
    layout: TableLayoutType.FIXED,
    alignment: AlignmentType.CENTER,
    rows: [
      new TableRow({
        children: [
          cell("Installed to", { w: convertInchesToTwip(1.6), bold: true, fill: BAND }),
          cell("~/.agents/skills/docx", { w: convertInchesToTwip(4.9) }),
        ],
      }),
      new TableRow({
        children: [
          cell("Creates with", { w: convertInchesToTwip(1.6), bold: true, fill: BAND }),
          cell("docx-js (Node) — a .docx is a ZIP of XML", {
            w: convertInchesToTwip(4.9),
          }),
        ],
      }),
      new TableRow({
        children: [
          cell("Edits with", { w: convertInchesToTwip(1.6), bold: true, fill: BAND }),
          cell("unzip → word/document.xml → zip (docx-js cannot open files)", {
            w: convertInchesToTwip(4.9),
          }),
        ],
      }),
      new TableRow({
        children: [
          cell("Reads with", { w: convertInchesToTwip(1.6), bold: true, fill: BAND }),
          cell("pandoc -t markdown file.docx", { w: convertInchesToTwip(4.9) }),
        ],
      }),
    ],
  }),
  new Paragraph({ children: [new PageBreak()] }),
);

/* ------------------------------------------------------------------ TOC */

push(
  new Paragraph({
    spacing: { after: 300 },
    children: [new TextRun({ text: "Contents", bold: true, size: 40, color: INK })],
  }),
  new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-3" }),
  new Paragraph({
    spacing: { before: 400 },
    children: [
      new TextRun({
        text: "The field above is a live Table of Contents. Right-click → Update Field in Word to populate it.",
        italics: true,
        size: 19,
        color: MUTED,
      }),
    ],
  }),
);

/* -------------------------------------------------- 1. text formatting */

push(
  h1("1. Text formatting"),
  p("Every run carries its own font, size, color, weight, and decoration. Mixing formats inside a single paragraph is where documents usually look amateur — the skill exposes the full run API so you don't have to fake it."),
  h2("Character styles"),
  new Paragraph({
    spacing: { after: 160, line: 320, lineRule: LineRuleType.AUTO },
    children: [
      new TextRun({ text: "Bold", bold: true }),
      new TextRun({ text: "  ·  " }),
      new TextRun({ text: "Italic", italics: true }),
      new TextRun({ text: "  ·  " }),
      new TextRun({ text: "Underline", underline: {} }),
      new TextRun({ text: "  ·  " }),
      new TextRun({ text: "Strike", strike: true }),
      new TextRun({ text: "  ·  " }),
      new TextRun({ text: "Double underline", underline: { type: UnderlineType.DOUBLE } }),
      new TextRun({ text: "  ·  " }),
      new TextRun({ text: "Superscript", superScript: true }),
      new TextRun({ text: "2" }),
      new TextRun({ text: "  ·  " }),
      new TextRun({ text: "Subscript", subScript: true }),
      new TextRun({ text: "2" }),
      new TextRun({ text: "  ·  " }),
      new TextRun({ text: "Small caps", smallCaps: true }),
      new TextRun({ text: "all caps", allCaps: true }),
    ],
  }),
  h2("Type scale and colour"),
  new Paragraph({
    spacing: { after: 160, line: 300, lineRule: LineRuleType.AUTO },
    children: [
      new TextRun({ text: "9pt", size: 18, color: MUTED }),
      new TextRun({ text: "  11pt body  " }),
      new TextRun({ text: "14pt lead", size: 28, color: MUTED }),
      new TextRun({ text: "  20pt subhead", size: 40, color: INK }),
    ],
  }),
  new Paragraph({
    spacing: { after: 200 },
    children: [
      new TextRun({ text: "Highlighted", highlight: "yellow" }),
      new TextRun({ text: "  ·  " }),
      new TextRun({ text: "Coloured", color: "C0392B" }),
      new TextRun({ text: "  ·  " }),
      new TextRun({ text: "Accent", color: ACCENT }),
      new TextRun({ text: "  ·  " }),
      new TextRun({ text: "Muted", color: MUTED }),
      new TextRun({ text: "  ·  " }),
      new TextRun({ text: "Serif", font: "Georgia" }),
      new TextRun({ text: "  ·  " }),
      new TextRun({ text: "Monospace", font: "Consolas" }),
    ],
  }),
  h2("Alignment, indent, spacing"),
  new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 60 },
    children: [new TextRun({ text: "Left aligned", bold: true, size: 18, color: MUTED })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [new TextRun({ text: "Centre aligned", bold: true, size: 18, color: MUTED })],
  }),
  new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { after: 60 },
    children: [new TextRun({ text: "Right aligned", bold: true, size: 18, color: MUTED })],
  }),
  new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 60 },
    indent: { left: convertInchesToTwip(0.4), right: convertInchesToTwip(0.4) },
    children: [
      new TextRun(
        "Justified, indented from both margins. Justification is the fastest way to make a paragraph look like filler text — use it only in body copy that runs to a real measure, and never in a table cell or a heading.",
      ),
    ],
  }),
  new Paragraph({
    spacing: { after: 200, line: 480, lineRule: LineRuleType.AUTO },
    children: [new TextRun("This paragraph uses 24pt exact line spacing — looser than the 300-twip default above it.")],
  }),
  callout("Note", "Never use a literal \\n inside a run. A newline in the XML is ignored or renders as a stray space. Emit a new Paragraph instead."),
);

/* ------------------------------------------------------- 2. lists */

push(
  h1("2. Lists"),
  p("Lists come from a numbering configuration, not from typed characters. A real numbering definition is what makes Word's \"Continue numbering\" and outline view behave."),
  h2("Bullets, three levels"),
  bullet("Level one"),
  bullet("Level one, second item"),
  bullet("Level two, nested", 1),
  bullet("Level two, nested again", 1),
  bullet("Level three, deepest", 2),
  bullet("Back to level one"),
  h2("Numbered steps"),
  numbered("Unpack the archive with unzip."),
  numbered("Merge the fragmented runs so text becomes searchable."),
  numbered("Edit word/document.xml in place — do not reformat or pretty-print it."),
  numbered("Re-zip and validate against the original."),
  new Paragraph({ children: [new PageBreak()] }),
  h2("Nested numbered outline"),
  new Paragraph({
    numbering: { reference: "outline", level: 0 },
    spacing: { after: 70 },
    children: [new TextRun("Preparation")],
  }),
  new Paragraph({
    numbering: { reference: "outline", level: 1 },
    spacing: { after: 70 },
    children: [new TextRun("Check the source is a .docx, not a .doc")],
  }),
  new Paragraph({
    numbering: { reference: "outline", level: 1 },
    spacing: { after: 70 },
    children: [new TextRun("Strip symlink entries from the archive")],
  }),
  new Paragraph({
    numbering: { reference: "outline", level: 0 },
    spacing: { after: 200 },
    children: [new TextRun("Edit")],
  }),
  new Paragraph({
    numbering: { reference: "checklist", level: 0 },
    spacing: { after: 80 },
    children: [new TextRun("Tracked changes: every edit wrapped in w:ins or w:del")],
  }),
  new Paragraph({
    numbering: { reference: "checklist", level: 0 },
    spacing: { after: 200 },
    children: [new TextRun("Comments anchored with commentRangeStart / commentRangeEnd")],
  }),
  callout(
    "Footgun",
    "Inside a <w:del>, the text element is <w:delText>, not <w:t>. Getting this wrong is invisible in the accepted view and corrupts the file.",
  ),
);

/* --------------------------------------------------------- 3. tables */

push(
  h1("3. Tables"),
  p("A table needs its column widths declared twice: once as columnWidths on the table and once as width on every cell, both in DXA. Percent units break in Google Docs."),
  h2("A real report table"),
  new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [
      convertInchesToTwip(1.9),
      convertInchesToTwip(1.3),
      convertInchesToTwip(1.3),
      convertInchesToTwip(1.3),
      convertInchesToTwip(0.6),
    ],
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          cell("Quarter", { w: convertInchesToTwip(1.9), bold: true, fill: INK, color: "FFFFFF" }),
          cell("Pipeline", { w: convertInchesToTwip(1.3), bold: true, fill: INK, color: "FFFFFF", align: AlignmentType.RIGHT }),
          cell("Won", { w: convertInchesToTwip(1.3), bold: true, fill: INK, color: "FFFFFF", align: AlignmentType.RIGHT }),
          cell("Win rate", { w: convertInchesToTwip(1.3), bold: true, fill: INK, color: "FFFFFF", align: AlignmentType.RIGHT }),
          cell("Δ", { w: convertInchesToTwip(0.6), bold: true, fill: INK, color: "FFFFFF", align: AlignmentType.CENTER }),
        ],
      }),
      ...[
        ["Q1", "£412k", "£96k", "23.3%", "—", BAND],
        ["Q2", "£508k", "£141k", "27.8%", "+4.5", "FFFFFF"],
        ["Q3", "£477k", "£158k", "33.1%", "+5.3", BAND],
        ["Q4", "£624k", "£237k", "38.0%", "+4.9", "FFFFFF"],
      ].map(([q, pipe, won, rate, delta, fill], i) =>
        new TableRow({
          children: [
            cell(q, { w: convertInchesToTwip(1.9), bold: true, fill }),
            cell(pipe, { w: convertInchesToTwip(1.3), fill, align: AlignmentType.RIGHT }),
            cell(won, { w: convertInchesToTwip(1.3), fill, align: AlignmentType.RIGHT }),
            cell(rate, { w: convertInchesToTwip(1.3), fill, align: AlignmentType.RIGHT }),
            cell(delta, {
              w: convertInchesToTwip(0.6),
              fill,
              align: AlignmentType.CENTER,
              color: delta === "—" ? MUTED : "1E8E5A",
              bold: delta !== "—",
            }),
          ],
        }),
      ),
    ],
  }),
  caption("Table 1 — TableHeader repeats the header row on every page after a break."),
  h2("Merged cells"),
  new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [
      convertInchesToTwip(2.2),
      convertInchesToTwip(2.2),
      convertInchesToTwip(2.2),
    ],
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        children: [
          cell(
            [
              new Paragraph({
                spacing: { after: 0 },
                children: [new TextRun({ text: "Spans all three columns", bold: true, color: "FFFFFF" })],
              }),
            ],
            { w: convertInchesToTwip(6.6), span: 3, fill: ACCENT },
          ),
        ],
      }),
      new TableRow({
        children: [
          cell("Column span 2", { w: convertInchesToTwip(4.4), span: 2, fill: BAND, bold: true }),
          cell("Third cell", { w: convertInchesToTwip(2.2) }),
        ],
      }),
      new TableRow({
        children: [
          cell("Left", { w: convertInchesToTwip(2.2), fill: BAND }),
          cell("Middle", { w: convertInchesToTwip(2.2) }),
          cell("Right", { w: convertInchesToTwip(2.2), fill: BAND }),
        ],
      }),
    ],
  }),
  spacer(120),
  h2("Vertical alignment and direction"),
  new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [convertInchesToTwip(3.3), convertInchesToTwip(3.3)],
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: convertInchesToTwip(3.3), type: WidthType.DXA },
            verticalAlign: VerticalAlign.TOP,
            shading: { type: ShadingType.CLEAR, fill: BAND },
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            children: [
              new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: "vAlign: TOP", bold: true, size: 20 })] }),
              new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: "Text sits against the top edge of the cell.", size: 19, color: MUTED })] }),
            ],
          }),
          new TableCell({
            width: { size: convertInchesToTwip(3.3), type: WidthType.DXA },
            verticalAlign: VerticalAlign.BOTTOM,
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            children: [
              new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: "vAlign: BOTTOM", bold: true, size: 20 })] }),
              new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: "Text sits against the bottom edge of the cell.", size: 19, color: MUTED })] }),
            ],
          }),
        ],
      }),
    ],
  }),
  spacer(120),
  new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [convertInchesToTwip(2), convertInchesToTwip(4.6)],
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: convertInchesToTwip(2), type: WidthType.DXA },
            textDirection: TextDirection.BOTTOM_TO_TOP_LEFT_TO_RIGHT,
            shading: { type: ShadingType.CLEAR, fill: BAND },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Rotated 90°", size: 18, color: MUTED })],
              }),
            ],
          }),
          cell("TextDirection rotates cell content, not the row. Useful for narrow side labels.", {
            w: convertInchesToTwip(4.6),
          }),
        ],
      }),
    ],
  }),
  spacer(),
  h2("Borders"),
  new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [convertInchesToTwip(3.3), convertInchesToTwip(3.3)],
    layout: TableLayoutType.FIXED,
    borders: {
      top: { style: BorderStyle.DOUBLE, size: 6, color: INK },
      bottom: { style: BorderStyle.DOUBLE, size: 6, color: INK },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: RULE },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: [
      new TableRow({
        children: [
          cell("Open style", { w: convertInchesToTwip(3.3), bold: true, align: AlignmentType.CENTER }),
          cell("No vertical rules", { w: convertInchesToTwip(3.3), align: AlignmentType.CENTER }),
        ],
      }),
    ],
  }),
  spacer(240),
  callout("Footgun", "Table shading must use ShadingType.CLEAR. ShadingType.SOLID renders as solid black."),
);

/* --------------------------------------------------------- 4. images */

push(
  h1("4. Images"),
  p("ImageRun requires an explicit type. Supplying the data as a Buffer and a transformation in pixels is the reliable path."),
  h2("Inline image with a caption"),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [
      new ImageRun({
        type: "png",
        data: fs.readFileSync(`${__dirname}/chart.png`),
        transformation: { width: 430, height: 220 },
        altText: { title: "Quarterly pipeline", description: "Bar chart of pipeline and won revenue by quarter", name: "Chart" },
      }),
    ],
  }),
  caption("Table 2 — Inline image, centre aligned, with alt text for accessibility."),
  h2("Floating image with text wrapping"),
  new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [convertInchesToTwip(6.6)],
    layout: TableLayoutType.FIXED,
    borders: {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical: { style: BorderStyle.NONE, size: 0 },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: convertInchesToTwip(6.6), type: WidthType.DXA },
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            children: [
              new Paragraph({
                spacing: { after: 120 },
                children: [
                  new ImageRun({
                    type: "png",
                    data: fs.readFileSync(`${__dirname}/badge.png`),
                    transformation: { width: 96, height: 96 },
                    floating: {
                      horizontalPosition: {
                        relative: HorizontalPositionRelativeFrom.MARGIN,
                        align: HorizontalPositionAlign.CENTER,
                      },
                      verticalPosition: {
                        relative: VerticalPositionRelativeFrom.PARAGRAPH,
                        align: VerticalPositionAlign.TOP,
                      },
                      wrap: { type: TextWrappingType.SQUARE, side: TextWrappingSide.BOTH_SIDES },
                      margins: { top: 91440, bottom: 91440, left: 114300, right: 114300 },
                    },
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 100, line: 300, lineRule: LineRuleType.AUTO },
                children: [
                  new TextRun({
                    text: "A floating image is anchored with an absolute position and a wrap rule, so body text flows around it instead of sitting under it. The four common wrap types are square, tight, through, and topAndBottom — topAndBottom pushes text entirely above or below rather than beside.",
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 0, line: 300, lineRule: LineRuleType.AUTO },
                children: [
                  new TextRun("Floating images are the one construct most likely to shift between Word and LibreOffice. If exact placement matters more than robustness, use a borderless table instead."),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  }),
  callout(
    "Tip",
    "Need to crop or resize an existing asset? Convert it to PNG first — docx-js will not resize arbitrary binary formats.",
  ),
);

/* ------------------------------------------------- 5. headers/footers */

push(
  h1("5. Headers, footers, and page numbers"),
  p("Headers and footers are per-section. Each section declares its own, and the first page can differ from the rest."),
  h2("What the skill generates"),
  bullet("A running header with the document title and a bottom rule."),
  bullet("A footer with a right-aligned page number field."),
  bullet("A first-page header that suppresses the rule on the cover."),
  h2("Page field tokens"),
  code("PageNumber.CURRENT        → 1\nPageNumber.TOTAL_PAGES     → 12\nPageNumber.TOTAL_PAGES_IN_SECTION"),
  p([
    new TextRun("The footer below is live. It reads "),
    new TextRun({ text: "Page ", bold: true }),
    new TextRun({ text: "1", bold: true, color: ACCENT }),
    new TextRun({ text: " using a real Word field, so it stays correct after edits." }),
  ]),
);

/* ------------------------------------------- 6. dot leaders & tabs */

push(
  h1("6. Dot leaders and positional tabs"),
  p("A dot leader is the dotted run between a label and a value, as in a contents line or a summary table. It is a PositionalTab inside a TextRun — never literal periods or padded spaces."),
  new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W, leader: "dot" }],
    spacing: { after: 90 },
    children: [
      new TextRun({ text: "Unpack the archive" }),
      new TextRun({
        children: [
          new PositionalTab({ alignment: PositionalTabAlignment.RIGHT, leader: PositionalTabLeader.DOT, relativeTo: PositionalTabRelativeTo.MARGIN }),
          "",
        ],
      }),
      new TextRun({ text: "3 s" }),
    ],
  }),
  new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W, leader: "dot" }],
    spacing: { after: 90 },
    children: [
      new TextRun({ text: "Merge fragmented runs" }),
      new TextRun({
        children: [
          new PositionalTab({ alignment: PositionalTabAlignment.RIGHT, leader: PositionalTabLeader.DOT, relativeTo: PositionalTabRelativeTo.MARGIN }),
          "",
        ],
      }),
      new TextRun({ text: "1 s" }),
    ],
  }),
  new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W, leader: "dot" }],
    spacing: { after: 200 },
    children: [
      new TextRun({ text: "Validate against original" }),
      new TextRun({
        children: [
          new PositionalTab({ alignment: PositionalTabAlignment.RIGHT, leader: PositionalTabLeader.DOT, relativeTo: PositionalTabRelativeTo.MARGIN }),
          "",
        ],
      }),
      new TextRun({ text: "4 s" }),
    ],
  }),
  p([
    new TextRun("Other leader styles: "),
    new TextRun({ text: "underscore", bold: true }),
    new TextRun(", "),
    new TextRun({ text: "hyphen", bold: true }),
    new TextRun(", "),
    new TextRun({ text: "middle dot", bold: true }),
    new TextRun(", or "),
    new TextRun({ text: "none", bold: true }),
    new TextRun("."),
  ]),
);

/* ------------------------------------------------- 7. links/bookmarks */

push(
  h1("7. Links, bookmarks, and footnotes"),
  h2("Hyperlinks"),
  new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({ text: "External: " }),
      new ExternalHyperlink({
        link: "https://skills.sh/anthropics/skills",
        children: [new TextRun({ text: "the skill on skills.sh", style: "Hyperlink" })],
      }),
    ],
  }),
  new Paragraph({
    spacing: { after: 200 },
    children: [
      new TextRun({ text: "Internal: " }),
      new InternalHyperlink({
        anchor: "anchors",
        children: [new TextRun({ text: "jump to the checklist below", style: "Hyperlink" })],
      }),
    ],
  }),
  h2("Footnotes"),
  new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({ text: "A footnote reference sits inline in the run flow" }),
      new FootnoteReferenceRun(1),
      new TextRun({ text: "." }),
    ],
  }),
  new Paragraph({
    spacing: { after: 240 },
    children: [
      new TextRun({ text: "Footnotes are collected at the end of the section and renumber automatically" }),
      new FootnoteReferenceRun(2),
      new TextRun({ text: "." }),
    ],
  }),
);

/* --------------------------------------------------- 8. checkboxes */

push(
  h1("8. Interactive checkboxes"),
  p("Legacy form checkboxes are rendered by Word as a symbol. In a plain .docx they are not clickable — they only become interactive in a protected form — but they render and print correctly."),
  new Paragraph({
    spacing: { after: 100 },
    tabStops: [{ type: TabStopType.LEFT, position: convertInchesToTwip(0.4) }],
    children: [
      new TextRun({ text: "☐" }),
      new TextRun({ text: "\tUnpack the .docx into a working directory" }),
    ],
  }),
  new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text: "☒" }), new TextRun({ text: "\tStrip symlink entries (untrusted input)" })],
  }),
  new Paragraph({
    spacing: { after: 240 },
    children: [
      new TextRun({ text: "☐" }),
      new TextRun({ text: "\tValidate with validate.py against the original" }),
    ],
  }),
  new Paragraph({
    spacing: { before: 200, after: 200 },
    children: [new TextRun({ text: "Prose checklists read better than boxes:", bold: true })],
  }),
  bullet("Tick the box only when the step is genuinely done — a pre-ticked checklist is worse than none."),
  bullet("Where a document is going to be printed, prefer a plain bullet; the box adds ink and no information."),
  bullet("Where a document is a signed-off artefact, the box is the record. Keep it."),
);

/* -------------------------------------------- 9. sections & layout */

push(
  h1("9. Sections and page setup"),
  p("Sections control page size, orientation, margins, columns, and which header/footer applies. docx-js takes portrait dimensions and swaps them itself when orientation is landscape."),
  h2("Page sizes"),
  code('US Letter   width 12240  height 15840\nA4          width 11906  height 16838\nUS Legal    width 12240  height 20160\nLandscape   portrait dims + PageOrientation.LANDSCAPE'),
  h2("The three-column spread that follows"),
  p("The next page uses a three-column section with balanced columns — the layout you would use for a glossary or a dense reference list."),
);

/* ------------------------------- three-column reference section */

const glossary = [
  ["Abstract numbering", "The level/format template a numbering instance points at."],
  ["Anchor", "The paragraph or run a floating object or bookmark is attached to."],
  ["columnSpan", "Number of grid columns a cell occupies. Width must match the sum of the columns it replaces."],
  ["docProps", "core.xml and app.xml — title, author, created date, word count."],
  ["Lead", "The empty line between a heading and the body, matched to the body's type size."],
  ["Leader", "The dot/underscore/hyphen run produced by a tab stop in a PositionalTab."],
  ["Merge field", "A field that Word replaces at mail-merge time."],
  ["Orientation", "Landscape via docx-js means passing portrait dimensions plus the enum."],
  ["Section", "The unit of page setup. A continuous section break changes columns without forcing a new page."],
  ["Shading", "Cell or paragraph background. Always ShadingType.CLEAR."],
  ["TableHeader", "Repeats a row on every page a table spans."],
  ["Tracked change", "A w:ins or w:del wrapper. The author, id, and date attributes are all required."],
  ["Word count", "Read from docProps/app.xml; recomputed by Word on save."],
  ["XSD schema", "The ISO 29500 files validate.py checks the package against."],
];

const glossaryParas = [];
for (const [term, def] of glossary) {
  glossaryParas.push(
    new Paragraph({
      spacing: { after: 120, line: 280, lineRule: LineRuleType.AUTO },
      children: [
        new TextRun({ text: term, bold: true, color: ACCENT }),
        new TextRun({ text: ` — ${def}` }),
      ],
    }),
  );
}

const threeColSection = {
  properties: {
    page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },

    type: SectionType.CONTINUOUS,
    column: { count: 3, space: 425, equalWidth: true, separateLine: true },
  },
  headers: {
    default: new Header({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 6 } },
          spacing: { after: 200 },
          children: [new TextRun({ text: "Reference", size: 18, color: MUTED, characterSpacing: 40 })],
        }),
      ],
    }),
  },
  footers: {
    default: new Footer({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 6 } },
          children: [new TextRun({ text: "The DOCX Skill — reference glossary", size: 17, color: MUTED })],
        }),
      ],
    }),
  },
  children: [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: ACCENT, space: 8 } },
      children: [new TextRun({ text: "Reference glossary" })],
    }),
    ...glossaryParas,
    new Paragraph({
      spacing: { before: 300 },
      children: [
        new TextRun({
          text: "Ends the three-column section. The next section returns to a single column.",
          italics: true,
          size: 18,
          color: MUTED,
        }),
      ],
    }),
  ],
};

/* -------------------------- back to single column, remaining chapters */

const rest = [];

const p2 = p;
const h2b = h2;
const h3b = h3;
const bullet2 = bullet;
const code2 = code;
const callout2 = callout;
const spacer2 = spacer;
const caption2 = caption;

rest.push(
  h1("10. The editing workflow"),
  p("docx-js cannot open an existing file, so every edit to an existing document goes through the archive."),
  h2("The loop"),
  code(
    "unzip -q doc.docx -d unpacked/\nfind unpacked -type l -delete\npython scripts/merge_runs.py unpacked/\n# edit unpacked/word/document.xml in place\n(cd unpacked && rm -f ../out.docx && zip -Xr ../out.docx .)\npython scripts/office/validate.py out.docx --original doc.docx",
  ),
  h2("Why merge_runs.py exists"),
  p("Word fragments a sentence across many runs — revision ids, spell-check markers, proofing boundaries. A phrase that reads as one word in the rendered document often does not exist as a contiguous string in the XML, so a naive find-and-replace silently misses. merge_runs.py coalesces adjacent identically-formatted runs without changing content or rendering, and it accepts a .docx directly as well as an unpacked directory."),
  callout(
    "Rule",
    "Never reformat or pretty-print word/document.xml during an edit. A diff that reformats the file makes the actual change impossible to review.",
  ),
  h2("Scripts in the skill"),
  new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [convertInchesToTwip(2.3), convertInchesToTwip(4.3)],
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          cell("Script", { w: convertInchesToTwip(2.3), bold: true, fill: INK, color: "FFFFFF" }),
          cell("What it does", { w: convertInchesToTwip(4.3), bold: true, fill: INK, color: "FFFFFF" }),
        ],
      }),
      ...[
        ["comment.py", "Writes comments.xml plus the four companion files, relationships, and content-type overrides — then prints the markers to paste into document.xml."],
        ["merge_runs.py", "Coalesces fragmented runs so text is findable. Accepts a directory or a .docx."],
        ["accept_changes.py", "Produces a clean copy with every tracked change accepted, joining paragraphs correctly where other tools leave stray empty bullets."],
        ["validate.py", "XSD checks against ISO 29500. --auto-repair fixes common issues. --author flags untracked edits when redlining."],
        ["soffice.py", "LibreOffice headless wrapper for converting between .doc, .docx, and .pdf."],
      ].map(([name, what], i) =>
        new TableRow({
          children: [
            cell([new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: name, font: "Consolas", size: 18, bold: true, color: ACCENT })] })], {
              w: convertInchesToTwip(2.3),
              fill: i % 2 === 0 ? BAND : "FFFFFF",
            }),
            cell(what, { w: convertInchesToTwip(4.3), fill: i % 2 === 0 ? BAND : "FFFFFF", size: 19 }),
          ],
        }),
      ),
    ],
  }),
  spacer(240),
  h2("Tracked changes"),
  p("When redlining, validate with the author flag. It reports any text you changed without a w:ins or w:del wrapper around it — easy to do by accident and invisible in the accepted view."),
  code(
    'python scripts/office/validate.py out.docx --original doc.docx --author "A. Reviewer"',
  ),
  bullet([
    new TextRun({ text: "Added text", color: "1E8E5A", bold: true }),
    new TextRun(" goes inside <w:ins> with w:id, w:author, and w:date."),
  ]),
  bullet([
    new TextRun({ text: "Removed text", color: "C0392B", bold: true }),
    new TextRun(" goes inside <w:del>, and the run's text element becomes <w:delText>."),
  ]),
  bullet(
    "Deleting a paragraph outright means a <w:del/> in the paragraph mark's rPr plus a <w:del> around every run. The <w:del/> must come before the rPr's other children — the order is schema-enforced.",
  ),
  bullet(
    "A deleted paragraph mark means \"merge this paragraph into the next\", which is how a paragraph disappears entirely once changes are accepted.",
  ),
  h2("Comments"),
  p("Comments require six cross-linked files. comment.py writes all of them and the relationships, then prints the snippet to place in document.xml. Until you place the markers, the comment exists but is not visible."),
  code(
    '# against an already-unpacked directory\npython scripts/comment.py unpacked/ "Fees & expenses cap is too low"\npython scripts/comment.py unpacked/ "Agreed" --parent 0\n\n# against a .docx directly\npython scripts/comment.py contract.docx "This cap is too low" -o annotated.docx',
  ),
  h3b("The three markers to place"),
  bullet("<w:commentRangeStart w:id=\"N\" /> — where the highlighted text begins."),
  bullet("<w:commentRangeEnd w:id=\"N\" /> — where it ends."),
  bullet('<w:commentReference w:id="N" /> — the visible anchor, inside a run at the end.'),
  spacer2(200),
  new Paragraph({ children: [new PageBreak()] }),
  h2b("Gotchas, collected"),
  new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [convertInchesToTwip(3.1), convertInchesToTwip(3.5)],
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          cell("Gotcha", { w: convertInchesToTwip(3.1), bold: true, fill: INK, color: "FFFFFF" }),
          cell("What to do instead", { w: convertInchesToTwip(3.5), bold: true, fill: INK, color: "FFFFFF" }),
        ],
      }),
      ...[
        ["Page size defaults to A4", "Pass page.size explicitly: width 12240, height 15840 for US Letter."],
        ["Landscape looks wrong", "Pass portrait dimensions and let docx-js swap them internally."],
        ["Table misrenders in Google Docs", "Use WidthType.DXA on both columnWidths and every cell. PERCENTAGE breaks."],
        ["Cell renders solid black", "Use ShadingType.CLEAR, never ShadingType.SOLID."],
        ["Literal bullet characters", "Use a numbering config with LevelFormat.BULLET."],
        ["ImageRun throws", "Supply type: \"png\" / \"jpg\" / … alongside data."],
        ["PageBreak does nothing", "It must be inside a Paragraph."],
        ["\\n inside a run", "Use a separate Paragraph. Newlines in the XML are ignored."],
        ["Headings missing from the TOC", "Use the built-in HeadingLevel.* values, or set outlineLevel on a custom style."],
        ["Table used as a horizontal rule", "Use a paragraph bottom border."],
        ["Dot leader typed as periods", "Use PositionalTab with PositionalTabAlignment.RIGHT and a leader."],
        ["Column widths inconsistent", "They must sum exactly to the table width."],
        ["Fake alignment with spaces", "Use PositionalTab or a right tab stop with a leader."],
      ].map(([a, b], i) =>
        new TableRow({
          children: [
            cell(a, { w: convertInchesToTwip(3.1), fill: i % 2 === 0 ? BAND : "FFFFFF", size: 19, font: "Consolas" }),
            cell(b, { w: convertInchesToTwip(3.5), fill: i % 2 === 0 ? BAND : "FFFFFF", size: 19 }),
          ],
        }),
      ),
    ],
  }),
  spacer2(240),
  h2b("Verifying the output"),
  p("A .docx that generates without error is not the same as a .docx that looks right. Render it and look at it."),
  code(
    "python scripts/office/soffice.py --headless --convert-to pdf output.docx\npdftoppm -jpeg -r 100 output.pdf page\nls page-*.jpg",
  ),
  p("pdftoppm zero-pads page numbers to the width of the page count, so a 12-page render gives page-01.jpg through page-12.jpg."),
  callout2(
    "On this machine",
    "pandoc, LibreOffice, and pdftoppm are not installed, so this document was checked by unpacking the archive and reading the XML directly rather than by rendering. Install Poppler and LibreOffice to get the full render loop.",
  ),
  h2b("Dependencies the skill expects"),
  bullet("docx (npm) — preinstalled; only run npm install docx if require('docx') fails."),
  bullet("pandoc — reading documents to markdown."),
  bullet("LibreOffice (soffice) — .doc conversion and PDF rendering."),
  bullet("pdftoppm (Poppler) — PDF pages to images for visual inspection."),
  spacer2(200),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 300 },
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 12 } },
    children: [
      new TextRun({ text: "End of sample.", size: 18, color: MUTED, italics: true }),
    ],
  }),
);

/* ------------------------------------------------------------ document */

const doc = new Document({
  creator: "opencode",
  title: "The DOCX Skill — capability sample",
  description: "A sample document exercising every capability of the installed anthropics/skills@docx skill.",
  subject: "DOCX skill reference",
  keywords: "docx, skill, sample, reference",
  lastModifiedBy: "opencode",
  revision: 1,
  footnotes: {
    1: {
      children: [
        new Paragraph({
          spacing: { after: 0 },
          children: [new TextRun("Footnote bodies are real paragraphs, so they can contain runs, links, and their own formatting.")],
        }),
      ],
    },
    2: {
      children: [
        new Paragraph({
          spacing: { after: 0 },
          children: [new TextRun("They land at the end of the section that contains the reference, and Word renumbers them as content moves.")],
        }),
      ],
    },
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: convertInchesToTwip(0.3), hanging: convertInchesToTwip(0.18) } } },
          },
          {
            level: 1,
            format: LevelFormat.BULLET,
            text: "◦",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: convertInchesToTwip(0.6), hanging: convertInchesToTwip(0.18) } } },
          },
          {
            level: 2,
            format: LevelFormat.BULLET,
            text: "▪",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: convertInchesToTwip(0.9), hanging: convertInchesToTwip(0.18) } } },
          },
        ],
      },
      {
        reference: "steps",
        levels: [
          {
            level: 0,
            format: NumberFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: convertInchesToTwip(0.35), hanging: convertInchesToTwip(0.22) } } },
          },
        ],
      },
      {
        reference: "outline",
        levels: [
          {
            level: 0,
            format: NumberFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: convertInchesToTwip(0.35), hanging: convertInchesToTwip(0.22) } },
            },
          },
          {
            level: 1,
            format: NumberFormat.LOWER_LETTER,
            text: "%2.",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: convertInchesToTwip(0.75), hanging: convertInchesToTwip(0.22) } } },
          },
        ],
      },
      {
        reference: "checklist",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "☐",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: convertInchesToTwip(0.35), hanging: convertInchesToTwip(0.22) } } },
          },
        ],
      },
    ],
  },
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: 22, color: INK },
        paragraph: { spacing: { after: 140, line: 300, lineRule: LineRuleType.AUTO } },
      },
      heading1: {
        run: { font: "Calibri Light", size: 40, bold: true, color: INK },
        paragraph: { spacing: { before: 240, after: 200 } },
      },
      heading2: {
        run: { font: "Calibri Light", size: 30, bold: true, color: ACCENT },
        paragraph: { spacing: { before: 320, after: 140 } },
      },
      heading3: {
        run: { font: "Calibri", size: 25, bold: true, color: INK },
        paragraph: { spacing: { before: 240, after: 100 } },
      },
    },
    paragraphStyles: [
      {
        id: "Hyperlink",
        name: "Hyperlink",
        run: { color: ACCENT, underline: { type: UnderlineType.SINGLE, color: ACCENT } },
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN, header: 720, footer: 720 },
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
          borders: {
            pageBorderTop: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 24 },
            pageBorderBottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 24 },
            pageBorderLeft: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 24 },
            pageBorderRight: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 24 },
          },
        },
        titlePage: true,
      },
      headers: {
        first: new Header({
          children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun("")] })],
        }),
        default: new Header({
          children: [
            new Paragraph({
              tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
              border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 8 } },
              spacing: { after: 240 },
              children: [
                new TextRun({ text: "The DOCX Skill", size: 18, color: MUTED, characterSpacing: 30 }),
                new TextRun({ text: "\tanthropics/skills@docx", size: 18, color: MUTED }),
              ],
            }),
          ],
        }),
      },
      footers: {
        first: new Footer({
          children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun("")] })],
        }),
        default: new Footer({
          children: [
            new Paragraph({
              border: { top: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 8 } },
              tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
              children: [
                new TextRun({ text: "Capability sample", size: 17, color: MUTED }),
                new TextRun({ text: "\t", size: 17 }),
                new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], size: 17, color: MUTED }),
              ],
            }),
          ],
        }),
      },
      children: body,
    },
    threeColSection,
    {
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN, header: 720, footer: 720 },
        },
        type: SectionType.CONTINUOUS,
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 8 } },
              tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
              spacing: { after: 240 },
              children: [
                new TextRun({ text: "The DOCX Skill", size: 18, color: MUTED, characterSpacing: 30 }),
                new TextRun({ text: "\tWorkflow, scripts, and gotchas", size: 18, color: MUTED }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              border: { top: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 8 } },
              tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
              children: [
                new TextRun({ text: "Capability sample", size: 17, color: MUTED }),
                new TextRun({ text: "\t", size: 17 }),
                new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], size: 17, color: MUTED }),
              ],
            }),
          ],
        }),
      },
      children: rest,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  const out = process.argv[2] || `${__dirname}/docx-skill-sample.docx`;
  fs.writeFileSync(out, buf);
  console.log(`wrote ${out} (${(buf.length / 1024).toFixed(1)} KB)`);
});
