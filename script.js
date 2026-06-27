'use strict';

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* =====================================================================
   NAV: scroll state, hamburger, active link, smooth scroll
===================================================================== */
const navbar = $('#navbar');
window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 40));

const hamburger = $('#hamburger');
const mobileMenu = $('#mobileMenu');
hamburger.addEventListener('click', () => mobileMenu.classList.toggle('open'));
$$('a', mobileMenu).forEach((a) => a.addEventListener('click', () => mobileMenu.classList.remove('open')));

$$('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - 72;
        window.scrollTo({ top, behavior: 'smooth' });
    });
});

const navLinks = $$('.nav-links a');
const sections = $$('section[id]');
const navObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === '#' + entry.target.id));
    });
}, { threshold: 0.4, rootMargin: '-60px 0px -40% 0px' });
sections.forEach((s) => navObserver.observe(s));

/* =====================================================================
   FLOW-FIELD BACKGROUND  (data packets streaming along lanes)
===================================================================== */
(function flowField() {
    const canvas = $('#flowCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, lanes = [], dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
        w = canvas.clientWidth; h = canvas.clientHeight;
        canvas.width = w * dpr; canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        buildLanes();
    }
    function buildLanes() {
        lanes = [];
        const count = Math.max(5, Math.round(h / 90));
        for (let i = 0; i < count; i++) {
            const y = (h / (count + 1)) * (i + 1) + (Math.random() * 24 - 12);
            const packets = [];
            const n = 2 + Math.floor(Math.random() * 3);
            for (let p = 0; p < n; p++) {
                packets.push({ x: Math.random() * w, speed: 0.2 + Math.random() * 0.5, r: 1.4 + Math.random() * 1.6 });
            }
            lanes.push({ y, packets, dir: i % 2 === 0 ? 1 : -1 });
        }
    }
    function draw() {
        ctx.clearRect(0, 0, w, h);
        lanes.forEach((lane) => {
            ctx.strokeStyle = 'rgba(56,189,248,0.045)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, lane.y); ctx.lineTo(w, lane.y); ctx.stroke();
            lane.packets.forEach((pk) => {
                pk.x += pk.speed * lane.dir;
                if (lane.dir > 0 && pk.x > w + 10) pk.x = -10;
                if (lane.dir < 0 && pk.x < -10) pk.x = w + 10;
                const grad = ctx.createLinearGradient(pk.x - 22 * lane.dir, lane.y, pk.x, lane.y);
                grad.addColorStop(0, 'rgba(56,189,248,0)');
                grad.addColorStop(1, 'rgba(56,189,248,0.5)');
                ctx.strokeStyle = grad; ctx.lineWidth = pk.r;
                ctx.beginPath(); ctx.moveTo(pk.x - 22 * lane.dir, lane.y); ctx.lineTo(pk.x, lane.y); ctx.stroke();
                ctx.fillStyle = 'rgba(56,189,248,0.85)';
                ctx.beginPath(); ctx.arc(pk.x, lane.y, pk.r, 0, Math.PI * 2); ctx.fill();
            });
        });
        requestAnimationFrame(draw);
    }
    resize();
    window.addEventListener('resize', resize);
    if (!prefersReduced) draw();
})();

