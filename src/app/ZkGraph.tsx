"use client";

import { useFuzzySearchList, Highlight } from "@nozbe/microfuzz/react";
import React, { useRef, useState, useEffect } from "react";
import * as d3 from "d3";
import ConfigControl from "./GraphControl";
import { GraphConfig, defaultConfig } from "./graphConfig";
import { GraphVisualizer } from "./D3Graph";
import { RawData, ZkGraph } from "./Graph";

function Graph() {
  const [graph, setGraph] = useState<ZkGraph>();
  const [graphViz, setGraphViz] = useState<GraphVisualizer>();
  const [tags, setTags] = useState<string[]>([]);
  const refSvg = useRef(null);

  useEffect(() => {
    const svg = d3.select(refSvg.current);
    async function fetchData() {
      const fetchData: RawData | undefined = await d3.json(
        "http://localhost:3000/api/graph",
      );

      const graph = new ZkGraph(fetchData!);
      const graphViz = new GraphVisualizer(svg, defaultConfig, graph);
      graphViz.initialize();

      setGraph(graph);
      setGraphViz(graphViz);
    }
    fetchData();
    return () => {};
  }, []);

  const handleConfigUpdate = (newConfig: GraphConfig) => {
    graphViz.config = newConfig;
    graphViz.setupSimulation();
    // graphInstance.createVisualization();
    // graphInstance.setupZoom();
  };

  const handleFilterUpdate = (newFilter) => {
    graphViz.filter = newFilter;
    graphViz.applyFilter();
    graphViz.setupSimulation();
    graphViz.createVisualization();
    graphViz.setupZoom();
  };

  const handleTagSelect = (newTags) => {
    graphViz.tagFilter = newTags;
    graphViz.applyFilter();
    graphViz.setupSimulation();
    graphViz.createVisualization();
    graphViz.setupZoom();
  };

  return (
    <>
      <ConfigControl
        onConfigUpdate={handleConfigUpdate}
        onFilterUpdate={handleFilterUpdate}
        tags={tags}
        onTagSelect={handleTagSelect}
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

export default Graph;
