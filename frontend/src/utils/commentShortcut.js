const COMMENT_PREFIX = "// ";

const getIndentLength = (line) => line.match(/^\s*/)?.[0].length || 0;

const isCtrlShiftA = (event) =>
  (event.ctrlKey || event.metaKey) &&
  event.shiftKey &&
  event.key.toLowerCase() === "a";

const getSelectedLineRange = (value, selectionStart, selectionEnd) => {
  const lineStart = value.lastIndexOf("\n", Math.max(selectionStart - 1, 0)) + 1;
  const adjustedEnd =
    selectionEnd > selectionStart && value[selectionEnd - 1] === "\n"
      ? selectionEnd - 1
      : selectionEnd;
  const nextLineBreak = value.indexOf("\n", adjustedEnd);

  return {
    start: lineStart,
    end: nextLineBreak === -1 ? value.length : nextLineBreak,
  };
};

const toggleLineComments = (value, selectionStart, selectionEnd) => {
  const range = getSelectedLineRange(value, selectionStart, selectionEnd);
  const selectedBlock = value.slice(range.start, range.end);
  const lines = selectedBlock.split("\n");
  const uncomment = lines
    .filter((line) => line.trim())
    .every((line) => line.slice(getIndentLength(line)).startsWith("//"));

  const edits = [];
  let offset = range.start;
  const nextLines = lines.map((line) => {
    if (!line.trim()) {
      offset += line.length + 1;
      return line;
    }

    const indentLength = getIndentLength(line);

    if (uncomment) {
      const marker = line.slice(indentLength).startsWith(COMMENT_PREFIX)
        ? COMMENT_PREFIX
        : "//";
      edits.push({ index: offset + indentLength, delta: -marker.length });
      offset += line.length + 1;
      return line.slice(0, indentLength) + line.slice(indentLength + marker.length);
    }

    edits.push({ index: offset + indentLength, delta: COMMENT_PREFIX.length });
    offset += line.length + 1;
    return line.slice(0, indentLength) + COMMENT_PREFIX + line.slice(indentLength);
  });

  const adjustSelection = (position) =>
    edits.reduce((nextPosition, edit) => {
      if (position > edit.index || (selectionStart === selectionEnd && position === edit.index)) {
        return nextPosition + edit.delta;
      }
      return nextPosition;
    }, position);

  const nextValue =
    value.slice(0, range.start) + nextLines.join("\n") + value.slice(range.end);

  return {
    value: nextValue,
    selectionStart: Math.max(range.start, adjustSelection(selectionStart)),
    selectionEnd: Math.max(range.start, adjustSelection(selectionEnd)),
  };
};

export const handleCommentShortcut = (event, updateValue) => {
  if (!isCtrlShiftA(event)) return false;

  event.preventDefault();

  const textarea = event.currentTarget;
  const { value, selectionStart, selectionEnd } = textarea;
  const next = toggleLineComments(value, selectionStart, selectionEnd);

  updateValue(next.value);

  requestAnimationFrame(() => {
    textarea.selectionStart = next.selectionStart;
    textarea.selectionEnd = next.selectionEnd;
  });

  return true;
};
