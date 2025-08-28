class CMDLine {
  constructor() {
    this.commands = [];
    this.globalCommands = [];

    this.currentMode = 'normal';

    this.commandHistory = [];
    this.commandHistorySearchIndex = -1;
    this.cmdLine = document.getElementById('cmd');

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
        if (window.isTyping(e) || this.currentMode === 'insert') {
          return;
        }
        e.preventDefault();
        this.cmdLine.value = '';
        this.focus();
      }
    });
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
      for (const parser of this.globalCommands) {
        if (parser(normalizedCommand)) {
          return;
        }
      }

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

  registerGlobalCommandsParser(parser) {
    this.globalCommands.push(parser);
  }

  registerRegexCommand(regex, fn, parser) {
    this.regexCommands[regex] = {
      regex,
      fn,
      parser,
    };
  }

}

window.vimCmdLine = new CMDLine();
