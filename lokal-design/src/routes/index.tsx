import { createFileRoute } from "@tanstack/react-router";
import { Story } from "@/components/story";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <Story />;
}
