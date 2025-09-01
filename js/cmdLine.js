class CMDLine {
  constructor() {
    this.rc = window.rcmail;

    this.commands = [];

    this.currentMode = 'normal';
    this.helpOpened = false;
    this.helpLineHeight = 0;
    this.helpContainer = document.getElementById('vim-help-container');

    this.keybuf = [];
    this.clearKeyBufTimeout = 0;

    this.commandHistory = [];
    this.commandHistorySearchIndex = -1;
    this.cmdLine = document.getElementById('cmd');

    this.cmdLine.addEventListener('click', () => {
      this.focus();
    });

    this.cmdLine.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.normalMode();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = this.cmdLine.value;
        this.commandHistory.push(cmd);
        this.normalMode();
        this._runCommand(cmd);
        return;
      }

      if (e.key === 'ArrowUp') {
        this.commandHistorySearchIndex++;
        if (this.commandHistorySearchIndex > this.commandHistory.length - 1) {
          this.commandHistorySearchIndex = this.commandHistory.length - 1;
        }
        if (this.commandHistorySearchIndex === -1) {
          this.cmdLine.value = '';
        } else {
          this.cmdLine.value = this.commandHistory[(this.commandHistory.length - 1) - this.commandHistorySearchIndex];
        }
        setTimeout(() => { this.cmdLine.selectionStart = this.cmdLine.selectionEnd = 10000; }, 0);
        return;
      }

      if (e.key === 'ArrowDown') {
        this.commandHistorySearchIndex--;
        if (this.commandHistorySearchIndex < -1) this.commandHistorySearchIndex = -1
        if (this.commandHistorySearchIndex === -1) {
          this.cmdLine.value = '';
        } else {
          this.cmdLine.value = this.commandHistory[(this.commandHistory.length - 1) - this.commandHistorySearchIndex];
        }
        setTimeout(() => { this.cmdLine.selectionStart = this.cmdLine.selectionEnd = 10000; }, 0);
        return;
      }
    });

    document.addEventListener('keydown', (e) => {
      const k = e.key;
      if (k === ':') {
        if (window.isTyping(e)) {
          return;
        }
        e.preventDefault();
        this.focus();
      }

      if (!this.isHelpOpened()) {
        return;
      }

      const seq = this._feedKey(k);

      const jumpCmdRegex = /^.*?(\d+)([jk])$/;
      if (jumpCmdRegex.test(seq)) {
        e.preventDefault();
        const match = seq.match(jumpCmdRegex);
        if (!match) {
          return;
        }
        const direction = match[2] === 'j' ? 1 : -1;
        const times = parseInt(match[1], 10);
        let top = this.helpLineHeight * direction * times;
        this.helpContainer.scrollBy({ top, behavior: 'smooth' });
        this.keybuf.length = 0;
        return true;
      }

      // TODO: disable light theme
      // TODO: make an easter egg for :iusevim command

      if (seq.endsWith('gg')) {
        e.preventDefault();
        this.helpContainer.scrollTop = 0;
        this.keybuf.length = 0;
        return;
      }

      if (k === 'G') {
        e.preventDefault();
        this.helpContainer.scrollTop = this.helpContainer.scrollHeight;
      }

      if (k === 'j') {
        e.preventDefault();
        this.helpContainer.scrollBy({ top: this.helpLineHeight, behavior: 'smooth' });
      }

      if (k === 'k') {
        e.preventDefault();
        this.helpContainer.scrollBy({ top: -this.helpLineHeight, behavior: 'smooth' });
      }

      if (e.key === 'PageDown') {
        this.helpContainer.scrollBy({ top: this.helpContainer.clientHeight * 0.9, behavior: 'smooth' })
      }

      if (e.ctrlKey && (e.key === 'd' || e.key === 'D')) {
        this.helpContainer.scrollBy({ top: this.helpContainer.clientHeight * 0.5, behavior: 'smooth' })
      }

      if (e.key === 'PageUp') {
        this.helpContainer.scrollBy({ top: -this.helpContainer.clientHeight * 0.9, behavior: 'smooth' })
      }

      if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
        this.helpContainer.scrollBy({ top: -this.helpContainer.clientHeight * 0.5, behavior: 'smooth' })
      }
    });

    this.registerCommandsParser((line) => {
      const raw = (line || '').trim();
      if (!raw) {
        return;
      }
      const m = raw.match(/^([a-zA-Z]+!?)(?:\s+([\s\S]+))?$/);
      if (!m) {
        return false;
      }
      const cmd = m[1].toLowerCase();
      const arg = (m[2] || '').trim();

      switch (cmd) {
				case 'iusevimbtw':
				case 'iusevim':
					this.showMessage('"Superior Developer" mode activated.');
					return true;
        case 'q':
        case 'wq':
        case 'wq!':
        case 'q!':
        case 'x':
        case 'x!':
          if (!this.isHelpOpened()) {
            return false;
          }
          this._closeHelp();
          return true;
        case 'help':
          this._openHelp();
          return true;
        case 'e':
          if (arg.toLowerCase().includes('@')) {

            if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(arg.toLowerCase())) {
              this.rc.command('compose', arg);
              return true;
            }

            throw new Error(`E486: email not valid: ${arg}`);
          }
          let folder = arg.toLowerCase() === 'inbox' ? 'INBOX' : String(arg).charAt(0).toUpperCase() + String(arg.toLowerCase()).slice(1);
          this.rc.command('list', folder);
          return true;
      }
    });
  }

  _feedKey(key) {
    this.keybuf.push(key);
    this._clearKeyBufTimeout();
    return this.keybuf.join('');
  }

  _clearKeyBufTimeout() {
    clearTimeout(this.clearKeyBufTimeout);
    this.clearKeyBufTimeout = setTimeout(() => this.keybuf.length = 0, 500);
    return this.clearKeyBufTimeout;
  }

  getLineHeight(el) {
    var temp = document.createElement(el.nodeName), ret;
    temp.setAttribute("style", "margin:0; padding:0; "
      + "font-family:" + (el.style.fontFamily || "inherit") + "; "
      + "font-size:" + (el.style.fontSize || "inherit"));
    temp.innerHTML = "A";

    el.parentNode.appendChild(temp);
    ret = temp.clientHeight;
    temp.parentNode.removeChild(temp);

    return ret;
  }

  _openHelp() {
    this.helpOpened = true;
    document.getElementById('vim-help').classList.remove('hidden');
    this.helpLineHeight = this.getLineHeight(this.helpContainer);
    this.helpContainer.focus();
  }

  _closeHelp() {
    this.helpOpened = false;
    document.getElementById('vim-help').classList.add('hidden');
  }

  isHelpOpened() {
    return this.helpOpened;
  }

  visualMode() {
    this._resetError();
    this.currentMode = 'visual';
    this.cmdLine.value = '-- VISUAL --';
  }

  visualLineMode() {
    this._resetError();
    this.currentMode = 'visual-line';
    this.cmdLine.value = '-- VISUAL LINE --';
  }

  visualBlockMode() {
    this._resetError();
    this.currentMode = 'visual-block';
    this.cmdLine.value = '-- VISUAL BLOCK --';
  }

  normalMode() {
    this.currentMode = 'normal';
    document.querySelector('#vim-cmdline-inner>.prefix').classList.add('hidden');
    this.cmdLine.value = '';
    this.cmdLine.blur();
  }

  insertMode() {
    this._resetError();
    this.currentMode = 'insert';
    this.cmdLine.value = '-- INSERT --';
  }

  showMessage(msg) {
    this.cmdLine.value = msg;
  }


  _runCommand(cmd) {
    console.log(`got cmd ${cmd}`);
    const normalizedCommand = (cmd.indexOf(':') === 0 ? cmd.replace(':', '') : cmd).toLowerCase();

    try {
      for (const parser of this.commands) {
        if (parser(normalizedCommand)) {
          return;
        }
      }
    } catch (e) {
      console.error(e);
      this._showError(e.message);
      return;
    }

    this._showError(`E492: Not a Webmail command: ${cmd}`);
  }

  _showError(error) {
    document.getElementById('vim-cmdline-inner').classList.add('hidden');
    document.getElementById('vim-cmdline-error').classList.remove('hidden');
    document.querySelector('#vim-cmdline-error>span').innerHTML = error;
  }

  _resetError() {
    document.getElementById('vim-cmdline-inner').classList.remove('hidden');
    document.getElementById('vim-cmdline-error').classList.add('hidden');
  }

  focus() {
    if (this.currentMode === 'insert') {
      return;
    }
    this.cmdLine.value = '';
    this._resetError();
    document.querySelector('#vim-cmdline-inner>.prefix').classList.remove('hidden');
    this.cmdLine.focus();
  }

  reset() {
    this.commandHistory = [];
    this.commandHistorySearchIndex = -1;
  }

  registerCommandsParser(parser) {
    this.commands.push(parser);
  }
}

window.vimCmdLine = new CMDLine();
