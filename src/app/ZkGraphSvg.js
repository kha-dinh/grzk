"use client";

import { useD3 } from "./useD3";
import React, { useRef, useState, useEffect } from "react";
import * as d3 from "d3";
import ConfigSliders from "./GraphControl";
//
// Configuration object for graph settings
const defaultConfig = {
  node: {
    baseRadius: 7,
    radiusMultiplier: 0.5,
    fill: "#1f77b4",
    tagFill: "#cc77cc",
    highlightFill: "#ff6b6b", // Highlight color for nodes
    fontSize: 0,
    hoverFontSize: 25,
    textColor: "#333333", // Added text color configuration
    textYOffset: 30, // Added offset for text below node
    dimOpacity: 0.2,
    highlightOpacity: 1,
    transitionDuration: 300,
  },
  link: {
    stroke: "#999",
    highlightStroke: "#ff6b6b",
    opacity: 1,
    strength: 2,
    dimOpacity: 0.2,
    highlightOpacity: 1,
    arrowSize: 3, // Size of the arrow marker
  },
  forces: {
    centerForce: 0.2, // How strongly nodes are pulled to the center (0-1)
    repelForce: -500, // How strongly nodes push away from each other
    linkForce: 0.3, // How strongly connected nodes pull together (0-1)
    linkDistance: 50, // Base distance between connected nodes
  },
  zoom: {
    min: 0.1,
    max: 10,
    defaultScale: 0.4,
  },
};

class GraphVisualizer {
  constructor(svg, config, rawData, tags) {
    this.svg = svg;
    this.config = config;
    this.rawData = rawData;
    this.tags = tags;
    this.simulation = null;
    this.zoomGroup = null;
    this.nodes = null;
    this.links = null;
  }

  async initialize() {
    try {
      const processedData = this.processGraphData(this.rawData, this.tags);
      this.setupSimulation(processedData);
      this.createVisualization(processedData);
      this.setupZoom();
    } catch (error) {
      console.error("Failed to initialize graph:", error);
    }
  }

  calculateConnectionCounts(nodes, links) {
    const counts = Object.fromEntries(nodes.map((node) => [node.path, 0]));

    links.forEach((link) => {
      counts[link.source]++;
      counts[link.target]++;
    });

    return counts;
  }

  processGraphData(rawData, tags) {
    const validPaths = rawData.notes.map((note) => note.path);
    const links = rawData.links
      .filter(
        (edge) =>
          validPaths.includes(edge.targetPath) &&
          validPaths.includes(edge.sourcePath),
      )
      .map((edge) => ({
        // We link nodes base on their "path"
        source: edge.sourcePath,
        target: edge.targetPath,
      }));

    const connectionCounts = this.calculateConnectionCounts(
      rawData.notes,
      links,
    );

    const nodes = rawData.notes.map((note) => ({
      ...note,
      type: "note",
      connections: connectionCounts[note.path] || 0,
      active: defaultConfig.node.highlightFill,
      inactive: defaultConfig.node.fill,
    }));

    tags.map((tag) => {
      const tagLinks = rawData.notes.filter((note) =>
        note.tags.includes(tag.name),
      );

      // NOTE: We link nodes base on their path
      const tagNode = {
        title: tag.name,
        connections: tagLinks.length,
        type: "tag",
        id: 999,
        path: tag.name,
        active: defaultConfig.node.highlightFill,
        inactive: defaultConfig.node.tagFill,
      };
      nodes.push(tagNode);
      tagLinks.map((note) => {
        // console.log(note);
        links.push({
          source: tagNode.path,
          target: note.path,
        });
      });
    });

    // console.log(rawData.links);
    // console.log(links);
    // console.log(nodes);
    // console.log(tags);

    return { nodes, links };
  }

  setupSimulation(data) {
    // Calculate the maximum number of connections for normalization
    const maxConnections = Math.max(
      ...data.nodes.map((node) => node.connections),
    );

    this.simulation = d3
      .forceSimulation(data.nodes)
      // Center force - pulls nodes toward the center, stronger for well-connected nodes
      .force(
        "x",
        d3.forceX().strength((d) => {
          // Normalize connections to get a value between 0 and 1
          const connectionStrength = d.connections / maxConnections;
          // More connections = stronger pull to center
          return defaultConfig.forces.centerForce * (1 + connectionStrength);
        }),
      )
      .force(
        "y",
        d3.forceY().strength((d) => {
          const connectionStrength = d.connections / maxConnections;
          return defaultConfig.forces.centerForce * (1 + connectionStrength);
        }),
      )

      // Repel force - pushes nodes away from each other
      .force(
        "charge",
        d3.forceManyBody().strength(defaultConfig.forces.repelForce),
      )

      // Link force - maintains connections between nodes
      .force(
        "link",
        d3
          .forceLink(data.links)
          .id((d) => d.path)
          .strength(defaultConfig.forces.linkForce)
          .distance(defaultConfig.forces.linkDistance),
      );

    // These x and y forces are now handled in the center force above

    // Adjust simulation parameters for stability
    this.simulation
      .alphaDecay(0.02) // Slower cooling
      .velocityDecay(0.2) // More momentum
      .alpha(0.5)
      .restart();
  }

