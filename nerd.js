// Nerd mode: the site as a read-only home directory in a terminal.
// The files are read from the site's own pages when the page opens: one
// directory per page, one file per section label, so nothing here repeats
// what the pages say and nothing can fall out of step with them.
(function () {
  'use strict';

  var PAGES = [
    { dir: 'career', url: 'career.html' },
    { dir: 'group', url: 'group.html' },
    { dir: 'publications', url: 'publications.html' },
    { dir: 'projects', url: 'projects.html' },
    { dir: 'talks', url: 'talks.html' },
    { dir: 'engagement', url: 'engagement.html' },
    { dir: 'training', url: 'training.html' },
    { dir: 'press', url: 'news-verbose.html' }
  ];
  var USER = 'guest';
  var HOST = 'coniglio';

  var out = document.getElementById('nerd-out');
  var form = document.getElementById('nerd-form');
  var input = document.getElementById('nerd-input');
  var ps1 = document.getElementById('nerd-ps1');

  // ---------- The file system ----------

  function mkdir(parent, name, url) {
    var d = { type: 'dir', name: name, parent: parent, children: [], url: url || (parent && parent.url) };
    if (parent) parent.children.push(d);
    return d;
  }
  function mkfile(parent, name, url) {
    var f = { type: 'file', name: name, parent: parent, items: [], url: url || parent.url };
    parent.children.push(f);
    return f;
  }
  function child(dir, name) {
    for (var i = 0; i < dir.children.length; i++) if (dir.children[i].name === name) return dir.children[i];
    return null;
  }
  function uniqueName(dir, name) {
    if (!child(dir, name)) return name;
    var base = name.replace(/\.txt$/, ''), n = 2;
    while (child(dir, base + '-' + n + '.txt')) n++;
    return base + '-' + n + '.txt';
  }
  function slug(text) {
    return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled';
  }

  var root = mkdir(null, '', 'index.html');
  var homeParent = mkdir(root, 'home');
  var home = mkdir(homeParent, 'stefano', 'index.html');
  var cwd = home, lastDir = home;
  var mailto = null;

  // A page's element, cleaned to text, links, bold, italics and line breaks.
  function clean(node, base) {
    var frag = document.createDocumentFragment();
    node.childNodes.forEach(function (c) {
      if (c.nodeType === 3) {
        frag.appendChild(document.createTextNode(c.textContent.replace(/\s+/g, ' ')));
      } else if (c.nodeType === 1) {
        var tag = c.tagName.toLowerCase();
        if (tag === 'br') { frag.appendChild(document.createElement('br')); return; }
        var map = { a: 'a', strong: 'strong', b: 'strong', em: 'em', i: 'em' };
        var el = map[tag] ? document.createElement(map[tag]) : document.createElement('span');
        if (tag === 'a' && c.getAttribute('href')) {
          el.href = new URL(c.getAttribute('href'), base).href;
          el.rel = 'noopener';
          el.target = '_blank';
        }
        el.appendChild(clean(c, base));
        frag.appendChild(el);
      }
    });
    return frag;
  }
  function item(date, nodes, base) {
    var body = document.createElement('span');
    nodes.forEach(function (n, i) {
      if (i) body.appendChild(document.createElement('br'));
      body.appendChild(clean(n, base));
    });
    return { date: date, body: body, text: (date + ' ' + body.textContent).replace(/\s+/g, ' ').trim() };
  }

  function parsePage(doc, dir, base) {
    var main = doc.querySelector('main.content');
    if (!main) return;
    var titles = main.querySelectorAll(':scope > h2:not(.section-label)');
    var target = dir, file = null, last = null;
    function ensure() { return file || (file = mkfile(target, uniqueName(target, 'index.txt'))); }
    Array.prototype.forEach.call(main.children, function (el) {
      var tag = el.tagName.toLowerCase();
      if (tag === 'h2' && !el.classList.contains('section-label')) {
        // A page with several titles (the group page) gets a directory each.
        if (titles.length > 1) {
          var words = el.textContent.trim().split(/\s+/);
          target = mkdir(dir, slug(words[words.length - 1]));
          file = null;
        }
        last = null;
      } else if (tag === 'h2') {
        file = mkfile(target, uniqueName(target, slug(el.textContent) + '.txt'));
        last = null;
      } else if (tag === 'ul' && el.classList.contains('news')) {
        var f = ensure();
        el.querySelectorAll(':scope > li').forEach(function (li) {
          var date = li.querySelector('.date');
          var body = li.querySelector(':scope > div');
          f.items.push(item(date ? date.textContent.trim() : '', [body || li], base));
        });
        last = null;
      } else if (tag === 'h3') {
        // A project: its title in bold, its paragraphs below.
        last = item('', [el], base);
        var title = document.createElement('strong');
        while (last.body.firstChild) title.appendChild(last.body.firstChild);
        last.body.appendChild(title);
        ensure().items.push(last);
      } else if (tag === 'p') {
        if (last) {
          // A project's description, under its title.
          last.body.appendChild(document.createElement('br'));
          last.body.appendChild(clean(el, base));
          last.text = (last.text + ' ' + el.textContent).replace(/\s+/g, ' ');
        } else {
          var readme = file || child(target, 'README') || mkfile(target, 'README');
          readme.items.push(item('', [el], base));
        }
      }
    });
  }

  function parseHome(doc, base) {
    var about = mkfile(home, 'about.txt', 'index.html');
    doc.querySelectorAll('main.content > p:not(.more)').forEach(function (p) {
      about.items.push(item('', [p], base));
    });
    var news = mkfile(home, 'news.txt', 'index.html');
    doc.querySelectorAll('.news-frame ul.news > li').forEach(function (li) {
      var date = li.querySelector('.date');
      news.items.push(item(date ? date.textContent.trim() : '', [li.querySelector(':scope > div') || li], base));
    });
    var contact = mkfile(home, 'contact.txt', 'index.html');
    var aff = doc.querySelector('.sidebar .affiliation');
    if (aff) contact.items.push(item('address', [aff], base));
    doc.querySelectorAll('.sidebar .contact a').forEach(function (a) {
      var href = new URL(a.getAttribute('href'), base).href;
      if (href.indexOf('mailto:') === 0) mailto = href;
      var link = document.createElement('a');
      link.textContent = href.replace(/^mailto:/, '');
      link.setAttribute('href', href);
      var holder = document.createElement('span');
      holder.appendChild(link);
      contact.items.push(item(a.textContent.trim().replace(/ \(PDF\)$/, ''), [holder], base));
    });

    var roles = document.getElementById('nerd-roles');
    roles.textContent = '';
    doc.querySelectorAll('.sidebar .title li').forEach(function (li) {
      var row = document.createElement('li');
      row.textContent = li.textContent.replace(/\s+/g, ' ').trim();
      roles.appendChild(row);
    });
  }

  function fetchDoc(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + ': ' + r.status);
      return r.text();
    }).then(function (t) {
      return new DOMParser().parseFromString(t, 'text/html');
    });
  }

  var ready = fetchDoc('index.html').then(function (doc) {
    parseHome(doc, new URL('index.html', location.href).href);
    home.children.push({ type: 'link', name: 'cv.pdf', parent: home, url: 'cv/cv_SC.pdf' });
    // The directories are made first, so they keep the menu's order
    // whichever page arrives first.
    var dirs = PAGES.map(function (p) { return mkdir(home, p.dir, p.url); });
    home.children.sort(function (a, b) {
      return (a.type === 'dir' ? 0 : 1) - (b.type === 'dir' ? 0 : 1);
    });
    return Promise.all(PAGES.map(function (p, i) {
      return fetchDoc(p.url).then(function (d) {
        parsePage(d, dirs[i], new URL(p.url, location.href).href);
      });
    }));
  });

  // ---------- Paths ----------

  function pathOf(node) {
    var parts = [];
    for (var n = node; n && n.parent; n = n.parent) parts.unshift(n.name);
    return '/' + parts.join('/');
  }
  function pretty(node) {
    var p = pathOf(node), h = pathOf(home);
    return p === h ? '~' : p.indexOf(h + '/') === 0 ? '~' + p.slice(h.length) : p;
  }
  function resolve(path) {
    if (path === undefined || path === '') return cwd;
    var node = path[0] === '/' ? root : path[0] === '~' ? home : cwd;
    var parts = path.replace(/^~/, '').split('/');
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p === '' || p === '.') continue;
      if (p === '..') { node = node.parent || node; continue; }
      if (node.type !== 'dir') return null;
      node = child(node, p);
      if (!node) return null;
    }
    return node;
  }
  function walk(node, fn) {
    fn(node);
    if (node.type === 'dir') node.children.forEach(function (c) { walk(c, fn); });
  }
  function rel(node, from) {
    var p = pathOf(node), f = pathOf(from);
    if (p.indexOf(f + '/') === 0) return p.slice(f.length + 1);
    return pretty(node);
  }

  // ---------- Output ----------

  function block() {
    var b = document.createElement('div');
    b.className = 'nerd-block';
    out.appendChild(b);
    return b;
  }
  function line(parent, text, cls) {
    var l = document.createElement('div');
    l.className = 'nerd-line' + (cls ? ' ' + cls : '');
    if (text !== undefined) l.textContent = text;
    parent.appendChild(l);
    return l;
  }
  function promptSpan(dir) {
    var s = document.createElement('span');
    s.className = 'nerd-ps1';
    s.appendChild(document.createTextNode(USER + '@' + HOST + ':'));
    var p = document.createElement('span');
    p.className = 'nerd-path';
    p.textContent = pretty(dir);
    s.appendChild(p);
    s.appendChild(document.createTextNode('$'));
    return s;
  }
  function updatePrompt() {
    ps1.textContent = '';
    ps1.appendChild(promptSpan(cwd));
  }
  function showItem(parent, it, highlight, wide) {
    var row = document.createElement('div');
    row.className = 'nerd-item' + (it.date ? '' : ' no-date') + (wide ? ' is-wide' : '');
    if (it.date) {
      var d = document.createElement('span');
      d.className = 'nerd-date';
      d.textContent = it.date;
      row.appendChild(d);
    }
    var t = document.createElement('span');
    t.className = 'nerd-text';
    t.appendChild(it.body.cloneNode(true));
    if (highlight) mark(t, highlight);
    row.appendChild(t);
    parent.appendChild(row);
  }
  // Wraps every match of re in the element's text in <mark>, keeping its links and lines.
  function mark(el, re) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      var text = n.textContent, last = 0, m, frag = document.createDocumentFragment();
      re.lastIndex = 0;
      while ((m = re.exec(text)) && m[0]) {
        frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        var k = document.createElement('mark');
        k.textContent = m[0];
        frag.appendChild(k);
        last = m.index + m[0].length;
      }
      if (!last) return;
      frag.appendChild(document.createTextNode(text.slice(last)));
      n.parentNode.replaceChild(frag, n);
    });
  }
  function entryButton(node, label) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'nerd-entry' + (node.type === 'dir' ? ' is-dir' : '');
    b.textContent = label + (node.type === 'dir' ? '/' : '');
    b.addEventListener('click', function () {
      var p = rel(node, cwd);
      run(node.type === 'dir' ? 'cd ' + p + ' && ls' : node.type === 'link' ? 'open ' + p : 'cat ' + p);
    });
    return b;
  }

  // ---------- Commands ----------

  var HELP = [
    ['ls [-l] [dir]', 'list a directory (click an entry to open it)'],
    ['cd [dir]', 'change directory (cd .. up, cd - back, cd alone home)'],
    ['pwd', 'print the current directory'],
    ['cat <file>', 'print a file (less and more do the same)'],
    ['head / tail [-n N] <file>', 'the first or last N entries of a file'],
    ['tree [dir]', 'everything below a directory'],
    ['grep <word> [dir]', 'search every file below a directory'],
    ['find [dir] [-name pattern]', 'list paths, optionally matching a pattern'],
    ['wc <file>', 'count the entries of a file'],
    ['open <path>', 'open the page behind a file or directory'],
    ['cv, mail, scholar', 'the CV, an e-mail, Google Scholar'],
    ['theme [light|dark|auto]', 'switch colours (auto follows your system)'],
    ['whoami, id, hostname, uname, date, echo', 'the usual'],
    ['history, clear', 'past commands; clear the screen (Ctrl+L)'],
    ['exit', 'back to the standard view']
  ];

  function err(b, text) { line(b, text, 'nerd-err'); }
  function count(n) { return n + (n === 1 ? ' entry' : ' entries'); }

  function needFile(b, cmd, path) {
    var n = resolve(path);
    if (!path) { err(b, cmd + ': missing file operand'); return null; }
    if (!n) { err(b, cmd + ': ' + path + ': No such file or directory'); return null; }
    if (n.type === 'dir') { err(b, cmd + ': ' + path + ': Is a directory'); return null; }
    if (n.type === 'link') { err(b, cmd + ': ' + path + ': binary file; try open ' + path); return null; }
    return n;
  }

  function opts(args) {
    var o = { flags: '', n: null, name: null, rest: [] };
    for (var i = 0; i < args.length; i++) {
      var a = args[i];
      if (a === '-n' && i + 1 < args.length) o.n = parseInt(args[++i], 10);
      else if (a === '-name' && i + 1 < args.length) o.name = args[++i];
      else if (/^-\d+$/.test(a)) o.n = parseInt(a.slice(1), 10);
      else if (/^-[a-zA-Z]+$/.test(a)) o.flags += a.slice(1);
      else o.rest.push(a);
    }
    return o;
  }

  var history = [];
  var COMMANDS = {
    help: function (b) {
      line(b, 'A read-only copy of this website as a home directory. Commands:', 'nerd-faint');
      HELP.forEach(function (h) {
        var s = document.createElement('span');
        s.textContent = h[1];
        showItem(b, item(h[0], [s], location.href), null, true);
      });
    },
    man: function (b, a) {
      if (!a[0]) return err(b, 'What manual page do you want?');
      var h = HELP.filter(function (x) { return x[0].split(/[\s,\/]+/).indexOf(a[0]) >= 0; })[0];
      if (!h) return err(b, 'No manual entry for ' + a[0]);
      line(b, h[0] + '  —  ' + h[1]);
    },
    ls: function (b, a) {
      var o = opts(a), targets = o.rest.length ? o.rest : [''];
      targets.forEach(function (p, k) {
        var n = resolve(p);
        if (!n) return err(b, 'ls: cannot access \'' + p + '\': No such file or directory');
        if (targets.length > 1) line(b, (k ? '\n' : '') + p + ':', 'nerd-faint');
        var list = n.type === 'dir' ? n.children : [n];
        if (o.flags.indexOf('l') >= 0) {
          list.forEach(function (c) {
            var l = line(b);
            var size = c.type === 'link' ? 'pdf' : count(c.type === 'dir' ? c.children.length : c.items.length);
            var mode = c.type === 'dir' ? 'dr-xr-xr-x' : '-r--r--r--';
            var meta = document.createElement('span');
            meta.className = 'nerd-faint';
            meta.textContent = mode + '  stefano  ' + (size + '            ').slice(0, 12) + '  ';
            l.appendChild(meta);
            l.appendChild(entryButton(c, c.name));
          });
        } else {
          var grid = document.createElement('div');
          grid.className = 'nerd-ls';
          list.forEach(function (c) { grid.appendChild(entryButton(c, c.name)); });
          b.appendChild(grid);
        }
      });
    },
    cd: function (b, a) {
      var p = a[0];
      var n = p === '-' ? lastDir : p === undefined ? home : resolve(p);
      if (!n) return err(b, 'cd: ' + p + ': No such file or directory');
      if (n.type !== 'dir') return err(b, 'cd: ' + p + ': Not a directory');
      lastDir = cwd;
      cwd = n;
      updatePrompt();
    },
    pwd: function (b) { line(b, pathOf(cwd)); },
    cat: function (b, a) {
      if (!a.length) return err(b, 'cat: missing file operand');
      a.forEach(function (p) {
        var f = needFile(b, 'cat', p);
        if (f) f.items.forEach(function (it) { showItem(b, it); });
      });
    },
    head: function (b, a) { ends(b, a, 'head'); },
    tail: function (b, a) { ends(b, a, 'tail'); },
    wc: function (b, a) {
      var f = needFile(b, 'wc', a[0]);
      if (f) line(b, count(f.items.length) + ', ' + f.items.reduce(function (s, it) {
        return s + it.text.split(/\s+/).length;
      }, 0) + ' words  ' + a[0]);
    },
    tree: function (b, a) {
      var n = resolve(a[0]);
      if (!n) return err(b, a[0] + ' [error opening dir]');
      var dirs = 0, files = 0;
      line(b, a[0] || '.', 'nerd-faint');
      (function rec(d, pre) {
        d.children.forEach(function (c, i) {
          var lastOne = i === d.children.length - 1;
          var l = line(b);
          var lead = document.createElement('span');
          lead.className = 'nerd-faint';
          lead.textContent = pre + (lastOne ? '└── ' : '├── ');
          l.appendChild(lead);
          l.appendChild(entryButton(c, c.name));
          if (c.type === 'dir') { dirs++; rec(c, pre + (lastOne ? '    ' : '│   ')); } else files++;
        });
      })(n.type === 'dir' ? n : { children: [n] }, '');
      line(b, '\n' + dirs + ' directories, ' + files + ' files', 'nerd-faint');
    },
    grep: function (b, a) {
      var o = opts(a);
      if (!o.rest.length) return err(b, 'usage: grep <word> [dir or file]');
      var word = o.rest[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var re = new RegExp(word, 'gi');
      var start = resolve(o.rest[1]);
      if (!start) return err(b, 'grep: ' + o.rest[1] + ': No such file or directory');
      var hits = 0, shown = null;
      walk(start, function (n) {
        if (n.type !== 'file') return;
        n.items.forEach(function (it) {
          re.lastIndex = 0;
          if (!re.test(it.text) || hits >= 200) return;
          if (shown !== n) {
            line(b).appendChild(entryButton(n, rel(n, cwd)));
            shown = n;
          }
          hits++;
          showItem(b, it, re);
        });
      });
      if (!hits) line(b, 'no match for "' + o.rest[0] + '"', 'nerd-faint');
      else line(b, hits >= 200 ? '200+ matching entries' : count(hits).replace(' ', ' matching '), 'nerd-faint');
    },
    find: function (b, a) {
      var o = opts(a);
      var start = resolve(o.rest[0]);
      if (!start) return err(b, 'find: \'' + o.rest[0] + '\': No such file or directory');
      var re = o.name ? new RegExp('^' + o.name.replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i') : null;
      walk(start, function (n) {
        if (n === start || (re && !re.test(n.name))) return;
        line(b).appendChild(entryButton(n, (o.rest[0] ? o.rest[0].replace(/\/$/, '') : '.') + '/' + rel(n, start)));
      });
    },
    open: function (b, a) {
      if (!a[0]) return err(b, 'usage: open <file or directory>');
      var n = resolve(a[0]);
      if (!n) return err(b, 'open: ' + a[0] + ': No such file or directory');
      window.open(n.url, '_blank', 'noopener');
      line(b, 'opening ' + n.url, 'nerd-faint');
    },
    cv: function (b) { COMMANDS.open(b, ['~/cv.pdf']); },
    mail: function (b) {
      if (!mailto) return err(b, 'mail: no address found on the site');
      location.href = mailto;
      line(b, 'opening your mail client for ' + mailto.slice(7), 'nerd-faint');
    },
    scholar: function (b) {
      window.open('https://scholar.google.com/citations?user=F9mrD0gAAAAJ', '_blank', 'noopener');
      line(b, 'opening Google Scholar', 'nerd-faint');
    },
    theme: function (b, a) {
      var t = window.siteTheme;
      if (!a[0]) {
        var s = t && t.stored();
        return line(b, document.documentElement.dataset.theme + (s ? ' (chosen)' : ' (following your system)'));
      }
      if (['light', 'dark', 'auto'].indexOf(a[0]) < 0 || !t) return err(b, 'usage: theme [light|dark|auto]');
      t.set(a[0]);
    },
    whoami: function (b) { line(b, USER); },
    id: function (b) { line(b, 'uid=1000(' + USER + ') gid=1000(visitors) groups=1000(visitors)'); },
    hostname: function (b) { line(b, HOST); },
    uname: function (b, a) {
      line(b, opts(a).flags.indexOf('a') >= 0
        ? 'NerdOS ' + HOST + ' 1.0 static-html GitHub-Pages ' + navigator.platform
        : 'NerdOS');
    },
    date: function (b) { line(b, new Date().toString()); },
    echo: function (b, a) { line(b, a.join(' ')); },
    history: function (b) {
      history.forEach(function (h, i) { line(b, ('    ' + (i + 1)).slice(-5) + '  ' + h); });
    },
    clear: function () { out.textContent = ''; },
    exit: function () { location.href = 'index.html'; },
    sudo: function (b) { err(b, USER + ' is not in the sudoers file. This incident will be reported.'); }
  };
  COMMANDS.less = COMMANDS.more = COMMANDS.cat;
  COMMANDS.dir = COMMANDS.ls;
  COMMANDS.logout = COMMANDS.exit;
  COMMANDS.email = COMMANDS.mail;
  ['rm', 'mv', 'cp', 'touch', 'mkdir', 'rmdir', 'chmod', 'chown', 'ln', 'vi', 'vim', 'nano', 'emacs', 'ed']
    .forEach(function (c) {
      COMMANDS[c] = function (b, a) { err(b, c + ': ' + (a[0] ? a[0] + ': ' : '') + 'Read-only file system'); };
    });
  // Shortcuts: "about", "/news", or a directory's name on its own.
  var SHORT = { about: 'cat ~/about.txt', news: 'cat ~/news.txt', contact: 'cat ~/contact.txt' };

  function ends(b, a, which) {
    var o = opts(a), f = needFile(b, which, o.rest[0]);
    if (!f) return;
    var n = o.n === null || isNaN(o.n) ? 10 : o.n;
    (which === 'head' ? f.items.slice(0, n) : f.items.slice(-n)).forEach(function (it) { showItem(b, it); });
  }

  function words(s) {
    var re = /"([^"]*)"|'([^']*)'|(\S+)/g, m, w = [];
    while ((m = re.exec(s))) w.push(m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : m[3]);
    return w;
  }

  function exec(cmdline, b) {
    var w = words(cmdline);
    if (!w.length) return;
    var cmd = w[0], args = w.slice(1);
    if (cmd[0] === '/' && !resolve(cmd)) cmd = cmd.slice(1);
    if (SHORT[cmd] && !args.length) return exec(SHORT[cmd], b);
    if (!COMMANDS[cmd]) {
      var d = resolve(cmd) || resolve('~/' + cmd);
      if (d && d.type === 'dir' && !args.length) { COMMANDS.cd(b, [rel(d, cwd)]); return COMMANDS.ls(b, []); }
      if (d && d.type === 'file' && !args.length) return COMMANDS.cat(b, [rel(d, cwd)]);
      return err(b, cmd + ': command not found (type help)');
    }
    COMMANDS[cmd](b, args);
  }

  function run(cmdline, quiet) {
    cmdline = cmdline.trim();
    var b = block();
    if (!quiet) {
      var echo = line(b);
      echo.appendChild(promptSpan(cwd));
      var c = document.createElement('span');
      c.className = 'nerd-cmd';
      c.textContent = ' ' + cmdline;
      echo.appendChild(c);
    }
    if (cmdline && history[history.length - 1] !== cmdline) history.push(cmdline);
    histPos = history.length;
    return ready.then(function () {
      if (/\|/.test(cmdline)) return err(b, 'pipes are not plumbed in here: try grep <word> [dir]');
      cmdline.split(/\s*(?:&&|;)\s*/).forEach(function (part) { exec(part, b); });
    }, function (e) {
      err(b, 'could not read the site\'s pages (' + e.message + ')');
    }).then(function () {
      if (!b.childNodes.length) b.remove();
      form.scrollIntoView({ block: 'nearest' });
    });
  }

  // ---------- Keyboard: history, completion, shortcuts ----------

  var histPos = 0;

  function complete() {
    var v = input.value.slice(0, input.selectionStart), after = input.value.slice(input.selectionStart);
    var w = v.split(/\s+/), last = w[w.length - 1], options;
    var first = w.length === 1;
    var dirPart = last.slice(0, last.lastIndexOf('/') + 1);
    var base = resolve(dirPart === '' ? '' : dirPart);
    var entries = base && base.type === 'dir' ? base.children : [];
    options = entries.map(function (c) { return { text: dirPart + c.name + (c.type === 'dir' ? '/' : ' '), node: c }; });
    if (first && dirPart === '') {
      options = Object.keys(COMMANDS).concat(Object.keys(SHORT)).sort()
        .map(function (c) { return { text: c + ' ' }; }).concat(options);
    }
    options = options.filter(function (o) { return o.text.indexOf(last) === 0; });
    if (!options.length) return;
    var common = options[0].text;
    options.forEach(function (o) {
      while (o.text.indexOf(common) !== 0) common = common.slice(0, -1);
    });
    if (options.length === 1 || common.length > last.length) {
      var head = v.slice(0, v.length - last.length) + (options.length === 1 ? options[0].text : common);
      input.value = head + after;
      input.setSelectionRange(head.length, head.length);
    } else {
      var b = block(), l = line(b);
      l.appendChild(promptSpan(cwd));
      l.appendChild(document.createTextNode(' ' + input.value));
      var grid = document.createElement('div');
      grid.className = 'nerd-ls';
      options.forEach(function (o) {
        var s = document.createElement('span');
        s.className = 'nerd-entry' + (o.node && o.node.type === 'dir' ? ' is-dir' : '');
        s.textContent = o.text.slice(dirPart.length).trim();
        grid.appendChild(s);
      });
      b.appendChild(grid);
      form.scrollIntoView({ block: 'nearest' });
    }
  }

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      ready.then(complete);
    } else if (e.key === 'ArrowUp') {
      if (histPos > 0) { histPos--; input.value = history[histPos]; }
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      if (histPos < history.length) { histPos++; input.value = history[histPos] || ''; }
      e.preventDefault();
    } else if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      out.textContent = '';
    } else if (e.ctrlKey && (e.key === 'c' || e.key === 'C') && !window.getSelection().toString()) {
      e.preventDefault();
      var b = block(), l = line(b);
      l.appendChild(promptSpan(cwd));
      l.appendChild(document.createTextNode(' ' + input.value + '^C'));
      input.value = '';
    } else if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      input.value = '';
    }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = input.value;
    input.value = '';
    run(v);
  });

  document.querySelectorAll('[data-run]').forEach(function (btn) {
    btn.addEventListener('click', function () { run(btn.getAttribute('data-run')); input.focus({ preventScroll: true }); });
  });

  // A click on the terminal's empty space puts the cursor on the prompt.
  document.querySelector('.nerd-term').addEventListener('click', function (e) {
    if (e.target.closest('a, button, input') || window.getSelection().toString()) return;
    input.focus({ preventScroll: true });
  });

  updatePrompt();
  run('ls', false);
  if (window.matchMedia('(pointer: fine)').matches) input.focus({ preventScroll: true });
})();
