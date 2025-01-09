import * as d3 from "d3";
import { ZkNode, ZkGraph, ZkEdge } from "./Graph";
import { GraphConfig } from "./graphConfig.js";

type SvgSelection = d3.Selection<any, any, any, undefined>;
export class GraphVisualizer {
  svg: SvgSelection;
  config: GraphConfig;
  graph: ZkGraph;
  simulation: d3.Simulation<ZkNode, ZkEdge>;
  zoomGroup: SvgSelection;
  nodes: SvgSelection;
  links: SvgSelection;

  constructor(svg: SvgSelection, config: GraphConfig, graph: ZkGraph) {
    this.svg = svg;
    this.config = config;
    // this.data = this.processGraphData(rawData, tags);
    this.graph = graph;

    this.zoomGroup = this.svg.append("g").attr("class", "zoom-group");
    this.simulation = d3.forceSimulation(this.graph.getAllNodes());
    let allLinks = this.graph.getAllLinks();
    this.links = this.setupLinks(allLinks);

    // Update position on tick
    this.simulation.on("tick.links", () => {
      this.links
        .attr("x1", (d) => d.source.x!)
        .attr("y1", (d) => d.source.y!)
        .attr("x2", (d) => d.target.x!)
        .attr("y2", (d) => d.target.y!);
    });

    this.nodes = this.createNodeGroup(this.graph.getAllNodes());
  }

  async initialize() {
    this.setupSimulation();
    this.setupZoom();
  }
  async redraw() {
    if (this.links) this.links.remove();
    if (this.nodes) this.nodes.remove();
    const nodes = this.graph.getAllNodes();
    const links = this.graph.getAllLinks();

    // Links should be behind the nodes
    this.links = this.setupLinks(links);
    this.nodes = this.createNodeGroup(nodes);
  }

  setupSimulation() {
    this.simulation.alphaDecay(0.05).velocityDecay(0.2).alpha(2).restart();

    this.simulation
      .force("x", d3.forceX().strength(this.config.force.centerForce))
      .force("y", d3.forceY().strength(this.config.force.centerForce))
      .force(
        "repel",
        d3.forceManyBody().strength(this.config.force.repelForce),
      );

    // Pull force between two nodes
    this.simulation.force(
      "link",
      d3
        .forceLink(this.graph.getAllLinks())
        .id((d: any) => d.path)
        .strength(this.config.force.linkForce)
        .distance(this.config.force.linkDistance),
    );

    this.simulation.force(
      "collide",
      d3.forceCollide((d) => d.radius),
    );
  }

  setupZoom() {
    const width = this.svg.node().getBoundingClientRect().width;
    const height = this.svg.node().getBoundingClientRect().height;

    const zoom = d3
      .zoom()
      .scaleExtent([this.config.zoom.min, this.config.zoom.max])
      .on("zoom", (event) => {
        this.zoomGroup.attr("transform", event.transform);
      });

    this.svg
      .call(zoom)
      .call(
        zoom.transform,
        d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(this.config.zoom.defaultScale),
      );
  }

  // From link data, create link visualization and setup simulation force
  setupLinks(links: ZkEdge[]) {
    let container = this.zoomGroup
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", this.config.link.stroke)
      .attr("stroke-opacity", this.config.link.opacity)
      .attr("stroke-width", 2);

    return container;
  }