  createVisualization(data) {
    this.zoomGroup = this.svg.append("g").attr("class", "zoom-group");

    // Store references to nodes and links
    this.links = this.createLinks(data.links);
    this.nodes = this.createNodeGroups(data.nodes);

    this.setupSimulationTick(this.nodes, this.links);
  }

  setupZoom() {
    const width = this.svg.node().getBoundingClientRect().width;
    const height = this.svg.node().getBoundingClientRect().height;

    const zoom = d3
      .zoom()
      .scaleExtent([defaultConfig.zoom.min, defaultConfig.zoom.max])
      .on("zoom", (event) => {
        this.zoomGroup.attr("transform", event.transform);
      });

    this.svg
      .call(zoom)
      .call(
        zoom.transform,
        d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(defaultConfig.zoom.defaultScale),
      );
  }

  createLinks(links) {
    return this.zoomGroup
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", defaultConfig.link.stroke)
      .attr("stroke-opacity", defaultConfig.link.opacity)
      .attr("stroke-width", 2);
  }

  createNodeGroups(nodes) {
    const container = this.zoomGroup
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .join("g");

    // Add circles to nodes
    container
      .filter((d) => d.type == "note")
      .append("circle")
      .attr(
        "r",
        (d) =>
          defaultConfig.node.baseRadius +
          d.connections * defaultConfig.node.radiusMultiplier,
      )
      .attr("fill", defaultConfig.node.fill);

    container
      .filter((d) => d.type == "tag")
      .append("circle")
      .attr(
        "r",
        (d) =>
          defaultConfig.node.baseRadius +
          d.connections * defaultConfig.node.radiusMultiplier,
      )
      .attr("fill", defaultConfig.node.tagFill);

    // Add labels to nodes with updated positioning and color
    container
      .append("text")
      .attr(
        "dy",
        (d) =>
          defaultConfig.node.baseRadius +
          d.connections * defaultConfig.node.radiusMultiplier +
          defaultConfig.node.textYOffset,
      )
      .attr("text-anchor", "middle") // Center the text below the node
      .style("fill", defaultConfig.node.textColor) // Set text color
      .style("font-size", defaultConfig.node.fontSize)
      .style("opacity", 0)
      .text((d) => d.title);

    // Add tooltips
    container
      .append("title")
      .text((d) => `${d.title}\nConnections: ${d.connections}`);

    this.setupNodeInteractions(container);
    return container;
  }

  getConnectedNodes(sourceNode) {
    const connected = new Set();
    const links = this.simulation.force("link").links();

    links.forEach((link) => {
      if (link.source.path === sourceNode.path) {
        connected.add(link.target.path);
      } else if (link.target.path === sourceNode.path) {
        connected.add(link.source.path);
      }
    });

    return connected;
  }

  getConnectedLinks(sourceNode) {
    const connectedLinks = new Set();
    const links = this.simulation.force("link").links();

    links.forEach((link) => {
      if (
        link.source.path === sourceNode.path ||
        link.target.path === sourceNode.path
      ) {
        connectedLinks.add(link);
      }
    });

    return connectedLinks;
  }