/* =====================================================================
   TEXT-TO-SQL PLAYGROUND
===================================================================== */
const QUERIES = [
    {
        q: 'Top 5 hotels by revenue last quarter',
        match: ['top', 'hotel', 'revenue', 'best'],
        sql: `SELECT hotel_name,
       SUM(room_revenue) AS revenue,
       SUM(rooms_sold)   AS rooms
FROM   bookings.fact_revenue
WHERE  quarter = 'Q4-2025'
GROUP  BY hotel_name
ORDER  BY revenue DESC
LIMIT  5;`,
        scan: 'scanned 1.4 GB · 0.7s', cache: 'miss',
        columns: ['hotel_name', 'revenue', 'rooms'],
        rows: [
            ['Marriott Downtown', '$1,284,500', '6,210'],
            ['Hilton Riverwalk', '$1,142,800', '5,880'],
            ['Hampton Bayshore', '$928,300', '7,140'],
            ['Residence Inn Westshore', '$874,100', '4,960'],
            ['Courtyard Midtown', '$651,200', '3,720'],
        ],
        numCols: [1, 2],
        summary: 'Marriott Downtown led the quarter at $1.28M, ~12% ahead of Hilton Riverwalk; the top 5 drove 58% of portfolio revenue.',
    },
    {
        q: 'Month-over-month occupancy trend',
        match: ['month', 'occupancy', 'trend', 'mom'],
        sql: `SELECT DATE_TRUNC('month', stay_date) AS month,
       ROUND(AVG(occupancy_pct), 1) AS occupancy
FROM   bookings.fact_occupancy
WHERE  stay_date >= DATE '2025-07-01'
GROUP  BY 1
ORDER  BY 1;`,
        scan: 'scanned 612 MB · 0.4s', cache: 'hit',
        columns: ['month', 'occupancy'],
        rows: [
            ['2025-07', '81.4%'], ['2025-08', '79.2%'], ['2025-09', '74.8%'],
            ['2025-10', '77.6%'], ['2025-11', '83.1%'], ['2025-12', '88.9%'],
        ],
        numCols: [1],
        summary: 'Occupancy dipped through September, then climbed 14 pts into the December holiday peak at 88.9% — the strongest month of the period.',
    },
    {
        q: 'ADR by brand this year',
        match: ['adr', 'brand', 'rate', 'average daily'],
        sql: `SELECT brand,
       ROUND(AVG(adr), 2) AS avg_daily_rate,
       COUNT(*)           AS room_nights
FROM   bookings.fact_revenue
WHERE  fiscal_year = 2025
GROUP  BY brand
ORDER  BY avg_daily_rate DESC;`,
        scan: 'scanned 1.1 GB · 0.6s', cache: 'miss',
        columns: ['brand', 'avg_daily_rate', 'room_nights'],
        rows: [
            ['Marriott', '$214.60', '184,200'],
            ['Hilton', '$198.30', '171,540'],
            ['Hyatt', '$186.90', '96,310'],
            ['Hampton', '$142.10', '203,880'],
        ],
        numCols: [1, 2],
        summary: 'Marriott commands the highest ADR at $214.60, while Hampton trades rate for volume — the most room-nights at the lowest daily rate.',
    },
    {
        q: 'Which markets are below budget',
        match: ['market', 'below', 'budget', 'under'],
        sql: `SELECT market,
       SUM(actual_revenue) AS actual,
       SUM(budget_revenue) AS budget
FROM   bookings.fact_pnl
WHERE  fiscal_year = 2025
GROUP  BY market
HAVING SUM(actual_revenue) < SUM(budget_revenue)
ORDER  BY (budget - actual) DESC;`,
        scan: 'scanned 880 MB · 0.5s', cache: 'hit',
        columns: ['market', 'actual', 'budget'],
        rows: [
            ['Orlando', '$3,910,000', '$4,300,000'],
            ['Atlanta', '$2,640,000', '$2,880,000'],
            ['Nashville', '$1,720,000', '$1,810,000'],
        ],
        numCols: [1, 2],
        summary: '3 markets finished under budget; Orlando has the largest gap at -$390K, flagging it as the priority for a recovery plan.',
    },
];

function highlightSql(sql) {
    let s = escapeHtml(sql);
    s = s.replace(/'([^']*)'/g, "<span class=\"str\">'$1'</span>");
    ['SELECT', 'FROM', 'WHERE', 'GROUP\\s+BY', 'ORDER\\s+BY', 'LIMIT', 'HAVING', 'AND', 'OR', 'AS', 'DESC', 'ASC', 'ON', 'DATE']
        .forEach((k) => { s = s.replace(new RegExp('\\b' + k + '\\b', 'g'), (m) => `<span class="kw">${m}</span>`); });
    ['SUM', 'AVG', 'COUNT', 'ROUND', 'DATE_TRUNC', 'MAX', 'MIN']
        .forEach((f) => { s = s.replace(new RegExp('\\b' + f + '\\b(?=\\s*\\()', 'g'), (m) => `<span class="fn">${m}</span>`); });
    return s;
}

