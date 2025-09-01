class VimCommandsMailListView {

  constructor() {
    this.rc = window.rcmail;
    this.cmdLine = window.vimCmdLine;

    if (!['mail', 'folder'].includes(this.rc.env.task) || this.rc.env.action !== '') {
      return;
    }

    this.focusOn = 'message_list'; // message_list || folder_list

    this.keybuf = [];
    this.clearKeyBufTimeout = 0;

    this.jumpCmdRegex = /^.*?(\d+)([jk])$/;
    this.windowCmdRegex = /^.*?(Controlw)([hl])$/;
    this.halfPageJumpCmdRegex = /^.*?(Control)([ud])$/;

    this.lastSelectedUid = null;

    this.rc.addEventListener('init', () => {
      document.addEventListener('keydown', this._onKeyDown.bind(this));
    });
    this.rc.addEventListener('listupdate', () => {
      this._toggleFocus('message_list');
    });
    this.cmdLine.registerCommandsParser((line) => {
      if (this.cmdLine.isHelpOpened()) {
        return false;
      }

      if (line === 'q') {
        this.cmdLine.showMessage('Are you sure you want to logout? if yes - use q!');
        return true;
      }

      if (['q!', 'wq', 'x', 'qa!'].includes(line.toLowerCase())) {
        this.rc.command('logout');
        return true;
      }
    });
  }

  _toggleFocus(forceFocus = null) {
    this.focusOn = forceFocus ? forceFocus : this.focusOn === 'message_list' ? 'folder_list' : 'message_list';
    if (this.focusOn === 'message_list') {

      this._selectRow('first');
    } else {
      this.rc.message_list.blur();
      this.rc.message_list.clear_selection();
    }

    document.getElementById('messagelist').classList[this.focusOn === 'message_list' ? 'add' : 'remove']('vimkeys-focus-block');
    document.getElementById('mailboxlist').classList[this.focusOn === 'folder_list' ? 'add' : 'remove']('vimkeys-focus-block');
  }

  _switchToVisualMode() {
    if (this.focusOn === 'folder_list') {
      return;
    }

    this.cmdLine.visualMode();
  }

  _switchToNormalMode() {
    if (this.focusOn === 'message_list') {
      this.rc.message_list.clear_selection();
      if (this.lastSelectedUid) {
        this.rc.message_list.select_row(this.lastSelectedUid, null, false);
      } else {
        this._selectRow('first');
      }
    }
    document.getElementById('cmd').value = '';
  }

  _clearKeyBufTimeout() {
    clearTimeout(this.clearKeyBufTimeout);
    this.clearKeyBufTimeout = setTimeout(() => this.keybuf.length = 0, 500);
    return this.clearKeyBufTimeout;
  }

  _feedKey(key) {
    this.keybuf.push(key);
    this._clearKeyBufTimeout();
    return this.keybuf.join('');
  }

  _selectRowOnMessageList(cmd, jumpCount = 1) {
    const ml = this.rc.message_list;
    let next;

    if (cmd === 'next' || cmd === 'prev') {
      while (jumpCount > 0) {
        next = ml[cmd === 'next' ? 'get_next_row' : 'get_prev_row'](next ? next.uid : null);
        jumpCount--;
      }
    }

    if (cmd === 'first' || cmd === 'last') {
      next = ml[cmd === 'first' ? 'select_first' : 'select_last']();
    }

    if (next) {
      ml.select_row(next.uid, this.cmdLine.currentMode === 'visual' ? 2 : null, false);
      this.lastSelectedUid = next.uid;
    }
  }

  _selectRowOnFolderList(cmd, jumpCount = 1) {
    const tl = this.rc.treelist;
    let next;
    if (cmd === 'next' || cmd === 'prev') {
      while (jumpCount > 0) {
        next = tl[cmd === 'next' ? 'get_next' : 'get_prev']();
        jumpCount--;
      }
    }

    if (cmd === 'first' || cmd === 'last') {
      this.rc.command('list', cmd === 'first' ? 'INBOX' : 'Trash');
      return;
    }

    if (next) {
      tl.select(next);
      this.rc.command('list', tl.get_selection());
    }
  }

  _selectRow(cmd, jumpCount = 1) {
    console.log('select_row');
    if (this.focusOn === 'message_list') {
      this._selectRowOnMessageList(cmd, jumpCount);
      return;
    }

    this._selectRowOnFolderList(cmd, jumpCount);
  }

  _fastSwitchFolder(folder) {
    const onUpdate = (ev) => {
      // ev.folder is the folder that just finished loading
      if (!ev || ev.folder !== folder) return;
      this.rc.removeEventListener('listupdate', onUpdate);
      this._toggleFocus('message_list');
    };
    this.rc.addEventListener('listupdate', onUpdate);
    this.rc.command('list', folder);
  }

  _folderFastNavigation(e, seq) {
    if (seq === 'gi') {
      e.preventDefault();
      this._fastSwitchFolder('INBOX');
      this.keybuf.length = 0;
      return true;
    }

    if (seq === 'gs') {
      e.preventDefault();
      this._fastSwitchFolder('Sent');
      this.keybuf.length = 0;
      return true;
    }

    if (seq === 'gd') {
      e.preventDefault();
      this._fastSwitchFolder('Drafts');
      this.keybuf.length = 0;
      return true;
    }

    if (seq === 'gj') {
      e.preventDefault();
      this._fastSwitchFolder('Junk');
      this._toggleFocus('message_list');
      return true;
    }

    if (seq === 'gt') {
      e.preventDefault();
      this._fastSwitchFolder('Trash');
      this.keybuf.length = 0;
      return true;
    }

    return false;
  }

  _parseKeyCombo(regex, str) {
    const match = str.match(regex);
    if (match) {
      return {
        number: parseInt(match[1], 10),
        endLetter: match[2]
      };
    }
    return null;
  }
  
  _comboKeyCommand(e, seq) {
    if (this.jumpCmdRegex.test(seq)) {
      e.preventDefault();
      const jumpCombo = this._parseKeyCombo(this.jumpCmdRegex, seq);
      this._selectRow(jumpCombo.endLetter === 'j' ? 'next' : 'prev', jumpCombo.number);
      this.keybuf.length = 0;
      return true;
    }

    if (this.windowCmdRegex.test(seq)) {
      e.preventDefault();
      this._toggleFocus();
      this.keybuf.length = 0;
      return true;
    }

    if (this.halfPageJumpCmdRegex.test(seq)) {
      e.preventDefault();
      const halfPageJumpCombo = this._parseKeyCombo(halfPageJumpCmdRegex, seq);
      const container = document.querySelector('#messagelist-content');
      // TODO: calculate 20 from visible height and visible rows/2
      this._selectRow(halfPageJumpCombo.endLetter === 'd' ? 'next' : 'prev', 20);
      if (container) {
        container.scrollBy({ top: (halfPageJumpCombo.endLetter === 'd' ? 1 : -1) * (container.clientHeight / 2), behavior: 'smooth' });
      }
      return true;
    }

    return false;
  }

  _simpleCommand(e, seq, k) {
    if (seq === 'gg') {
      e.preventDefault();
      this._selectRow('first');
      this.keybuf.length = 0;
      return true;
    }

    if (k === 'G') {
      e.preventDefault();
      this._selectRow('last');
      this.keybuf.length = 0;
      return true;
    }

    if (k === 'j') {
      e.preventDefault();
      this._selectRow('next');
      return true;
    }

    if (k === 'k') {
      e.preventDefault();
      this._selectRow('prev');
      return;
    }

    if (k === 'Enter' || k === 'o') {
      e.preventDefault();
      this.rc.command('show');
      return true;
    }

    if (k === 'V' || k === 'v') {
      e.preventDefault();
      this._switchToVisualMode();
      return true;
    }

    if (seq === 'dd') {
      e.preventDefault();
      this.rc.command('delete');
      this.keybuf.length = 0;
      return true;
    }

    if (k === 'D') {
      e.preventDefault();
      this.rc.command('delete', 'purge');
      return true;
    }

    // if (k === 's') { e.preventDefault(); RC.command('toggle_flag'); return; }
    // if (k === 'a') { e.preventDefault(); RC.command('archive'); return; }
    if (k === 'u') { 
      e.preventDefault();
      this.rc.command('mark', 'read');
      return true;
    }
    if (k === 'U') {
      e.preventDefault();
      this.rc.command('mark', 'unread');
      return true;
    }

    if (k === 'c') {
      e.preventDefault();
      this.rc.command('compose');
      return true;
    }
    if (k === 'r') {
      e.preventDefault();
      this.rc.command('reply');
      return true;
    }
    if (k === 'R') {
      e.preventDefault();
      this.rc.command('reply-all');
      return true;
    }
    if (k === 'f') {
      e.preventDefault();
      this.rc.command('forward');
      return true;
    }

    if (k === '/') {
      e.preventDefault();
      const s = document.querySelector('#mailsearchform');
      if (s) {
        s.focus();
        s.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            s.blur();
          }
        });
      }
      return;
    }

    if (k === 'Escape') {
      this._switchToNormalMode();
      const active = document.activeElement;
      if (active) {
        active.blur();
      }
      return;
    }
  }

  _onKeyDown(e) {
    if (this.cmdLine.isHelpOpened()) {
      return;
    }
    if (window.isTyping(e)) {
      return;
    }

    const k = e.key;
    const seq = this._feedKey(k);

    console.log(`seq is ${seq} k is ${k}`);

    if (this._comboKeyCommand(e, seq)) {
      return;
    }

    if (this._folderFastNavigation(e, seq)) {
      return;
    }

    if (this._simpleCommand(e, seq, k)) {
      return;
    }
  }
}

(() => {
  const onready = () => {
    if (!window.vimCommandsMaillistView) {
      window.vimCommandsMaillistView = new VimCommandsMailListView();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onready);
  } else {
    onready();
  }
})();
