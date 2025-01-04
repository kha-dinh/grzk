"use client";

import { useFuzzySearchList, Highlight } from "@nozbe/microfuzz/react";
import React, { useRef, useState, useEffect } from "react";
import * as d3 from "d3";
import ConfigControl from "./GraphControl";
import { defaultConfig } from "./graphConfig.ts";
import createFuzzySearch from "@nozbe/microfuzz";

class GraphVisualizer {
  constructor(svg, config, rawData, tags) {
    this.svg = svg;
    this.config = config;
    this.data = this.processGraphData(rawData, tags);
    this.filtered = null;
    this.tags = tags;
    this.simulation = null;
    this.zoomGroup = null;
    this.nodes = null;
    this.links = null;
  }

  async initialize() {
    try {
      this.applyFilter()
      this.setupSimulation();
      this.createVisualization();
      this.setupZoom();
    } catch (error) {
      console.error("Failed to initialize graph:", error);
    }
  }

  applyFilter(filter = null) {
    if (!filter) {
      this.filtered = this.data
      return;
    }
    const tagNodes = this.data.nodes
      .filter((d) => d.type == "tag");

    const fuzzySearch = createFuzzySearch(
      this.data.nodes.filter((d) => d.type != "tag"),
      {
        getText: (item) => [item.title],
      },
    );


    let selectedNodes = fuzzySearch(filter).map((n) => n.item);
    const connectedTags = tagNodes.filter((d) => {
      let connected = this.getConnectedNodes(d);
      return selectedNodes.some((n) => {
        return connected.has(n.path);
      });
    });

    selectedNodes = selectedNodes.concat(connectedTags);

    let connectedLinks = new Set();
    selectedNodes.forEach((n) => {
      let links = this.getConnectedLinks(n);
      if (links) {
        links = [...links].filter(
          (l) =>
            selectedNodes.some((n) => l.source.path === n.path) &&
            selectedNodes.some((n) => l.target.path === n.path)

        );
        if (links.length > 0) {
          connectedLinks.add(...links);
        }
      }
    });
    connectedLinks = [...connectedLinks]
    this.filtered = {
      nodes: selectedNodes,
      links: connectedLinks,
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

    let nodes = rawData.notes.map((note) => {
      if (note.title.length > 60) {
        note.title = note.title.slice(0, 60) + "...";
      }
      return {
        ...note,
        type: "note",
        connections: connectionCounts[note.path] || 0,
        active: this.config.node.highlightFill,
        inactive: this.config.node.fill,
      };
    });

    // }

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
        active: this.config.node.tagHighlightFill,
        inactive: this.config.node.tagFill,
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

  setupSimulation() {
    if (this.simulation) {
      this.simulation.stop()
    }

    this.simulation = d3
      .forceSimulation(this.filtered.nodes)
      .force(
        "x",
        d3.forceX().strength((d) => {
          return this.config.force.centerForce;
        }),
      )
      .force(
        "y",
        d3.forceY().strength((d) => {
          return this.config.force.centerForce;
        }),
      )

      // Repel force - pushes nodes away from each other
      .force(
        "charge",
        d3.forceManyBody().strength((d) => { return this.config.force.repelForce; }),
      )

      // Link force - maintains connections between nodes
      .force(
        "link",
        d3
          .forceLink(this.filtered.links)
          .id((d) => d.path)
          .strength(this.config.force.linkForce)
          .distance(this.config.force.linkDistance),
      );

    // These x and y forces are now handled in the center force above

    // Adjust simulation parameters for stability
    this.simulation
      .alphaDecay(0.02) // Slower cooling
      .velocityDecay(0.2) // More momentum
      .alpha(0.2)
      .restart();
  }

  createVisualization(data) {
    this.zoomGroup = this.svg.append("g").attr("class", "zoom-group");

    if (this.links) {
      this.links.remove();
    }
    if (this.nodes) {
      this.nodes.remove();
    }
    // Store references to nodes and links
    this.links = this.createLinks(this.filtered.links);
    this.nodes = this.createNodeGroups(this.filtered.nodes);

    this.setupSimulationTick(this.nodes, this.links);
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

  createLinks(links) {
    return this.zoomGroup
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", this.config.link.stroke)
      .attr("stroke-opacity", this.config.link.opacity)
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
          this.config.node.baseRadius +
          d.connections * this.config.node.radiusMultiplier,
      )
      .attr("fill", this.config.node.fill);

    container
      .filter((d) => d.type == "tag")
      .append("circle")
      .attr(
        "r",
        (d) =>
          this.config.node.baseRadius +
          d.connections * this.config.node.radiusMultiplier,
      )
      .attr("fill", this.config.node.tagFill);

    // Add labels to nodes with updated positioning and color
    container
      .append("text")
      .attr(
        "dy",
        (d) =>
          this.config.node.baseRadius +
          d.connections * this.config.node.radiusMultiplier +
          this.config.node.textYOffset,
      )
      .attr("text-anchor", "middle") // Center the text below the node
      .style("fill", this.config.node.textColor) // Set text color
      .style("font-size", this.config.node.fontSize)
      .attr("hidden", null)
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

    this.data.links.forEach((link) => {
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

    this.data.links.forEach((link) => {
      if (
        link.source.path === sourceNode.path ||
        link.target.path === sourceNode.path
      ) {
        connectedLinks.add(link);
      }
    });
    if (connectedLinks.length == 0) {
      return null
    }

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

    // if hovering over the circle
    container
      .call(drag);

    container.on("mouseover", (event, d) => {
      if (event.target.tagName !== "circle") return;

      const connectedNodes = this.getConnectedNodes(d);
      const connectedLinks = this.getConnectedLinks(d);

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
      // .style("fill", d.active);

      // Highlight connected nodes
      this.zoomGroup
        .selectAll(".nodes g")
        .filter((n) => n.path === d.path || connectedNodes.has(n.path))
        .style(
          "transition",
          `opacity ${this.config.node.transitionDuration}ms`,
        )
        .style("opacity", this.config.node.highlightOpacity)
        .select("circle")
        .style("transition", `fill ${this.config.node.transitionDuration}ms`)
        .style("fill", (n) => n.active);

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
        .filter((l) => connectedLinks.has(l))
        .style(
          "transition",
          `opacity ${this.config.link.transitionDuration}ms, stroke ${this.config.link.transitionDuration}ms, stroke-width ${this.config.link.transitionDuration}ms`,
        )
        .style("opacity", this.config.link.highlightOpacity)
        .style("stroke", this.config.link.highlightStroke)
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
          .style("fill", (d) => d.inactive);

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

  handleNodeClick(event) {
    const file = event.srcElement.__data__.absPath;
    const request = new XMLHttpRequest();
    request.open("GET", "http://localhost:3000/api/open?file=" + file, false);
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
  const refSvg = useRef(null);

  useEffect(() => {
    const svg = d3.select(refSvg.current);
    async function fetchData() {
      const fetchData = await d3.json("http://localhost:3000/api/graph");
      const fetchTags = await d3.json("http://localhost:3000/api/tag");
      // console.log(fetchData);
      // console.log(fetchTags);
      const newGraph = new GraphVisualizer(
        svg,
        defaultConfig,
        fetchData,
        fetchTags,
      );
      newGraph.initialize();
      setGraphInstance(newGraph);
    }
    fetchData();
    return () => { };
  }, []);

  const handleConfigUpdate = (newConfig) => {
    if (!graphInstance) return;

    graphInstance.config = newConfig;

    graphInstance.setupSimulation();
    graphInstance.createVisualization();
    graphInstance.setupZoom();
    // graphInstance.setupSimulation()
    // graphInstance.simulation
    //   .force("x", d3.forceX().strength(newConfig.force.centerForce))
    //   .force("y", d3.forceY().strength(newConfig.force.centerForce))
    //   .force("charge", d3.forceManyBody().strength(newConfig.force.repelForce))
    //   .force(
    //     "link",
    //     graphInstance.simulation
    //       .force("link")
    //       .strength(newConfig.force.linkForce)
    //       .distance(newConfig.force.linkDistance),
    //   );
    //
    // graphInstance.zoomGroup
    //   .selectAll(".nodes circle")
    //   .attr(
    //     "r",
    //     (d) =>
    //       newConfig.node.baseRadius +
    //       d.connections * newConfig.node.radiusMultiplier,
    //   );

    // Restart simulation
    // graphInstance.simulation.alpha(0.3).restart();
  };

  const handleFilterUpdate = (newFilter) => {
    graphInstance.applyFilter(newFilter);
    graphInstance.setupSimulation();
    graphInstance.createVisualization();
    graphInstance.setupZoom();
  };

  return (
    <>
      <ConfigControl
        onConfigUpdate={handleConfigUpdate}
        onFilterUpdate={handleFilterUpdate}
      />
      <div className="graph-container">
        <svg
          ref={refSvg}
          style={{
            height: "100vh",
            width: "100%",
            position: "fixed",
            backgroundColor: defaultConfig.background.color,
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
