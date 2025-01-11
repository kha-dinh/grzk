import * as d3 from "d3";
import { ZkNode, ZkGraph, ZkEdge, RawData, GraphFilter } from "./Graph";
import { GraphConfig } from "./graphConfig";
import { useEffect, useRef, useState } from "react";

type SvgSelection = d3.Selection<any, any, any, undefined>;
export class GraphVisualizer {
  svg: SvgSelection;
  config: GraphConfig;
  graph: ZkGraph;
  simulation: d3.Simulation<ZkNode, ZkEdge>;
  zoomGroup: SvgSelection;
  nodes?: SvgSelection;
  links?: SvgSelection;
  onScaleUpdate: (arg: number) => void;
  onNodeSelect: (node: ZkNode) => void;

  constructor(svg: SvgSelection, config: GraphConfig, graph: ZkGraph,
    onScaleUpdate: (arg: number) => void,
    onNodeSelect: (node: ZkNode) => void
  ) {

    this.svg = svg;
    this.config = config;
    this.graph = graph;
    this.zoomGroup = this.svg.append("g").attr("class", "zoom-group");
    this.simulation = d3.forceSimulation();
    this.onScaleUpdate = onScaleUpdate;
    this.onNodeSelect = onNodeSelect;
  }

  async render() {
    if (this.links) this.links.remove();
    if (this.nodes) this.nodes.remove();

    this.graph.applyFilters();
    const nodes = this.graph.getFilteredNodes();
    const links = this.graph.getFilteredLinks();

    // Links should be behind the nodes
    this.links = this.setupLinks(links);
    this.nodes = this.createNodeGroup(nodes);
  }

  setupSimulation() {
    if (!this.links || !this.nodes)
      return;
    this.graph.applyFilters();
    this.simulation.nodes(this.graph.getFilteredNodes());
    this.simulation.alphaDecay(0.05).velocityDecay(0.2).alpha(1).restart();

    this.simulation
      .force("x", d3.forceX().strength(this.config.force.centerForce))
      .force("y", d3.forceY().strength(this.config.force.centerForce))
      .force(
        "repel",
        // Scaling repel force lets notes appears in layers
        d3.forceManyBody().strength((d) => d.radius * 0.1 * this.config.force.repelForce),
      );

    // Pull force between two nodes
    this.simulation.force(
      "link",
      d3
        .forceLink(this.graph.getFilteredLinks())
        .id((d: any) => d.path)
        .strength(this.config.force.linkForce)
        .distance(this.config.force.linkDistance),
    );

    this.simulation.force(
      "collide",
      d3.forceCollide((d) => d.radius),
    );

    // Update position on tick
    this.simulation.on("tick.links", () => {
      this.links!
        .attr("x1", (d) => d.source.x!)
        .attr("y1", (d) => d.source.y!)
        .attr("x2", (d) => d.target.x!)
        .attr("y2", (d) => d.target.y!);
    });
  }

