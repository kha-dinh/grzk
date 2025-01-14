"use client";

import React, { useState, useEffect } from "react";
import * as d3 from "d3";
import ConfigControl from "./GraphControl";
import { GraphConfig, defaultConfig } from "./graphConfig";
import D3Graph from "./D3Graph";
import { GraphFilter, RawData, ZkGraph, ZkNode, ZkNodeType } from "./Graph";
import { tryGetStored } from "./Utils";

function Graph() {
  const [graph, setGraph] = useState<ZkGraph | undefined>(undefined);
  const [config, setConfig] = useState(tryGetStored("config", defaultConfig));
  const [showTitle, setShowTitle] = useState(tryGetStored("showTitle", true));
  const [filter, setFilter] = useState<GraphFilter>(
    tryGetStored("filter", null),
  );

  useEffect(() => {
    window.localStorage.setItem("config", JSON.stringify(config));
  }, [config]);
  useEffect(() => {
    window.localStorage.setItem("filter", JSON.stringify(filter));
  }, [filter]);

  useEffect(() => {
    async function fetchData() {
      const fetchData: RawData | undefined = await d3.json(
        "http://localhost:3000/api/graph",
      );

      const graph = new ZkGraph(fetchData!, config);
      if (filter) {
        graph.filter = filter;
      }
      setGraph(graph);
      setFilter(filter);
    }
    fetchData();
  }, []);

  const handleConfigUpdate = (newConfig: GraphConfig) => {
    setConfig(newConfig);
  };

  const handleZoomUpdate = (scale: number) => {
    let newConfig: GraphConfig = {
      ...config,
      zoom: {
        ...config.zoom,
        defaultScale: scale,
      },
    };
    setConfig(newConfig);
  };

  const handleNodeSelect = (node: ZkNode) => {
    switch (node.type) {
      case ZkNodeType.NOTE:
        let file = node.data.absPath;
        if (file) {
          const request = new XMLHttpRequest();
          request.open(
            "GET",
            "http://localhost:3000/api/open?file=" + file,
            false,
          );
          request.send();
        } else {
          console.log(`File for ${node.path} not found`);
        }
        break;
      case ZkNodeType.TAG:
        // let newTags = [{ value: node.path, label: node.path }]
        // handleTagSelect(newTags);
        break;
    }
  };

  const handleFilterUpdate = (newFilter: GraphFilter) => {
    setFilter(newFilter);
    graph!.filter = newFilter;
  };

  const handleDownloadFile = () => {
    // const svg = document.getElementsByTagName("svg")?.innerHTML;
    const container = document.getElementsByClassName("graph-container");
    const svg = container.item(0)?.innerHTML;

    const doc = new window.PDFDocument();

    const chunks = [];
    const stream = doc.pipe({
      // writable stream implementation
      write: (chunk) => chunks.push(chunk),
      end: () => {
        const pdfBlob = new Blob(chunks, {
          type: "application/octet-stream",
        });
        var blobUrl = URL.createObjectURL(pdfBlob);
        //window.open(`${blobUrl}?customfilename.pdf`);

        /* custom file name download */
        const a = document.createElement("a");
        document.body.appendChild(a);
        a.style = "display: none";
        a.href = blobUrl;
        a.download = "test.pdf"; // <---- 👈 file name
        a.click();
        window.URL.revokeObjectURL(blobUrl);
      },
      // readable streaaam stub iplementation
      on: (event, action) => {},
      once: (...args) => {},
      emit: (...args) => {},
    });
    // let zoomGroup = container.item(0)?.getElementsByClassName("zoom-group");

    // const secondGroup = document.querySelectorAll(".zoom-group")[1];
    // const matrix = secondGroup.transform.baseVal[0].matrix;
    // const translateX = matrix.e;
    // const translateY = matrix.f;
    // console.log(container.item(0)?.getBoundingClientRect());
    // console.log(window.innerHeight);
    // console.log(window.innerWidth);

    window.SVGtoPDF(doc, svg, 0, 0, {
      width: window.innerWidth,
      height: window.innerHeight,
    });

    doc.end();
    // console.log(svg);
  };

  return graph ? (
    <>
      <ConfigControl
        showTitle={showTitle}
        onShowTitle={setShowTitle}
        config={config}
        filter={graph.filter}
        onConfigUpdate={handleConfigUpdate}
        onFilterUpdate={handleFilterUpdate}
        onDownloadFile={handleDownloadFile}
        tags={graph.getTags()}
      />
      <D3Graph
        config={config}
        filter={graph.filter}
        graph={graph}
        showTitle={showTitle}
        onScaleUpdate={handleZoomUpdate}
        onNodeSelect={handleNodeSelect}
      ></D3Graph>
    </>
  ) : (
    <></>
  );
}

export default Graph;
