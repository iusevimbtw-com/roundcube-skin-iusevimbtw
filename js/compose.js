window.mobileAndTabletCheck = function() {
  let check = false;
  (function(a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true; })(navigator.userAgent || navigator.vendor || window.opera);
  return check;
};

class VimCommandsComposeView {
  constructor() {
    if (window.innerWidth <= 1024 || mobileAndTabletCheck()) {
      return;
    }
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

    this.cm.on('keydown', (_, e) => {
      if (this.cmdLine.isHelpOpened()) {
        return;
      }
      e.stopPropagation();
    });

    this.cm.on('vim-mode-change', this._changeMode.bind(this));
    this._changeMode();

    CodeMirror.Vim.defineAction('startEx', () => { this.cmdLine.focus(); });

    CodeMirror.Vim.mapCommand(':', 'action', 'startEx', { context: 'normal' });
    CodeMirror.Vim.mapCommand(':', 'action', 'startEx', { context: 'visual' });

    this.cmdLine.registerCommandsParser(this._parseCommand.bind(this));

    document.addEventListener('keydown', (e) => {
      if (this.cmdLine.isHelpOpened()) {
        return;
      }
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
        return isCurrent ? String(line) + '\u2002' : String(rel);
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

    // TODO: global help command

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
          throw new Error(`E518: Email address is invalid`);
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
          throw new Error(`E518: Email address is invalid`);
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
          throw new Error(`E518: Email address is invalid`);
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

