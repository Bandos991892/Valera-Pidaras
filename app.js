const svg = d3.select("#graph");
const shell = document.querySelector(".graph-shell");
const stats = document.querySelector("#stats");
const panel = document.querySelector("#panel");
const panelTitle = document.querySelector("#panelTitle");
const panelType = document.querySelector("#panelType");
const panelContent = document.querySelector("#panelContent");
const closeBtn = document.querySelector("#close");

const palette = {
  person: "#61e7ff",
  location: "#ff62ef",
  website: "#35d8ff",
  phone: "#55ff9c",
  text: "#b98cff",
  image: "#ffb55d"
};

let width = 900, height = 600;

function resize() {
  const r = shell.getBoundingClientRect();
  width = r.width; height = r.height;
  svg.attr("viewBox", `0 0 ${width} ${height}`);
}
resize();
window.addEventListener("resize", resize);

function safeText(v) {
  return String(v ?? "").replace(/[&<>"]/g, s => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;"
  }[s]));
}

function makeSnow() {
  const canvas = document.getElementById("snow");
  const ctx = canvas.getContext("2d");
  let flakes = [];
  const DPR = Math.min(devicePixelRatio || 1, 2);

  function reset() {
    canvas.width = innerWidth * DPR;
    canvas.height = innerHeight * DPR;
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const count = Math.min(105, Math.max(42, Math.floor(innerWidth * innerHeight / 18000)));
    flakes = Array.from({length: count}, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      r: 1.5 + Math.random() * 4.2,
      vx: -.28 + Math.random() * .56,
      vy: .18 + Math.random() * .65,
      phase: Math.random() * Math.PI * 2,
      hue: Math.random() < .7 ? "94,231,255" : "190,108,255"
    }));
  }
  reset();
  addEventListener("resize", reset);

  function frame(t) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const f of flakes) {
      f.x += f.vx + Math.sin(t / 1500 + f.phase) * .12;
      f.y += f.vy;
      if (f.y > innerHeight + 10) { f.y = -10; f.x = Math.random() * innerWidth; }
      if (f.x < -10) f.x = innerWidth + 10;
      if (f.x > innerWidth + 10) f.x = -10;

      const pulse = .72 + Math.sin(t / 700 + f.phase) * .2;
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 5);
      g.addColorStop(0, `rgba(${f.hue},${.95 * pulse})`);
      g.addColorStop(.2, `rgba(${f.hue},${.55 * pulse})`);
      g.addColorStop(1, `rgba(${f.hue},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(235,250,255,${.72 * pulse})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, Math.max(.7, f.r * .55), 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
makeSnow();

async function loadGraph() {
  try {
    const data = await d3.json("zodiac-graph.json");
    drawGraph(data);
  } catch (err) {
    stats.textContent = "Не удалось загрузить zodiac-graph.json";
    console.error(err);
  }
}

function drawGraph(data) {
  const nodes = data.nodes.map(d => ({...d}));
  const byId = new Map(nodes.map(d => [d.id, d]));
  const links = data.edges
    .map(d => ({...d, source: byId.get(d.from), target: byId.get(d.to)}))
    .filter(d => d.source && d.target);

  stats.textContent = `${nodes.length} узлов · ${links.length} связей`;

  const g = svg.append("g");

  const link = g.append("g")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("class", "link");

  const node = g.append("g")
    .selectAll("g")
    .data(nodes)
    .join("g")
    .attr("class", "node")
    .on("click", (event, d) => {
      event.stopPropagation();
      showNode(d);
    });

  // Use the exact image embedded in every node of the supplied graph file.
  node.append("image")
    .attr("href", d => d.image || "")
    .attr("x", -32)
    .attr("y", -32)
    .attr("width", 64)
    .attr("height", 64)
    .attr("preserveAspectRatio", "xMidYMid meet");

  node.append("text")
    .attr("x", 38)
    .attr("y", 4)
    .text(d => d.label);

  // The graph is static: use the positions already stored in the supplied file.
  // Only the background snow is animated.
  nodes.forEach(d => {
    d.x = Number.isFinite(d.x) ? d.x : width / 2;
    d.y = Number.isFinite(d.y) ? d.y : height / 2;
  });

  // Keep the original graph coordinates, but scale them to fit the viewport.
  const xs = nodes.map(d => d.x), ys = nodes.map(d => d.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const pad = 90;
  const sx = (width - pad * 2) / Math.max(1, maxX - minX);
  const sy = (height - pad * 2) / Math.max(1, maxY - minY);
  const scale = Math.min(sx, sy, 1.35);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  nodes.forEach(d => {
    d.x = width / 2 + (d.x - cx) * scale;
    d.y = height / 2 + (d.y - cy) * scale;
  });

  function ticked() {
    link
      .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x).attr("y2", d.target.y);
    node.attr("transform", d => `translate(${d.x},${d.y})`);
  }
  ticked();

  svg.on("click", () => panel.hidden = true);

  function showNode(d) {
    panel.hidden = false;
    panelType.textContent = d.entityType || "node";
    panelTitle.textContent = d.label || "Без названия";
    let html = "";

    if (d.entityType === "image" && d.image) {
      html += `<img src="${d.image}" alt="${safeText(d.label)}">`;
    } else if (d.entityType === "email") {
      html += `<div>${safeText(d.label)}</div>`;
    } else {
      html += `<div>${safeText(d.label)}</div>`;
    }

    html += `<div class="meta">ID: ${safeText(d.id)}</div>`;
    panelContent.innerHTML = html;
  }
}

closeBtn.addEventListener("click", () => panel.hidden = true);
loadGraph();
