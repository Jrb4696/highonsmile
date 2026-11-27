/* High on Smile: shared site script (menu, reveal, booking form, year) */
(function () {
  var CLINIC = '916380218872';

  // Mobile menu
  var menu = document.getElementById('menu');
  var openBtn = document.getElementById('menuOpen');
  var closeBtn = document.getElementById('menuClose');
  function setMenu(open) {
    if (!menu) return;
    menu.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (openBtn) openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (openBtn) openBtn.addEventListener('click', function () { setMenu(true); });
  if (closeBtn) closeBtn.addEventListener('click', function () { setMenu(false); });
  if (menu) menu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  var root = document.documentElement;

  // Headlines: wrap each word so it can sharpen from a blur, one after another
  function wrapWords(el) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 1) { walk(n); return; }
        if (n.nodeType !== 3) return;
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var s = document.createElement('span');
          s.className = 'w';
          s.style.setProperty('--i', i++);
          s.textContent = part;
          frag.appendChild(s);
        });
        node.replaceChild(frag, n);
      });
    })(el);
  }
  document.querySelectorAll('[data-split], [data-ink]').forEach(wrapWords);

  // Numbers count up when they come into view
  function countUp(el) {
    var end = parseInt(el.getAttribute('data-count'), 10);
    var suffix = el.getAttribute('data-suffix') || '';
    var start = null;
    function tick(t) {
      if (start === null) start = t;
      var k = Math.min(1, (t - start) / 1400);
      el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))) + suffix;
      if (k < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // Reveal on scroll
  function startReveals() {
    var items = document.querySelectorAll('.reveal, [data-split]');
    function show(el) {
      el.classList.add('is-in');
      el.querySelectorAll('[data-count]').forEach(countUp);
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { show(en.target); io.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -6% 0px' });
      items.forEach(function (el) { io.observe(el); });
    } else {
      items.forEach(show);
    }
  }

  // Loader: short percentage counter, then the page sharpens in
  if (root.classList.contains('loading')) {
    var pct = document.getElementById('loaderPct');
    var began = Date.now();
    var timer = setInterval(function () {
      var k = Math.min(1, (Date.now() - began) / 1500);
      if (pct) pct.textContent = Math.round(k * 100) + '%';
      if (k === 1) {
        clearInterval(timer);
        root.classList.add('loaded-out');
        root.classList.remove('loading');
        startReveals();
        setTimeout(function () { root.classList.remove('loaded-out'); }, 700);
      }
    }, 30);
  } else {
    startReveals();
  }

  // Scroll-linked effects
  var hs = document.getElementById('hs');
  var track = document.getElementById('hsTrack');
  var ink = document.querySelector('[data-ink]');
  var zoom = document.querySelector('[data-zoom]');
  var unders = Array.prototype.slice.call(document.querySelectorAll('.stack-under'));
  var wide = window.matchMedia('(min-width: 901px) and (min-height: 640px)');
  var travel = 0;

  function clamp(v) { return Math.max(0, Math.min(1, v)); }

  // Service cards: pin the section and move the cards sideways (swipe on small screens)
  function layout() {
    if (hs && track) {
      var pin = wide.matches;
      root.classList.toggle('hs-pin', pin);
      track.style.transform = '';
      if (pin) {
        var box = hs.querySelector('.container');
        var edge = box.getBoundingClientRect().left + parseFloat(getComputedStyle(box).paddingLeft);
        track.style.setProperty('--edge', edge + 'px');
        track.scrollLeft = 0;
        travel = Math.max(0, track.scrollWidth - root.clientWidth);
        hs.style.setProperty('--travel', travel + 'px');
      }
    }
    // The next panel slides over these sections: hold each one once its end is on screen
    unders.forEach(function (under) {
      under.classList.add('is-stuck');
      under.style.setProperty('--stick-top', Math.min(0, window.innerHeight - under.offsetHeight) + 'px');
    });
    onScroll();
  }

  function onScroll() {
    var vh = window.innerHeight;
    if (track && root.classList.contains('hs-pin')) {
      var done = Math.max(0, Math.min(travel, -hs.getBoundingClientRect().top));
      track.style.transform = 'translate3d(' + (-done) + 'px, 0, 0)';
    }
    if (ink) {
      ink.classList.add('is-scrub');
      var r = ink.getBoundingClientRect();
      var words = ink.querySelectorAll('.w');
      var on = Math.round(words.length * clamp((vh * 0.9 - r.top) / (r.height + vh * 0.3)));
      words.forEach(function (w, n) { w.classList.toggle('is-on', n < on); });
    }
    if (zoom) {
      var z = zoom.getBoundingClientRect();
      zoom.style.setProperty('--zoom', (1.12 - 0.12 * clamp((vh - z.top) / (vh * 0.8))).toFixed(3));
    }
  }

  // Keyboard users: bring a focused card into view while the section is pinned
  if (track) track.addEventListener('focusin', function (e) {
    if (!root.classList.contains('hs-pin')) return;
    var card = e.target.closest('.svc');
    if (!card) return;
    track.parentNode.scrollLeft = 0;
    var want = Math.max(0, Math.min(travel, card.offsetLeft - parseFloat(track.style.getPropertyValue('--edge'))));
    // Measured from the wrapper, because the section itself can be held in place
    var section = hs.parentNode;
    var begins = section.parentNode.getBoundingClientRect().top + window.scrollY + section.previousElementSibling.offsetHeight + parseFloat(getComputedStyle(section).marginTop);
    window.scrollTo({ top: begins + want });
  });

  var waiting = false;
  window.addEventListener('scroll', function () {
    if (waiting) return;
    waiting = true;
    requestAnimationFrame(function () { waiting = false; onScroll(); });
  }, { passive: true });
  window.addEventListener('resize', layout);
  window.addEventListener('load', layout);
  if ('ResizeObserver' in window) {
    var heights = new ResizeObserver(layout);
    unders.forEach(function (under) { heights.observe(under); });
  }
  layout();

  // Hero: a blob at the pointer shows the second photo, and the clinic photo behind ripples like water.
  // Only the background is drawn by the ripple, so the doctor and the text never bend.
  (function () {
    var box = document.querySelector('[data-blob]');
    if (!box) return;
    var area = box.closest('section');
    var canvas = box.querySelector('canvas');
    var ctx = canvas.getContext('2d');
    var photo = new Image();
    photo.src = box.getAttribute('data-blob');

    var boxW = 0, boxH = 0, boxX = 0, boxY = 0;
    var frame = 0, over = false, onPhoto = false;
    var target = { x: 0, y: 0 };
    var water = makeWater(area.querySelector('.hero__water'));

    function blobRadius() { return Math.max(70, Math.min(150, boxW * 0.2)); }

    function resize() {
      var a = area.getBoundingClientRect(), r = box.getBoundingClientRect();
      var ratio = Math.min(2, window.devicePixelRatio || 1);
      boxX = r.left - a.left; boxY = r.top - a.top;
      boxW = r.width; boxH = r.height;
      if (canvas.width !== Math.round(boxW * ratio) || canvas.height !== Math.round(boxH * ratio)) {
        canvas.width = Math.round(boxW * ratio);
        canvas.height = Math.round(boxH * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      }
      if (water) water.size(a.width, a.height, blobRadius());
    }

    // The ripple: one large pool of water, the size of the blob on the doctor, that glides after the
    // pointer, stretches into a flowing trail and settles. WebGL redraws the clinic photo bent by it.
    function makeWater(surface) {
      if (!surface) return null;
      var gl = surface.getContext('webgl', { alpha: false, antialias: false });
      if (!gl) return null;
      var MAX = 24;          // points remembered along the trail
      var LIFE = 1.3;        // seconds for the water to settle
      var PUSH = 20;         // how far the picture bends, in pixels: raise for a bolder ripple
      var points = new Float32Array(MAX * 3), trail = [];
      var head = null, goal = null, sampled = 0, previous = 0;
      var width = 0, height = 0, radius = 120, ready = false, imageW = 1, imageH = 1;

      function shader(type, source) {
        var s = gl.createShader(type);
        gl.shaderSource(s, source);
        gl.compileShader(s);
        return s;
      }
      var program = gl.createProgram();
      gl.attachShader(program, shader(gl.VERTEX_SHADER,
        'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }'));
      gl.attachShader(program, shader(gl.FRAGMENT_SHADER, [
        '#ifdef GL_FRAGMENT_PRECISION_HIGH',
        'precision highp float;',
        '#else',
        'precision mediump float;',
        '#endif',
        'uniform sampler2D picture;',
        'uniform vec2 size, cover;',
        'uniform float radius, push, time;',
        'uniform vec3 points[' + MAX + '];', // x, y, strength; neighbours are joined into one stream
        'void main() {',
        '  vec2 at = vec2(gl_FragCoord.x, size.y - gl_FragCoord.y);',
        '  float k = 6.2832 / (radius * 1.5);',
        // bend the outline so the pool never looks like a circle
        '  vec2 loose = at + radius * 0.13 * vec2(sin(at.y * k * 1.3 + time * 1.7), cos(at.x * k * 1.1 - time * 2.1));',
        '  float wet = 0.0, total = 0.0;',
        '  vec2 out_ = vec2(0.0);',
        '  for (int i = 0; i < ' + (MAX - 1) + '; i++) {',
        '    vec3 a = points[i], b = points[i + 1];',
        '    if (a.z <= 0.0 || b.z <= 0.0) continue;',
        '    vec2 line = b.xy - a.xy;',
        '    float along = clamp(dot(loose - a.xy, line) / max(dot(line, line), 0.001), 0.0, 1.0);',
        '    vec2 away = loose - (a.xy + line * along);',
        '    float strength = mix(a.z, b.z, along);',
        '    float reach = radius * (0.55 + 0.45 * strength);',
        '    float far = length(away) / reach;',
        '    if (far >= 1.15) continue;',
        '    float here = strength * (1.0 - smoothstep(0.45, 1.15, far));',
        '    wet = max(wet, here);',
        '    float weight = here * here * here * here;',
        '    out_ += weight * away / reach;',
        '    total += weight;',
        '  }',
        '  out_ /= max(total, 0.00001);',
        '  float rim = 4.0 * wet * (1.0 - wet);', // strongest around the edge of the water
        // slow, broad currents inside the pool
        '  vec2 current = vec2(',
        '    sin(at.y * k + time * 2.3 + 1.6 * sin(at.x * k * 0.6 - time * 1.1)),',
        '    cos(at.x * k * 0.9 + time * 1.9 + 1.6 * sin(at.y * k * 0.7 + time * 1.3)));',
        '  vec2 shift = current * wet * 0.75 - out_ * rim * 0.9;',
        '  vec2 uv = (at + shift * push - size * 0.5) / cover + 0.5;',
        '  vec3 colour = texture2D(picture, uv).rgb;',
        // soft light on one side of the water and shade on the other, so it shows on the soft photo
        '  colour += dot(out_, vec2(-0.6, -0.8)) * rim * 0.2;',
        '  colour += (current.x + current.y) * wet * 0.035;',
        '  gl_FragColor = vec4(colour, 1.0);',
        '}'
      ].join('\n')));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var p = gl.getAttribLocation(program, 'p');
      gl.enableVertexAttribArray(p);
      gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
      function uniform(name) { return gl.getUniformLocation(program, name); }
      var uSize = uniform('size'), uCover = uniform('cover'), uRadius = uniform('radius'),
          uTime = uniform('time'), uPoints = uniform('points[0]');
      gl.uniform1f(uniform('push'), PUSH);

      // 1 when new, easing down to 0 as it settles
      function strengthAt(born, now) {
        var left = Math.max(0, 1 - (now - born) / LIFE);
        return left * left * (3 - 2 * left);
      }

      function render(now) {
        if (!ready || !width) return false;
        var dt = previous ? Math.min(0.05, Math.max(0, now - previous)) : 1 / 60;
        previous = now;
        if (head && goal) {
          // glide after the pointer, rather than sticking to it
          var ease = 1 - Math.pow(0.86, dt * 60);
          head.x += (goal.x - head.x) * ease;
          head.y += (goal.y - head.y) * ease;
          head.born = now;
          head.rise = Math.min(1, head.rise + dt * 3);
          if (now - sampled > LIFE / (MAX - 2)) {
            sampled = now;
            trail.unshift({ x: head.x, y: head.y, born: now, rise: head.rise });
          }
        }
        while (trail.length && (trail.length > MAX - 1 || now - trail[trail.length - 1].born >= LIFE)) trail.pop();
        var list = head ? [head].concat(trail) : trail;
        var alive = false;
        for (var i = 0; i < MAX; i++) {
          var q = list[i], s = q ? strengthAt(q.born, now) * q.rise : 0;
          points[i * 3] = q ? q.x : 0;
          points[i * 3 + 1] = q ? q.y : 0;
          points[i * 3 + 2] = s;
          if (s > 0) alive = true;
        }
        if (!alive) head = null;
        // Scale the photo the way CSS "cover" does
        var scale = Math.max(width / imageW, height / imageH);
        gl.viewport(0, 0, surface.width, surface.height);
        gl.uniform2f(uSize, width, height);
        gl.uniform2f(uCover, imageW * scale, imageH * scale);
        gl.uniform1f(uRadius, radius);
        gl.uniform1f(uTime, now % 600);
        gl.uniform3fv(uPoints, points);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        return alive;
      }

      var image = new Image();
      image.onload = function () {
        try {
          gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
        } catch (err) { return; } // e.g. the page was opened as a file: the still photo stays
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        imageW = image.naturalWidth;
        imageH = image.naturalHeight;
        ready = true;
        render(performance.now() / 1000);
        area.classList.add('has-water');
      };
      image.src = surface.getAttribute('data-image');
      surface.addEventListener('webglcontextlost', function () { ready = false; area.classList.remove('has-water'); });

      return {
        render: render,
        size: function (w, h, r) {
          w = Math.round(w); h = Math.round(h);
          radius = r;
          if (w === width && h === height) return;
          width = surface.width = w;
          height = surface.height = h;
          render(performance.now() / 1000);
        },
        move: function (x, y) {
          // A new visit starts under the pointer instead of sweeping in from the last place
          if (!head || !goal) {
            // a blank point keeps this visit from being joined to the one before
            trail.unshift({ x: x, y: y, born: -1e9, rise: 0 });
            head = { x: x, y: y, born: performance.now() / 1000, rise: 0 };
          }
          goal = { x: x, y: y };
        },
        lift: function () {
          if (head) { trail.unshift(head); head = null; }
          goal = null;
        }
      };
    }

    // The second photo inside a rippling blob, exactly where the pointer is (no lag, no fade)
    function reveal(time) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, boxW, boxH);
      if (!onPhoto || !photo.complete || !photo.naturalWidth) return;
      var x = target.x - boxX, y = target.y - boxY;
      var radius = blobRadius();
      var count = 16, pts = [], i;
      for (i = 0; i < count; i++) {
        var a = i / count * Math.PI * 2;
        var r = radius * (1 + (0.1 * Math.sin(2 * a + time * 1.7) + 0.06 * Math.sin(3 * a - time * 2.3)));
        pts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r });
      }
      function mid(m, n) { return { x: (m.x + n.x) / 2, y: (m.y + n.y) / 2 }; }
      var start = mid(pts[count - 1], pts[0]);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      for (i = 0; i < count; i++) {
        var next = mid(pts[i], pts[(i + 1) % count]);
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, next.x, next.y);
      }
      ctx.fill();
      ctx.globalCompositeOperation = 'source-in';
      ctx.drawImage(photo, 0, 0, boxW, boxH);
    }

    function draw(t) {
      var settling = water ? water.render(performance.now() / 1000) : false;
      reveal(t / 1000);
      frame = (settling || onPhoto) ? requestAnimationFrame(draw) : 0;
    }

    function move(e) {
      resize();
      var a = area.getBoundingClientRect();
      target.x = e.clientX - a.left;
      target.y = e.clientY - a.top;
      over = true;
      var px = target.x - boxX, py = target.y - boxY;
      onPhoto = px >= 0 && py >= 0 && px <= boxW && py <= boxH;
      if (water) water.move(target.x, target.y);
      reveal(performance.now() / 1000);
      if (!frame) frame = requestAnimationFrame(draw);
    }
    function leave() {
      over = false;
      onPhoto = false;
      if (water) water.lift();
      reveal(0);
    }

    area.addEventListener('pointermove', move);
    area.addEventListener('pointerdown', move);
    area.addEventListener('pointerleave', leave);
    area.addEventListener('pointercancel', leave);
    area.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') leave(); });
    window.addEventListener('scroll', function () { if (over) leave(); }, { passive: true });
    window.addEventListener('resize', resize);
    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(resize);
      ro.observe(area);
      ro.observe(box);
    }
    resize();
  })();

  // Patient reviews: cards sit on the inside of a curve; drag to turn it, and it settles on a card
  (function () {
    var stage = document.querySelector('[data-reviews]');
    if (!stage) return;
    var cards = Array.prototype.slice.call(stage.querySelectorAll('.rv__card'));
    var cursor = stage.querySelector('.rv__cursor');
    var count = cards.length;
    var STEP = 0.22; // angle between neighbouring cards, in radians
    // Open on the 4th card: the row loops, so this keeps the first (best) reviews on both sides
    var at = Math.min(3, count - 1), goal = at, frame = 0, drag = null, spacing = 300;
    stage.classList.add('is-3d');

    function place() {
      var radius = spacing / STEP;
      cards.forEach(function (card, i) {
        // Distance from the front, wrapped so the row loops forever
        var d = ((i - at) % count + count + count / 2) % count - count / 2;
        var angle = d * STEP;
        var edge = Math.min(count / 2, 4);
        var shown = Math.abs(d) < edge;
        card.style.visibility = shown ? 'visible' : 'hidden';
        card.style.opacity = Math.max(0, Math.min(1, (edge - Math.abs(d)) * 1.5));
        card.style.transform = 'translate3d(' + (radius * Math.sin(angle)) + 'px, 0, ' + (radius * (1 - Math.cos(angle))) + 'px) rotateY(' + (-angle) + 'rad)';
        card.classList.toggle('is-front', Math.abs(d) < 0.5);
      });
    }
    function tick() {
      at += (goal - at) * 0.12;
      if (Math.abs(goal - at) < 0.001) at = goal;
      place();
      frame = at === goal ? 0 : requestAnimationFrame(tick);
    }
    function run() { if (!frame) frame = requestAnimationFrame(tick); }
    function step(n) { goal = Math.round(goal) + n; run(); }
    function measure() { spacing = cards[0].offsetWidth + 22; place(); }

    function moveCursor(e) {
      var r = stage.getBoundingClientRect();
      cursor.style.transform = 'translate(' + (e.clientX - r.left) + 'px, ' + (e.clientY - r.top) + 'px)';
      stage.classList.toggle('has-cursor', e.pointerType === 'mouse');
    }
    stage.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || e.target.closest('a')) return;
      drag = { x: e.clientX, from: at, last: e.clientX, time: e.timeStamp, speed: 0 };
      goal = at;
      stage.classList.add('is-dragging');
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    });
    stage.addEventListener('pointermove', function (e) {
      moveCursor(e);
      if (!drag) return;
      var wait = Math.max(1, e.timeStamp - drag.time);
      drag.speed = (e.clientX - drag.last) / wait;
      drag.last = e.clientX;
      drag.time = e.timeStamp;
      goal = drag.from - (e.clientX - drag.x) / spacing;
      run();
    });
    function release(e) {
      if (!drag) return;
      // A quick flick carries on a little further
      var flick = e.timeStamp - drag.time < 90 ? Math.max(-2, Math.min(2, drag.speed * 160 / spacing)) : 0;
      goal = Math.round(goal - flick);
      drag = null;
      stage.classList.remove('is-dragging');
      run();
    }
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);
    stage.addEventListener('pointerenter', moveCursor);
    stage.addEventListener('pointerleave', function () { stage.classList.remove('has-cursor'); });
    stage.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    });
    stage.parentNode.querySelectorAll('[data-step]').forEach(function (b) {
      b.addEventListener('click', function () { step(Number(b.getAttribute('data-step'))); });
    });
    window.addEventListener('resize', measure);
    measure();
  })();

  // Footer year
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Booking form: builds a WhatsApp message to the clinic
  var form = document.getElementById('bookForm');
  if (!form) return;
  var done = document.getElementById('bookDone');
  var recap = document.getElementById('bookRecap');
  var reset = document.getElementById('bookReset');

  function mark(name, bad) {
    var f = form.querySelector('[data-field="' + name + '"]');
    if (f) f.classList.toggle('invalid', bad);
  }
  function validate() {
    var ok = true;
    var nameOk = form.name.value.trim().length >= 2;
    var digits = (form.phone.value || '').replace(/\D/g, '');
    var phoneOk = digits.length >= 10 && digits.length <= 13;
    var treatOk = !!form.treatment.value;
    mark('name', !nameOk); mark('phone', !phoneOk); mark('treatment', !treatOk);
    ok = nameOk && phoneOk && treatOk;
    return ok;
  }
  ['name', 'phone', 'treatment'].forEach(function (n) {
    form[n].addEventListener('input', function () { mark(n, false); });
    form[n].addEventListener('change', function () { mark(n, false); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) {
      var bad = form.querySelector('.invalid .input');
      if (bad) bad.focus();
      return;
    }
    var slot = form.querySelector('input[name="slot"]:checked');
    var lines = [
      'Hello High on Smile, I would like to book an appointment.',
      '',
      'Name: ' + form.name.value.trim(),
      'Phone: ' + form.phone.value.trim(),
      'Treatment: ' + form.treatment.value,
      'Preferred time: ' + (slot ? slot.value : 'Any')
    ];
    if (form.date.value) lines.push('Preferred date: ' + form.date.value);
    if (form.notes.value.trim()) lines.push('Notes: ' + form.notes.value.trim());
    var msg = lines.join('\n');
    recap.textContent = msg;
    window.open('https://wa.me/' + CLINIC + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
    form.hidden = true;
    done.classList.add('is-shown');
  });
  if (reset) reset.addEventListener('click', function () {
    form.hidden = false;
    done.classList.remove('is-shown');
  });
})();
