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

  const zoom = d3.zoom()
    .scaleExtent([.22, 4])
    .on("zoom", e => g.attr("transform", e.transform));
  svg.call(zoom);

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
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended)
    )
    .on("click", (event, d) => {
      event.stopPropagation();
      showNode(d);
    });

  node.append("circle")
    .attr("r", d => Math.max(9, Math.min(18, (d.size || 32) / 2.2)))
    .attr("fill", d => palette[d.entityType] || "#8ba7ff")
    .attr("color", d => palette[d.entityType] || "#8ba7ff");

  node.append("text")
    .attr("x", d => Math.max(9, Math.min(18, (d.size || 32) / 2.2)) + 7)
    .attr("y", 3)
    .text(d => d.label);

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(105).strength(.45))
    .force("charge", d3.forceManyBody().strength(-250))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius(d => Math.max(18, (d.size || 32) / 2 + 9)))
    .alphaDecay(.018)
    .on("tick", ticked);

  // Start from positions stored in the supplied file when available.
  nodes.forEach(d => {
    if (Number.isFinite(d.x)) d.x = width / 2 + d.x / 8;
    if (Number.isFinite(d.y)) d.y = height / 2 + d.y / 8;
  });
  simulation.alpha(1).restart();

  svg.on("click", () => panel.hidden = true);

  function ticked() {
    link
      .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x).attr("y2", d => d.target.y);

    node.attr("transform", d => `translate(${d.x},${d.y})`);
  }

  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(.2).restart();
    d.fx = d.x; d.fy = d.y;
  }
  function dragged(event, d) {
    d.fx = event.x; d.fy = event.y;
  }
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null; d.fy = null;
  }

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