const qOutput = $('#qOutput');
const qInput = $('#qInput');
const qChipsEl = $('#qChips');
let runToken = 0;

QUERIES.forEach((item, i) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = item.q;
    chip.addEventListener('click', () => { setActiveChip(i); runQuery(item); });
    qChipsEl.appendChild(chip);
});
function setActiveChip(i) {
    $$('.chip', qChipsEl).forEach((c, idx) => c.classList.toggle('active', idx === i));
}

function matchQuery(text) {
    const t = text.toLowerCase();
    let best = null, bestScore = 0;
    QUERIES.forEach((item) => {
        const score = item.match.reduce((acc, w) => acc + (t.includes(w) ? 1 : 0), 0);
        if (score > bestScore) { bestScore = score; best = item; }
    });
    return best || QUERIES[0];
}

function addStep(html) {
    const div = document.createElement('div');
    div.className = 'out-step';
    div.innerHTML = html;
    qOutput.appendChild(div);
    requestAnimationFrame(() => div.classList.add('show'));
    return div;
}

async function typeInto(el, sql, token) {
    for (let i = 1; i <= sql.length; i++) {
        if (token !== runToken) return;
        el.innerHTML = escapeHtml(sql.slice(0, i)) + '<span class="typing-cursor">▍</span>';
        await sleep(prefersReduced ? 0 : 9);
    }
    el.innerHTML = highlightSql(sql);
}

async function runQuery(item) {
    const token = ++runToken;
    qOutput.innerHTML = '';

    const sqlStep = addStep('<div class="out-cap">generated SQL</div><pre class="sql mono"></pre>');
    await typeInto($('.sql', sqlStep), item.sql, token);
    if (token !== runToken) return;

    await sleep(prefersReduced ? 0 : 250);
    const cacheTag = item.cache === 'hit'
        ? '<span class="hit">cache HIT</span>' : '<span class="miss">cache MISS</span>';
    addStep(`<div class="out-scan mono"><i class="fas fa-bolt" style="color:var(--amber)"></i> ${item.scan} · ${cacheTag}</div>`);

    await sleep(prefersReduced ? 0 : 350);
    if (token !== runToken) return;
    const head = item.columns.map((c) => `<th>${c}</th>`).join('');
    const body = item.rows.map((r) =>
        '<tr>' + r.map((cell, ci) => `<td class="${item.numCols.includes(ci) ? 'num' : ''}">${cell}</td>`).join('') + '</tr>'
    ).join('');
    addStep(`<div class="out-cap">result · ${item.rows.length} rows</div><table class="result mono"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`);

    await sleep(prefersReduced ? 0 : 400);
    if (token !== runToken) return;
    addStep(`<div class="out-summary"><i class="fas fa-comment-dots"></i>${item.summary}</div>`);
}

$('#qForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = qInput.value.trim();
    const item = text ? matchQuery(text) : QUERIES[0];
    setActiveChip(QUERIES.indexOf(item));
    runQuery(item);
});

// Auto-run the first query once the console scrolls into view
const consoleEl = $('#heroConsole');
const consoleObs = new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting) {
        setActiveChip(0); runQuery(QUERIES[0]); obs.disconnect();
    }
}, { threshold: 0.3 });
consoleObs.observe(consoleEl);

