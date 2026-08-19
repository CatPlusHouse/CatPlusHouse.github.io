(function (Scratch) {
  'use strict';
  if (typeof Scratch === 'undefined') return;

  const ArgumentType = Scratch.ArgumentType;
  const BlockType = Scratch.BlockType;

  // Internal console capture
  const _logs = [];
  const originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console)
  };

  function addLog(type, args) {
    try {
      const text = Array.prototype.slice.call(args).map((v) => {
        try { return typeof v === 'string' ? v : JSON.stringify(v); } catch (e) { return String(v); }
      }).join(' ');
      const entry = { type: type, text: text, ts: Date.now() };
      _logs.push(entry);
      // keep buffer bounded
      if (_logs.length > 1000) _logs.shift();
      _renderOverlayEntry(entry);
    } catch (e) {
      // ignore
    }
  }

  // Wrap console methods so that logs from page code are captured too
  console.log = function () { addLog('log', arguments); originalConsole.log.apply(null, arguments); };
  console.warn = function () { addLog('warn', arguments); originalConsole.warn.apply(null, arguments); };
  console.error = function () { addLog('error', arguments); originalConsole.error.apply(null, arguments); };

  // Overlay UI for viewing captured logs in-page
  let _overlay = null;
  let _overlayVisible = false;

  function _createOverlay() {
    if (_overlay) return _overlay;
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.right = '12px';
    div.style.bottom = '12px';
    div.style.width = '420px';
    div.style.maxHeight = '60vh';
    div.style.overflow = 'auto';
    div.style.background = 'rgba(20,20,20,0.95)';
    div.style.color = 'white';
    div.style.fontFamily = 'monospace';
    div.style.fontSize = '12px';
    div.style.padding = '8px';
    div.style.borderRadius = '8px';
    div.style.zIndex = 999999;
    div.style.boxShadow = '0 6px 20px rgba(0,0,0,0.6)';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '6px';

    const title = document.createElement('div');
    title.textContent = 'JS Runner Console';
    title.style.fontWeight = '700';
    title.style.fontSize = '13px';

    const btns = document.createElement('div');

    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear';
    clearBtn.style.marginRight = '6px';
    clearBtn.onclick = () => { _logs.length = 0; _refreshOverlay(); };

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.onclick = () => { _toggleOverlay(false); };

    [clearBtn, closeBtn].forEach(b => {
      b.style.background = '#333';
      b.style.color = 'white';
      b.style.border = '1px solid #555';
      b.style.padding = '4px 8px';
      b.style.borderRadius = '4px';
      b.style.cursor = 'pointer';
    });

    btns.appendChild(clearBtn);
    btns.appendChild(closeBtn);

    header.appendChild(title);
    header.appendChild(btns);

    const content = document.createElement('div');
    content.style.maxHeight = '50vh';
    content.style.overflow = 'auto';
    content.style.whiteSpace = 'pre-wrap';

    div.appendChild(header);
    div.appendChild(content);

    // attach
    document.body.appendChild(div);
    _overlay = { root: div, content: content };
    _refreshOverlay();
    return _overlay;
  }

  function _renderOverlayEntry(entry) {
    if (!_overlay || !_overlay.content) return;
    const line = document.createElement('div');
    line.textContent = '[' + new Date(entry.ts).toLocaleTimeString() + '] ' + entry.type.toUpperCase() + ': ' + entry.text;
    line.style.padding = '2px 0';
    if (entry.type === 'warn') line.style.color = 'orange';
    if (entry.type === 'error') line.style.color = '#ff6b6b';
    _overlay.content.appendChild(line);
    // keep scroll
    _overlay.content.scrollTop = _overlay.content.scrollHeight;
  }

  function _refreshOverlay() {
    if (!_overlay) return;
    _overlay.content.innerHTML = '';
    _logs.forEach(_renderOverlayEntry);
  }

  function _toggleOverlay(visible) {
    if (typeof visible === 'undefined') visible = !_overlayVisible;
    if (visible) {
      _createOverlay();
      _overlay.root.style.display = 'block';
      _overlayVisible = true;
      _refreshOverlay();
    } else {
      if (_overlay && _overlay.root) _overlay.root.style.display = 'none';
      _overlayVisible = false;
    }
  }

  class JSEvalExtension {
    getInfo() {
      return {
        id: 'jseval_ext',
        name: 'JS Runner',
        blocks: [
          {
            opcode: 'evalJs',
            blockType: BlockType.REPORTER,
            text: 'js (code)',
            arguments: {
              code: { type: ArgumentType.STRING, defaultValue: '1+1' }
            }
          },
          {
            opcode: 'runJs',
            blockType: BlockType.COMMAND,
            text: 'run js (code)',
            arguments: {
              code: { type: ArgumentType.STRING, defaultValue: 'console.log("hello")' }
            }
          },
          {
            opcode: 'consoleLog',
            blockType: BlockType.COMMAND,
            text: 'console log (message)',
            arguments: { message: { type: ArgumentType.STRING, defaultValue: 'hello' } }
          },
          {
            opcode: 'consoleWarn',
            blockType: BlockType.COMMAND,
            text: 'console warn (message)',
            arguments: { message: { type: ArgumentType.STRING, defaultValue: 'be careful' } }
          },
          {
            opcode: 'consoleError',
            blockType: BlockType.COMMAND,
            text: 'console error (message)',
            arguments: { message: { type: ArgumentType.STRING, defaultValue: 'uh oh' } }
          },
          {
            opcode: 'consoleGet',
            blockType: BlockType.REPORTER,
            text: 'get console (count)',
            arguments: { count: { type: ArgumentType.NUMBER, defaultValue: 10 } }
          },
          {
            opcode: 'consoleClear',
            blockType: BlockType.COMMAND,
            text: 'clear console'
          },
          {
            opcode: 'consoleShow',
            blockType: BlockType.COMMAND,
            text: 'show console'
          },
          {
            opcode: 'alertBlock',
            blockType: BlockType.COMMAND,
            text: 'alert (message)',
            arguments: { message: { type: ArgumentType.STRING, defaultValue: 'hi' } }
          },
          {
            opcode: 'confirmBlock',
            blockType: BlockType.REPORTER,
            text: 'confirm (message)',
            arguments: { message: { type: ArgumentType.STRING, defaultValue: 'are you sure?' } }
          },
          {
            opcode: 'promptBlock',
            blockType: BlockType.REPORTER,
            text: 'prompt (message) (default)',
            arguments: {
              message: { type: ArgumentType.STRING, defaultValue: 'enter something' },
              def: { type: ArgumentType.STRING, defaultValue: '' }
            }
          },
          {
            opcode: 'sleep',
            blockType: BlockType.COMMAND,
            text: 'sleep (ms)',
            arguments: { ms: { type: ArgumentType.NUMBER, defaultValue: 1000 } }
          }
        ]
      };
    }

    // Helper to run user code and return value or error string
    async _runUserCode(code) {
      const src = String(code || '');
      // AsyncFunction constructor
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      try {
        // Try as expression first
        try {
          return await new AsyncFunction('return (' + src + ')')();
        } catch (exprErr) {
          // Run as statements wrapped in async IIFE
          return await new AsyncFunction('"use strict"; return (async function(){ ' + src + ' })()')();
        }
      } catch (err) {
        // Return an error string so Scratch shows something useful
        return 'Error: ' + (err && err.message ? err.message : String(err));
      }
    }

    // Reporter
    async evalJs(args) {
      const res = await this._runUserCode(args.code);
      // Convert objects to strings for Scratch compatibility
      try {
        if (res === undefined) return '';
        if (typeof res === 'string') return res;
        if (typeof res === 'number') return res;
        if (typeof res === 'boolean') return res;
        return JSON.stringify(res);
      } catch (e) {
        return String(res);
      }
    }

    // Command
    async runJs(args) {
      await this._runUserCode(args.code);
    }

    consoleLog(args) {
      const m = String(args.message || '');
      addLog('log', [m]);
      originalConsole.log(m);
    }

    consoleWarn(args) {
      const m = String(args.message || '');
      addLog('warn', [m]);
      originalConsole.warn(m);
    }

    consoleError(args) {
      const m = String(args.message || '');
      addLog('error', [m]);
      originalConsole.error(m);
    }

    consoleGet(args) {
      const count = Math.max(0, Number(args.count) || 10);
      const slice = _logs.slice(Math.max(0, _logs.length - count));
      return slice.map(e => '[' + new Date(e.ts).toLocaleTimeString() + '] ' + e.type.toUpperCase() + ': ' + e.text).join('\n');
    }

    consoleClear() {
      _logs.length = 0;
      _refreshOverlay();
    }

    consoleShow() {
      _toggleOverlay(true);
    }

    alertBlock(args) {
      window.alert(String(args.message || ''));
    }

    confirmBlock(args) {
      return window.confirm(String(args.message || ''));
    }

    promptBlock(args) {
      const r = window.prompt(String(args.message || ''), String(args.def || ''));
      return r === null ? '' : r;
    }

    async sleep(args) {
      const ms = Math.max(0, Number(args.ms) || 0);
      await new Promise((res) => setTimeout(res, ms));
    }
  }

  Scratch.extensions.register(new JSEvalExtension());
})(window.Scratch);
