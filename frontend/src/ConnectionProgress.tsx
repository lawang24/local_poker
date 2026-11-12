import { useEffect, useState } from "react";

export function ConnectionProgress({ loadingTable }: { loadingTable: boolean }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const timer = window.setInterval(() => {
      setSeconds(Math.floor((performance.now() - start) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const title = loadingTable ? "Loading the table" : "Connecting to the server";
  const detail = loadingTable ? "Waiting for the first table update."
    : "This should take between 30 seconds and 1 minute. This page will connect automatically.";

  return <section className="panel connection-progress">
    <div role="status">
      <h2>{title}</h2>
      <p>{detail}</p>
    </div>
    <div className="connection-track" role="progressbar" aria-label={title} />
    <small>{seconds}s elapsed</small>
  </section>;
}
