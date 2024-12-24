import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  GripVertical,
  Minimize2,
  Maximize2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const getStoredPosition = () => {
  const stored = localStorage.getItem("configSliderPosition");
  return stored ? JSON.parse(stored) : { x: 20, y: 20 };
};

const ConfigSliders = ({ onConfigUpdate }) => {
  const [config, setConfig] = useState({
    forces: {
      centerForce: 0.2,
      repelForce: -500,
      linkForce: 0.3,
      linkDistance: 50,
    },
    node: {
      baseRadius: 7,
      radiusMultiplier: 0.5,
    },
    zoom: {
      defaultScale: 0.4,
    },
  });

  const [position, setPosition] = useState(getStoredPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    forces: true,
    nodes: true,
    zoom: true,
  });

  // Save position to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("configSliderPosition", JSON.stringify(position));
  }, [position]);

  const handleMouseDown = (e) => {
    if (e.target.closest(".handle")) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
      e.preventDefault(); // Prevent text selection while dragging
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = Math.max(
        0,
        Math.min(window.innerWidth - 320, e.clientX - dragOffset.x),
      );
      const newY = Math.max(
        0,
        Math.min(window.innerHeight - 100, e.clientY - dragOffset.y),
      );

      setPosition({
        x: newX,
        y: newY,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleSliderChange = (category, parameter, value) => {
    const newConfig = {
      ...config,
      [category]: {
        ...config[category],
        [parameter]: parseFloat(value),
      },
    };
    setConfig(newConfig);
    onConfigUpdate(newConfig);
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const SectionHeader = ({ title, section }) => (
    <button
      onClick={() => toggleSection(section)}
      className="flex items-center gap-2 w-full hover:bg-gray-50 p-1 rounded select-none"
    >
      {expandedSections[section] ? (
        <ChevronDown className="w-4 h-4" />
      ) : (
        <ChevronRight className="w-4 h-4" />
      )}
      <h3 className="font-medium text-sm">{title}</h3>
    </button>
  );

  return (
    <div
      className="fixed"
      style={{
        left: 0,
        top: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 1000,
      }}
    >
      <Card
        className="absolute shadow-lg bg-white/95 backdrop-blur-sm"
        style={{
          left: position.x,
          top: position.y,
          width: "320px",
          pointerEvents: "auto",
        }}
      >
        <CardHeader
          className="handle cursor-grab active:cursor-grabbing p-2 flex flex-row items-center justify-between select-none"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4" />
            <CardTitle className="text-sm">Graph Configuration</CardTitle>
          </div>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4" />
            ) : (
              <Minimize2 className="w-4 h-4" />
            )}
          </button>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <SectionHeader title="Forces" section="forces" />
                {expandedSections.forces && (
                  <div className="grid gap-4 pl-6">
                    <div>
                      <label className="block text-xs mb-1">
                        Center Force: {config.forces.centerForce}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={config.forces.centerForce}
                        onChange={(e) =>
                          handleSliderChange(
                            "forces",
                            "centerForce",
                            e.target.value,
                          )
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">
                        Repel Force: {config.forces.repelForce}
                      </label>
                      <input
                        type="range"
                        min="-1000"
                        max="0"
                        step="50"
                        value={config.forces.repelForce}
                        onChange={(e) =>
                          handleSliderChange(
                            "forces",
                            "repelForce",
                            e.target.value,
                          )
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">
                        Link Force: {config.forces.linkForce}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={config.forces.linkForce}
                        onChange={(e) =>
                          handleSliderChange(
                            "forces",
                            "linkForce",
                            e.target.value,
                          )
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">
                        Link Distance: {config.forces.linkDistance}
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="200"
                        step="10"
                        value={config.forces.linkDistance}
                        onChange={(e) =>
                          handleSliderChange(
                            "forces",
                            "linkDistance",
                            e.target.value,
                          )
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <SectionHeader title="Nodes" section="nodes" />
                {expandedSections.nodes && (
                  <div className="grid gap-4 pl-6">
                    <div>
                      <label className="block text-xs mb-1">
                        Base Radius: {config.node.baseRadius}
                      </label>
                      <input
                        type="range"
                        min="2"
                        max="20"
                        step="1"
                        value={config.node.baseRadius}
                        onChange={(e) =>
                          handleSliderChange(
                            "node",
                            "baseRadius",
                            e.target.value,
                          )
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">
                        Radius Multiplier: {config.node.radiusMultiplier}
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="2"
                        step="0.1"
                        value={config.node.radiusMultiplier}
                        onChange={(e) =>
                          handleSliderChange(
                            "node",
                            "radiusMultiplier",
                            e.target.value,
                          )
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <SectionHeader title="Zoom" section="zoom" />
                {expandedSections.zoom && (
                  <div className="pl-6">
                    <label className="block text-xs mb-1">
                      Default Scale: {config.zoom.defaultScale}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="2"
                      step="0.1"
                      value={config.zoom.defaultScale}
                      onChange={(e) =>
                        handleSliderChange(
                          "zoom",
                          "defaultScale",
                          e.target.value,
                        )
                      }
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default ConfigSliders;
