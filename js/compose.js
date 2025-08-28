class VimCommandsComposeView {
  constructor() {
    this.rc = window.rcmail;
    this.cmdLine = window.vimCmdLine;

    this.textStateDirty = false;

    this.rcEditor = document.getElementById('composebody');

    const existingHtmlToggle = document.getElementById('compose-editor-switch');
    // disable existing html compose toggle if present. (we will control this)
    if (existingHtmlToggle) existingHtmlToggle.style.display = 'none';

    this.cm = CodeMirror.fromTextArea(this.rcEditor, {
      lineNumbers: true,
      lineWrapping: true,
      mode: 'markdown',
      theme: 'neo',
      viewportMargin: Infinity, // better UX on long emails
      indentUnit: 2,
      tabSize: 2,
      keyMap: 'vim',
      indentWithTabs: false
    });

    setTimeout(() => {
      this.focusEditor();
    }, 50);

    this.cm.on("change", () => {
      this.textStateDirty = true;
    });

    window.addEventListener('resize', this._fixHeight.bind(this));
    this._fixHeight();

    this.rc.addEventListener('beforesend', this._sync.bind(this));
    this.rc.addEventListener('before-savedraft', this._sync.bind(this));
    this.rc.addEventListener('before-autosave', this._sync.bind(this));
    this.rc.addEventListener('change_identity', this._sync.bind(this));

    // If RoundCube toggles editor state internally, keep our value in sync
    this.rc.addEventListener('aftertoggle-editor', () => {
      // Re-copy value from underlying textarea (in case RC swapped it)
      this.cm.setValue(this.rcEditor.value || '');
      this.cm.refresh();
      this._fixHeight();
    });

    this.cm.on('keydown', function(_, e) { e.stopPropagation(); });

    this.cm.on('vim-mode-change', this._changeMode.bind(this));
    this._changeMode();

    CodeMirror.Vim.defineAction('startEx', () => { this.cmdLine.focus(); });

    CodeMirror.Vim.mapCommand(':', 'action', 'startEx', { context: 'normal' });
    CodeMirror.Vim.mapCommand(':', 'action', 'startEx', { context: 'visual' });

    this.cmdLine.registerCommandsParser(this._parseCommand.bind(this));

    document.addEventListener('keydown', (e) => {
      if (window.isTyping(e)) {
        console.log(e.key);
        if (e.key === 'Escape') {
          e.target.blur();
        }
        return;
      }

      if (e.key === 'i' && this.cmdLine.currentMode === 'normal') {
        this.focusEditor();
        this.cmdLine.insertMode();
      }
    });

    this.cm.state.absNumbers = true;
    this.cm.state.relativeLines = true;

    this.cm.on('cursorActivity', this._refreshHybridNumbers.bind(this));
    this._refreshHybridNumbers();

    const cmdEl = document.getElementById('cmd');
    if (cmdEl) {
      cmdEl.addEventListener('focus', () => {
        this.cm.getWrapperElement().classList.add('cm-ghost');
      });
      cmdEl.addEventListener('blur', () => {
        this.cm.getWrapperElement().classList.remove('cm-ghost');
        this.focusEditor();
      });
    }
  }

  _applyLineNumberFormatter() {
    var cur = this.cm.getCursor().line + 1;
    this.cm.setOption('lineNumberFormatter', (line) => {
      const isCurrent = (line === cur);
      const rel = Math.abs(line - cur);
      if (this.cm.state.absNumbers && this.cm.state.relativeLines) {
        return isCurrent ? String(line) : String(rel);
      }
      if (this.cm.state.absNumbers && !this.cm.state.relativeLines) {
        return String(line);
      }
      if (!this.cm.state.absNumbers && this.cm.state.relativeLines) {
        return String(rel); // current 0
      }
      return String(line); // keep gutter stable
    });
  }

  _refreshHybridNumbers() {
    this._applyLineNumberFormatter();
    this.cm.refresh();
  }

  _resetTextState() {
    this.textStateDirty = false;
  }

  focusEditor() {
    this.cm.focus();
  }

  _changeMode() {
    const st = this.cm.state.vim;
    if (!!(st && st.insertMode)) {
      this.cmdLine.insertMode();
    }
    if (!!(st && st.visualMode)) {
      if (st.visualLine) {
        this.cmdLine.visualLineMode();
      } else if (st.visualBlock) {
        this.cmdLine.visualBlockMode();
      } else {
        this.cmdLine.visualMode();
      }
    }
    if (!(st && (st.insertMode || st.visualMode))) {
      this.cmdLine.normalMode();
    }
  }

  _fixHeight() {
    const editorWrap = this.cm.getWrapperElement();
    editorWrap.style.minHeight = '300px';
    editorWrap.style.height = 'calc(100vh - 320px)';
  }

  _sync() {
    this.rcEditor.value = this.cm.getValue();
  }

  _setEmailHeader(name, value, replace) {
    const el = document.getElementById(name);
    if (!el) {
      throw new Error(`E447: Can't find field ${name} in message headers`);
    }
    if (replace || !el.value) {
      el.value = value;
    } else {
      const inputValue = el.value.split(',');
      inputValue.push(value);
      el.value = inputValue.join(', ');
    }
    el.dispatchEvent(new Event('change'));
    return true;
  }

  _isValidEmail(email) {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  }

  _parseCommand(line) {
    var raw = (line || '').trim();
    if (!raw) {
      return;
    }
    var m = raw.match(/^([a-zA-Z]+!?)(?:\s+([\s\S]+))?$/);
    if (!m) {
      return false;
    }
    var cmd = m[1].toLowerCase();
    var arg = (m[2] || '').trim();

    // TODO: add cmdLine confirmation of operation and loading state
    // TODO: global help command
    // TODO: styles (grey is brrr on buttons)

    switch (cmd) {
      case 'w':
      case 'draft':
        this._sync();
        this.rc.command('savedraft');
        this.cmdLine.showMessage('Draft saved');
        this._resetTextState();
        return true;
      case 'x':
      case 'wq':
      case 'send':
      case 'wq!':
      case 'x!':
        this._sync();
        this.rc.command('send', {});
        this.cmdLine.showMessage('Sending…');
        return true;
      case 'q':
        if (this.textStateDirty) {
          this.cmdLine.showMessage('Use :q! to close without saving');
          return true;
        }
        this.rc.command('list', 'INBOX');
        return true;
      case 'q!':
        this.rc.command('list', 'INBOX');
        return true;

      // headers
      case 'to':
      case 'to!':
        if (!arg) {
          this.cmdLine.showMessage('Usage: :to[!] address');
          return true;
        }
        if (!this._isValidEmail(arg)) {
          throw new Error(`E518 Email address is invalid`);
        }
        var rep = cmd.endsWith('!');
        this._setEmailHeader('_to', arg, rep);
        this.cmdLine.showMessage((rep ? 'Set' : 'Added') + ' To');
        return true;
      case 'cc':
      case 'cc!':
        if (!arg) {
          msg('Usage: :cc[!] address', 'warning');
          return true;
        }
        if (!this._isValidEmail(arg)) {
          throw new Error(`E518 Email address is invalid`);
        }
        var repc = cmd.endsWith('!');
        this._setEmailHeader('_cc', arg, repc);
        this.cmdLine.showMessage((repc ? 'Set' : 'Added') + ' Cc');
        return true;
      case 'bcc':
      case 'bcc!':
        if (!arg) {
          this.cmdLine.showMessage('Usage: :bcc[!] address');
          return true;
        }
        if (!this._isValidEmail(arg)) {
          throw new Error(`E518 Email address is invalid`);
        }
        var repb = cmd.endsWith('!');
        this._setEmailHeader('_bcc', arg, repb);
        this.cmdLine.showMessage((repb ? 'Set' : 'Added') + ' Bcc');
        return true;
      case 'subj':
      case 'subj!':
        if (!arg) {
          this.cmdLine.showMessage('Usage: :subj[!] text');
          return true;
        }
        var el = document.querySelector('[name="_subject"]');
        if (el) {
          if (cmd.endsWith('!')) {
            el.value = arg;
          } else {
            el.value = (el.value ? el.value + ' ' : '') + arg;
          }
          el.dispatchEvent(new Event('change'));
        }
        this.cmdLine.showMessage('Subject ' + (cmd.endsWith('!') ? 'set' : 'appended'));
        return true;

      // settings
      case 'set':
        if (/^(?:nu|number)$/.test(arg)) {
          this.cm.state.absNumbers = true;
          this._refreshHybridNumbers();
          this.cmdLine.showMessage(`:${cmd} ${arg}`);
          return true;
        }
        if (/^(?:nonu|nonumber)$/.test(arg)) {
          this.cm.state.absNumbers = false;
          this._refreshHybridNumbers();
          this.cmdLine.showMessage(`:${cmd} ${arg}`);
          return true;
        }
        if (/^(?:rnu|relativenumber)$/.test(arg)) {
          this.cm.state.relativeLines = true;
          this._refreshHybridNumbers();
          this.cmdLine.showMessage(`:${cmd} ${arg}`);
          return true;
        }
        if (/^(?:nornu|norelativenumber)$/.test(arg)) {
          this.cm.state.relativeLines = false;
          this._refreshHybridNumbers();
          this.cmdLine.showMessage(`:${cmd} ${arg}`);
          return true;
        }
        throw new Error('Usage: :set [no]number | [no]relativenumber');

      case 'help':
        this.cm.openDialog(
          '<div style="white-space:pre;max-height:50vh;overflow:auto">'
          + [
            'Ex (compose):',
            ':w              save draft',
            ':x | :wq | :send   send',
            ':q | :q!        close (warn) | close without saving',
            ':to[:!]  addr   add/replace To',
            ':cc[:!]  addr   add/replace Cc',
            ':bcc[:!] addr   add/replace Bcc',
            ':subj[:!] text  append/set subject',
            ':e addr         set To = addr',
            ':set html|plain',
            ':set [no]number | [no]relativenumber',
            '',
            'Tips: ZZ send, ZQ cancel, <C-Enter> send'
          ].join('\n')
          + '</div><br><em>Esc to close</em>', null, { bottom: true }
        );
        break;

      default:
        return false;
    }
  }
}

(() => {
  const onready = () => {
    if (!window.vimCommandsComposeView) {
      window.vimCommandsComposeView = new VimCommandsComposeView();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onready);
  } else {
    onready();
  }
})();

