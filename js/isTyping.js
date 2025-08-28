  window.isTyping = (ev) => {
    if (!ev) {
      return false;
    }
    const t = ev.target;
    if (!t) {
      return false;
    }
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable || t.closest('.cm-editor, .CodeMirror'));
  }
