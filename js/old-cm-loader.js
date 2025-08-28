(function() {
  // Wait for RC to be ready and ensure we're on compose
  var onready = function() {
    if (!window.rcmail || rcmail.env.task !== 'mail' || rcmail.env.action !== 'compose') return;
    if (!window.vimCmdLine) return;

    // Roundcube compose textarea ID is usually "composebody"
    var ta = document.getElementById('composebody');
    if (!ta) return;

    // Hide the HTML/plain toggle if present (we're managing the editor ourselves)
    var toggle = document.getElementById('compose-editor-switch');
    if (toggle) toggle.style.display = 'none';

    // Choose a mode. If you want plain text emails use 'null' or 'text/plain'.
    // For HTML composing set htmlmixed and later set the content-type accordingly.
    var mode = 'markdown'; // or 'null', 'text/plain', 'htmlmixed'
    var theme = 'neo';     // comment this line if you didn't include the theme CSS


    var cm = CodeMirror.fromTextArea(ta, {
      lineNumbers: true,
      lineWrapping: true,
      mode: mode,
      theme: theme,
      viewportMargin: Infinity, // better UX on long emails
      indentUnit: 2,
      tabSize: 2,
      keyMap: 'vim',
      indentWithTabs: false
    });

    // Make CodeMirror fill the message area nicely
    function fitHeight() {
      // Feel free to tweak this if your skin uses different paddings/layout
      var editorWrap = cm.getWrapperElement();
      editorWrap.style.minHeight = '300px';
      editorWrap.style.height = 'calc(100vh - 320px)';
    }
    fitHeight();
    window.addEventListener('resize', fitHeight);

    // Ensure Roundcube submits the latest content
    function syncBackToTextarea() {
      ta.value = cm.getValue();
    }

    // Hook into send & draft flows
    // 'beforesend' fires before sending; draft saves go through commands as well
    rcmail.addEventListener('beforesend', syncBackToTextarea);
    rcmail.addEventListener('before-savedraft', syncBackToTextarea);
    rcmail.addEventListener('before-autosave', syncBackToTextarea);

    // Also sync when switching identities (sometimes headers re-render)
    rcmail.addEventListener('change_identity', syncBackToTextarea);

    // If RC toggles editor state internally, keep our value in sync
    rcmail.addEventListener('aftertoggle-editor', function() {
      // Re-copy value from underlying textarea (in case RC swapped it)
      cm.setValue(ta.value || '');
      cm.refresh();
      fitHeight();
    });

    cm.on('keydown', function(_, e) { e.stopPropagation(); });

    function applyModeClass() {
      var st = cm.state.vim;
      console.log(cm.state.vim);
      if (!!(st && st.insertMode)) {
        window.vimCmdLine.insertMode();
      }
      if (!!(st && st.visualMode)) {
        if (st.visualLine) {
          window.vimCmdLine.visualLineMode();
        } else if (st.visualBlock) {
          window.vimCmdLine.visualBlockMode();
        } else {
          window.vimCmdLine.visualMode();
        }
      }
      if (!(st && (st.insertMode || st.visualMode))) {
        window.vimCmdLine.normalMode();
      }
    }
    cm.on('vim-mode-change', applyModeClass);
    applyModeClass();

    CodeMirror.Vim.defineAction('startEx', function() { window.vimCmdLine.focus(); });

    CodeMirror.Vim.mapCommand(':', 'action', 'startEx', { context: 'normal' });

    // Also allow ":" in visual modes (optional)
    CodeMirror.Vim.mapCommand(':', 'action', 'startEx', { context: 'visual' });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onready);
  } else {
    onready();
  }
})();