  setupNodeInteractions(container) {
    // Create drag behavior
    const drag = d3
      .drag()
      .on("start", (event, d) => {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    container
      .call(drag)
      .on("mouseover", (event, d) => {
        // Only trigger if hovering over the circle
        if (event.target.tagName !== "circle") return;

        const connectedNodes = this.getConnectedNodes(d);
        const connectedLinks = this.getConnectedLinks(d);

        // Dim all nodes initially
        this.zoomGroup
          .selectAll(".nodes g")
          .style(
            "transition",
            `opacity ${defaultConfig.node.transitionDuration}ms`,
          )
          .style("opacity", defaultConfig.node.dimOpacity)
          .select("circle")
          .style(
            "transition",
            `fill ${defaultConfig.node.transitionDuration}ms`,
          );
        // .style("fill", d.active);

        // Highlight connected nodes
        this.zoomGroup
          .selectAll(".nodes g")
          .filter((n) => n.path === d.path || connectedNodes.has(n.path))
          .style(
            "transition",
            `opacity ${defaultConfig.node.transitionDuration}ms`,
          )
          .style("opacity", defaultConfig.node.highlightOpacity)
          .select("circle")
          .style(
            "transition",
            `fill ${defaultConfig.node.transitionDuration}ms`,
          )
          .style("fill", d.active);

        // Show text for hovered node only
        d3.select(event.currentTarget)
          .select("text")
          // .style(
          //   "transition",
          //   `opacity ${CONFIG.node.transitionDuration}ms, font-size ${CONFIG.node.transitionDuration}ms`,
          // )
          .style("opacity", 1)
          .style("font-size", defaultConfig.node.hoverFontSize);

        // Dim all links
        this.zoomGroup
          .selectAll(".links line")
          .style(
            "transition",
            `opacity ${defaultConfig.link.transitionDuration}ms, stroke ${defaultConfig.link.transitionDuration}ms, stroke-width ${defaultConfig.link.transitionDuration}ms`,
          )
          .style("opacity", defaultConfig.link.dimOpacity)
          .style("stroke", defaultConfig.link.stroke)
          .style("stroke-width", 1);

        // Highlight connected links
        this.zoomGroup
          .selectAll(".links line")
          .filter((l) => connectedLinks.has(l))
          .style(
            "transition",
            `opacity ${defaultConfig.link.transitionDuration}ms, stroke ${defaultConfig.link.transitionDuration}ms, stroke-width ${defaultConfig.link.transitionDuration}ms`,
          )
          .style("opacity", defaultConfig.link.highlightOpacity)
          .style("stroke", defaultConfig.link.highlightStroke)
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
            `opacity ${defaultConfig.node.transitionDuration}ms`,
          )
          .style("opacity", defaultConfig.node.highlightOpacity)
          .select("circle")
          .style(
            "transition",
            `fill ${defaultConfig.node.transitionDuration}ms`,
          )
          .style("fill", (d) => d.inactive);

        // Hide all text
        this.zoomGroup
          .selectAll("text")
          // .style(
          //   "transition",
          //   `opacity ${CONFIG.node.transitionDuration}ms, font-size ${CONFIG.node.transitionDuration}ms`,
          // )
          .style("opacity", 0)
          .style("font-size", defaultConfig.node.fontSize);

        // Reset all links
        this.zoomGroup
          .selectAll(".links line")
          .style(
            "transition",
            `opacity ${defaultConfig.link.transitionDuration}ms, stroke ${defaultConfig.link.transitionDuration}ms, stroke-width ${defaultConfig.link.transitionDuration}ms`,
          )
          .style("opacity", defaultConfig.link.opacity)
          .style("stroke", defaultConfig.link.stroke)
          .style("stroke-width", 1);
      })
      .on("click", this.handleNodeClick);
  }

  handleNodeClick(event) {
    const file = event.srcElement.__data__.absPath;
    const request = new XMLHttpRequest();
    request.open("GET", document.URL + "open" + "?file=" + file, false);
    request.send();
  }

  setupSimulationTick(nodeGroups, links) {
    this.simulation.on("tick", () => {
      nodeGroups.attr("transform", (d) => `translate(${d.x}, ${d.y})`);

      links
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);
    });
  }
}

function ZkGraph() {
  const [graphInstance, setGraphInstance] = useState(null);
  // const [rawData, setRawData] = useState(null);
  // const [tags, setTags] = useState(null);
  const refSvg = useRef(null)

  useEffect(() => {
    const svg = d3.select(refSvg.current);
    async function fetchData() {
      const fetchData = await d3.json("http://localhost:3000/api/graph");
      const fetchTags = await d3.json("http://localhost:3000/api/tag");
      // console.log(fetchData);
      // console.log(fetchTags);
      const newGraph = new GraphVisualizer(svg, null, fetchData, fetchTags);
      newGraph.initialize();
      setGraphInstance(newGraph);
    }
    fetchData();
    // setRawData(rawData)
    // console.log(fetch);
    return () => { };
  }, [])


  // const ref = useD3((svg) => {
  //   const newGraph = new GraphVisualizer(ref);
  //   newGraph.initialize("graph.json", "tags.json", svg);
  //   setGraphInstance(newGraph);
  // }, []);
  //
  const handleConfigUpdate = (newConfig) => {
    if (!graphInstance) return;

    // Update forces
    graphInstance.simulation
      .force("x", d3.forceX().strength(newConfig.forces.centerForce))
      .force("y", d3.forceY().strength(newConfig.forces.centerForce))
      .force("charge", d3.forceManyBody().strength(newConfig.forces.repelForce))
      .force(
        "link",
        graphInstance.simulation
          .force("link")
          .strength(newConfig.forces.linkForce)
          .distance(newConfig.forces.linkDistance),
      );

    // Update node sizes
    graphInstance.zoomGroup
      .selectAll(".nodes circle")
      .attr(
        "r",
        (d) =>
          newConfig.node.baseRadius +
          d.connections * newConfig.node.radiusMultiplier,
      );

    // Restart simulation
    graphInstance.simulation.alpha(0.3).restart();
  };

  return (
    <>
      {/* <ConfigSliders onConfigUpdate={handleConfigUpdate} /> */}
      <div className="graph-container">
        <svg
          ref={refSvg}
          style={{
            height: "100vh",
            width: "100%",
            position: "fixed",
            top: 0,
            left: 0,
          }}
        >
          <g className="plot-area" />
          <g className="x-axis" />
          <g className="y-axis" />
        </svg>
      </div>
    </>
  );
}

export default ZkGraph;