/* =====================================================================
   CASE STUDIES  (detail panel + animated architecture diagrams)
===================================================================== */
const CASES = [
    {
        tab: 'Text-to-SQL bot', tabTag: 'GenAI · NLP',
        tag: 'GenAI · NLP · Bedrock',
        title: 'Text-to-SQL Financial Analytics Bot',
        problem: 'Finance teams waited on analysts for every ad-hoc number, slowing month-end decisions.',
        approach: 'A Microsoft Teams bot routes each question through a LangChain workflow, generates guard-railed Athena SQL (SELECT-only, allow-listed), caches results in DynamoDB, and replies with a plain-English summary.',
        metrics: [{ n: '40–70%', l: 'faster repeat queries' }, { n: '18–30%', l: 'cache hit rate' }],
        stack: ['LangChain', 'GPT-4o-mini', 'Claude 3 Haiku', 'Bedrock', 'Athena', 'DynamoDB', 'SQS', 'Lambda'],
        nodes: [
            { id: 'teams', label: 'Teams', x: 60, y: 45, role: 'User asks a question in Microsoft Teams' },
            { id: 'sqs', label: 'SQS', x: 60, y: 150, role: 'Event queue buffers high-throughput requests' },
            { id: 'lambda', label: 'Lambda', x: 175, y: 150, role: 'LangChain router orchestrates the multi-step flow' },
            { id: 'bedrock', label: 'Bedrock', x: 290, y: 45, role: 'GPT-4o-mini writes SQL · Claude 3 Haiku summarizes' },
            { id: 'athena', label: 'Athena', x: 290, y: 150, role: 'Runs the generated SQL on the data lake' },
            { id: 'ddb', label: 'DynamoDB', x: 175, y: 258, role: 'Caches results to skip repeat Athena scans' },
        ],
        edges: [['teams', 'sqs'], ['sqs', 'lambda'], ['lambda', 'bedrock'], ['lambda', 'athena'], ['lambda', 'ddb', true]],
    },
    {
        tab: 'RAG HR assistant', tabTag: 'RAG · LLM',
        tag: 'RAG · LLM · Embeddings',
        title: 'RAG Knowledge Assistant for HR',
        problem: 'HR fielded the same policy questions repeatedly, with no self-serve way for staff to get trusted answers.',
        approach: 'Policy documents are chunked and embedded with Titan into ChromaDB. A Teams bot retrieves the most relevant chunks, answers with Bedrock Nova Lite, and keeps multi-turn memory for follow-ups.',
        metrics: [{ n: '~0.98', l: 'faithfulness score' }, { n: '7K+', l: 'chunks indexed' }],
        stack: ['Bedrock', 'Titan Embeddings', 'ChromaDB', 'LangChain', 'Nova Lite', 'Azure Bot'],
        nodes: [
            { id: 'teams', label: 'Teams', x: 60, y: 45, role: 'Employee asks an HR policy question' },
            { id: 'retriever', label: 'Retriever', x: 60, y: 150, role: 'Lambda retriever with ConversationBufferMemory' },
            { id: 'docs', label: 'HR Docs', x: 60, y: 258, role: 'Source policies & forms (ingestion)' },
            { id: 'titan', label: 'Titan', x: 175, y: 258, role: 'Titan embeddings vectorize each chunk' },
            { id: 'chroma', label: 'ChromaDB', x: 175, y: 150, role: 'Vector store for semantic retrieval' },
            { id: 'nova', label: 'Nova Lite', x: 290, y: 90, role: 'Generates the grounded answer' },
        ],
        edges: [['teams', 'retriever'], ['retriever', 'chroma'], ['retriever', 'nova'], ['docs', 'titan', true], ['titan', 'chroma', true]],
    },
    {
        tab: 'Agentic docs', tabTag: 'Agents · OCR',
        tag: 'Agents · Automation',
        title: 'Agentic RAG Document Processor',
        problem: 'Legal contracts, licenses and permits were tracked by hand — slow, error-prone, and hard to audit.',
        approach: 'A fail-safe OCR engine (PyMuPDF + OCR) ingests even low-quality scans, then a Claude 3.5 Sonnet agent extracts structured fields zero-shot. A React/TypeScript dashboard reviews results and syncs to SharePoint.',
        metrics: [{ n: '100%', l: 'text extraction' }, { n: '200+', l: 'documents processed' }],
        stack: ['React', 'TypeScript', 'Claude 3.5 Sonnet', 'Titan Embeddings', 'OCR', 'SharePoint'],
        nodes: [
            { id: 'scans', label: 'Scans', x: 60, y: 45, role: 'Contracts, licenses & permits (often low-quality)' },
            { id: 'ocr', label: 'OCR', x: 60, y: 150, role: 'PyMuPDF + OCR fail-safe text extraction' },
            { id: 'agent', label: 'Claude 3.5', x: 175, y: 150, role: 'Autonomous agent extracts fields zero-shot' },
            { id: 'titan', label: 'Titan', x: 175, y: 258, role: 'Embeddings power high-precision search' },
            { id: 'react', label: 'React UI', x: 290, y: 45, role: 'TypeScript dashboard to review & validate' },
            { id: 'sp', label: 'SharePoint', x: 290, y: 150, role: 'Validated records sync to SharePoint Lists' },
        ],
        edges: [['scans', 'ocr'], ['ocr', 'agent'], ['agent', 'titan', true], ['agent', 'react'], ['react', 'sp']],
    },
    {
        tab: 'BI migration', tabTag: 'Data Eng · BI',
        tag: 'Data Engineering · Lakehouse',
        title: 'BI Platform Migration & Lakehouse',
        problem: 'Qlik Sense licensing was costly and the legacy pipelines were brittle and slow to refresh.',
        approach: 'Migrated to Tableau on AWS-native ETL: Glue Spark jobs land a medallion lakehouse on S3, Athena views model the data, Step Functions orchestrate, and Datadog monitors SLAs — 18 dashboards adopted org-wide.',
        metrics: [{ n: '$100K', l: 'saved / year' }, { n: '~40%', l: 'faster loads' }, { n: '1TB+', l: 'migrated' }],
        stack: ['Tableau', 'AWS Glue', 'Athena', 'Airflow', 'Step Functions', 'Delta Lake', 'Datadog'],
        nodes: [
            { id: 'src', label: 'Sources', x: 60, y: 45, role: 'Operational + external source systems' },
            { id: 'glue', label: 'Glue', x: 60, y: 150, role: '20+ Glue Spark ETL jobs transform data' },
            { id: 's3', label: 'S3 Lake', x: 175, y: 150, role: 'Medallion architecture on S3 / Delta Lake' },
            { id: 'athena', label: 'Athena', x: 290, y: 150, role: '50+ Athena views model the lakehouse' },
            { id: 'tableau', label: 'Tableau', x: 290, y: 45, role: '18 dashboards adopted across departments' },
            { id: 'step', label: 'Step Fns', x: 175, y: 258, role: 'Step Functions orchestrate the pipeline' },
        ],
        edges: [['src', 'glue'], ['glue', 's3'], ['s3', 'athena'], ['athena', 'tableau'], ['step', 'glue', true]],
    },
];

