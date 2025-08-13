"use client";

import { useRef } from "react";
import html2canvas from "html2canvas";

export function useLegendExport() {
  const componentRef = useRef<HTMLDivElement>(null);

  const downloadAsImage = async () => {
    if (!componentRef.current) return;

    try {
      const clone = componentRef.current.cloneNode(true) as HTMLElement;

      const processColors = (element: HTMLElement) => {
        Array.from(element.querySelectorAll("*")).forEach((el) => {
          if (!(el instanceof HTMLElement)) return;
          try {
            const computedStyle = window.getComputedStyle(el);
            const colorProps = [
              "color",
              "background-color",
              "border-color",
              "fill",
              "stroke",
            ];
            colorProps.forEach((prop) => {
              const value = computedStyle.getPropertyValue(prop);
              if (value && value !== "none" && value !== "transparent") {
                el.style.setProperty(prop, value, "important");
              }
            });
            const style = el.getAttribute("style");
            if (
              style &&
              (style.includes("oklch") ||
                style.includes("lab(") ||
                style.includes("lch(") ||
                style.includes("color("))
            ) {
              let newStyle = style;
              [
                /oklch\([^)]+\)/g,
                /lab\([^)]+\)/g,
                /lch\([^)]+\)/g,
                /color\([^)]+\)/g,
              ].forEach((regex) => {
                newStyle = newStyle.replace(regex, "rgb(0,0,0)");
              });
              if (newStyle !== style) el.setAttribute("style", newStyle);
            }
          } catch {}
        });
        return element;
      };

      const processedElement = processColors(clone);
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "-9999px";
      container.style.width = `${componentRef.current.clientWidth}px`;
      container.style.height = `${componentRef.current.clientHeight}px`;
      container.appendChild(processedElement);
      document.body.appendChild(container);

      const canvas = await html2canvas(processedElement, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        onclone: (_, element) => {
          const elements = element.querySelectorAll("*");
          elements.forEach((el) => {
            if (!(el instanceof HTMLElement)) return;
            try {
              const style = el.getAttribute("style");
              if (
                style &&
                (style.includes("oklch") ||
                  style.includes("lab(") ||
                  style.includes("lch(") ||
                  style.includes("color("))
              ) {
                let newStyle = style;
                [
                  /oklch\([^)]+\)/g,
                  /lab\([^)]+\)/g,
                  /lch\([^)]+\)/g,
                  /color\([^)]+\)/g,
                ].forEach((regex) => {
                  newStyle = newStyle.replace(regex, "rgb(0,0,0)");
                });
                if (newStyle !== style) el.setAttribute("style", newStyle);
              }
            } catch {}
          });
          return element;
        },
      });

      const dataUrl = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "legend.png";
      link.click();

      document.body.removeChild(container);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error exporting legend:", error);
    }
  };

  return { componentRef, downloadAsImage } as const;
}


