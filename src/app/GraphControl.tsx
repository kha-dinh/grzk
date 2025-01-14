"use client";

import React, { useState, useEffect } from "react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  GripVertical,
  Minimize2,
  Maximize2,
  ChevronsUpDown,
  Sun,
  Moon,
  ChevronsDown,
  ChevronsUp,
  RotateCcw,
  RotateCcwIcon,
  Download,
} from "lucide-react";
import { defaultConfig, GraphConfig } from "./graphConfig";
import MultipleSelector, { Option } from "@/components/ui/multi-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

import { GraphFilter, TagData } from "./Graph";
import { tryGetStored } from "./Utils";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const GraphControlCollapsible = ({
  children,
  openSection,
  title,
  sectionName,
  toggleSection,
  className = "",
}: {
  children: any;
  openSection: boolean;
  title: string;
  sectionName: string;
  toggleSection: (arg: string) => void;
  className?: string;
}) => {
  return (
    <div className={`${className}`}>
      <Collapsible
        open={openSection}
        onOpenChange={() => {
          toggleSection(sectionName);
        }}
        className="w-full"
      >
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between py-1">
            <h4 className="text-sm font-semibold">{title}</h4>
            <Button variant="ghost" size="sm" className="w-8 p-0 bg-red">
              {!openSection ? (
                <ChevronsDown className="h-4 w-4" />
              ) : (
                <ChevronsUp className="h-4 w-4" />
              )}
              <span className="sr-only">Toggle</span>
            </Button>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent
          className={cn(
            "text-popover-foreground outline-none\
            data-[state=open]:animate-in data-[state=closed]:animate-out\
            data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0\
            data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95\
            data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2\
            data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2\
            ",
          )}
        >
          <div className="grid pl-2">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

const ConfigSlider = ({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.1,
  className,
}: {
  label: string;
  value: number;
  onChange: any;
  min: number;
  max: number;
  step: number;
  className?: string;
}) => {
  return (
    <div className={`w-[95%] ${className ? className : ""}`}>
      <Label className="block text-xs mb-2 mt-2">
        {label}: {value}
      </Label>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        className="w-full"
      />
    </div>
  );
};

const ForceConfiguration = ({
  config,
  handleSliderChange,
  className = "",
}: {
  config: GraphConfig;
  handleSliderChange: <Category extends keyof GraphConfig>(
    a: Category,
    b: string,
    c: any,
  ) => void;
  className: string;
}) => {
  const sliderConfigs = [
    {
      label: "Center Force",
      value: config.force.centerForce,
      onChange: (v: number) => handleSliderChange("force", "centerForce", v),
      min: 0,
      max: 1,
      step: 0.1,
    },
    {
      label: "Repel Force",
      value: config.force.repelForce,
      onChange: (v: number) => handleSliderChange("force", "repelForce", v),
      min: -5000,
      max: 0,
      step: 50,
    },
    {
      label: "Link Force",
      value: config.force.linkForce,
      onChange: (v: number) => handleSliderChange("force", "linkForce", v),
      min: 0,
      max: 1,
      step: 0.1,
    },
    {
      label: "Link Distance",
      value: config.force.linkDistance,
      onChange: (v: number) => handleSliderChange("force", "linkDistance", v),
      min: 10,
      max: 200,
      step: 5,
    },
  ];

  return (
    <div className={`${className}`}>
      {sliderConfigs.map((sliderConfig) => (
        <ConfigSlider key={sliderConfig.label} {...sliderConfig} />
      ))}
    </div>
  );
};

const ConfigControl = ({
  tags,
  config,
  filter,
  onConfigUpdate,
  onFilterUpdate,
  onShowTitle,
  onDownloadFile,
  showTitle,
}: {
  showTitle: boolean;
  onConfigUpdate: any;
  config: GraphConfig;
  filter: GraphFilter;
  onFilterUpdate: any;
  onShowTitle: any;
  onDownloadFile: any;
  tags?: Map<string, TagData>;
}) => {
  const { theme, setTheme } = useTheme();
  const [position, setPosition] = useState(
    tryGetStored("configPosition", { x: 20, y: 20 }),
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);

  interface Map {
    [key: string]: boolean;
  }

  const [expandedSections, setExpandedSections] = useState<Map>({
    visualization: true,
    force: true,
    nodes: true,
    zoom: true,
    filter: true,
  });

  let processedTags: Option[] = [];
  if (tags)
    processedTags = [
      ...tags.entries().map(([d, data]) => {
        return { value: d, label: d, count: data.nodes.length };
      }),
    ]
      .sort((a, b) => b.count - a.count)
      .map((d) => {
        return { value: d.value, label: d.label };
      });

  // Save position to localStorage when it changes
  useEffect(() => {
    window.localStorage.setItem("configPosition", JSON.stringify(position));
  }, [position]);

  const handleMouseDown = (e: any) => {
    if (e.target.closest(".handle")) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
      e.preventDefault(); // Prevent text selection while dragging
    }
  };

  const handleMouseMove = (e: any) => {
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
  const handleReset = () => {
    onConfigUpdate(defaultConfig);
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

  const handleSliderChange = <Category extends keyof GraphConfig>(
    category: Category,
    parameter: string,
    value: number,
  ) => {
    const newConfig = {
      ...config,
      [category]: {
        ...config[category],
        [parameter]: value,
      },
    };
    onConfigUpdate(newConfig);
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const onFilterStringUpdate = (newFilter: string) => {
    onFilterUpdate({ ...filter, filterString: newFilter });
  };

  const onShowTagsUpdate = (newVal: boolean) => {
    onFilterUpdate({ ...filter, showTags: newVal });
  };

  const handleTagSelect = (newTags: Option[]) => {
    let newSet = [
      ...new Set([...newTags.map((t) => JSON.stringify(t))])
        .values()
        .map((v) => JSON.parse(v)),
    ];
    onFilterUpdate({ ...filter, tags: newSet });
  };

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
        suppressHydrationWarning
        className="absolute shadow-lg bg-accent backdrop-blur-sm"
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
          <div className="flex items-center gap-1">
            <GripVertical className="w-4 h-4" />
            <CardTitle>Graph Configuration</CardTitle>
          </div>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1  rounded"
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
            <div className="flex justify-between">
              <Button
                title="Toggle light/dark theme"
                variant="outline"
                onClick={() =>
                  theme === "dark" ? setTheme("light") : setTheme("dark")
                }
                size="sm"
              >
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>

              <Button
                title="Export graph"
                variant="outline"
                onClick={onDownloadFile}
                size="sm"
              >
                <Download className="h-[1.2rem] w-[1.2rem]" />
              </Button>
              <Button
                title="Reset to defaults"
                variant="outline"
                // onClick={handleReset}
                size="sm"
              >
                <RotateCcw className="h-[1.2rem] w-[1.2rem]" />
              </Button>
              <Button
                title="Reset to defaults"
                variant="outline"
                onClick={handleReset}
                size="sm"
              >
                <RotateCcw className="h-[1.2rem] w-[1.2rem]" />
              </Button>
            </div>
            <div className="py-2 flex space-x-4 justify-between items-center">
              <Label className="font-semibold text-sm">Show titles</Label>
              <Switch
                id="show-text"
                checked={showTitle}
                onCheckedChange={onShowTitle}
              />
            </div>
            <div className="py-2 flex space-x-4 justify-between items-center">
              <Label className="font-semibold text-sm">Show tags</Label>
              <Switch
                id="show-text"
                checked={filter.showTags}
                onCheckedChange={onShowTagsUpdate}
              />
            </div>

            <GraphControlCollapsible
              openSection={expandedSections.filter}
              toggleSection={toggleSection}
              sectionName="filter"
              title="Filters"
            >
              <div className="grid gap-2 px-2">
                <Input
                  type="text"
                  placeholder="Title"
                  value={filter.filterString}
                  onChange={(e) => onFilterStringUpdate(e.target.value)}
                  className="w-full h-8 text-sm bg-background"
                />
                <MultipleSelector
                  options={processedTags}
                  onChange={handleTagSelect}
                  placeholder="Select tag(s)"
                  value={filter.tags}
                  className="w-full h-fit text-sm bg-background"
                ></MultipleSelector>
              </div>
            </GraphControlCollapsible>

            <GraphControlCollapsible
              openSection={expandedSections.visualization}
              toggleSection={toggleSection}
              sectionName="visualization"
              title="Visualization Configurations"
            >
              <GraphControlCollapsible
                openSection={expandedSections.force}
                toggleSection={toggleSection}
                title="Force"
                sectionName="force"
                className=""
              >
                <ForceConfiguration
                  config={config}
                  handleSliderChange={handleSliderChange}
                  className="space-y-2 pb-4 mr-2 pl-4 bg-background rounded border border-input shadow-sm"
                ></ForceConfiguration>
              </GraphControlCollapsible>
              <GraphControlCollapsible
                openSection={expandedSections.nodes}
                toggleSection={toggleSection}
                title="Nodes"
                sectionName="nodes"
              >
                <Label className="block text-xs mb-2 ">
                  Radius: {config.node.baseRadius}
                </Label>
                <Slider
                  min={5}
                  max={30}
                  step={1}
                  value={[config.node.baseRadius]}
                  onValueChange={(v) =>
                    handleSliderChange("node", "baseRadius", v[0])
                  }
                  className="w-full"
                />
              </GraphControlCollapsible>
              <GraphControlCollapsible
                openSection={expandedSections.zoom}
                toggleSection={toggleSection}
                title="Zoom"
                sectionName="zoom"
              >
                <Label className="block text-xs mb-2">
                  Zoom: {config.zoom.defaultScale}
                </Label>
                <Slider
                  min={config.zoom.min}
                  max={config.zoom.max}
                  step={0.05}
                  value={[config.zoom.defaultScale]}
                  onValueChange={(v) =>
                    handleSliderChange("zoom", "defaultScale", v[0])
                  }
                  className="w-full"
                />
              </GraphControlCollapsible>
            </GraphControlCollapsible>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default ConfigControl;
