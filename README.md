# iusevimbtw skin for Roundcube Webmail

*iusevimbtw* stands for **"I'm a better developer than you"**.  
iusevimbtw webmail is powered by [Roundcube](https://roundcube.net) and the [Elastic skin](https://roundcube.net/screens/).  
Heavily upgraded by [our team](https://team.iusevimbtw.com) to provide the keystrokes you all know.  

---

## MESSAGE LIST VIEW

This view supports:
- **Normal mode** (`Esc`)
- **Ex mode** (`:`)
- **Visual mode** (`Shift+v | v`)
- **Search mode** (`/`)

### In Ex-mode
- `:e <folder name>` → Open a folder.  
- `:e <email>` → Compose a new email.  
- `:(q | q! | wq | x | qa!)` → Logout.  

### In Normal mode
- `gi` → Inbox  
- `gd` → Drafts  
- `gs` → Sent  
- `gj` → Spam  
- `gt` → Deleted Items  
- `j` → Select next item  
- `k` → Select previous item  
- `gg` → Select first item  
- `G` → Select last item  
- `<C-d>` → Jump half a page down  
- `<C-u>` → Jump half a page up  
- `<C-w>(h|l)` → Switch focus between email list and folder list  
- `Shift + V` → Start Visual mode  
- `dd` → Move selected message(s) to Deleted Items  
- `D` → Purge selected message(s)  
- `u` → Mark selected message(s) as read  
- `U` → Mark selected message(s) as unread  
- `r` → Reply to selected message  
- `R` → Reply-all to selected message  
- `f` → Forward selected message  
- `/` → Start a search  

---

## COMPOSE VIEW

- Enter **Insert mode** (`i`) to type a message.  
- Exit to **Normal mode** to navigate with Vim motions.  
- Press `:` to enter **Ex-mode**.  
- Use **Visual, Visual Line, and Visual Block mode** while composing.  

### In Ex-mode
- `:w` → Save draft  
- `:(x | wq | wq! | x!)` → Send message & go to Inbox  
- `:q` → Switch to mail list  
- `:to <email>` → Append to "To" field  
- `:to! <email>` → Set "To" field  
- `:cc <email>` → Append to "Cc" field  
- `:cc! <email>` → Set "Cc" field  
- `:bcc <email>` → Append to "Bcc" field  
- `:bcc! <email>` → Set "Bcc" field  
- `:subj <text>` → Append to Subject  
- `:subj! <text>` → Set Subject  
- `:set (nu | number)` → Show line numbers  
- `:set (rnu | relativenumber)` → Show relative line numbers  
- `:set (nonu | nonumber)` → Hide line numbers  
- `:set (nornu | norelativenumber)` → Hide relative line numbers  

---

**Modes available:**  
- Normal (`Esc`)  
- Insert (`i`)  
- Visual (`v | Shift+v | Ctrl+v`)  

