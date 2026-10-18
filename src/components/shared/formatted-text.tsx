import { Fragment } from "react";

/**
 * Splits one line on `**bold**` spans and returns the bold parts wrapped in
 * `<strong>` — the only inline mark this supports, matching what the
 * business-description field actually asks owners to write (WhatsApp/
 * ChatGPT-style `**text**`, not full Markdown).
 */
function parseInline(line: string, keyPrefix: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

const bulletPattern = /^[-•]\s+/;
const numberedPattern = /^(\d+)[.)]\s+/;

/**
 * Renders free-typed owner text (the business "about" description) with a
 * small, deliberately limited set of marks: `**bold**`, `- `/`• ` bullet
 * lines and `1. ` numbered lines, each paragraph (blank-line-separated)
 * kept as its own block. Never `dangerouslySetInnerHTML` — this builds
 * actual React nodes, so there's no HTML-injection surface from text an
 * owner typed into a public page.
 */
export function FormattedText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const blocks = text.split(/\n{2,}/).filter((block) => block.trim() !== "");

  return (
    <div className={className}>
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n").filter((line) => line.trim() !== "");
        const key = `block-${blockIndex}`;

        if (lines.every((line) => bulletPattern.test(line))) {
          return (
            <ul key={key} className="list-disc space-y-1 ps-5">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>
                  {parseInline(line.replace(bulletPattern, ""), `${key}-${lineIndex}`)}
                </li>
              ))}
            </ul>
          );
        }

        if (lines.every((line) => numberedPattern.test(line))) {
          return (
            <ol key={key} className="list-decimal space-y-1 ps-5">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>
                  {parseInline(line.replace(numberedPattern, ""), `${key}-${lineIndex}`)}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={key}>
            {lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 && <br />}
                {parseInline(line, `${key}-${lineIndex}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
