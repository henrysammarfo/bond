import { createFileRoute } from "@tanstack/react-router";
import { EvidencePage } from "@/components/EvidencePage";

export const Route = createFileRoute("/evidence")({
  head: () => ({
    meta: [
      { title: "Evidence — BOND" },
      {
        name: "description",
        content:
          "Public evidence for BOND vault scans: SERV I/O, IXS MCP probes, on-chain reads with block numbers.",
      },
    ],
  }),
  component: EvidencePage,
});
