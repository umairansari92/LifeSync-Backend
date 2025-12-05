// utils/extractNoteData.js
export function extractNoteData(titleEditor, contentEditor, noteBg, tags = []) {
  if (!titleEditor || !contentEditor) return null;

  // Plain text
  const plainTitle = titleEditor.getText();
  const plainContent = contentEditor.getText();

  // Helper: get active attributes from editor marks
  const getActiveAttrs = (editor) => {
    const attrs = {};
    const marks = ["textStyle", "highlight"];
    marks.forEach((mark) => {
      if (editor.isActive(mark)) {
        Object.assign(attrs, editor.getAttributes(mark));
      }
    });
    return attrs;
  };

  const titleStyles = getActiveAttrs(titleEditor);
  const contentStyles = getActiveAttrs(contentEditor);

  // Final payload
  return {
    title: plainTitle,
    content: plainContent,
    styles: {
      title: titleStyles,
      content: contentStyles,
    },
    color: noteBg,
    tags,
  };
}
