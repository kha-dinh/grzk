import * as d3 from "d3";
import { ZkNode, ZkGraph, ZkEdge, GraphFilter } from "./Graph";
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
    this.simulation
      .alphaDecay(0.05)
      .velocityDecay(0.3)
      .alpha(1)
      .restart();

    this.simulation
      .force("x", d3.forceX().strength(this.config.force.centerForce))
      .force("y", d3.forceY().strength(this.config.force.centerForce))
      .force("repel", d3.forceManyBody().strength(this.config.force.repelForce),
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

    const selectedNode =
      this.zoomGroup
        .selectAll(".nodes g")
        .filter(
          (n: any) =>
            n == this.graph.filter.selectedNode
        );
    selectedNode
      .select("text")
      .style("font-size", `${this.config.node.fontSize * 1.2}px`)
      .attr("dy", (d: any) => (d.radius + this.config.node.fontSize) * 1.2)
      ;

    selectedNode
      .select("circle")
      .attr("r", (d: any) => d.radius * 1.2)
      .attr("fill", (d: any) => d.fill.highlight);


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


    const mouseOver = (event: any, d: ZkNode) => {
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

      nodes.filter(
        (n: any) =>
          n.path === d.path ||
          connectedNodes!.some((c: any) => c.path === n.path),
      )
        .style("opacity", 1)
        .select("circle")
        .style("fill", (n: any) => n.fill.highlight)

      // Dim remaining nodes
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
    }

    const mouseOut = (event: any) => {
      // Only trigger if leaving the circle
      if (event.target.tagName !== "circle") return;

      let nonSelected =
        this.zoomGroup
          .selectAll(".nodes g")
          .filter((d) => d != this.graph.filter.selectedNode).transition()
      nonSelected
        .style("opacity", 1)
        .select("circle")
        .style("fill", (d: any) => d.fill.normal)
        .attr("r", (d: any) => d.radius);

      nonSelected
        .select("text")
        .attr("dy", (d: any) => (d.radius + this.config.node.fontSize))
        .style("font-size", `${this.config.node.fontSize}px`)

      // Reset all links
      this.zoomGroup
        .selectAll(".links line")
        .transition()
        .style("stroke-opacity", this.config.link.opacity)
        .style("stroke", this.config.link.stroke)
        .style("stroke-width", 1 + "px");
    }

    const handleClick = (e: PointerEvent, d: ZkNode) => {
      // Reset other selection
      // const connectedLinks = this.graph.getConnectedEdges(d);

      // connectedNodes.forEach((n) => {
      //   if (n) n.active = true;
      // })
      this.graph.toggleSelectNode(d)
      this.graph.applyFilters();
      this.render();
      this.setupSimulation();
    }
    const handleRightClick = (e: PointerEvent, d: ZkNode) => {
      e.preventDefault();
      this.onNodeSelect(d);
    }

    // Node hovering
    container.on("mouseover", mouseOver)
      .on("contextmenu", handleRightClick)
      .on("click", handleClick)
      .on("mouseout", mouseOut);
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
  onScaleUpdate: (s: any) => void;
  onNodeSelect: (e: any) => void;
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
    if (!graphViz) return;
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
