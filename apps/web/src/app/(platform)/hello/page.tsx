import { notFound } from "next/navigation";
import HelloClient from "./hello-client";

export default function HelloPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <HelloClient />;
}