  createNodeGroup(nodes: ZkNode[]) {
    const container = this.zoomGroup
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .join("g");

    container
      .append("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => d.fill.normal);

    // Add labels to nodes with updated positioning and color
    container
      .append("text")
      .attr("dy", (d) => d.radius + this.config.node.fontSize)
      .attr("text-anchor", "middle")
      .style("fill", this.config.node.textColor)
      .style("font-size", this.config.node.fontSize)
      .attr("hidden", null)
      .text((d) => d.data.title);

    // Add tooltips
    container
      .append("title")
      .text(
        (d) =>
          `${d.data.title}\nIn Edges: ${d.inEdges}\nOut Edges: ${d.outEdges}\nTags: ${d.data.tags ? d.data.tags.length : 0}`,
      );

    this.simulation.on("tick.nodes", () => {
      container.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
    });

    this.setupNodeInteractions(container);
    return container;
  }

  setupNodeInteractions(container: SvgSelection) {
    // Create drag behavior
    const drag = d3
      .drag()
      .on("start", (event, d: any) => {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d: any) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d: any) => {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    // if hovering over the circle
    container.call(drag);

    container
      .on("mouseover", (event, d: ZkNode) => {
        if (event.target.tagName !== "circle") return;

        const connectedNodes = this.graph.getConnectedNotes(d);
        const connectedLinks = this.graph.getConnectedEdges(d);

        // console.log(connectedNodes);
        // Dim all nodes initially
        this.zoomGroup
          .selectAll(".nodes g")
          .style(
            "transition",
            `opacity ${this.config.node.transitionDuration}ms`,
          )
          .style("opacity", this.config.node.dimOpacity)
          .select("circle")
          .style("transition", `fill ${this.config.node.transitionDuration}ms`);

        // Highlight connected nodes
        this.zoomGroup
          .selectAll(".nodes g")
          .filter(
            (n: any) =>
              n.path === d.path ||
              connectedNodes!.some((c: any) => c.path == n.path),
          )
          .style(
            "transition",
            `opacity ${this.config.node.transitionDuration}ms`,
          )
          .style("opacity", this.config.node.highlightOpacity)
          .select("circle")
          .style("transition", `fill ${this.config.node.transitionDuration}ms`)
          .style("fill", (n: any) => n.fill.highlight);

        // // Show text for hovered node
        // d3.select(event.currentTarget).select("text").attr("hidden", null);

        // Dim all links
        this.zoomGroup
          .selectAll(".links line")
          .style(
            "transition",
            `opacity ${this.config.link.transitionDuration}ms, stroke ${this.config.link.transitionDuration}ms, stroke-width ${this.config.link.transitionDuration}ms`,
          )
          .style("opacity", this.config.link.dimOpacity)
          .style("stroke", this.config.link.stroke)
          .style("stroke-width", 1);

        // Highlight connected links
        this.zoomGroup
          .selectAll(".links line")
          .filter((l: any) => connectedLinks.includes(l))
          .style(
            "transition",
            `opacity ${this.config.link.transitionDuration}ms, stroke ${this.config.link.transitionDuration}ms, stroke-width ${this.config.link.transitionDuration}ms`,
          )
          .style("opacity", this.config.link.highlightOpacity)
          .style("stroke", this.config.link.highlight)
          .style("stroke-width", 2);
      })
      .on("mouseout", (event) => {
        // Only trigger if leaving the circle
        if (event.target.tagName !== "circle") return;
        // Reset all nodes
        this.zoomGroup
          .selectAll(".nodes g")
          .style(
            "transition",
            `opacity ${this.config.node.transitionDuration}ms`,
          )
          .style("opacity", this.config.node.highlightOpacity)
          .select("circle")
          .style("transition", `fill ${this.config.node.transitionDuration}ms`)
          .style("fill", (d: any) => d.fill.normal);

        // // Hide all text
        // this.zoomGroup
        //   .selectAll("text")
        //   // .style(
        //   //   "transition",
        //   //   `opacity ${CONFIG.node.transitionDuration}ms, font-size ${CONFIG.node.transitionDuration}ms`,
        //   // )
        //   .attr("hidden", true);

        // Reset all links
        this.zoomGroup
          .selectAll(".links line")
          .style(
            "transition",
            `opacity ${this.config.link.transitionDuration}ms, stroke ${this.config.link.transitionDuration}ms, stroke-width ${this.config.link.transitionDuration}ms`,
          )
          .style("opacity", this.config.link.opacity)
          .style("stroke", this.config.link.stroke)
          .style("stroke-width", 1);
      })
      .on("click", this.handleNodeClick);
  }

  handleNodeClick(event: any) {
    const node: ZkNode = event.srcElement.__data__;
    const file = node.data.absPath;
    if (file) {
      const request = new XMLHttpRequest();
      request.open("GET", "http://localhost:3000/api/open?file=" + file, false);
      request.send();
    } else {
      console.log(`File for ${node.path} not found`);
    }
  }
}
