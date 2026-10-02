import { createFileRoute } from "@tanstack/react-router";
import { DetectorApp } from "@/components/detector-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <DetectorApp />;
}