const NODE_W = 92, NODE_H = 34, VB_W = 350, VB_H = 310;
const caseTabsEl = $('#caseTabs');
const caseDetailEl = $('#caseDetail');
const archMount = $('#archMount');
let archTip;

function buildArchTip() {
    archTip = document.createElement('div');
    archTip.className = 'arch-tip mono';
    archMount.appendChild(archTip);
}

function renderDiagram(c) {
    const byId = Object.fromEntries(c.nodes.map((n) => [n.id, n]));
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${VB_W} ${VB_H}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // edges (drawn first, behind nodes)
    c.edges.forEach((e, i) => {
        const [from, to, dashed] = e;
        const a = byId[from], b = byId[to];
        const d = `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('class', 'arch-edge' + (dashed ? ' dashed' : ''));
        path.setAttribute('id', `edge-${c.tag.length}-${i}`);
        svg.appendChild(path);

        if (!prefersReduced) {
            const packet = document.createElementNS(svgNS, 'circle');
            packet.setAttribute('r', '2.6');
            packet.setAttribute('class', 'arch-packet');
            const motion = document.createElementNS(svgNS, 'animateMotion');
            motion.setAttribute('dur', '2.2s');
            motion.setAttribute('repeatCount', 'indefinite');
            motion.setAttribute('begin', `${(i * 0.45).toFixed(2)}s`);
            motion.setAttribute('path', d);
            packet.appendChild(motion);
            svg.appendChild(packet);
        }
    });

    // nodes
    c.nodes.forEach((n) => {
        const g = document.createElementNS(svgNS, 'g');
        g.setAttribute('class', 'arch-node');
        const rect = document.createElementNS(svgNS, 'rect');
        rect.setAttribute('x', n.x - NODE_W / 2);
        rect.setAttribute('y', n.y - NODE_H / 2);
        rect.setAttribute('width', NODE_W);
        rect.setAttribute('height', NODE_H);
        rect.setAttribute('rx', '6');
        const text = document.createElementNS(svgNS, 'text');
        text.setAttribute('x', n.x);
        text.setAttribute('y', n.y + 4);
        text.setAttribute('text-anchor', 'middle');
        text.textContent = n.label;
        g.appendChild(rect); g.appendChild(text);

        const show = (ev) => {
            const m = archMount.getBoundingClientRect();
            const r = rect.getBoundingClientRect();
            archTip.textContent = n.role;
            archTip.style.left = (r.left - m.left + r.width / 2) + 'px';
            archTip.style.top = (r.top - m.top - 6) + 'px';
            archTip.classList.add('show');
            g.classList.add('active');
        };
        const hide = () => { archTip.classList.remove('show'); g.classList.remove('active'); };
        g.addEventListener('mouseenter', show);
        g.addEventListener('mouseleave', hide);
        g.addEventListener('click', show);
        svg.appendChild(g);
    });

    archMount.querySelector('svg')?.remove();
    archMount.insertBefore(svg, archTip);
}

function renderCase(c) {
    caseDetailEl.innerHTML = `
        <div class="cd-tag">${c.tag}</div>
        <h3 class="cd-title">${c.title}</h3>
        <div class="cd-block"><h4>Problem</h4><p>${c.problem}</p></div>
        <div class="cd-block"><h4>Approach</h4><p>${c.approach}</p></div>
        <div class="cd-metrics">${c.metrics.map((m) => `<div class="metric"><div class="m-num">${m.n}</div><div class="m-lab">${m.l}</div></div>`).join('')}</div>
        <div class="tech-tags">${c.stack.map((s) => `<span>${s}</span>`).join('')}</div>`;
    renderDiagram(c);
}

buildArchTip();
CASES.forEach((c, i) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'case-tab';
    tab.setAttribute('role', 'tab');
    tab.innerHTML = `${c.tab}<span class="ct-tag">${c.tabTag}</span>`;
    tab.addEventListener('click', () => {
        $$('.case-tab', caseTabsEl).forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        renderCase(c);
    });
    caseTabsEl.appendChild(tab);
    if (i === 0) { tab.classList.add('active'); renderCase(c); }
});

/* =====================================================================
   COUNT-UP READOUT
===================================================================== */
function countUp(el) {
    const target = parseFloat(el.dataset.count);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    if (prefersReduced) { el.textContent = prefix + target + suffix; return; }
    const dur = 1300; const start = performance.now();
    function tick(now) {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}
const readout = $('#readout');
if (readout) {
    const roObs = new IntersectionObserver((entries, obs) => {
        if (entries[0].isIntersecting) {
            $$('.readout-num', readout).forEach(countUp);
            obs.disconnect();
        }
    }, { threshold: 0.4 });
    roObs.observe(readout);
}

/* =====================================================================
   COPY EMAIL
===================================================================== */
const copyBtn = $('#copyEmail');
if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
        const email = copyBtn.dataset.email;
        try {
            await navigator.clipboard.writeText(email);
        } catch (_) {
            // Fallback for file:// or insecure contexts where the async clipboard API is blocked
            const ta = document.createElement('textarea');
            ta.value = email; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); } catch (__) { /* give up silently */ }
            document.body.removeChild(ta);
        }
        const span = $('span', copyBtn);
        const original = span.textContent;
        copyBtn.classList.add('copied');
        span.textContent = 'copied to clipboard';
        setTimeout(() => { copyBtn.classList.remove('copied'); span.textContent = original; }, 1800);
    });
}

/* =====================================================================
   SCROLL REVEAL
===================================================================== */
const revealEls = $$('.pipe-node, .case-tab, .case-panel, .prior-card, .stack-group, .about-text, .readout, .contact-actions');
revealEls.forEach((el) => el.classList.add('reveal'));
const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        revealObs.unobserve(entry.target);
    });
}, { threshold: 0.12 });
revealEls.forEach((el) => revealObs.observe(el));