  setupZoom() {
    const width = this.svg.node().getBoundingClientRect().width;
    const height = this.svg.node().getBoundingClientRect().height;

    const zoom = d3
      .zoom()
      .scaleExtent([this.config.zoom.min, this.config.zoom.max])
      .on("zoom", (event) => {
        this.zoomGroup.attr("transform", event.transform);
        // this.onScaleUpdate(1 - event.transform.k)
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

  showHideTitles(showTitle: boolean) {
    if (showTitle) this.zoomGroup.selectAll("text").attr("hidden", null);
    else this.zoomGroup.selectAll("text").attr("hidden", true);
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
      .attr("stroke-width", 1 + "px");

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
      .append("text")
      .attr("dy", (d) => d.radius + this.config.node.fontSize)
      .attr("text-anchor", "middle")
      .style("fill", this.config.node.textColor)
      .style("font-size", `${this.config.node.fontSize}px`)
      .text((d) => d.data.title);

    container
      .append("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => d.fill.normal);

    // Add labels to nodes with updated positioning and color

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

  styleNode(nodes: SvgSelection) {
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

    // Node hovering
    container.on("mouseover", (event, d: ZkNode) => {
      if (event.target.tagName !== "circle") return;

      const connectedNodes = this.graph.getConnectedNotes(d);
      const connectedLinks = this.graph.getConnectedEdges(d);

      let nodes = this.zoomGroup.selectAll(".nodes g").transition();

      // Style the the hovered node
      const selectedNode =
        nodes.filter(
          (n: any) =>
            n.path === d.path
        );
      selectedNode
        .select("text")
        .style("font-size", `${this.config.node.fontSize * 1.2}px`)
        .attr("dy", (d: any) => (d.radius + this.config.node.fontSize) * 1.2)
        ;

      selectedNode
        .select("circle")
        .attr("r", (d: any) => d.radius * 1.2)

      const connected = nodes.filter(
        (n: any) =>
          n.path === d.path ||
          connectedNodes!.some((c: any) => c.path === n.path),
      );
      // Highlight connected nodes
      connected
        .style("opacity", 1)
        .select("circle")
        .style("fill", (n: any) => n.fill.highlight)

      nodes.filter((n: any) =>
        !connectedNodes.includes(n) && n.path != d.path
      ).style("opacity", this.config.node.dimOpacity);
      // Dim all links
      let links = this.zoomGroup
        .selectAll(".links line")
        .transition()


      // Dim non-connected links
      links.filter((l: any) => !connectedLinks.includes(l))
        .style("stroke-opacity", this.config.link.dimOpacity)
        .style("stroke", this.config.link.stroke)
        .style("stroke-width", 1 + "px");

      // Highlight connected links
      links.filter((l: any) => connectedLinks.includes(l))
        .style("stroke-opacity", this.config.link.highlightOpacity)
        .style("stroke", this.config.link.highlight)
        .style("stroke-width", 2 + "px");
    })
      .on("mouseout", (event) => {
        // Only trigger if leaving the circle
        if (event.target.tagName !== "circle") return;
        // Reset all nodes
        this.zoomGroup
          .selectAll(".nodes g")
          .transition()
          .style("opacity", this.config.node.highlightOpacity)
          .select("circle")
          .style("fill", (d: any) => d.fill.normal)
          .attr("r", (d: any) => d.radius);

        this.zoomGroup.selectAll("text")
          .transition()
          .attr("dy", (d: any) => (d.radius + this.config.node.fontSize))
          .style("font-size", `${this.config.node.fontSize}px`)

        // Reset all links
        this.zoomGroup
          .selectAll(".links line")
          .transition()
          .style("stroke-opacity", this.config.link.opacity)
          .style("stroke", this.config.link.stroke)
          .style("stroke-width", 1 + "px");
      })
      .on("click", this.onNodeSelect);
  }

}

const D3Graph = ({
  config,
  filter,
  graph,
  showTitle,
  onScaleUpdate,
  onNodeSelect,
}: {
  config: GraphConfig;
  graph: ZkGraph;
  filter: GraphFilter;
  showTitle: boolean;
  onScaleUpdate: any
}) => {
  const refSvg = useRef(null);
  const [graphViz, setGraphViz] = useState<GraphVisualizer | undefined>();

  useEffect(() => {
    if (!graphViz) {
      const svg = d3.select(refSvg.current);
      const graphViz = new GraphVisualizer(svg,
        config,
        graph,
        onScaleUpdate,
        onNodeSelect
      );
      graphViz.setupZoom();
      setGraphViz(graphViz);
    }
  }, [graph]);

  useEffect(() => {
    if (!graphViz) return;
    graphViz.config = config;
    graphViz.render();
    graphViz.setupSimulation();
    graphViz.setupZoom();
    graphViz.showHideTitles(showTitle);
  }, [graphViz, config]);

  useEffect(() => {
    if (!graphViz || !filter) return;
    graphViz.graph.setFilter(filter);
    graphViz.render();
    // Filter changes nodes shown => change simulation
    graphViz.setupSimulation();
    // TODO: manage showhide state
    graphViz.showHideTitles(showTitle);
  }, [graphViz, filter]);

  useEffect(() => {
    graphViz?.showHideTitles(showTitle);
  }, [graphViz, showTitle]);

  return (
    <div className="graph-container">
      <svg
        ref={refSvg}
        style={{
          height: "100vh",
          width: "100%",
          position: "fixed",
          backgroundColor: config.background.color,
          top: 0,
          left: 0,
        }}
      >
        <g className="plot-area" />
        <g className="x-axis" />
        <g className="y-axis" />
      </svg>
    </div>
  );
};

export default D3Graph;
